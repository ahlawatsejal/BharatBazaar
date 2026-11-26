from rest_framework import serializers
from .models import Address, Order, OrderItem, Notification, ReturnRequest


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id',
            'title',
            'message',
            'notification_type',
            'is_read',
            'created_at',
        )


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            'id',
            'full_name',
            'phone_number',
            'address_line_1',
            'address_line_2',
            'city',
            'state',
            'postal_code',
            'country',
            'is_default',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class OrderItemSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.store_name', read_only=True)
    product_slug = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'product',
            'product_slug',
            'seller',
            'seller_name',
            'product_name',
            'unit_price',
            'quantity',
            'line_total',
            'craft_type',
            'origin_state',
            'primary_image',
            'fulfillment_status',
            'courier_name',
            'tracking_number',
            'tracking_url',
            'dispatched_at',
            'estimated_delivery_date',
            'shipment_notes',
            'status_updated_at',
        )

    def get_product_slug(self, obj):
        return obj.product.slug if obj.product else ''


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    refund_status_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'customer_email',
            'subtotal',
            'shipping_amount',
            'discount_amount',
            'total_amount',
            'order_status',
            'payment_status',
            'refund_status_info',
            'shipping_address_snapshot',
            'razorpay_order_id',
            'razorpay_payment_id',
            'items',
            'created_at',
            'updated_at',
        )

    def get_refund_status_info(self, obj):
        is_cancelled = obj.order_status == Order.OrderStatus.CANCELLED
        is_paid = obj.payment_status == Order.PaymentStatus.PAID
        is_refunded = obj.payment_status == Order.PaymentStatus.REFUNDED

        if is_refunded:
            refund_state = 'CONFIRMED'
            label = 'Refund Confirmed'
        elif is_cancelled and is_paid:
            refund_state = 'AWAITING_CONFIRMATION'
            label = 'Awaiting Refund Confirmation'
        else:
            refund_state = 'NOT_APPLICABLE'
            label = 'No Refund Required'

        return {
            'is_cancelled': is_cancelled,
            'is_payment_captured': is_paid,
            'is_refund_confirmed': is_refunded,
            'refund_state': refund_state,
            'label': label,
        }


class CreateOrderRequestSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(required=True)


class CustomerReturnRequestSerializer(serializers.ModelSerializer):
    """Customer-safe serializer for viewing submitted return requests."""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_item_id = serializers.IntegerField(source='order_item.id', read_only=True)
    product_name = serializers.CharField(source='order_item.product_name', read_only=True)
    quantity = serializers.IntegerField(source='order_item.quantity', read_only=True)
    line_total = serializers.DecimalField(
        source='order_item.line_total', max_digits=12, decimal_places=2, read_only=True
    )
    seller_store_name = serializers.CharField(source='seller.store_name', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ReturnRequest
        fields = (
            'id',
            'order_number',
            'order_item_id',
            'product_name',
            'quantity',
            'line_total',
            'seller_store_name',
            'reason',
            'reason_display',
            'description',
            'status',
            'status_display',
            'rejection_reason',
            'reviewed_at',
            'created_at',
            'updated_at',
        )


class CreateReturnRequestSerializer(serializers.Serializer):
    """Input validation for customer return request submission."""
    order_number = serializers.CharField(required=True, max_length=64)
    order_item_id = serializers.IntegerField(required=True, min_value=1)
    reason = serializers.ChoiceField(choices=ReturnRequest.ReturnReason.choices, required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='', max_length=2000)
