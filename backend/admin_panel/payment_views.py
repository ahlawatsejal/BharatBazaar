from datetime import date
from decimal import Decimal
from django.db.models import Count, Q, Sum
from django.http import Http404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from .serializers import AdminPaymentListSerializer, AdminPaymentDetailSerializer
from orders.models import Order


class AdminPaymentPagination(PageNumberPagination):
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


class AdminPaymentSummaryView(APIView):
    """
    GET /api/admin/payments/summary/
    Platform-wide read-only payment & refund summary statistics.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        agg = Order.objects.aggregate(
            total_transactions=Count('id'),
            total_paid_amount=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            paid_count=Count('id', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            pending_count=Count('id', filter=Q(payment_status=Order.PaymentStatus.PENDING)),
            failed_count=Count('id', filter=Q(payment_status=Order.PaymentStatus.FAILED)),
            refunded_count=Count('id', filter=Q(payment_status=Order.PaymentStatus.REFUNDED)),
            refunded_amount=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.REFUNDED)),
            cancelled_not_refunded_count=Count(
                'id',
                filter=Q(order_status=Order.OrderStatus.CANCELLED) & ~Q(payment_status=Order.PaymentStatus.REFUNDED),
            ),
        )

        return Response(
            {
                'total_transactions': agg['total_transactions'] or 0,
                'total_paid_amount': str(agg['total_paid_amount'] or Decimal('0.00')),
                'paid_count': agg['paid_count'] or 0,
                'pending_count': agg['pending_count'] or 0,
                'failed_count': agg['failed_count'] or 0,
                'refunded_count': agg['refunded_count'] or 0,
                'refunded_amount': str(agg['refunded_amount'] or Decimal('0.00')),
                'cancelled_not_refunded_count': agg['cancelled_not_refunded_count'] or 0,
                'has_gateway_refund_records': False,
                'refund_data_note': (
                    'Refund counts and totals reflect orders with payment_status=REFUNDED. '
                    'Separate gateway refund transaction records are not stored.'
                ),
            },
            status=status.HTTP_200_OK,
        )


class AdminPaymentListView(APIView):
    """
    GET /api/admin/payments/
    Paginated platform-wide payment list across all orders/sellers (read-only).
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        qs = Order.objects.select_related('customer').order_by('-created_at')

        payment_status = (request.query_params.get('payment_status') or '').strip().upper()
        if payment_status and payment_status != 'ALL':
            qs = qs.filter(payment_status=payment_status)

        date_from = _parse_iso_date(request.query_params.get('date_from'))
        if date_from is False:
            return Response(
                {'detail': 'Invalid date_from format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if date_from is not None:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = _parse_iso_date(request.query_params.get('date_to'))
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

        rzp_payment_id = (request.query_params.get('razorpay_payment_id') or '').strip()
        if rzp_payment_id:
            qs = qs.filter(razorpay_payment_id__icontains=rzp_payment_id)

        rzp_order_id = (request.query_params.get('razorpay_order_id') or '').strip()
        if rzp_order_id:
            qs = qs.filter(razorpay_order_id__icontains=rzp_order_id)

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search)
                | Q(customer__email__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(razorpay_payment_id__icontains=search)
                | Q(razorpay_order_id__icontains=search)
            )

        paginator = AdminPaymentPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminPaymentListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminPaymentDetailView(APIView):
    """
    GET /api/admin/payments/<str:identifier>/
    Read-only payment & related order details by order_number, razorpay_payment_id,
    razorpay_order_id, or numeric order ID.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request, identifier):
        base_qs = Order.objects.select_related('customer').prefetch_related(
            'items__seller', 'items__product'
        )
        lookup_q = (
            Q(order_number=identifier)
            | Q(razorpay_payment_id=identifier)
            | Q(razorpay_order_id=identifier)
        )
        if identifier.isdigit():
            lookup_q |= Q(pk=int(identifier))

        order = base_qs.filter(lookup_q).first()
        if not order:
            raise Http404('Payment record not found.')

        serializer = AdminPaymentDetailSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
