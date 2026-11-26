import re
from decimal import Decimal
from django.core.validators import URLValidator
from django.db.models import Sum
from rest_framework import serializers
from sellers.models import SellerProfile
from products.models import Product
from orders.models import Address, Order, OrderItem, ReturnRequest
from accounts.models import User
from .models import PlatformSettings


class AdminSellerListSerializer(serializers.ModelSerializer):
    """Summary serializer for admin seller applications & storefronts table."""
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source='user.email', read_only=True)
    owner_phone = serializers.CharField(source='user.phone_number', read_only=True)
    reviewed_by_email = serializers.SerializerMethodField()
    products_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SellerProfile
        fields = (
            'id',
            'store_name',
            'craft_category',
            'city',
            'state',
            'application_status',
            'owner_name',
            'owner_email',
            'owner_phone',
            'products_count',
            'reviewed_by_email',
            'reviewed_at',
            'created_at',
            'updated_at',
        )

    def get_owner_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None


class AdminSellerDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for inspecting a seller application and storefront."""
    owner = serializers.SerializerMethodField()
    reviewed_by = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = SellerProfile
        fields = (
            'id',
            'store_name',
            'business_description',
            'craft_category',
            'city',
            'state',
            'application_status',
            'admin_notes',
            'status_reason',
            'reviewed_by',
            'reviewed_at',
            'created_at',
            'updated_at',
            'owner',
            'stats',
        )

    def get_owner(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name() or user.email,
            'email': user.email,
            'phone_number': user.phone_number,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
        }

    def get_reviewed_by(self, obj):
        if not obj.reviewed_by:
            return None
        return {
            'id': obj.reviewed_by.id,
            'email': obj.reviewed_by.email,
            'full_name': obj.reviewed_by.get_full_name() or obj.reviewed_by.email,
        }

    def get_stats(self, obj):
        products_qs = Product.objects.filter(seller=obj)
        return {
            'total_products': products_qs.count(),
            'approved_products': products_qs.filter(approval_status=Product.ApprovalStatus.APPROVED).count(),
            'pending_products': products_qs.filter(approval_status=Product.ApprovalStatus.PENDING).count(),
            'total_orders': Order.objects.filter(items__seller=obj).distinct().count(),
        }


class AdminSellerActionSerializer(serializers.Serializer):
    """Optional notes for approve / reactivate actions."""
    admin_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        max_length=2000,
    )


class AdminSellerReasonSerializer(serializers.Serializer):
    """Required reason for reject / suspend actions."""
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=1000,
        error_messages={
            'required': 'A reason is required for this action.',
            'blank': 'Please provide a clear reason before submitting.',
        },
    )
    admin_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        max_length=2000,
    )


class AdminProductListSerializer(serializers.ModelSerializer):
    """Summary serializer for admin product moderation queue."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_id = serializers.IntegerField(source='seller.id', read_only=True)
    seller_store_name = serializers.CharField(source='seller.store_name', read_only=True)
    seller_status = serializers.CharField(source='seller.application_status', read_only=True)
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'sku',
            'primary_image',
            'price',
            'discount_price',
            'available_stock',
            'craft_type',
            'category_name',
            'seller_id',
            'seller_store_name',
            'seller_status',
            'approval_status',
            'reviewed_by_email',
            'reviewed_at',
            'created_at',
            'updated_at',
        )

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None


class AdminProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for admin product moderation inspection."""
    category = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    reviewed_by = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'sku',
            'short_description',
            'description',
            'price',
            'discount_price',
            'available_stock',
            'low_stock_threshold',
            'craft_type',
            'origin_state',
            'origin_city',
            'tags',
            'materials',
            'dimensions',
            'care_instructions',
            'shipping_info',
            'returns_info',
            'primary_image',
            'images',
            'is_featured',
            'approval_status',
            'admin_feedback',
            'reviewed_by',
            'reviewed_at',
            'created_at',
            'updated_at',
            'category',
            'seller',
        )

    def get_category(self, obj):
        return {
            'id': obj.category.id,
            'name': obj.category.name,
            'slug': obj.category.slug,
        }

    def get_seller(self, obj):
        s = obj.seller
        return {
            'id': s.id,
            'store_name': s.store_name,
            'application_status': s.application_status,
            'city': s.city,
            'state': s.state,
            'owner_name': s.user.get_full_name() or s.user.email,
            'owner_email': s.user.email,
        }

    def get_images(self, obj):
        return [
            {
                'id': img.id,
                'image_url': img.image_url,
                'alt_text': img.alt_text,
                'is_primary': img.is_primary,
            }
            for img in obj.images.all()
        ]

    def get_reviewed_by(self, obj):
        if not obj.reviewed_by:
            return None
        return {
            'id': obj.reviewed_by.id,
            'email': obj.reviewed_by.email,
            'full_name': obj.reviewed_by.get_full_name() or obj.reviewed_by.email,
        }


class AdminProductApproveSerializer(serializers.Serializer):
    """Optional feedback note when approving a product."""
    admin_feedback = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        max_length=1000,
    )


class AdminProductReasonSerializer(serializers.Serializer):
    """Mandatory reason when rejecting or suspending a product."""
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=1000,
        error_messages={
            'required': 'A moderation reason is required.',
            'blank': 'Please provide a clear reason before submitting.',
        },
    )


class AdminCustomerListSerializer(serializers.ModelSerializer):
    """Summary serializer for the admin customer table."""
    full_name = serializers.SerializerMethodField()
    order_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, default=Decimal('0.00'))

    class Meta:
        model = User
        fields = (
            'id',
            'full_name',
            'email',
            'phone_number',
            'is_active',
            'date_joined',
            'order_count',
            'total_spent',
        )

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class AdminCustomerDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for admin customer inspection."""
    full_name = serializers.SerializerMethodField()
    addresses = serializers.SerializerMethodField()
    order_summary = serializers.SerializerMethodField()
    recent_orders = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone_number',
            'is_active',
            'date_joined',
            'updated_at',
            'addresses',
            'order_summary',
            'recent_orders',
        )

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_addresses(self, obj):
        from orders.models import Address
        return [
            {
                'id': a.id,
                'full_name': a.full_name,
                'phone_number': a.phone_number,
                'address_line_1': a.address_line_1,
                'address_line_2': a.address_line_2,
                'city': a.city,
                'state': a.state,
                'postal_code': a.postal_code,
                'is_default': a.is_default,
            }
            for a in Address.objects.filter(customer=obj).order_by('-is_default', '-created_at')[:10]
        ]

    def get_order_summary(self, obj):
        from orders.models import Address, Order
        orders_qs = Order.objects.filter(customer=obj)
        total_orders = orders_qs.count()
        paid_qs = orders_qs.filter(payment_status=Order.PaymentStatus.PAID)
        paid_count = paid_qs.count()
        total_spent_agg = paid_qs.aggregate(total=Sum('total_amount'))
        return {
            'total_orders': total_orders,
            'paid_orders': paid_count,
            'total_spent': str(total_spent_agg['total'] or Decimal('0.00')),
        }

    def get_recent_orders(self, obj):
        from orders.models import Address, Order
        return [
            {
                'order_number': o.order_number,
                'order_status': o.order_status,
                'payment_status': o.payment_status,
                'total_amount': str(o.total_amount),
                'created_at': o.created_at,
            }
            for o in Order.objects.filter(customer=obj).order_by('-created_at')[:10]
        ]


class AdminOrderListSerializer(serializers.ModelSerializer):
    """Summary serializer for platform-wide admin order table."""
    customer = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    seller_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'created_at',
            'updated_at',
            'customer',
            'item_count',
            'seller_count',
            'subtotal',
            'shipping_amount',
            'discount_amount',
            'total_amount',
            'payment_status',
            'order_status',
        )

    def get_customer(self, obj):
        if not obj.customer:
            return None
        return {
            'id': obj.customer.id,
            'full_name': obj.customer.get_full_name() or obj.customer.email,
            'email': obj.customer.email,
            'phone_number': obj.customer.phone_number,
        }

    def get_item_count(self, obj):
        if hasattr(obj, 'item_count'):
            return obj.item_count or 0
        return obj.items.count()

    def get_seller_count(self, obj):
        if hasattr(obj, 'seller_count'):
            return obj.seller_count or 0
        return obj.items.values('seller_id').distinct().count()


