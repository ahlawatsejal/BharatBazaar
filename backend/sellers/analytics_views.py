from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum, Count, Q, F, Value, DecimalField, IntegerField
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .permissions import IsApprovedSeller
from products.models import Product
from orders.models import Order, OrderItem


def _parse_date_range(request):
    """
    Parses ?range=7d|30d|90d|year|custom and optional ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD.
    Returns (range_key, start_date, end_date, prev_start_date, prev_end_date).
    """
    today = timezone.localdate()
    range_key = request.query_params.get('range', '30d').strip().lower()

    if range_key == '7d':
        start_date = today - timedelta(days=6)
        end_date = today
    elif range_key == '90d':
        start_date = today - timedelta(days=89)
        end_date = today
    elif range_key == 'year':
        start_date = date(today.year, 1, 1)
        end_date = today
    elif range_key == 'custom':
        raw_start = request.query_params.get('start_date', '').strip()
        raw_end = request.query_params.get('end_date', '').strip()
        if not raw_start or not raw_end:
            raise ValidationError({'detail': 'Both start_date and end_date are required for custom range.'})
        try:
            start_date = datetime.strptime(raw_start, '%Y-%m-%d').date()
            end_date = datetime.strptime(raw_end, '%Y-%m-%d').date()
        except ValueError:
            raise ValidationError({'detail': 'Dates must be in YYYY-MM-DD format.'})
        if start_date > end_date:
            raise ValidationError({'detail': 'start_date cannot be later than end_date.'})
    else:
        range_key = '30d'
        start_date = today - timedelta(days=29)
        end_date = today

    period_days = (end_date - start_date).days + 1
    prev_end_date = start_date - timedelta(days=1)
    prev_start_date = prev_end_date - timedelta(days=period_days - 1)

    return range_key, start_date, end_date, prev_start_date, prev_end_date


def _paid_active_items_qs(seller, start_date, end_date):
    """
    Returns OrderItems strictly belonging to `seller`, from PAID orders,
    excluding CANCELLED items, within the inclusive date range.
    """
    return OrderItem.objects.filter(
        seller=seller,
        order__payment_status=Order.PaymentStatus.PAID,
        order__created_at__date__gte=start_date,
        order__created_at__date__lte=end_date,
    ).exclude(fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED)


def _calc_growth_percent(current_val, previous_val):
    if not previous_val or previous_val == 0:
        return None
    diff = ((current_val - previous_val) / previous_val) * Decimal('100')
    return float(diff.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))


