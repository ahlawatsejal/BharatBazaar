from decimal import Decimal
from django.db.models import Count, Q, Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from accounts.models import User
from sellers.models import SellerProfile
from products.models import Product
from orders.models import Order


class AdminDashboardSummaryView(APIView):
    """
    GET /api/admin/dashboard/summary/
    Read-only aggregated platform statistics for ADMIN users.
    Counts distinct parent orders and excludes unpaid/failed orders from paid sales.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        # 1. Customer count
        total_customers = User.objects.filter(role=User.Role.CUSTOMER).count()

        # 2. Seller counts (single aggregated query)
        seller_agg = SellerProfile.objects.aggregate(
            total_sellers=Count('id'),
            pending_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.PENDING)),
            approved_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.APPROVED)),
            rejected_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.REJECTED)),
            suspended_sellers=Count('id', filter=Q(application_status=SellerProfile.ApplicationStatus.SUSPENDED)),
        )

        # 3. Product counts (single aggregated query)
        product_agg = Product.objects.aggregate(
            total_products=Count('id'),
            pending_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.PENDING)),
            approved_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.APPROVED)),
            rejected_products=Count('id', filter=Q(approval_status=Product.ApprovalStatus.REJECTED)),
        )

        # 4. Parent Order counts & Paid Sales (multi-vendor parent orders counted once)
        total_orders = Order.objects.count()
        paid_orders_qs = Order.objects.filter(payment_status=Order.PaymentStatus.PAID)
        paid_agg = paid_orders_qs.aggregate(
            paid_orders=Count('id'),
            total_paid_order_value=Sum('total_amount'),
        )
        total_paid_value = paid_agg['total_paid_order_value'] or Decimal('0.00')

        # 5. Recent Seller Registrations (non-sensitive summary fields only)
        recent_sellers_qs = SellerProfile.objects.order_by('-created_at')[:5]
        recent_sellers = [
            {
                'id': s.id,
                'store_name': s.store_name,
                'craft_category': s.craft_category,
                'city': s.city,
                'state': s.state,
                'application_status': s.application_status,
                'created_at': s.created_at,
            }
            for s in recent_sellers_qs
        ]

        # 6. Recent Parent Orders (non-sensitive summary fields only)
        recent_orders_qs = Order.objects.order_by('-created_at')[:5]
        recent_orders = [
            {
                'order_number': o.order_number,
                'order_status': o.order_status,
                'payment_status': o.payment_status,
                'total_amount': str(o.total_amount),
                'created_at': o.created_at,
            }
            for o in recent_orders_qs
        ]

        return Response(
            {
                'stats': {
                    'total_customers': total_customers,
                    'total_sellers': seller_agg['total_sellers'] or 0,
                    'pending_sellers': seller_agg['pending_sellers'] or 0,
                    'approved_sellers': seller_agg['approved_sellers'] or 0,
                    'rejected_sellers': seller_agg['rejected_sellers'] or 0,
                    'suspended_sellers': seller_agg['suspended_sellers'] or 0,
                    'total_products': product_agg['total_products'] or 0,
                    'pending_products': product_agg['pending_products'] or 0,
                    'approved_products': product_agg['approved_products'] or 0,
                    'rejected_products': product_agg['rejected_products'] or 0,
                    'total_orders': total_orders,
                    'paid_orders': paid_agg['paid_orders'] or 0,
                    'total_paid_order_value': str(total_paid_value),
                },
                'recent_sellers': recent_sellers,
                'recent_orders': recent_orders,
            },
            status=status.HTTP_200_OK,
        )
