from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from accounts.models import User
from sellers.models import SellerProfile
from products.models import Product
from orders.models import Order, OrderItem


def _parse_admin_date_range(request):
    """
    Parses ?range=7d|30d|90d|year|all|custom and optional ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD.
    Returns (range_key, start_date, end_date). For 'all', start_date and end_date are None.
    """
    today = timezone.localdate()
    range_key = (request.query_params.get('range') or '30d').strip().lower()

    if range_key == '7d':
        return '7d', today - timedelta(days=6), today
    if range_key == '90d':
        return '90d', today - timedelta(days=89), today
    if range_key == 'year':
        return 'year', date(today.year, 1, 1), today
    if range_key == 'all':
        return 'all', None, None
    if range_key == 'custom':
        raw_start = (request.query_params.get('start_date') or '').strip()
        raw_end = (request.query_params.get('end_date') or '').strip()
        if not raw_start or not raw_end:
            raise ValidationError({'detail': 'Both start_date and end_date are required for custom range.'})
        try:
            start_date = datetime.strptime(raw_start, '%Y-%m-%d').date()
            end_date = datetime.strptime(raw_end, '%Y-%m-%d').date()
        except ValueError:
            raise ValidationError({'detail': 'Dates must be in YYYY-MM-DD format.'})
        if start_date > end_date:
            raise ValidationError({'detail': 'start_date cannot be later than end_date.'})
        return 'custom', start_date, end_date

    # Default to 30d
    return '30d', today - timedelta(days=29), today


