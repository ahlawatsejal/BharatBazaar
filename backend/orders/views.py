import base64
from decimal import Decimal
import hashlib
import hmac
import json
import logging
import urllib.request
import urllib.error

from django.conf import settings
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Address, Order, OrderItem, Notification
from .serializers import (
    AddressSerializer,
    CreateOrderRequestSerializer,
    OrderSerializer,
    NotificationSerializer,
)
from cart.models import Cart
from products.models import Product

logger = logging.getLogger(__name__)


def create_razorpay_order_remote(amount_in_paise, receipt_id):
    """
    Creates an order on Razorpay using urllib (zero external unapproved libraries).
    Returns razorpay_order_id on success, or None on fallback.
    """
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

    if not key_id or not key_secret:
        return None

    url = 'https://api.razorpay.com/v1/orders'
    payload = {
        'amount': amount_in_paise,
        'currency': 'INR',
        'receipt': receipt_id,
        'payment_capture': 1,
    }
    data = json.dumps(payload).encode('utf-8')
    auth_str = f"{key_id}:{key_secret}"
    b64_auth = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Basic {b64_auth}',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            return res_json.get('id')
    except Exception as exc:
        logger.warning("Could not reach Razorpay API: %s", exc)
        return None


def verify_razorpay_signature(order_id, payment_id, signature):
    """
    Verifies Razorpay HMAC SHA256 payment signature server-side.
    """
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
    if not key_secret:
        # If no secret configured in test environment, return False for security
        return False

    msg = f"{order_id}|{payment_id}".encode('utf-8')
    expected = hmac.new(key_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ─── Address Management Views ─────────────────────────────────────────────────

class AddressListCreateView(APIView):
    """
    GET /api/orders/addresses/
    Lists saved delivery addresses for the authenticated customer.

    POST /api/orders/addresses/
    Creates a new delivery address for the customer.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = Address.objects.filter(customer=request.user)
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AddressSerializer(data=request.data)
        if serializer.is_valid():
            # If customer has no existing addresses, make this the default automatically
            has_existing = Address.objects.filter(customer=request.user).exists()
            is_default = serializer.validated_data.get('is_default', not has_existing)

            address = serializer.save(customer=request.user, is_default=is_default)
            return Response(AddressSerializer(address).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AddressDetailView(APIView):
    """
    PATCH /api/orders/addresses/{id}/
    Updates a customer's existing delivery address.

    DELETE /api/orders/addresses/{id}/
    Removes a delivery address.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        address = get_object_or_404(Address, pk=pk, customer=request.user)
        serializer = AddressSerializer(address, data=request.data, partial=True)
        if serializer.is_valid():
            address = serializer.save()
            return Response(AddressSerializer(address).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        address = get_object_or_404(Address, pk=pk, customer=request.user)
        address.delete()
        return Response({'message': 'Address removed successfully.'}, status=status.HTTP_200_OK)


class AddressSetDefaultView(APIView):
    """
    POST /api/orders/addresses/{id}/default/
    Marks an address as default for the customer.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        address = get_object_or_404(Address, pk=pk, customer=request.user)
        address.is_default = True
        address.save()
        return Response(AddressSerializer(address).data, status=status.HTTP_200_OK)


# ─── Payment Gateway Config View ──────────────────────────────────────────────

class PaymentConfigView(APIView):
    """
    GET /api/orders/payment-config/
    Returns public Razorpay key ID and configuration readiness.
    Strictly never exposes RAZORPAY_KEY_SECRET.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        has_secret = bool(getattr(settings, 'RAZORPAY_KEY_SECRET', ''))
        return Response(
            {
                'razorpay_key_id': key_id,
                'test_mode': True,
                'is_configured': bool(key_id and has_secret),
            },
            status=status.HTTP_200_OK,
        )


# ─── Order Creation View ──────────────────────────────────────────────────────

class CreateOrderView(APIView):
    """
    POST /api/orders/create/
    Validates cart, stock, and delivery destination.
    Calculates authoritative order totals on backend.
    Provisions a pending Order and associated OrderItems with historical snapshots.
    Provisions a Razorpay order ID for client payment checkout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        address_id = serializer.validated_data['address_id']

        # 1. Verify shipping address belongs to customer
        try:
            address = Address.objects.get(pk=address_id, customer=request.user)
        except Address.DoesNotExist:
            return Response(
                {'detail': 'Selected delivery address does not exist or does not belong to you.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Verify cart is not empty
        try:
            cart = Cart.objects.prefetch_related('items__product__seller').get(customer=request.user)
        except Cart.DoesNotExist:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        cart_items = list(cart.items.all())
        if not cart_items:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Validate stock and product approval
        for item in cart_items:
            prod = item.product
            if (
                prod.approval_status != Product.ApprovalStatus.APPROVED
                or not prod.seller.is_approved
                or not prod.category.is_active
            ):
                return Response(
                    {'detail': f'"{prod.name}" is no longer available for purchase.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if prod.available_stock < item.quantity:
                return Response(
                    {
                        'detail': f'Insufficient stock for "{prod.name}". Only {prod.available_stock} units available (you requested {item.quantity}).'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # 4. Authoritative calculation of totals
        subtotal = sum(item.line_total for item in cart_items)
        shipping_amount = Decimal('0.00') if subtotal >= Decimal('999.00') else Decimal('99.00')
        discount_amount = Decimal('0.00')
        total_amount = subtotal + shipping_amount - discount_amount

        # Snapshot address
        address_snapshot = {
            'full_name': address.full_name,
            'phone_number': address.phone_number,
            'address_line_1': address.address_line_1,
            'address_line_2': address.address_line_2,
            'city': address.city,
            'state': address.state,
            'postal_code': address.postal_code,
            'country': address.country,
        }

        # 5. Create Order and OrderItems in database transaction
        with transaction.atomic():
            order_number = Order.generate_order_number()

            order = Order.objects.create(
                customer=request.user,
                order_number=order_number,
                subtotal=subtotal,
                shipping_amount=shipping_amount,
                discount_amount=discount_amount,
                total_amount=total_amount,
                order_status=Order.OrderStatus.PENDING,
                payment_status=Order.PaymentStatus.PENDING,
                shipping_address_snapshot=address_snapshot,
            )

            order_items_to_create = []
            for item in cart_items:
                prod = item.product
                unit_price = prod.discount_price if (prod.discount_price and prod.discount_price > 0) else prod.price
                line_total = unit_price * item.quantity

                order_items_to_create.append(
                    OrderItem(
                        order=order,
                        product=prod,
                        seller=prod.seller,
                        product_name=prod.name,
                        unit_price=unit_price,
                        quantity=item.quantity,
                        line_total=line_total,
                        craft_type=prod.craft_type,
                        origin_state=prod.origin_state,
                        primary_image=prod.primary_image,
                    )
                )

            OrderItem.objects.bulk_create(order_items_to_create)

        # 6. Generate Razorpay Order
        amount_in_paise = int(total_amount * 100)
        razorpay_order_id = create_razorpay_order_remote(amount_in_paise, order.order_number)

        if not razorpay_order_id:
            # Fallback simulated test gateway identifier if remote credentials not yet configured
            razorpay_order_id = f"rzp_test_ord_{order.order_number.replace('-', '_')}"

        order.razorpay_order_id = razorpay_order_id
        order.save(update_fields=['razorpay_order_id'])

        order_data = OrderSerializer(order).data
        return Response(
            {
                'order': order_data,
                'razorpay_order_id': razorpay_order_id,
                'razorpay_key_id': getattr(settings, 'RAZORPAY_KEY_ID', ''),
                'amount_in_paise': amount_in_paise,
                'currency': 'INR',
                'customer_name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email,
                'customer_email': request.user.email,
                'customer_phone': request.user.phone_number or address.phone_number,
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Payment Verification View ────────────────────────────────────────────────

class VerifyPaymentView(APIView):
    """
    POST /api/orders/verify-payment/
    Verifies Razorpay payment signature server-side.
    Atomically updates order status, reserves/deducts stock, and clears the cart.
    Idempotent to safely prevent duplicate stock deduction or double charging.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_number = request.data.get('order_number')
        razorpay_order_id = request.data.get('razorpay_order_id', '')
        razorpay_payment_id = request.data.get('razorpay_payment_id', '')
        razorpay_signature = request.data.get('razorpay_signature', '')

        if not order_number or not razorpay_payment_id:
            return Response(
                {'detail': 'Order number and payment ID are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = get_object_or_404(Order, order_number=order_number, customer=request.user)

        # 1. Idempotency Check: if already paid, return immediately
        if order.payment_status == Order.PaymentStatus.PAID:
            return Response(
                {
                    'message': 'Order is already confirmed and paid.',
                    'order': OrderSerializer(order).data,
                },
                status=status.HTTP_200_OK,
            )

        # 2. Signature verification
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        if key_secret:
            # Cryptographic verification against secret
            is_valid = verify_razorpay_signature(
                razorpay_order_id or order.razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
            )
            if not is_valid:
                order.payment_status = Order.PaymentStatus.FAILED
                order.save(update_fields=['payment_status', 'updated_at'])
                return Response(
                    {'detail': 'Cryptographic payment signature verification failed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # If Razorpay keys are not yet configured in environment, record in test mode
            logger.info("Razorpay secret not configured. Operating in test sandbox mode.")

        # 3. Atomic stock deduction and order confirmation
        with transaction.atomic():
            # Lock order record
            locked_order = Order.objects.select_for_update().get(pk=order.pk)
            if locked_order.payment_status == Order.PaymentStatus.PAID:
                return Response(
                    {
                        'message': 'Order already processed.',
                        'order': OrderSerializer(locked_order).data,
                    },
                    status=status.HTTP_200_OK,
                )

            # Deduct stock safely for each item
            order_items = locked_order.items.select_related('product')
            for item in order_items:
                if item.product:
                    # Lock product record
                    prod = Product.objects.select_for_update().get(pk=item.product.pk)
                    if prod.available_stock < item.quantity:
                        # Insufficient stock at checkout finalization
                        locked_order.payment_status = Order.PaymentStatus.FAILED
                        locked_order.order_status = Order.OrderStatus.CANCELLED
                        locked_order.save(update_fields=['payment_status', 'order_status', 'updated_at'])
                        return Response(
                            {
                                'detail': f'Stock for "{prod.name}" was claimed by another customer. Payment marked for refund.'
                            },
                            status=status.HTTP_409_CONFLICT,
                        )
                    prod.available_stock = max(0, prod.available_stock - item.quantity)
                    prod.save(update_fields=['available_stock', 'updated_at'])

            # Update order state
            locked_order.payment_status = Order.PaymentStatus.PAID
            locked_order.order_status = Order.OrderStatus.CONFIRMED
            locked_order.razorpay_payment_id = razorpay_payment_id
            if razorpay_signature:
                locked_order.razorpay_signature = razorpay_signature
            locked_order.save(update_fields=[
                'payment_status',
                'order_status',
                'razorpay_payment_id',
                'razorpay_signature',
                'updated_at',
            ])

            # Clear customer's cart
            try:
                cart = Cart.objects.get(customer=request.user)
                cart.items.all().delete()
            except Cart.DoesNotExist:
                pass

            # Create duplicate-safe in-app notifications for customer and each distinct seller
            cust_title = f'Order {locked_order.order_number} Confirmed'
            if not Notification.objects.filter(
                customer=request.user, title=cust_title, notification_type='ORDER'
            ).exists():
                Notification.objects.create(
                    customer=request.user,
                    title=cust_title,
                    message=f'Your payment for order {locked_order.order_number} was verified and artisans have been notified.',
                    notification_type='ORDER',
                )

            notified_seller_ids = set()
            for item in order_items.select_related('seller__user'):
                if item.seller and item.seller.user_id not in notified_seller_ids:
                    notified_seller_ids.add(item.seller.user_id)
                    seller_title = f'New Paid Order {locked_order.order_number}'
                    if not Notification.objects.filter(
                        customer=item.seller.user, title=seller_title, notification_type='ORDER'
                    ).exists():
                        Notification.objects.create(
                            customer=item.seller.user,
                            title=seller_title,
                            message=f'You received a new paid order ({locked_order.order_number}). Review and accept it in your Orders workspace.',
                            notification_type='ORDER',
                        )

        return Response(
            {
                'message': 'Payment successfully verified. Your artisanal order is confirmed!',
                'order': OrderSerializer(locked_order).data,
            },
            status=status.HTTP_200_OK,
        )


# ─── Order Detail and History Views ───────────────────────────────────────────

class OrderDetailView(APIView):
    """
    GET /api/orders/{order_number}/
    Returns order confirmation details. Customer can only access their own orders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        order = get_object_or_404(
            Order.objects.prefetch_related('items__seller'),
            order_number=order_number,
            customer=request.user,
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class OrderListView(generics.ListAPIView):
    """
    GET /api/orders/
    Lists order history for the authenticated customer.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related('items').order_by('-created_at')


class CancelOrderView(APIView):
    """
    POST /api/orders/{order_number}/cancel/
    Allows customer to cancel orders that have not yet dispatched or begun artisan workshop processing.
    Restores stock safely inside a database transaction.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number, customer=request.user)

        # Business rule check: only PENDING or newly CONFIRMED orders can be cancelled by customer
        if order.order_status not in [Order.OrderStatus.PENDING, Order.OrderStatus.CONFIRMED]:
            return Response(
                {
                    'detail': f'Order cannot be cancelled because it is already {order.get_order_status_display().lower()}.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            locked_order = Order.objects.select_for_update().get(pk=order.pk)
            if locked_order.order_status in [Order.OrderStatus.SHIPPED, Order.OrderStatus.DELIVERED, Order.OrderStatus.CANCELLED]:
                return Response(
                    {'detail': 'Order status changed or is already cancelled.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # If order was paid, restore stock to products.
            # Payment status remains PAID until an actual provider refund is confirmed.
            if locked_order.payment_status == Order.PaymentStatus.PAID:
                for item in locked_order.items.select_related('product'):
                    if item.product:
                        Product.objects.filter(pk=item.product.pk).update(
                            available_stock=models.F('available_stock') + item.quantity
                        )

            locked_order.order_status = Order.OrderStatus.CANCELLED
            locked_order.save(update_fields=['order_status', 'updated_at'])
            locked_order.items.update(fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED)

            is_paid = locked_order.payment_status == Order.PaymentStatus.PAID
            notif_msg = (
                f'Your order {order.order_number} has been cancelled. '
                'Your payment remains captured and is awaiting refund confirmation.'
                if is_paid
                else f'Your order {order.order_number} has been cancelled successfully.'
            )

            # Create notification
            Notification.objects.create(
                customer=request.user,
                title=f'Order {order.order_number} Cancelled',
                message=notif_msg,
                notification_type='ORDER',
            )

        return Response(
            {
                'message': f'Order {order.order_number} has been cancelled.',
                'refund_status': 'AWAITING_REFUND_CONFIRMATION' if is_paid else 'NO_REFUND_REQUIRED',
                'order': OrderSerializer(locked_order).data,
            },
            status=status.HTTP_200_OK,
        )


# ─── Notifications Views ──────────────────────────────────────────────────────

class NotificationListView(APIView):
    """
    GET /api/orders/notifications/
    Lists customer notifications and total unread count.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(customer=request.user)
        unread_count = notifications.filter(is_read=False).count()
        serializer = NotificationSerializer(notifications[:30], many=True)
        return Response(
            {
                'unread_count': unread_count,
                'notifications': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class NotificationMarkReadView(APIView):
    """
    POST /api/orders/notifications/{id}/read/
    Marks a single notification as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, customer=request.user)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'message': 'Notification marked as read.'}, status=status.HTTP_200_OK)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/orders/notifications/mark-all-read/
    Marks all notifications for this customer as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(customer=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'}, status=status.HTTP_200_OK)
