from datetime import date
from decimal import Decimal
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from .serializers import AdminOrderListSerializer, AdminOrderDetailSerializer
from orders.models import Order


class AdminOrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


def _parse_iso_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return False


class AdminOrderSummaryView(APIView):
    """
    GET /api/admin/orders/summary/
    Platform-wide order & payment statistics for admin oversight (read-only).
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        agg = Order.objects.aggregate(
            total_orders=Count('id'),
            paid_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            pending_payment_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.PENDING)),
            failed_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.FAILED)),
            refunded_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.REFUNDED)),
            pending_orders=Count('id', filter=Q(order_status=Order.OrderStatus.PENDING)),
            confirmed_orders=Count('id', filter=Q(order_status=Order.OrderStatus.CONFIRMED)),
            processing_orders=Count('id', filter=Q(order_status=Order.OrderStatus.PROCESSING)),
            shipped_orders=Count('id', filter=Q(order_status=Order.OrderStatus.SHIPPED)),
            delivered_orders=Count('id', filter=Q(order_status=Order.OrderStatus.DELIVERED)),
            cancelled_orders=Count('id', filter=Q(order_status=Order.OrderStatus.CANCELLED)),
            total_paid_gmv=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.PAID)),
        )

        return Response(
            {
                'total_orders': agg['total_orders'] or 0,
                'paid_orders': agg['paid_orders'] or 0,
                'pending_payment_orders': agg['pending_payment_orders'] or 0,
                'failed_orders': agg['failed_orders'] or 0,
                'refunded_orders': agg['refunded_orders'] or 0,
                'pending_orders': agg['pending_orders'] or 0,
                'confirmed_orders': agg['confirmed_orders'] or 0,
                'processing_orders': agg['processing_orders'] or 0,
                'shipped_orders': agg['shipped_orders'] or 0,
                'delivered_orders': agg['delivered_orders'] or 0,
                'cancelled_orders': agg['cancelled_orders'] or 0,
                'total_paid_gmv': str(agg['total_paid_gmv'] or Decimal('0.00')),
            },
            status=status.HTTP_200_OK,
        )


class AdminOrderListView(APIView):
    """
    GET /api/admin/orders/
    Paginated platform-wide order directory across all sellers (read-only).
    Supports filtering by order_status, payment_status, date_from, date_to,
    search, customer, order_number, and seller.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        qs = (
            Order.objects.select_related('customer')
            .annotate(
                item_count=Count('items', distinct=True),
                seller_count=Count('items__seller', distinct=True),
            )
            .order_by('-created_at')
        )

        order_status = (request.query_params.get('order_status') or '').strip().upper()
        if order_status and order_status != 'ALL':
            qs = qs.filter(order_status=order_status)

        payment_status = (request.query_params.get('payment_status') or '').strip().upper()
        if payment_status and payment_status != 'ALL':
            qs = qs.filter(payment_status=payment_status)

        date_from_raw = request.query_params.get('date_from')
        date_from = _parse_iso_date(date_from_raw)
        if date_from is False:
            return Response(
                {'detail': 'Invalid date_from format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from is not None:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to_raw = request.query_params.get('date_to')
        date_to = _parse_iso_date(date_to_raw)
        if date_to is False:
            return Response(
                {'detail': 'Invalid date_to format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_to is not None:
            qs = qs.filter(created_at__date__lte=date_to)

        order_number = (request.query_params.get('order_number') or '').strip()
        if order_number:
            qs = qs.filter(order_number__icontains=order_number)

        customer_q = (request.query_params.get('customer') or '').strip()
        if customer_q:
            qs = qs.filter(
                Q(customer__email__icontains=customer_q)
                | Q(customer__first_name__icontains=customer_q)
                | Q(customer__last_name__icontains=customer_q)
            )

        seller_q = (request.query_params.get('seller') or '').strip()
        if seller_q:
            if seller_q.isdigit():
                qs = qs.filter(Q(items__seller_id=int(seller_q)) | Q(items__seller__store_name__icontains=seller_q)).distinct()
            else:
                qs = qs.filter(items__seller__store_name__icontains=seller_q).distinct()

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search)
                | Q(customer__email__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(items__seller__store_name__icontains=search)
            ).distinct()

        paginator = AdminOrderPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminOrderListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminOrderDetailView(APIView):
    """
    GET /api/admin/orders/<str:order_number>/
    Complete read-only order details including customer, shipping address,
    safe payment reference, multi-vendor OrderItems, and seller groupings.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request, order_number):
        order = get_object_or_404(
            Order.objects.select_related('customer').prefetch_related('items__seller', 'items__product'),
            order_number=order_number,
        )
        serializer = AdminOrderDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
