from datetime import date
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
from .serializers import AdminReturnRequestSerializer
from orders.models import Notification, ReturnRequest


class AdminReturnPagination(PageNumberPagination):
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


class AdminReturnListView(APIView):
    """
    GET /api/admin/returns/
    Paginated admin return-request queue with status, date, and search filters.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        qs = (
            ReturnRequest.objects.select_related('customer', 'order', 'order_item', 'seller', 'reviewed_by')
            .order_by('-created_at')
        )

        req_status = (request.query_params.get('status') or '').strip().upper()
        if req_status and req_status != 'ALL':
            qs = qs.filter(status=req_status)

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

        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(order__order_number__icontains=search)
                | Q(order_item__product_name__icontains=search)
                | Q(customer__email__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(seller__store_name__icontains=search)
            )

        paginator = AdminReturnPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminReturnRequestSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminReturnDetailView(APIView):
    """GET /api/admin/returns/<int:pk>/"""
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request, pk):
        return_req = get_object_or_404(
            ReturnRequest.objects.select_related('customer', 'order', 'order_item', 'seller', 'reviewed_by'),
            pk=pk,
        )
        return Response(AdminReturnRequestSerializer(return_req).data, status=status.HTTP_200_OK)


class AdminReturnApproveView(APIView):
    """
    POST /api/admin/returns/<int:pk>/approve/
    Approves a PENDING return request. Does NOT alter payment_status or product stock.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        return_req = get_object_or_404(
            ReturnRequest.objects.select_related('customer', 'order', 'order_item', 'seller'),
            pk=pk,
        )
        if return_req.status != ReturnRequest.ReturnStatus.PENDING:
            return Response(
                {'detail': f'Only PENDING return requests can be approved (current: {return_req.status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_notes = (request.data.get('admin_notes') or '').strip()
        with transaction.atomic():
            return_req.status = ReturnRequest.ReturnStatus.APPROVED
            return_req.admin_notes = admin_notes
            return_req.reviewed_by = request.user
            return_req.reviewed_at = timezone.now()
            return_req.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'])

            Notification.objects.create(
                customer=return_req.customer,
                title='Return Request Approved',
                message=(
                    f'Your return request for "{return_req.order_item.product_name}" '
                    f'(Order {return_req.order.order_number}) has been approved.'
                ),
                notification_type='RETURN',
            )

        return Response(
            {
                'message': 'Return request approved.',
                'return_request': AdminReturnRequestSerializer(return_req).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminReturnRejectView(APIView):
    """
    POST /api/admin/returns/<int:pk>/reject/
    Rejects a PENDING return request with a mandatory reason.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response(
                {'reason': ['A rejection reason is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return_req = get_object_or_404(
            ReturnRequest.objects.select_related('customer', 'order', 'order_item', 'seller'),
            pk=pk,
        )
        if return_req.status != ReturnRequest.ReturnStatus.PENDING:
            return Response(
                {'detail': f'Only PENDING return requests can be rejected (current: {return_req.status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_notes = (request.data.get('admin_notes') or '').strip()
        with transaction.atomic():
            return_req.status = ReturnRequest.ReturnStatus.REJECTED
            return_req.rejection_reason = reason
            return_req.admin_notes = admin_notes
            return_req.reviewed_by = request.user
            return_req.reviewed_at = timezone.now()
            return_req.save(
                update_fields=[
                    'status', 'rejection_reason', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'
                ]
            )

            Notification.objects.create(
                customer=return_req.customer,
                title='Return Request Rejected',
                message=(
                    f'Your return request for "{return_req.order_item.product_name}" '
                    f'(Order {return_req.order.order_number}) was not approved. Reason: {reason}'
                ),
                notification_type='RETURN',
            )

        return Response(
            {
                'message': 'Return request rejected.',
                'return_request': AdminReturnRequestSerializer(return_req).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminReturnCompleteView(APIView):
    """
    POST /api/admin/returns/<int:pk>/complete/
    Marks an APPROVED return request as COMPLETED. Does NOT alter payment_status or stock.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def post(self, request, pk):
        return_req = get_object_or_404(
            ReturnRequest.objects.select_related('customer', 'order', 'order_item', 'seller'),
            pk=pk,
        )
        if return_req.status != ReturnRequest.ReturnStatus.APPROVED:
            return Response(
                {'detail': f'Only APPROVED return requests can be marked completed (current: {return_req.status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_notes = (request.data.get('admin_notes') or '').strip()
        with transaction.atomic():
            return_req.status = ReturnRequest.ReturnStatus.COMPLETED
            if admin_notes:
                return_req.admin_notes = admin_notes
            return_req.reviewed_by = request.user
            return_req.reviewed_at = timezone.now()
            return_req.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'])

            Notification.objects.create(
                customer=return_req.customer,
                title='Return Request Completed',
                message=(
                    f'Your return request for "{return_req.order_item.product_name}" '
                    f'(Order {return_req.order.order_number}) has been marked as completed.'
                ),
                notification_type='RETURN',
            )

        return Response(
            {
                'message': 'Return request marked as completed.',
                'return_request': AdminReturnRequestSerializer(return_req).data,
            },
            status=status.HTTP_200_OK,
        )
