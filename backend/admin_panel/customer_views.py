from decimal import Decimal
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from .serializers import AdminCustomerListSerializer, AdminCustomerDetailSerializer
from accounts.models import User
from orders.models import Notification, Order


class AdminCustomerPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class AdminCustomerListView(APIView):
    """
    GET /api/admin/customers/
    Paginated customer directory with search, active/inactive filter,
    order count, and total paid spending.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        qs = (
            User.objects.filter(role=User.Role.CUSTOMER)
            .annotate(
                order_count=Count('orders', distinct=True),
                total_spent=Sum(
                    'orders__total_amount',
                    filter=Q(orders__payment_status=Order.PaymentStatus.PAID),
                ),
            )
            .order_by('-date_joined')
        )

        # Active / inactive filter
        active_filter = (request.query_params.get('active') or '').strip().lower()
        if active_filter == 'true':
            qs = qs.filter(is_active=True)
        elif active_filter == 'false':
            qs = qs.filter(is_active=False)

        # Search
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
            )

        paginator = AdminCustomerPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminCustomerListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminCustomerDetailView(APIView):
    """
    GET /api/admin/customers/<int:pk>/
    Full customer profile with addresses, order summary, and recent orders.
    Restricted to CUSTOMER-role users.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request, pk):
        customer = get_object_or_404(User, pk=pk, role=User.Role.CUSTOMER)
        serializer = AdminCustomerDetailSerializer(customer)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCustomerDeactivateView(APIView):
    """
    POST /api/admin/customers/<int:pk>/deactivate/
    Deactivates a CUSTOMER account. Does not delete any data.
    Admin cannot deactivate their own account.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        customer = get_object_or_404(User, pk=pk, role=User.Role.CUSTOMER)

        if customer.id == request.user.id:
            return Response(
                {'detail': 'You cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not customer.is_active:
            return Response(
                {'detail': 'This customer account is already deactivated.', 'is_active': False},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            customer.is_active = False
            customer.save(update_fields=['is_active', 'updated_at'])

            Notification.objects.create(
                customer=customer,
                title='Account Deactivated',
                message=(
                    'Your BharatBazaar account has been deactivated by a platform administrator. '
                    'Your data, orders, and reviews remain preserved. '
                    'Contact support if you believe this is an error.'
                ),
                notification_type='ACCOUNT',
            )

        return Response(
            {
                'message': 'Customer account deactivated successfully.',
                'customer': AdminCustomerDetailSerializer(customer).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminCustomerActivateView(APIView):
    """
    POST /api/admin/customers/<int:pk>/activate/
    Reactivates a deactivated CUSTOMER account.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        customer = get_object_or_404(User, pk=pk, role=User.Role.CUSTOMER)

        if customer.is_active:
            return Response(
                {'detail': 'This customer account is already active.', 'is_active': True},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            customer.is_active = True
            customer.save(update_fields=['is_active', 'updated_at'])

            Notification.objects.create(
                customer=customer,
                title='Account Reactivated',
                message=(
                    'Your BharatBazaar account has been reactivated. '
                    'You can now log in and continue shopping for handcrafted artisan products.'
                ),
                notification_type='ACCOUNT',
            )

        return Response(
            {
                'message': 'Customer account reactivated successfully.',
                'customer': AdminCustomerDetailSerializer(customer).data,
            },
            status=status.HTTP_200_OK,
        )