class SellerAnalyticsOverviewView(APIView):
    """
    GET /api/sellers/analytics/overview/
    Returns summary KPI metrics for the authenticated approved seller within the selected date range.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        range_key, start_date, end_date, prev_start, prev_end = _parse_date_range(request)

        current_items = _paid_active_items_qs(seller, start_date, end_date)
        prev_items = _paid_active_items_qs(seller, prev_start, prev_end)

        total_sales = current_items.aggregate(total=Sum('line_total'))['total'] or Decimal('0.00')
        prev_sales = prev_items.aggregate(total=Sum('line_total'))['total'] or Decimal('0.00')

        total_orders = current_items.values('order_id').distinct().count()
        avg_order_value = (
            (total_sales / total_orders).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if total_orders > 0
            else Decimal('0.00')
        )

        # Product inventory snapshot
        prod_qs = Product.objects.filter(seller=seller)
        total_products = prod_qs.count()
        active_products = prod_qs.filter(approval_status=Product.ApprovalStatus.APPROVED).count()
        low_stock_products = prod_qs.filter(
            available_stock__gt=0,
            available_stock__lte=F('low_stock_threshold'),
        ).count()
        out_of_stock_products = prod_qs.filter(available_stock=0).count()

        # Best-selling product in period
        top_prod_row = (
            current_items.values('product_id', 'product_name')
            .annotate(units_sold=Sum('quantity'), revenue=Sum('line_total'))
            .order_by('-units_sold', '-revenue')
            .first()
        )
        best_selling_product = (
            {
                'product_id': top_prod_row['product_id'],
                'product_name': top_prod_row['product_name'],
                'units_sold': top_prod_row['units_sold'],
                'revenue': str(top_prod_row['revenue'] or Decimal('0.00')),
            }
            if top_prod_row
            else None
        )

        return Response(
            {
                'period': {
                    'range': range_key,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
                'total_sales': str(total_sales),
                'previous_period_sales': str(prev_sales),
                'sales_growth_percent': _calc_growth_percent(total_sales, prev_sales),
                'total_orders': total_orders,
                'average_order_value': str(avg_order_value),
                'total_products': total_products,
                'active_products': active_products,
                'low_stock_products': low_stock_products,
                'out_of_stock_products': out_of_stock_products,
                'best_selling_product': best_selling_product,
            },
            status=status.HTTP_200_OK,
        )


class SellerAnalyticsSalesView(APIView):
    """
    GET /api/sellers/analytics/sales/
    Returns daily sales trend, monthly sales trend, order volume over time, and period comparison.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        range_key, start_date, end_date, prev_start, prev_end = _parse_date_range(request)

        current_items = _paid_active_items_qs(seller, start_date, end_date)
        prev_items = _paid_active_items_qs(seller, prev_start, prev_end)

        daily_rows = (
            current_items.annotate(day=TruncDate('order__created_at'))
            .values('day')
            .annotate(
                sales=Coalesce(Sum('line_total'), Value(Decimal('0.00'), output_field=DecimalField())),
                orders=Count('order_id', distinct=True),
                units=Coalesce(Sum('quantity'), Value(0, output_field=IntegerField())),
            )
            .order_by('day')
        )

        daily_trend = [
            {
                'date': row['day'].isoformat() if hasattr(row['day'], 'isoformat') else str(row['day']),
                'sales': float(row['sales'] or 0),
                'orders': row['orders'],
                'units': row['units'],
            }
            for row in daily_rows
        ]

        # Monthly trend for current year (or selected range if wider)
        year_start = min(start_date, date(timezone.localdate().year, 1, 1))
        monthly_items = _paid_active_items_qs(seller, year_start, end_date)
        monthly_rows = (
            monthly_items.annotate(month=TruncMonth('order__created_at'))
            .values('month')
            .annotate(
                sales=Coalesce(Sum('line_total'), Value(Decimal('0.00'), output_field=DecimalField())),
                orders=Count('order_id', distinct=True),
            )
            .order_by('month')
        )

        monthly_trend = [
            {
                'month': row['month'].strftime('%b %Y') if hasattr(row['month'], 'strftime') else str(row['month']),
                'sales': float(row['sales'] or 0),
                'orders': row['orders'],
            }
            for row in monthly_rows
        ]

        current_sales = current_items.aggregate(total=Sum('line_total'))['total'] or Decimal('0.00')
        previous_sales = prev_items.aggregate(total=Sum('line_total'))['total'] or Decimal('0.00')
        current_orders = current_items.values('order_id').distinct().count()
        previous_orders = prev_items.values('order_id').distinct().count()

        return Response(
            {
                'period': {
                    'range': range_key,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
                'daily_trend': daily_trend,
                'monthly_trend': monthly_trend,
                'comparison': {
                    'current_sales': str(current_sales),
                    'previous_sales': str(previous_sales),
                    'current_orders': current_orders,
                    'previous_orders': previous_orders,
                    'sales_growth_percent': _calc_growth_percent(current_sales, previous_sales),
                },
            },
            status=status.HTTP_200_OK,
        )


class SellerAnalyticsProductsView(APIView):
    """
    GET /api/sellers/analytics/products/
    Returns product-wise units sold & revenue, best-selling, highest-revenue, low-sales, and no-sales lists.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        range_key, start_date, end_date, _, _ = _parse_date_range(request)

        paid_filter = Q(
            order_items__seller=seller,
            order_items__order__payment_status=Order.PaymentStatus.PAID,
            order_items__order__created_at__date__gte=start_date,
            order_items__order__created_at__date__lte=end_date,
        ) & ~Q(order_items__fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED)

        annotated_products = (
            Product.objects.filter(seller=seller)
            .select_related('category')
            .annotate(
                units_sold=Coalesce(
                    Sum('order_items__quantity', filter=paid_filter),
                    Value(0, output_field=IntegerField()),
                ),
                revenue=Coalesce(
                    Sum('order_items__line_total', filter=paid_filter),
                    Value(Decimal('0.00'), output_field=DecimalField(max_digits=12, decimal_places=2)),
                ),
            )
            .order_by('-units_sold', '-revenue', 'name')
        )

        product_rows = [
            {
                'id': p.id,
                'name': p.name,
                'sku': p.sku,
                'category_name': p.category.name if p.category else '—',
                'price': str(p.discount_price or p.price),
                'available_stock': p.available_stock,
                'approval_status': p.approval_status,
                'units_sold': p.units_sold,
                'revenue': str(p.revenue),
            }
            for p in annotated_products
        ]

        best_selling = [r for r in product_rows if r['units_sold'] > 0][:5]
        highest_revenue = sorted(
            [r for r in product_rows if Decimal(r['revenue']) > 0],
            key=lambda x: Decimal(x['revenue']),
            reverse=True,
        )[:5]
        low_sales = [r for r in product_rows if 0 < r['units_sold'] <= 2]
        no_sales = [r for r in product_rows if r['units_sold'] == 0]

        return Response(
            {
                'period': {
                    'range': range_key,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
                'products': product_rows,
                'best_selling': best_selling,
                'highest_revenue': highest_revenue,
                'low_sales': low_sales,
                'no_sales': no_sales,
            },
            status=status.HTTP_200_OK,
        )


class SellerAnalyticsOrdersView(APIView):
    """
    GET /api/sellers/analytics/orders/
    Returns fulfillment status breakdown across distinct parent orders for the authenticated seller.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        range_key, start_date, end_date, _, _ = _parse_date_range(request)

        base_qs = Order.objects.filter(
            items__seller=seller,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).distinct()

        def count_status(statuses):
            return base_qs.filter(
                items__seller=seller,
                items__fulfillment_status__in=statuses,
            ).distinct().count()

        return Response(
            {
                'period': {
                    'range': range_key,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
                'total_orders': base_qs.count(),
                'new_orders': count_status([OrderItem.FulfillmentStatus.NEW]),
                'processing_orders': count_status([
                    OrderItem.FulfillmentStatus.ACCEPTED,
                    OrderItem.FulfillmentStatus.PROCESSING,
                ]),
                'ready_to_dispatch_orders': count_status([OrderItem.FulfillmentStatus.READY_TO_DISPATCH]),
                'shipped_orders': count_status([OrderItem.FulfillmentStatus.SHIPPED]),
                'delivered_orders': count_status([OrderItem.FulfillmentStatus.DELIVERED]),
                'cancelled_orders': count_status([OrderItem.FulfillmentStatus.CANCELLED]),
            },
            status=status.HTTP_200_OK,
        )
