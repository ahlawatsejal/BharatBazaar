from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from .models import Order, OrderItem, ReturnRequest
from .serializers import CustomerReturnRequestSerializer, CreateReturnRequestSerializer


class IsCustomerRoleUser(BasePermission):
    """Allows access strictly to authenticated users with role=CUSTOMER."""
    message = 'Only customer accounts may access customer return endpoints.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == User.Role.CUSTOMER
        )


def _validate_return_eligibility(customer, order, order_item):
    """
    Validates ownership, delivery/payment eligibility, and duplicate active requests.
    Returns (is_valid, error_message).
    """
    if order.customer_id != customer.id:
        return False, 'Order not found for this customer.'

    if order_item.order_id != order.id:
        return False, 'Selected item does not belong to the specified order.'

    if order.payment_status != Order.PaymentStatus.PAID:
        return False, 'Only paid orders are eligible for return requests.'

    if order.order_status == Order.OrderStatus.CANCELLED:
        return False, 'Cancelled orders are not eligible for return requests.'

    if order_item.fulfillment_status == OrderItem.FulfillmentStatus.CANCELLED:
        return False, 'Cancelled items are not eligible for return requests.'

    is_delivered = (
        order_item.fulfillment_status == OrderItem.FulfillmentStatus.DELIVERED
        or order.order_status == Order.OrderStatus.DELIVERED
    )
    if not is_delivered:
        return False, 'Return requests can only be submitted after the item has been delivered.'

    has_active_or_completed = ReturnRequest.objects.filter(
        order_item=order_item,
        status__in=[
            ReturnRequest.ReturnStatus.PENDING,
            ReturnRequest.ReturnStatus.APPROVED,
            ReturnRequest.ReturnStatus.COMPLETED,
        ],
    ).exists()
    if has_active_or_completed:
        return False, 'An active or completed return request already exists for this order item.'

    return True, None


class CustomerReturnListCreateView(APIView):
    """
    GET /api/orders/returns/ — List authenticated customer's return requests.
    POST /api/orders/returns/ — Submit a return request for an eligible OrderItem.
    """
    permission_classes = [IsAuthenticated, IsCustomerRoleUser]

    def get(self, request):
        qs = (
            ReturnRequest.objects.filter(customer=request.user)
            .select_related('order', 'order_item', 'seller')
            .order_by('-created_at')
        )
        serializer = CustomerReturnRequestSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateReturnRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data

        order = get_object_or_404(Order, order_number=v['order_number'], customer=request.user)
        order_item = get_object_or_404(OrderItem, pk=v['order_item_id'])

        is_valid, err_msg = _validate_return_eligibility(request.user, order, order_item)
        if not is_valid:
            return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            return_req = ReturnRequest.objects.create(
                customer=request.user,
                order=order,
                order_item=order_item,
                seller=order_item.seller,
                reason=v['reason'],
                description=v['description'].strip(),
                status=ReturnRequest.ReturnStatus.PENDING,
            )

        return Response(
            {
                'message': 'Return request submitted successfully.',
                'return_request': CustomerReturnRequestSerializer(return_req).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerReturnDetailView(APIView):
    """
    GET /api/orders/returns/<int:pk>/
    Retrieves a specific return request owned by the authenticated customer.
    """
    permission_classes = [IsAuthenticated, IsCustomerRoleUser]

    def get(self, request, pk):
        return_req = get_object_or_404(
            ReturnRequest.objects.select_related('order', 'order_item', 'seller'),
            pk=pk,
            customer=request.user,
        )
        serializer = CustomerReturnRequestSerializer(return_req)
        return Response(serializer.data, status=status.HTTP_200_OK)