class AdminPlatformAnalyticsView(APIView):
    """
    GET /api/admin/analytics/
    Read-only platform-wide analytics for ADMIN users.
    Strictly distinguishes paid GMV (captured order value) from platform profit,
    excludes unpaid cancelled orders from paid GMV, and never counts cancelled
    orders as refunded unless payment_status == REFUNDED.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        range_key, start_date, end_date = _parse_admin_date_range(request)

        # Base querysets
        orders_qs = Order.objects.all()
        paid_items_qs = OrderItem.objects.filter(
            order__payment_status=Order.PaymentStatus.PAID,
        ).exclude(fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED)
        customers_qs = User.objects.filter(role=User.Role.CUSTOMER)
        sellers_qs = SellerProfile.objects.all()

        if start_date is not None and end_date is not None:
            orders_period_qs = orders_qs.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            )
            paid_items_period_qs = paid_items_qs.filter(
                order__created_at__date__gte=start_date,
                order__created_at__date__lte=end_date,
            )
            customers_period_qs = customers_qs.filter(
                date_joined__date__gte=start_date,
                date_joined__date__lte=end_date,
            )
            sellers_period_qs = sellers_qs.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            )
            sellers_approved_period_qs = sellers_qs.filter(
                application_status=SellerProfile.ApplicationStatus.APPROVED,
                reviewed_at__date__gte=start_date,
                reviewed_at__date__lte=end_date,
            )
        else:
            orders_period_qs = orders_qs
            paid_items_period_qs = paid_items_qs
            customers_period_qs = customers_qs
            sellers_period_qs = sellers_qs
            sellers_approved_period_qs = sellers_qs.filter(
                application_status=SellerProfile.ApplicationStatus.APPROVED,
            )

        # 1. Platform Snapshot Counts (current state)
        total_customers = customers_qs.count()
        new_customers_in_period = customers_period_qs.count()

        seller_agg = sellers_qs.aggregate(
            total_sellers=Count('id'),
            pending_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.PENDING)),
            approved_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.APPROVED)),
            rejected_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.REJECTED)),
            suspended_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.SUSPENDED)),
        )
        new_sellers_in_period = sellers_period_qs.count()
        approved_sellers_in_period = sellers_approved_period_qs.count()

        product_agg = Product.objects.aggregate(
            total_products=Count('id'),
            pending_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.PENDING)),
            approved_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.APPROVED)),
            inactive_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.INACTIVE)),
            rejected_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.REJECTED)),
        )

        # 2. Order & Financial Aggregations (in selected date range)
        order_agg = orders_period_qs.aggregate(
            total_orders=Count('id'),
            paid_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            pending_payments=Count('id', filter=Q(payment_status=Order.PaymentStatus.PENDING)),
            failed_payments=Count('id', filter=Q(payment_status=Order.PaymentStatus.FAILED)),
            cancelled_orders=Count('id', filter=Q(order_status=Order.OrderStatus.CANCELLED)),
            cancelled_paid_orders=Count(
                'id',
                filter=Q(order_status=Order.OrderStatus.CANCELLED, payment_status=Order.PaymentStatus.PAID),
            ),
            confirmed_refunds_count=Count('id', filter=Q(payment_status=Order.PaymentStatus.REFUNDED)),
            confirmed_refunds_amount=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.REFUNDED)),
            paid_gmv=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            # Status breakdown
            status_pending=Count('id', filter=Q(order_status=Order.OrderStatus.PENDING)),
            status_confirmed=Count('id', filter=Q(order_status=Order.OrderStatus.CONFIRMED)),
            status_processing=Count('id', filter=Q(order_status=Order.OrderStatus.PROCESSING)),
            status_shipped=Count('id', filter=Q(order_status=Order.OrderStatus.SHIPPED)),
            status_delivered=Count('id', filter=Q(order_status=Order.OrderStatus.DELIVERED)),
            status_cancelled=Count('id', filter=Q(order_status=Order.OrderStatus.CANCELLED)),
        )

        paid_orders_count = order_agg['paid_orders'] or 0
        paid_gmv = order_agg['paid_gmv'] or Decimal('0.00')
        avg_paid_order_value = (
            (paid_gmv / paid_orders_count).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if paid_orders_count > 0
            else Decimal('0.00')
        )
        confirmed_refunds_amount = order_agg['confirmed_refunds_amount'] or Decimal('0.00')

        # 3. Order & Paid GMV Trends
        daily_rows = (
            orders_period_qs.annotate(bucket=TruncDate('created_at'))
            .values('bucket')
            .annotate(
                total_orders=Count('id'),
                paid_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.PAID)),
                cancelled_orders=Count('id', filter=Q(order_status=Order.OrderStatus.CANCELLED)),
                paid_gmv=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            )
            .order_by('bucket')
        )
        daily_trend = [
            {
                'date': r['bucket'].isoformat() if r['bucket'] else '',
                'total_orders': r['total_orders'] or 0,
                'paid_orders': r['paid_orders'] or 0,
                'cancelled_orders': r['cancelled_orders'] or 0,
                'paid_gmv': float(r['paid_gmv'] or Decimal('0.00')),
            }
            for r in daily_rows
        ]

        monthly_rows = (
            orders_period_qs.annotate(bucket=TruncMonth('created_at'))
            .values('bucket')
            .annotate(
                total_orders=Count('id'),
                paid_orders=Count('id', filter=Q(payment_status=Order.PaymentStatus.PAID)),
                cancelled_orders=Count('id', filter=Q(order_status=Order.OrderStatus.CANCELLED)),
                paid_gmv=Sum('total_amount', filter=Q(payment_status=Order.PaymentStatus.PAID)),
            )
            .order_by('bucket')
        )
        monthly_trend = [
            {
                'month': r['bucket'].strftime('%Y-%m') if r['bucket'] else '',
                'total_orders': r['total_orders'] or 0,
                'paid_orders': r['paid_orders'] or 0,
                'cancelled_orders': r['cancelled_orders'] or 0,
                'paid_gmv': float(r['paid_gmv'] or Decimal('0.00')),
            }
            for r in monthly_rows
        ]

        # 4. Top-Selling Products (by actual paid non-cancelled quantities)
        top_products_rows = (
            paid_items_period_qs.values('product_id', 'product_name', 'seller__store_name')
            .annotate(
                units_sold=Sum('quantity'),
                paid_sales=Sum('line_total'),
                order_count=Count('order_id', distinct=True),
            )
            .order_by('-units_sold', '-paid_sales')[:5]
        )
        top_products = [
            {
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'store_name': row['seller__store_name'] or 'Artisan Store',
                'units_sold': row['units_sold'] or 0,
                'paid_sales': str(row['paid_sales'] or Decimal('0.00')),
                'order_count': row['order_count'] or 0,
            }
            for row in top_products_rows
        ]

        # 5. Top-Performing Sellers (by actual paid non-cancelled sales)
        top_sellers_rows = (
            paid_items_period_qs.values('seller_id', 'seller__store_name', 'seller__city', 'seller__state')
            .annotate(
                paid_sales=Sum('line_total'),
                units_sold=Sum('quantity'),
                order_count=Count('order_id', distinct=True),
            )
            .order_by('-paid_sales', '-units_sold')[:5]
        )
        top_sellers = [
            {
                'seller_id': row['seller_id'],
                'store_name': row['seller__store_name'] or 'Artisan Store',
                'city': row['seller__city'] or '',
                'state': row['seller__state'] or '',
                'paid_sales': str(row['paid_sales'] or Decimal('0.00')),
                'units_sold': row['units_sold'] or 0,
                'order_count': row['order_count'] or 0,
            }
            for row in top_sellers_rows
        ]

        # 6. Marketplace Insights: Categories & Regions
        popular_categories_rows = (
            paid_items_period_qs.filter(product__category__isnull=False)
            .values('product__category__id', 'product__category__name')
            .annotate(
                units_sold=Sum('quantity'),
                paid_sales=Sum('line_total'),
            )
            .order_by('-units_sold', '-paid_sales')[:6]
        )
        popular_categories = [
            {
                'category_id': row['product__category__id'],
                'category_name': row['product__category__name'],
                'units_sold': row['units_sold'] or 0,
                'paid_sales': str(row['paid_sales'] or Decimal('0.00')),
            }
            for row in popular_categories_rows
        ]

        regional_products_rows = (
            Product.objects.filter(approval_status=Product.ApprovalStatus.APPROVED)
            .exclude(origin_state='')
            .values('origin_state')
            .annotate(product_count=Count('id'))
            .order_by('-product_count')[:8]
        )
        regional_distribution = [
            {
                'state': row['origin_state'],
                'product_count': row['product_count'] or 0,
            }
            for row in regional_products_rows
        ]

        # 7. Registration Trends (Monthly)
        cust_reg_rows = (
            customers_period_qs.annotate(bucket=TruncMonth('date_joined'))
            .values('bucket')
            .annotate(count=Count('id'))
            .order_by('bucket')
        )
        seller_reg_rows = (
            sellers_period_qs.annotate(bucket=TruncMonth('created_at'))
            .values('bucket')
            .annotate(count=Count('id'))
            .order_by('bucket')
        )

        return Response(
            {
                'period': {
                    'range': range_key,
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None,
                    'date_basis': (
                        'Order and GMV metrics are grouped by Order.created_at. '
                        'Customer registrations use User.date_joined; seller registrations use SellerProfile.created_at.'
                    ),
                },
                'overview': {
                    'total_customers': total_customers,
                    'new_customers_in_period': new_customers_in_period,
                    'total_sellers': seller_agg['total_sellers'] or 0,
                    'pending_sellers': seller_agg['pending_sellers'] or 0,
                    'approved_sellers': seller_agg['approved_sellers'] or 0,
                    'rejected_sellers': seller_agg['rejected_sellers'] or 0,
                    'suspended_sellers': seller_agg['suspended_sellers'] or 0,
                    'new_sellers_in_period': new_sellers_in_period,
                    'approved_sellers_in_period': approved_sellers_in_period,
                    'total_products': product_agg['total_products'] or 0,
                    'pending_products': product_agg['pending_products'] or 0,
                    'approved_products': product_agg['approved_products'] or 0,
                    'inactive_products': product_agg['inactive_products'] or 0,
                    'rejected_products': product_agg['rejected_products'] or 0,
                    'total_orders': order_agg['total_orders'] or 0,
                    'paid_orders': paid_orders_count,
                    'pending_payments': order_agg['pending_payments'] or 0,
                    'failed_payments': order_agg['failed_payments'] or 0,
                    'cancelled_orders': order_agg['cancelled_orders'] or 0,
                    'cancelled_paid_orders': order_agg['cancelled_paid_orders'] or 0,
                    'confirmed_refunds_count': order_agg['confirmed_refunds_count'] or 0,
                    'confirmed_refunds_amount': str(confirmed_refunds_amount),
                    'paid_gmv': str(paid_gmv),
                    'average_paid_order_value': str(avg_paid_order_value),
                },
                'distributions': {
                    'order_status': {
                        'PENDING': order_agg['status_pending'] or 0,
                        'CONFIRMED': order_agg['status_confirmed'] or 0,
                        'PROCESSING': order_agg['status_processing'] or 0,
                        'SHIPPED': order_agg['status_shipped'] or 0,
                        'DELIVERED': order_agg['status_delivered'] or 0,
                        'CANCELLED': order_agg['status_cancelled'] or 0,
                    },
                    'payment_status': {
                        'PENDING': order_agg['pending_payments'] or 0,
                        'PAID': paid_orders_count,
                        'FAILED': order_agg['failed_payments'] or 0,
                        'REFUNDED': order_agg['confirmed_refunds_count'] or 0,
                    },
                },
                'trends': {
                    'daily': daily_trend,
                    'monthly': monthly_trend,
                    'customer_registrations': [
                        {
                            'month': r['bucket'].strftime('%Y-%m') if r['bucket'] else '',
                            'count': r['count'] or 0,
                        }
                        for r in cust_reg_rows
                    ],
                    'seller_registrations': [
                        {
                            'month': r['bucket'].strftime('%Y-%m') if r['bucket'] else '',
                            'count': r['count'] or 0,
                        }
                        for r in seller_reg_rows
                    ],
                },
                'top_products': top_products,
                'top_sellers': top_sellers,
                'insights': {
                    'popular_categories': popular_categories,
                    'regional_distribution': regional_distribution,
                },
                'unavailable_metrics': {
                    'platform_profit_and_net_revenue': (
                        'Omitted: database does not store platform commission rates, '
                        'payment gateway fees, or separate gateway refund transaction records.'
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )
