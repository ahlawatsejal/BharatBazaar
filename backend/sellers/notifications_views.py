from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsApprovedSeller
from orders.models import Notification
from orders.serializers import NotificationSerializer


class SellerNotificationPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 50


class SellerNotificationListView(APIView):
    """
    GET /api/sellers/notifications/
    Lists notifications belonging strictly to the authenticated approved seller user.
    Supports ?status=all|unread|read and pagination.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        base_qs = Notification.objects.filter(customer=request.user).order_by('-created_at')
        unread_count = base_qs.filter(is_read=False).count()

        filter_status = request.query_params.get('status', 'all').strip().lower()
        qs = base_qs
        if filter_status == 'unread':
            qs = qs.filter(is_read=False)
        elif filter_status == 'read':
            qs = qs.filter(is_read=True)

        paginator = SellerNotificationPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = NotificationSerializer(page, many=True)

        response = paginator.get_paginated_response(serializer.data)
        response.data['unread_count'] = unread_count
        return response


class SellerNotificationUnreadCountView(APIView):
    """
    GET /api/sellers/notifications/unread-count/
    Returns unread notification count for the authenticated approved seller.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        count = Notification.objects.filter(customer=request.user, is_read=False).count()
        return Response({'unread_count': count}, status=status.HTTP_200_OK)


class SellerNotificationMarkReadView(APIView):
    """
    POST /api/sellers/notifications/<int:pk>/read/
    Marks a single notification owned by the authenticated seller as read.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, customer=request.user)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


class SellerNotificationMarkAllReadView(APIView):
    """
    POST /api/sellers/notifications/mark-all-read/
    Marks all unread notifications for the authenticated seller as read.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def post(self, request):
        updated = Notification.objects.filter(customer=request.user, is_read=False).update(is_read=True)
        return Response(
            {'message': 'All notifications marked as read.', 'updated_count': updated},
            status=status.HTTP_200_OK,
        )
