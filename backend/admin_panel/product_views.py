from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRoleUser
from .serializers import (
    AdminProductListSerializer,
    AdminProductDetailSerializer,
    AdminProductApproveSerializer,
    AdminProductReasonSerializer,
)
from products.models import Product
from orders.models import Notification


class AdminProductPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class AdminProductListView(APIView):
    """
    GET /api/admin/products/
    Paginated product listing for admin moderation with status filter and search.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        qs = (
            Product.objects.select_related('category', 'seller', 'reviewed_by')
            .order_by('-created_at')
        )

        status_filter = (request.query_params.get('status') or '').strip().upper()
        valid_statuses = {
            Product.ApprovalStatus.DRAFT,
            Product.ApprovalStatus.PENDING,
            Product.ApprovalStatus.APPROVED,
            Product.ApprovalStatus.REJECTED,
            Product.ApprovalStatus.INACTIVE,
        }
        if status_filter and status_filter != 'ALL':
            if status_filter not in valid_statuses:
                return Response(
                    {'detail': f'Invalid product status filter: {status_filter}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(approval_status=status_filter)

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(craft_type__icontains=search)
                | Q(seller__store_name__icontains=search)
                | Q(category__name__icontains=search)
            )

        paginator = AdminProductPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminProductListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminProductDetailView(APIView):
    """
    GET /api/admin/products/<int:pk>/
    Retrieves full product, seller, category, and moderation details for an admin.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request, pk):
        product = get_object_or_404(
            Product.objects.select_related('category', 'seller__user', 'reviewed_by')
            .prefetch_related('images'),
            pk=pk,
        )
        serializer = AdminProductDetailSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)


def _apply_product_moderation(
    *,
    pk,
    admin_user,
    allowed_from,
    target_status,
    invalid_message,
    admin_feedback,
    notification_title,
    notification_message,
):
    """
    Atomically validates and applies a Product moderation transition under row lock,
    records reviewing admin and timestamp, and notifies the owning seller.
    Never deletes products or alters orders, payments, or stock.
    """
    with transaction.atomic():
        product = get_object_or_404(
            Product.objects.select_for_update()
            .select_related('category', 'seller__user')
            .prefetch_related('images'),
            pk=pk,
        )

        if product.approval_status not in allowed_from:
            return None, Response(
                {
                    'detail': invalid_message,
                    'current_status': product.approval_status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        product.approval_status = target_status
        product.admin_feedback = admin_feedback
        product.reviewed_by = admin_user
        product.reviewed_at = timezone.now()
        product.save(
            update_fields=[
                'approval_status',
                'admin_feedback',
                'reviewed_by',
                'reviewed_at',
                'updated_at',
            ]
        )

        Notification.objects.create(
            customer=product.seller.user,
            title=notification_title,
            message=notification_message.format(name=product.name),
            notification_type='PRODUCT',
        )

    return product, None


class AdminProductApproveView(APIView):
    """
    POST /api/admin/products/<int:pk>/approve/
    Approves a PENDING or INACTIVE product for public marketplace listing.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminProductApproveSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        feedback_note = serializer.validated_data.get('admin_feedback', '').strip()

        product, error_response = _apply_product_moderation(
            pk=pk,
            admin_user=request.user,
            allowed_from={
                Product.ApprovalStatus.PENDING,
                Product.ApprovalStatus.INACTIVE,
            },
            target_status=Product.ApprovalStatus.APPROVED,
            invalid_message='Only PENDING or INACTIVE products can be approved.',
            admin_feedback=feedback_note,
            notification_title='Product Listing Approved',
            notification_message=(
                'Your product "{name}" has been approved by BharatBazaar curation and is now eligible for public listing.'
            ),
        )
        if error_response:
            return error_response

        # Update notification message cleanly if product name is available
        # (notification already created inside atomic block; keep atomic block clean)
        return Response(
            {
                'message': 'Product approved successfully.',
                'product': AdminProductDetailSerializer(product).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminProductRejectView(APIView):
    """
    POST /api/admin/products/<int:pk>/reject/
    Rejects a PENDING product with a mandatory moderation reason.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminProductReasonSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason'].strip()

        product, error_response = _apply_product_moderation(
            pk=pk,
            admin_user=request.user,
            allowed_from={Product.ApprovalStatus.PENDING},
            target_status=Product.ApprovalStatus.REJECTED,
            invalid_message='Only PENDING products can be rejected.',
            admin_feedback=reason,
            notification_title='Product Listing Rejected',
            notification_message=(
                f'Your product submission "{{name}}" was not approved. Reason: {reason}'
            ),
        )
        if error_response:
            return error_response

        return Response(
            {
                'message': 'Product rejected.',
                'product': AdminProductDetailSerializer(product).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminProductSuspendView(APIView):
    """
    POST /api/admin/products/<int:pk>/suspend/
    Suspends an APPROVED product by transitioning it to the existing safe INACTIVE state
    with a mandatory reason. Preserves product, orders, payments, and stock.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        serializer = AdminProductReasonSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason'].strip()

        product, error_response = _apply_product_moderation(
            pk=pk,
            admin_user=request.user,
            allowed_from={Product.ApprovalStatus.APPROVED},
            target_status=Product.ApprovalStatus.INACTIVE,
            invalid_message='Only APPROVED products can be suspended.',
            admin_feedback=reason,
            notification_title='Product Listing Suspended',
            notification_message=(
                f'Your active product listing "{{name}}" has been suspended from public display. Reason: {reason}'
            ),
        )
        if error_response:
            return error_response

        return Response(
            {
                'message': 'Product suspended (set to INACTIVE).',
                'product': AdminProductDetailSerializer(product).data,
            },
            status=status.HTTP_200_OK,
        )