class AdminOrderItemSerializer(serializers.ModelSerializer):
    """Read-only serializer for individual OrderItem with seller & shipment tracking."""
    seller_id = serializers.IntegerField(source='seller.id', read_only=True)
    seller_store_name = serializers.CharField(source='seller.store_name', read_only=True)
    seller_city = serializers.CharField(source='seller.city', read_only=True)
    seller_state = serializers.CharField(source='seller.state', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True, allow_null=True)
    product_slug = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'product_id',
            'product_slug',
            'product_name',
            'seller_id',
            'seller_store_name',
            'seller_city',
            'seller_state',
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


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """
    Complete read-only admin view of a multi-vendor Order.
    Excludes razorpay_signature, secrets, passwords, and tokens.
    """
    customer = serializers.SerializerMethodField()
    items = AdminOrderItemSerializer(many=True, read_only=True)
    seller_groups = serializers.SerializerMethodField()
    payment_reference = serializers.SerializerMethodField()
    cancellation_refund_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'created_at',
            'updated_at',
            'customer',
            'shipping_address_snapshot',
            'subtotal',
            'shipping_amount',
            'discount_amount',
            'total_amount',
            'order_status',
            'payment_status',
            'payment_reference',
            'cancellation_refund_info',
            'items',
            'seller_groups',
        )

    def get_customer(self, obj):
        if not obj.customer:
            return None
        return {
            'id': obj.customer.id,
            'full_name': obj.customer.get_full_name() or obj.customer.email,
            'email': obj.customer.email,
            'phone_number': obj.customer.phone_number,
            'is_active': obj.customer.is_active,
        }

    def get_payment_reference(self, obj):
        return {
            'razorpay_order_id': obj.razorpay_order_id or '',
            'razorpay_payment_id': obj.razorpay_payment_id or '',
            'signature_verified': bool(obj.razorpay_signature),
            'payment_status': obj.payment_status,
        }

    def get_cancellation_refund_info(self, obj):
        items = list(obj.items.all())
        cancelled_items = [i for i in items if i.fulfillment_status == OrderItem.FulfillmentStatus.CANCELLED]
        if obj.payment_status == Order.PaymentStatus.REFUNDED:
            refund_state = 'REFUNDED'
        elif obj.order_status == Order.OrderStatus.CANCELLED and obj.payment_status == Order.PaymentStatus.PAID:
            refund_state = 'AWAITING_PROVIDER_REFUND'
        elif obj.order_status == Order.OrderStatus.CANCELLED:
            refund_state = 'NO_REFUND_REQUIRED'
        else:
            refund_state = 'NOT_CANCELLED'

        return {
            'is_cancelled': obj.order_status == Order.OrderStatus.CANCELLED,
            'refund_state': refund_state,
            'cancelled_items_count': len(cancelled_items),
            'total_items_count': len(items),
        }

    def get_seller_groups(self, obj):
        groups = {}
        for item in obj.items.all():
            sid = item.seller_id
            if sid not in groups:
                groups[sid] = {
                    'seller_id': sid,
                    'store_name': item.seller.store_name if item.seller else 'Artisan Studio',
                    'city': item.seller.city if item.seller else '',
                    'state': item.seller.state if item.seller else '',
                    'subtotal': Decimal('0.00'),
                    'item_count': 0,
                    'items': [],
                }
            groups[sid]['subtotal'] += item.line_total or Decimal('0.00')
            groups[sid]['item_count'] += 1
            groups[sid]['items'].append(AdminOrderItemSerializer(item).data)

        result = []
        for g in groups.values():
            g['subtotal'] = str(g['subtotal'])
            result.append(g)
        return result


class AdminPaymentListSerializer(serializers.ModelSerializer):
    """
    Read-only summary serializer for platform-wide admin payment monitoring.
    Excludes razorpay_signature, secrets, passwords, and JWT tokens.
    """
    customer = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source='total_amount', max_digits=12, decimal_places=2, read_only=True)
    payment_method = serializers.SerializerMethodField()
    signature_verified = serializers.SerializerMethodField()
    is_order_cancelled = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'customer',
            'amount',
            'payment_status',
            'order_status',
            'payment_method',
            'razorpay_order_id',
            'razorpay_payment_id',
            'signature_verified',
            'is_order_cancelled',
            'created_at',
            'updated_at',
        )

    def get_customer(self, obj):
        if not obj.customer:
            return None
        return {
            'id': obj.customer.id,
            'full_name': obj.customer.get_full_name() or obj.customer.email,
            'email': obj.customer.email,
            'phone_number': obj.customer.phone_number,
        }

    def get_payment_method(self, obj):
        # Order model does not persist payment_method (e.g. UPI/card/netbanking)
        return None

    def get_signature_verified(self, obj):
        return bool(obj.razorpay_signature)

    def get_is_order_cancelled(self, obj):
        return obj.order_status == Order.OrderStatus.CANCELLED


class AdminPaymentDetailSerializer(AdminPaymentListSerializer):
    """
    Read-only detailed payment & related order serializer for admin oversight.
    Clearly separates cancelled orders from confirmed REFUNDED payment records.
    """
    items = AdminOrderItemSerializer(many=True, read_only=True)
    cancellation_refund_info = serializers.SerializerMethodField()

    class Meta(AdminPaymentListSerializer.Meta):
        fields = AdminPaymentListSerializer.Meta.fields + (
            'subtotal',
            'shipping_amount',
            'discount_amount',
            'total_amount',
            'shipping_address_snapshot',
            'cancellation_refund_info',
            'items',
        )

    def get_cancellation_refund_info(self, obj):
        is_cancelled = obj.order_status == Order.OrderStatus.CANCELLED
        is_paid = obj.payment_status == Order.PaymentStatus.PAID
        is_refunded = obj.payment_status == Order.PaymentStatus.REFUNDED

        if is_refunded:
            label = 'Refund Confirmed (REFUNDED)'
        elif is_cancelled and is_paid:
            label = 'Order Cancelled — Payment Captured (Awaiting Refund Confirmation)'
        elif is_cancelled:
            label = 'Order Cancelled — No Payment Captured'
        else:
            label = 'Not Cancelled / Not Refunded'

        return {
            'is_order_cancelled': is_cancelled,
            'is_payment_refunded': is_refunded,
            'refund_amount': str(obj.total_amount) if is_refunded else None,
            'has_gateway_refund_record': False,
            'refund_status_label': label,
            'note': (
                'BharatBazaar stores payment_status on Order without a separate Razorpay refund transaction record.'
            ),
        }


