from decimal import Decimal
import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import InventoryHistory
from .permissions import IsApprovedSeller
from .serializers import (
    SellerStoreProfileSerializer,
    SellerProductSerializer,
    SellerProductWriteSerializer,
    SellerInventoryItemSerializer,
    InventoryAdjustmentSerializer,
    InventoryHistorySerializer,
    SellerOrderItemSerializer,
    SellerOrderItemStatusUpdateSerializer,
    SellerOrderItemShipmentSerializer,
)
from products.models import Product
from orders.models import Order, OrderItem, Notification


class SellerDashboardOverviewView(APIView):
    """
    GET /api/sellers/dashboard/
    Retrieves aggregated operational dashboard metrics, recent orders,
    and product performance strictly for the authenticated approved seller.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile

        # ── 1. Product Inventory Stats ──
        products_qs = Product.objects.filter(seller=seller)
        total_products = products_qs.count()
        active_products = products_qs.filter(approval_status=Product.ApprovalStatus.APPROVED).count()
        out_of_stock_products = products_qs.filter(available_stock=0).count()

        # ── 2. Order Fulfillment Stats ──
        # Orders containing at least one item from this seller
        seller_orders_qs = Order.objects.filter(items__seller=seller).distinct()
        total_orders = seller_orders_qs.count()
        pending_orders = seller_orders_qs.filter(
            order_status__in=['PENDING', 'CONFIRMED', 'PROCESSING']
        ).count()
        delivered_orders = seller_orders_qs.filter(order_status='DELIVERED').count()

        # ── 3. Revenue from successfully PAID orders ──
        paid_items_qs = OrderItem.objects.filter(
            seller=seller,
            order__payment_status='PAID'
        )
        total_sales_agg = paid_items_qs.aggregate(total=Sum('line_total'))
        total_sales = total_sales_agg['total'] or Decimal('0.00')

        # ── 4. Recent Orders (Attributable to this Seller) ──
        recent_orders_list = []
        recent_orders = seller_orders_qs.order_by('-created_at')[:5]

        for ord in recent_orders:
            # Only include line items belonging to this seller
            items_for_seller = ord.items.filter(seller=seller)
            seller_items_data = []
            seller_subtotal = Decimal('0.00')

            for itm in items_for_seller:
                seller_subtotal += itm.line_total
                seller_items_data.append({
                    'id': itm.id,
                    'product_id': itm.product_id,
                    'product_name': itm.product_name,
                    'quantity': itm.quantity,
                    'unit_price': str(itm.unit_price),
                    'line_total': str(itm.line_total),
                })

            recent_orders_list.append({
                'order_number': ord.order_number,
                'created_at': ord.created_at,
                'order_status': ord.order_status,
                'payment_status': ord.payment_status,
                'customer_name': ord.customer.get_full_name() if ord.customer else ord.customer_email.split('@')[0],
                'items_count': items_for_seller.count(),
                'seller_subtotal': str(seller_subtotal),
                'items': seller_items_data,
            })

        # ── 5. Best-Selling Products ──
        best_sellers_qs = paid_items_qs.values(
            'product_id', 'product_name'
        ).annotate(
            units_sold=Sum('quantity'),
            total_revenue=Sum('line_total')
        ).order_by('-units_sold')[:5]

        best_selling_products = [
            {
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'units_sold': row['units_sold'],
                'total_revenue': str(row['total_revenue'] or Decimal('0.00')),
            }
            for row in best_sellers_qs
        ]

        # ── 6. Assemble Final Payload ──
        payload = {
            'store': SellerStoreProfileSerializer(seller).data,
            'stats': {
                'total_products': total_products,
                'active_products': active_products,
                'out_of_stock_products': out_of_stock_products,
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'delivered_orders': delivered_orders,
                'total_sales': str(total_sales),
            },
            'recent_orders': recent_orders_list,
            'best_selling_products': best_selling_products,
        }

        return Response(payload, status=status.HTTP_200_OK)


class SellerStoreProfileView(APIView):
    """
    GET /api/sellers/store/
    PATCH /api/sellers/store/
    Allows an approved seller to view and update their artisan storefront profile.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        serializer = SellerStoreProfileSerializer(seller)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        seller = request.user.seller_profile
        serializer = SellerStoreProfileSerializer(seller, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class SellerProductListCreateView(APIView):
    """
    GET /api/sellers/products/
      Lists all products belonging strictly to the authenticated approved seller.
      Supports ?search=, ?category=, ?status=, and ?ordering=.

    POST /api/sellers/products/
      Creates a new product owned by the authenticated approved seller.
      Enforces PENDING approval status on creation.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        qs = Product.objects.filter(seller=seller).select_related('category').prefetch_related('images')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(craft_type__icontains=search)
            )

        category_id = request.query_params.get('category', '').strip()
        if category_id and category_id != 'all':
            qs = qs.filter(Q(category_id=category_id) if category_id.isdigit() else Q(category__slug=category_id))

        approval_status = request.query_params.get('status', '').strip().upper()
        if approval_status and approval_status != 'ALL':
            qs = qs.filter(approval_status=approval_status)

        ordering = request.query_params.get('ordering', 'newest')
        if ordering == 'oldest':
            qs = qs.order_by('created_at')
        elif ordering == 'price_asc':
            qs = qs.order_by('price')
        elif ordering == 'price_desc':
            qs = qs.order_by('-price')
        else:
            qs = qs.order_by('-created_at')

        serializer = SellerProductSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        seller = request.user.seller_profile
        serializer = SellerProductWriteSerializer(
            data=request.data,
            context={'seller': seller, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            SellerProductSerializer(product).data,
            status=status.HTTP_201_CREATED,
        )


class SellerProductDetailView(APIView):
    """
    GET /api/sellers/products/<id>/
    PATCH /api/sellers/products/<id>/
    DELETE /api/sellers/products/<id>/
    Strictly isolated to products owned by request.user.seller_profile.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def _get_owned_product(self, request, pk):
        seller = request.user.seller_profile
        try:
            return Product.objects.select_related('category').prefetch_related('images').get(
                pk=pk,
                seller=seller,
            )
        except Product.DoesNotExist:
            return None

    def get(self, request, pk):
        product = self._get_owned_product(request, pk)
        if not product:
            return Response(
                {'detail': 'Product not found in your storefront catalog.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SellerProductSerializer(product).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        product = self._get_owned_product(request, pk)
        if not product:
            return Response(
                {'detail': 'Product not found or you do not have permission to edit it.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = SellerProductWriteSerializer(
            instance=product,
            data=request.data,
            partial=True,
            context={'seller': request.user.seller_profile, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(SellerProductSerializer(updated).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        product = self._get_owned_product(request, pk)
        if not product:
            return Response(
                {'detail': 'Product not found or you do not have permission to delete it.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        product.delete()
        return Response(
            {'message': 'Product removed from your catalog.'},
            status=status.HTTP_200_OK,
        )


def _detect_valid_image_format(uploaded_file):
    """
    Verifies actual binary image signatures and structural headers for JPEG, PNG, and WebP
    without trusting filename extensions. Returns detected extension ('.jpg', '.png', '.webp')
    or None if invalid/corrupted/non-image.
    """
    try:
        uploaded_file.seek(0)
        header = uploaded_file.read(32)
        uploaded_file.seek(0)
    except Exception:
        return None

    if not header or len(header) < 16:
        return None

    # PNG: 8-byte signature + IHDR chunk at offset 12
    if header.startswith(b'\x89PNG\r\n\x1a\n') and header[12:16] == b'IHDR':
        return '.png'

    # JPEG: SOI (FF D8 FF) followed by valid JPEG marker byte
    if header.startswith(b'\xff\xd8\xff') and header[3] in (
        0xE0, 0xE1, 0xE2, 0xE3, 0xE8, 0xDB, 0xC0, 0xC1, 0xC2, 0xED, 0xEE, 0xFE
    ):
        return '.jpg'

    # WebP: RIFF....WEBP
    if header[0:4] == b'RIFF' and header[8:12] == b'WEBP':
        return '.webp'

    return None


class SellerProductImageUploadView(APIView):
    """
    POST /api/sellers/products/upload-image/
    Validates uploaded image binary content (JPEG/PNG/WEBP, max 5MB) and saves it to MEDIA_ROOT/products/.
    Never relies solely on filename extension and never exposes server file paths in error responses.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
    MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        uploaded_file = request.FILES.get('image')
        if not uploaded_file:
            return Response(
                {'detail': 'No image file provided. Please select a valid JPEG, PNG, or WebP image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size == 0:
            return Response(
                {'detail': 'Uploaded image file is empty or corrupted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > self.MAX_SIZE_BYTES:
            return Response(
                {'detail': 'Image file exceeds the 5 MB size limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {'detail': 'Unsupported file type. Allowed formats: JPEG, PNG, WebP.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detected_ext = _detect_valid_image_format(uploaded_file)
        if not detected_ext:
            return Response(
                {'detail': 'Invalid or corrupted image file. Content does not match a valid JPEG, PNG, or WebP image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure file extension matches actual binary format
        normalized_ext = '.jpg' if (detected_ext == '.jpg' and ext in {'.jpg', '.jpeg'}) else detected_ext
        if detected_ext == '.png' and ext != '.png':
            return Response(
                {'detail': 'File extension does not match actual PNG image content.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if detected_ext == '.webp' and ext != '.webp':
            return Response(
                {'detail': 'File extension does not match actual WebP image content.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if detected_ext == '.jpg' and ext not in {'.jpg', '.jpeg'}:
            return Response(
                {'detail': 'File extension does not match actual JPEG image content.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = f"products/{uuid.uuid4().hex}{normalized_ext}"
        saved_path = default_storage.save(filename, uploaded_file)
        media_url = f"{settings.MEDIA_URL}{saved_path}".replace('//', '/')
        if not media_url.startswith('/'):
            media_url = '/' + media_url
        absolute_url = request.build_absolute_uri(media_url)

        return Response({'image_url': absolute_url}, status=status.HTTP_201_CREATED)


# ─── Seller Inventory Management Views ────────────────────────────────────────

class SellerInventoryListView(APIView):
    """
    GET /api/sellers/inventory/
    Lists inventory status for all products belonging to the authenticated approved seller.
    Supports ?search=, ?stock_status=, ?category=, ?ordering=.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        qs = Product.objects.filter(seller=seller).select_related('category')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search))

        category_id = request.query_params.get('category', '').strip()
        if category_id and category_id != 'all':
            qs = qs.filter(Q(category_id=category_id) if category_id.isdigit() else Q(category__slug=category_id))

        stock_status = request.query_params.get('stock_status', '').strip().upper()
        if stock_status == 'OUT_OF_STOCK':
            qs = qs.filter(available_stock=0)
        elif stock_status == 'LOW_STOCK':
            qs = qs.filter(available_stock__gt=0, available_stock__lte=F('low_stock_threshold'))
        elif stock_status == 'IN_STOCK':
            qs = qs.filter(available_stock__gt=F('low_stock_threshold'))

        ordering = request.query_params.get('ordering', 'stock_asc')
        if ordering == 'stock_desc':
            qs = qs.order_by('-available_stock', 'name')
        elif ordering == 'updated_desc':
            qs = qs.order_by('-updated_at')
        else:
            qs = qs.order_by('available_stock', 'name')

        serializer = SellerInventoryItemSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SellerInventorySummaryView(APIView):
    """
    GET /api/sellers/inventory/summary/
    Returns real MySQL-computed inventory metrics and low-stock/out-of-stock alerts
    for the authenticated approved seller.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        qs = Product.objects.filter(seller=seller)

        total_products = qs.count()
        out_of_stock_products = qs.filter(available_stock=0).count()
        low_stock_products = qs.filter(
            available_stock__gt=0,
            available_stock__lte=F('low_stock_threshold'),
        ).count()
        in_stock_products = qs.filter(
            available_stock__gt=F('low_stock_threshold'),
        ).count()
        total_available_units = qs.aggregate(total=Sum('available_stock'))['total'] or 0

        alert_qs = qs.filter(
            Q(available_stock=0) | Q(available_stock__lte=F('low_stock_threshold'))
        ).order_by('available_stock', 'name')[:20]

        alerts = [
            {
                'id': p.id,
                'name': p.name,
                'sku': p.sku,
                'available_stock': p.available_stock,
                'low_stock_threshold': p.low_stock_threshold,
                'inventory_status': p.inventory_status,
            }
            for p in alert_qs
        ]

        return Response(
            {
                'total_products': total_products,
                'in_stock_products': in_stock_products,
                'low_stock_products': low_stock_products,
                'out_of_stock_products': out_of_stock_products,
                'total_available_units': total_available_units,
                'alerts': alerts,
            },
            status=status.HTTP_200_OK,
        )


class SellerInventoryAdjustView(APIView):
    """
    PATCH /api/sellers/inventory/<product_id>/
    Atomically adjusts stock quantity or low_stock_threshold using row-level locking
    (select_for_update) and records an immutable InventoryHistory entry.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def patch(self, request, product_id):
        serializer = InventoryAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        seller = request.user.seller_profile
        data = serializer.validated_data
        action = data.get('action', 'set')
        quantity = data.get('quantity')
        new_threshold = data.get('low_stock_threshold')
        reason = data.get('reason', '').strip()

        with transaction.atomic():
            try:
                product = Product.objects.select_for_update().get(pk=product_id, seller=seller)
            except Product.DoesNotExist:
                return Response(
                    {'detail': 'Product not found in your storefront inventory.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            previous_stock = product.available_stock
            new_stock = previous_stock

            if quantity is not None:
                if action == 'increase':
                    new_stock = previous_stock + quantity
                elif action == 'decrease':
                    if previous_stock - quantity < 0:
                        return Response(
                            {
                                'detail': f'Cannot decrease stock by {quantity}. Only {previous_stock} units currently available.'
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    new_stock = previous_stock - quantity
                else:  # set
                    new_stock = quantity

                product.available_stock = new_stock

            update_fields = ['updated_at']
            if quantity is not None:
                update_fields.append('available_stock')
            if new_threshold is not None:
                product.low_stock_threshold = new_threshold
                update_fields.append('low_stock_threshold')

            product.save(update_fields=update_fields)

            history_entry = None
            if quantity is not None and new_stock != previous_stock:
                history_entry = InventoryHistory.objects.create(
                    product=product,
                    seller=seller,
                    adjusted_by=request.user,
                    previous_stock=previous_stock,
                    new_stock=new_stock,
                    adjustment_amount=new_stock - previous_stock,
                    reason=reason or f'Manual {action} adjustment',
                )

        return Response(
            {
                'message': 'Inventory updated successfully.',
                'product': SellerInventoryItemSerializer(product).data,
                'history_entry': InventoryHistorySerializer(history_entry).data if history_entry else None,
            },
            status=status.HTTP_200_OK,
        )


class SellerInventoryHistoryView(APIView):
    """
    GET /api/sellers/inventory/<product_id>/history/
    Returns immutable stock adjustment history for a product owned by the authenticated seller.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request, product_id):
        seller = request.user.seller_profile
        try:
            product = Product.objects.get(pk=product_id, seller=seller)
        except Product.DoesNotExist:
            return Response(
                {'detail': 'Product not found in your storefront inventory.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        history_qs = InventoryHistory.objects.filter(
            product=product,
            seller=seller,
        ).select_related('product', 'adjusted_by')[:50]

        serializer = InventoryHistorySerializer(history_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─── Seller Order & Consignment Management Views ──────────────────────────────

VALID_FULFILLMENT_TRANSITIONS = {
    OrderItem.FulfillmentStatus.NEW: {
        OrderItem.FulfillmentStatus.ACCEPTED,
        OrderItem.FulfillmentStatus.CANCELLED,
    },
    OrderItem.FulfillmentStatus.ACCEPTED: {
        OrderItem.FulfillmentStatus.PROCESSING,
        OrderItem.FulfillmentStatus.CANCELLED,
    },
    OrderItem.FulfillmentStatus.PROCESSING: {
        OrderItem.FulfillmentStatus.READY_TO_DISPATCH,
        OrderItem.FulfillmentStatus.CANCELLED,
    },
    OrderItem.FulfillmentStatus.READY_TO_DISPATCH: {
        OrderItem.FulfillmentStatus.SHIPPED,
    },
    OrderItem.FulfillmentStatus.SHIPPED: {
        OrderItem.FulfillmentStatus.DELIVERED,
    },
    OrderItem.FulfillmentStatus.DELIVERED: set(),
    OrderItem.FulfillmentStatus.CANCELLED: set(),
}


def sync_parent_order_status(order):
    """
    Safely updates parent Order.order_status from the aggregate fulfillment states
    of all its OrderItems without ever altering payment_status or other sellers' items.
    """
    if order.order_status == Order.OrderStatus.CANCELLED:
        return

    statuses = list(order.items.values_list('fulfillment_status', flat=True))
    if not statuses:
        return

    active_statuses = [s for s in statuses if s != OrderItem.FulfillmentStatus.CANCELLED]
    if not active_statuses:
        new_status = Order.OrderStatus.CANCELLED
    elif all(s == OrderItem.FulfillmentStatus.DELIVERED for s in active_statuses):
        new_status = Order.OrderStatus.DELIVERED
    elif all(
        s in (OrderItem.FulfillmentStatus.SHIPPED, OrderItem.FulfillmentStatus.DELIVERED)
        for s in active_statuses
    ):
        new_status = Order.OrderStatus.SHIPPED
    elif any(
        s in (
            OrderItem.FulfillmentStatus.ACCEPTED,
            OrderItem.FulfillmentStatus.PROCESSING,
            OrderItem.FulfillmentStatus.READY_TO_DISPATCH,
            OrderItem.FulfillmentStatus.SHIPPED,
            OrderItem.FulfillmentStatus.DELIVERED,
        )
        for s in active_statuses
    ):
        new_status = Order.OrderStatus.PROCESSING
    else:
        new_status = order.order_status

    if new_status != order.order_status:
        order.order_status = new_status
        order.save(update_fields=['order_status', 'updated_at'])


def _create_customer_order_notification(order, title, message, notification_type='DISPATCH'):
    """Creates an in-app Notification for the order's customer without duplicates."""
    if not order.customer:
        return
    if not Notification.objects.filter(
        customer=order.customer,
        title=title,
        message=message,
    ).exists():
        Notification.objects.create(
            customer=order.customer,
            title=title,
            message=message,
            notification_type=notification_type,
        )


def _derive_seller_order_status(seller_items):
    """Computes a representative status badge for a seller's subset of items in an order."""
    statuses = [itm.fulfillment_status for itm in seller_items]
    if not statuses:
        return 'NEW'
    priority = ['NEW', 'ACCEPTED', 'PROCESSING', 'READY_TO_DISPATCH', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    for st in priority:
        if st in statuses:
            return st
    return statuses[0]


class SellerOrderListView(APIView):
    """
    GET /api/sellers/orders/
    Lists distinct parent orders containing items belonging to the authenticated seller.
    Never exposes other sellers' items or totals.
    Supports ?search=, ?status=, ?payment_status=, ?date_from=, ?date_to=.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        qs = Order.objects.filter(items__seller=seller).distinct().select_related('customer').order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(order_number__icontains=search)

        fulfillment_status = request.query_params.get('status', '').strip().upper()
        if fulfillment_status and fulfillment_status != 'ALL':
            qs = qs.filter(items__seller=seller, items__fulfillment_status=fulfillment_status).distinct()

        payment_status = request.query_params.get('payment_status', '').strip().upper()
        if payment_status and payment_status != 'ALL':
            qs = qs.filter(payment_status=payment_status)

        date_from = request.query_params.get('date_from', '').strip()
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get('date_to', '').strip()
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        results = []
        for ord in qs:
            seller_items = list(ord.items.filter(seller=seller).order_by('id'))
            seller_subtotal = sum((itm.line_total for itm in seller_items), Decimal('0.00'))
            addr = ord.shipping_address_snapshot or {}
            customer_name = (
                ord.customer.get_full_name()
                if ord.customer and ord.customer.get_full_name().strip()
                else addr.get('full_name') or ord.customer_email.split('@')[0]
            )

            results.append({
                'order_number': ord.order_number,
                'created_at': ord.created_at,
                'payment_status': ord.payment_status,
                'order_status': ord.order_status,
                'seller_fulfillment_status': _derive_seller_order_status(seller_items),
                'customer_name': customer_name,
                'shipping_city': addr.get('city', ''),
                'shipping_state': addr.get('state', ''),
                'items_count': len(seller_items),
                'total_units': sum(itm.quantity for itm in seller_items),
                'seller_subtotal': str(seller_subtotal),
                'items': SellerOrderItemSerializer(seller_items, many=True).data,
            })

        return Response(results, status=status.HTTP_200_OK)


class SellerOrderSummaryView(APIView):
    """
    GET /api/sellers/orders/summary/
    Returns real MySQL-computed distinct parent order counts for this seller.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        base_qs = Order.objects.filter(items__seller=seller).distinct()

        return Response(
            {
                'total_orders': base_qs.count(),
                'new_orders': base_qs.filter(
                    items__seller=seller, items__fulfillment_status=OrderItem.FulfillmentStatus.NEW
                ).distinct().count(),
                'processing_orders': base_qs.filter(
                    items__seller=seller,
                    items__fulfillment_status__in=[
                        OrderItem.FulfillmentStatus.ACCEPTED,
                        OrderItem.FulfillmentStatus.PROCESSING,
                        OrderItem.FulfillmentStatus.READY_TO_DISPATCH,
                    ],
                ).distinct().count(),
                'dispatched_orders': base_qs.filter(
                    items__seller=seller, items__fulfillment_status=OrderItem.FulfillmentStatus.SHIPPED
                ).distinct().count(),
                'delivered_orders': base_qs.filter(
                    items__seller=seller, items__fulfillment_status=OrderItem.FulfillmentStatus.DELIVERED
                ).distinct().count(),
                'cancelled_orders': base_qs.filter(
                    items__seller=seller, items__fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED
                ).distinct().count(),
            },
            status=status.HTTP_200_OK,
        )


class SellerOrderDetailView(APIView):
    """
    GET /api/sellers/orders/<order_number>/
    Returns order detail scoped strictly to the authenticated seller's OrderItems.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request, order_number):
        seller = request.user.seller_profile
        try:
            order = Order.objects.select_related('customer').get(
                order_number=order_number,
                items__seller=seller,
            )
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Order not found in your storefront consignments.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        seller_items = list(order.items.filter(seller=seller).order_by('id'))
        seller_subtotal = sum((itm.line_total for itm in seller_items), Decimal('0.00'))
        addr = order.shipping_address_snapshot or {}
        customer_name = (
            order.customer.get_full_name()
            if order.customer and order.customer.get_full_name().strip()
            else addr.get('full_name') or order.customer_email.split('@')[0]
        )

        # Expose only fulfillment-essential address fields
        fulfillment_address = {
            'full_name': addr.get('full_name', customer_name),
            'phone_number': addr.get('phone_number', ''),
            'address_line_1': addr.get('address_line_1', ''),
            'address_line_2': addr.get('address_line_2', ''),
            'city': addr.get('city', ''),
            'state': addr.get('state', ''),
            'postal_code': addr.get('postal_code', ''),
            'country': addr.get('country', 'India'),
        }

        return Response(
            {
                'order_number': order.order_number,
                'created_at': order.created_at,
                'payment_status': order.payment_status,
                'order_status': order.order_status,
                'seller_fulfillment_status': _derive_seller_order_status(seller_items),
                'customer_name': customer_name,
                'shipping_address': fulfillment_address,
                'seller_subtotal': str(seller_subtotal),
                'items': SellerOrderItemSerializer(seller_items, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class SellerOrderItemStatusView(APIView):
    """
    PATCH /api/sellers/orders/<order_number>/items/<item_id>/status/
    Transitions seller-owned OrderItem.fulfillment_status according to state machine rules.
    Enforces paid order check, never alters payment_status or stock.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def patch(self, request, order_number, item_id):
        serializer = SellerOrderItemStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_status = serializer.validated_data['fulfillment_status']
        seller = request.user.seller_profile

        with transaction.atomic():
            try:
                item = (
                    OrderItem.objects.select_for_update()
                    .select_related('order', 'order__customer', 'seller')
                    .get(
                        pk=item_id,
                        order__order_number=order_number,
                        seller=seller,
                    )
                )
            except OrderItem.DoesNotExist:
                return Response(
                    {'detail': 'Order item not found or does not belong to your studio.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            order = item.order
            if order.payment_status != Order.PaymentStatus.PAID:
                return Response(
                    {'detail': f'Cannot update fulfillment for an order with payment status "{order.payment_status}".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            current_status = item.fulfillment_status
            if target_status == current_status:
                return Response(SellerOrderItemSerializer(item).data, status=status.HTTP_200_OK)

            allowed_next = VALID_FULFILLMENT_TRANSITIONS.get(current_status, set())
            if target_status not in allowed_next:
                return Response(
                    {
                        'detail': f'Invalid status transition from {current_status} to {target_status}.'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.fulfillment_status = target_status
            update_fields = ['fulfillment_status', 'status_updated_at']
            if target_status == OrderItem.FulfillmentStatus.SHIPPED and not item.dispatched_at:
                item.dispatched_at = timezone.now()
                update_fields.append('dispatched_at')
            item.save(update_fields=update_fields)

            sync_parent_order_status(order)

            # In-app customer notifications on key milestones
            store_name = seller.store_name
            if target_status == OrderItem.FulfillmentStatus.ACCEPTED:
                _create_customer_order_notification(
                    order,
                    f'Item Accepted in {order.order_number}',
                    f'{store_name} has accepted "{item.product_name}" and is preparing your craft.',
                    'ORDER',
                )
            elif target_status == OrderItem.FulfillmentStatus.SHIPPED:
                _create_customer_order_notification(
                    order,
                    f'Consignment Dispatched — {order.order_number}',
                    f'{store_name} has dispatched "{item.product_name}".'
                    + (f' Tracking: {item.tracking_number}' if item.tracking_number else ''),
                    'DISPATCH',
                )
            elif target_status == OrderItem.FulfillmentStatus.DELIVERED:
                _create_customer_order_notification(
                    order,
                    f'Item Delivered — {order.order_number}',
                    f'"{item.product_name}" from {store_name} has been marked as delivered.',
                    'ORDER',
                )

        return Response(SellerOrderItemSerializer(item).data, status=status.HTTP_200_OK)


class SellerOrderItemShipmentView(APIView):
    """
    PATCH /api/sellers/orders/<order_number>/items/<item_id>/shipment/
    Updates courier, tracking number, tracking URL, and dates for a seller-owned OrderItem.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def patch(self, request, order_number, item_id):
        serializer = SellerOrderItemShipmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        seller = request.user.seller_profile

        with transaction.atomic():
            try:
                item = (
                    OrderItem.objects.select_for_update()
                    .select_related('order', 'order__customer', 'seller')
                    .get(
                        pk=item_id,
                        order__order_number=order_number,
                        seller=seller,
                    )
                )
            except OrderItem.DoesNotExist:
                return Response(
                    {'detail': 'Order item not found or does not belong to your studio.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            order = item.order
            if order.payment_status != Order.PaymentStatus.PAID:
                return Response(
                    {'detail': 'Shipment details can only be updated for paid orders.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if item.fulfillment_status == OrderItem.FulfillmentStatus.CANCELLED:
                return Response(
                    {'detail': 'Cannot update shipment details for a cancelled item.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.courier_name = data['courier_name']
            item.tracking_number = data['tracking_number']
            item.tracking_url = data.get('tracking_url', '')
            item.dispatched_at = data.get('dispatched_at') or item.dispatched_at or timezone.now()
            item.estimated_delivery_date = data.get('estimated_delivery_date')
            item.shipment_notes = data.get('shipment_notes', '')
            item.save(update_fields=[
                'courier_name',
                'tracking_number',
                'tracking_url',
                'dispatched_at',
                'estimated_delivery_date',
                'shipment_notes',
                'status_updated_at',
            ])

            _create_customer_order_notification(
                order,
                f'Tracking Updated — {order.order_number}',
                f'Tracking for "{item.product_name}" ({seller.store_name}): {item.courier_name} — {item.tracking_number}.',
                'DISPATCH',
            )

        return Response(SellerOrderItemSerializer(item).data, status=status.HTTP_200_OK)
