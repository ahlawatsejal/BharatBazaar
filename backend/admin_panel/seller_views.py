from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from .serializers import (
    AdminSellerListSerializer,
    AdminSellerDetailSerializer,
    AdminSellerActionSerializer,
    AdminSellerReasonSerializer,
)
from sellers.models import SellerProfile
from orders.models import Notification


class AdminSellerPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class AdminSellerListView(APIView):
    """
    GET /api/admin/sellers/
    Lists seller applications with pagination, status filter, and search.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        qs = (
            SellerProfile.objects.select_related('user', 'reviewed_by')
            .annotate(products_count=Count('products', distinct=True))
            .order_by('-created_at')
        )

        status_filter = (request.query_params.get('status') or '').strip().upper()
        valid_statuses = {
            SellerProfile.ApplicationStatus.PENDING,
            SellerProfile.ApplicationStatus.APPROVED,
            SellerProfile.ApplicationStatus.REJECTED,
            SellerProfile.ApplicationStatus.SUSPENDED,
        }
        if status_filter and status_filter != 'ALL':
            if status_filter not in valid_statuses:
                return Response(
                    {'detail': f'Invalid status filter: {status_filter}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(application_status=status_filter)

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(store_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(craft_category__icontains=search)
            )

        paginator = AdminSellerPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminSellerListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminSellerDetailView(APIView):
    """
    GET /api/admin/sellers/<int:pk>/
    Retrieves full application and storefront details for a single seller.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request, pk):
        seller = get_object_or_404(
            SellerProfile.objects.select_related('user', 'reviewed_by'),
            pk=pk,
        )
        serializer = AdminSellerDetailSerializer(seller)
        return Response(serializer.data, status=status.HTTP_200_OK)


def _apply_seller_transition(
    *,
    pk,
    admin_user,
    allowed_from,
    target_status,
    invalid_message,
    notification_title,
    notification_message,
    status_reason='',
    admin_notes='',
):
    """
    Atomically validates and applies a SellerProfile status transition under row lock,
    records review audit metadata, and creates a single seller Notification.
    """
    with transaction.atomic():
        seller = get_object_or_404(
            SellerProfile.objects.select_for_update().select_related('user'),
            pk=pk,
        )

        if seller.application_status not in allowed_from:
            return None, Response(
                {
                    'detail': invalid_message,
                    'current_status': seller.application_status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        seller.application_status = target_status
        seller.status_reason = status_reason
        if admin_notes:
            seller.admin_notes = admin_notes
        seller.reviewed_by = admin_user
        seller.reviewed_at = timezone.now()
        seller.save(
            update_fields=[
                'application_status',
                'status_reason',
                'admin_notes',
                'reviewed_by',
                'reviewed_at',
                'updated_at',
            ]
        )

        Notification.objects.create(
            customer=seller.user,
            title=notification_title,
            message=notification_message,
            notification_type='ACCOUNT',
        )

    return seller, None


class AdminSellerApproveView(APIView):
    """
    POST /api/admin/sellers/<int:pk>/approve/
    Approves a PENDING seller application.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminSellerActionSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get('admin_notes', '').strip()

        seller, error_response = _apply_seller_transition(
            pk=pk,
            admin_user=request.user,
            allowed_from={SellerProfile.ApplicationStatus.PENDING},
            target_status=SellerProfile.ApplicationStatus.APPROVED,
            invalid_message='Only PENDING seller applications can be approved.',
            notification_title='Seller Application Approved',
            notification_message=(
                'Congratulations! Your artisan storefront application on BharatBazaar has been approved. '
                'You can now access your Seller Dashboard and submit craft listings.'
            ),
            status_reason='',
            admin_notes=notes,
        )
        if error_response:
            return error_response

        return Response(
            {
                'message': 'Seller application approved successfully.',
                'seller': AdminSellerDetailSerializer(seller).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminSellerRejectView(APIView):
    """
    POST /api/admin/sellers/<int:pk>/reject/
    Rejects a PENDING seller application with a mandatory reason.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminSellerReasonSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason'].strip()
        notes = serializer.validated_data.get('admin_notes', '').strip()

        seller, error_response = _apply_seller_transition(
            pk=pk,
            admin_user=request.user,
            allowed_from={SellerProfile.ApplicationStatus.PENDING},
            target_status=SellerProfile.ApplicationStatus.REJECTED,
            invalid_message='Only PENDING seller applications can be rejected.',
            notification_title='Seller Application Rejected',
            notification_message=(
                f'Your artisan storefront application was not approved. Reason: {reason}'
            ),
            status_reason=reason,
            admin_notes=notes or reason,
        )
        if error_response:
            return error_response

        return Response(
            {
                'message': 'Seller application rejected.',
                'seller': AdminSellerDetailSerializer(seller).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminSellerSuspendView(APIView):
    """
    POST /api/admin/sellers/<int:pk>/suspend/
    Suspends an APPROVED seller storefront with a mandatory reason.
    Preserves existing products, orders, and inventory records.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminSellerReasonSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason'].strip()
        notes = serializer.validated_data.get('admin_notes', '').strip()

        seller, error_response = _apply_seller_transition(
            pk=pk,
            admin_user=request.user,
            allowed_from={SellerProfile.ApplicationStatus.APPROVED},
            target_status=SellerProfile.ApplicationStatus.SUSPENDED,
            invalid_message='Only APPROVED sellers can be suspended.',
            notification_title='Seller Storefront Suspended',
            notification_message=(
                f'Your seller storefront has been suspended by an administrator. Reason: {reason}'
            ),
            status_reason=reason,
            admin_notes=notes or reason,
        )
        if error_response:
            return error_response

        return Response(
            {
                'message': 'Seller storefront suspended.',
                'seller': AdminSellerDetailSerializer(seller).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminSellerReactivateView(APIView):
    """
    POST /api/admin/sellers/<int:pk>/reactivate/
    Reactivates a SUSPENDED seller storefront back to APPROVED.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminSellerActionSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get('admin_notes', '').strip()

        seller, error_response = _apply_seller_transition(
            pk=pk,
            admin_user=request.user,
            allowed_from={SellerProfile.ApplicationStatus.SUSPENDED},
            target_status=SellerProfile.ApplicationStatus.APPROVED,
            invalid_message='Only SUSPENDED sellers can be reactivated.',
            notification_title='Seller Storefront Reactivated',
            notification_message=(
                'Your artisan storefront on BharatBazaar has been reactivated. '
                'Your Seller Dashboard access is now restored.'
            ),
            status_reason='',
            admin_notes=notes,
        )
        if error_response:
            return error_response

        return Response(
            {
                'message': 'Seller storefront reactivated successfully.',
                'seller': AdminSellerDetailSerializer(seller).data,
            },
            status=status.HTTP_200_OK,
        )