PHONE_REGEX = re.compile(r'^[0-9+\-\s()]{7,25}$')


class PublicPlatformSettingsSerializer(serializers.ModelSerializer):
    """Public-safe serializer for marketplace branding, announcement, and social links."""

    class Meta:
        model = PlatformSettings
        fields = (
            'marketplace_name',
            'marketplace_tagline',
            'support_email',
            'support_phone',
            'marketplace_description',
            'announcement_message',
            'announcement_enabled',
            'announcement_type',
            'website_url',
            'instagram_url',
            'facebook_url',
            'linkedin_url',
        )


class PlatformSettingsSerializer(serializers.ModelSerializer):
    """Admin serializer with strict validation for manageable platform settings."""
    updated_by_email = serializers.SerializerMethodField()

    class Meta:
        model = PlatformSettings
        fields = (
            'marketplace_name',
            'marketplace_tagline',
            'support_email',
            'support_phone',
            'marketplace_description',
            'announcement_message',
            'announcement_enabled',
            'announcement_type',
            'website_url',
            'instagram_url',
            'facebook_url',
            'linkedin_url',
            'updated_by_email',
            'updated_at',
        )
        read_only_fields = ('updated_by_email', 'updated_at')

    def get_updated_by_email(self, obj):
        return obj.updated_by.email if obj.updated_by else None

    def validate_marketplace_name(self, value):
        cleaned = (value or '').strip()
        if not cleaned:
            raise serializers.ValidationError('Marketplace name is required.')
        return cleaned

    def validate_support_phone(self, value):
        cleaned = (value or '').strip()
        if cleaned and not PHONE_REGEX.match(cleaned):
            raise serializers.ValidationError(
                'Enter a valid phone number (7 to 25 characters: digits, spaces, +, -, or parentheses).'
            )
        return cleaned

    def _validate_optional_url(self, value, field_label):
        cleaned = (value or '').strip()
        if not cleaned:
            return ''
        validator = URLValidator(schemes=['http', 'https'])
        try:
            validator(cleaned)
        except Exception:
            raise serializers.ValidationError(f'Enter a valid {field_label} starting with http:// or https://.')
        return cleaned

    def validate_website_url(self, value):
        return self._validate_optional_url(value, 'website URL')

    def validate_instagram_url(self, value):
        return self._validate_optional_url(value, 'Instagram URL')

    def validate_facebook_url(self, value):
        return self._validate_optional_url(value, 'Facebook URL')

    def validate_linkedin_url(self, value):
        return self._validate_optional_url(value, 'LinkedIn URL')


class AdminReturnRequestSerializer(serializers.ModelSerializer):
    """Admin serializer for inspecting and reviewing customer return requests."""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_payment_status = serializers.CharField(source='order.payment_status', read_only=True)
    order_status = serializers.CharField(source='order.order_status', read_only=True)
    customer = serializers.SerializerMethodField()
    order_item = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = ReturnRequest
        fields = (
            'id',
            'order_number',
            'order_payment_status',
            'order_status',
            'customer',
            'order_item',
            'seller',
            'reason',
            'reason_display',
            'description',
            'status',
            'status_display',
            'admin_notes',
            'rejection_reason',
            'reviewed_by_email',
            'reviewed_at',
            'created_at',
            'updated_at',
        )

    def get_customer(self, obj):
        if not obj.customer:
            return None
        return {
            'id': obj.customer.id,
            'full_name': obj.customer.get_full_name() or obj.customer.email,
            'email': obj.customer.email,
            'phone_number': obj.customer.phone_number,
        }

    def get_order_item(self, obj):
        if not obj.order_item:
            return None
        return {
            'id': obj.order_item.id,
            'product_name': obj.order_item.product_name,
            'quantity': obj.order_item.quantity,
            'unit_price': str(obj.order_item.unit_price),
            'line_total': str(obj.order_item.line_total),
            'fulfillment_status': obj.order_item.fulfillment_status,
        }

    def get_seller(self, obj):
        if not obj.seller:
            return None
        return {
            'id': obj.seller.id,
            'store_name': obj.seller.store_name,
            'city': obj.seller.city,
            'state': obj.seller.state,
        }

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None
