from decimal import Decimal
import uuid
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from .models import SellerProfile, InventoryHistory
from products.models import Category, Product, ProductImage, ProductReview
from products.serializers import ProductCategorySummarySerializer, ProductImageSerializer
from orders.models import OrderItem


class SellerStoreProfileSerializer(serializers.ModelSerializer):
    """Serializer for artisan storefront details."""
    is_approved = serializers.BooleanField(read_only=True)
    seller_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = SellerProfile
        fields = (
            'id',
            'store_name',
            'business_description',
            'craft_category',
            'state',
            'city',
            'application_status',
            'is_approved',
            'seller_name',
            'email',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'application_status', 'is_approved', 'created_at', 'updated_at')

    def get_seller_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class SellerProductSerializer(serializers.ModelSerializer):
    """Read serializer for seller's own products (includes all approval statuses)."""
    category = ProductCategorySummarySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'short_description',
            'category',
            'price',
            'discount_price',
            'discount_percentage',
            'available_stock',
            'sku',
            'craft_type',
            'origin_state',
            'origin_city',
            'tags',
            'primary_image',
            'images',
            'materials',
            'dimensions',
            'care_instructions',
            'shipping_info',
            'returns_info',
            'is_featured',
            'approval_status',
            'created_at',
            'updated_at',
        )


class SellerProductWriteSerializer(serializers.Serializer):
    """
    Write serializer for creating/updating a seller's product.
    Strictly derives seller from authenticated user and enforces PENDING approval workflow.
    """
    name = serializers.CharField(max_length=255)
    short_description = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    description = serializers.CharField()
    category_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('1.00'))
    discount_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    available_stock = serializers.IntegerField(min_value=0, default=1)
    sku = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    craft_type = serializers.CharField(max_length=100)
    origin_state = serializers.CharField(max_length=100)
    origin_city = serializers.CharField(max_length=100)
    tags = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    primary_image = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    gallery_images = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=False,
        default=list,
    )
    materials = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    dimensions = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    care_instructions = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_info = serializers.CharField(required=False, allow_blank=True, default='')
    returns_info = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_category_id(self, value):
        try:
            category = Category.objects.get(pk=value, is_active=True)
        except Category.DoesNotExist:
            raise serializers.ValidationError('Selected craft category does not exist or is inactive.')
        return category

    def validate_primary_image(self, value):
        val = (value or '').strip()
        if val and not (val.startswith('http://') or val.startswith('https://') or val.startswith('/media/')):
            raise serializers.ValidationError('Image URL must start with http://, https://, or /media/.')
        return val

    def validate_gallery_images(self, value):
        cleaned = []
        for url in value:
            u = (url or '').strip()
            if not u:
                continue
            if not (u.startswith('http://') or u.startswith('https://') or u.startswith('/media/')):
                raise serializers.ValidationError(f'Invalid image URL: {u}')
            cleaned.append(u)
        return cleaned

    def validate(self, attrs):
        price = attrs.get('price')
        discount_price = attrs.get('discount_price')
        if discount_price is not None:
            if discount_price <= 0:
                raise serializers.ValidationError({'discount_price': 'Discount price must be greater than zero.'})
            if price is not None and discount_price >= price:
                raise serializers.ValidationError({'discount_price': 'Discount price must be lower than original price.'})

        sku = (attrs.get('sku') or '').strip()
        if sku:
            qs = Product.objects.filter(sku__iexact=sku)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'sku': 'A product with this SKU already exists.'})

        return attrs

    def _generate_unique_slug(self, name):
        base_slug = slugify(name)[:220] or 'artisan-craft'
        slug = base_slug
        while Product.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
        return slug

    def _generate_unique_sku(self, craft_type):
        prefix = slugify(craft_type).upper()[:6].replace('-', '') or 'ART'
        while True:
            candidate = f"BB-{prefix}-{uuid.uuid4().hex[:6].upper()}"
            if not Product.objects.filter(sku=candidate).exists():
                return candidate

    @transaction.atomic
    def create(self, validated_data):
        seller = self.context['seller']
        category = validated_data.pop('category_id')
        gallery_images = validated_data.pop('gallery_images', [])
        sku = (validated_data.pop('sku', '') or '').strip() or self._generate_unique_sku(validated_data['craft_type'])
        primary_image = validated_data.pop('primary_image', '').strip()

        if not primary_image and gallery_images:
            primary_image = gallery_images[0]

        product = Product.objects.create(
            seller=seller,
            category=category,
            slug=self._generate_unique_slug(validated_data['name']),
            sku=sku,
            primary_image=primary_image,
            approval_status=Product.ApprovalStatus.PENDING,  # Always enters approval queue
            **validated_data,
        )

        # Save gallery images
        seen = set()
        order_idx = 0
        if primary_image:
            ProductImage.objects.create(
                product=product,
                image_url=primary_image,
                alt_text=product.name,
                is_primary=True,
                order=order_idx,
            )
            seen.add(primary_image)
            order_idx += 1

        for img_url in gallery_images:
            if img_url not in seen:
                ProductImage.objects.create(
                    product=product,
                    image_url=img_url,
                    alt_text=product.name,
                    is_primary=(order_idx == 0),
                    order=order_idx,
                )
                seen.add(img_url)
                order_idx += 1

        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        if 'category_id' in validated_data:
            instance.category = validated_data.pop('category_id')
        gallery_images = validated_data.pop('gallery_images', None)
        sku = validated_data.pop('sku', None)
        if sku:
            instance.sku = sku.strip()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # If previously rejected, editing resubmits it for curatorial approval
        if instance.approval_status == Product.ApprovalStatus.REJECTED:
            instance.approval_status = Product.ApprovalStatus.PENDING

        if not instance.primary_image and gallery_images:
            instance.primary_image = gallery_images[0]

        instance.save()

        if gallery_images is not None:
            instance.images.all().delete()
            seen = set()
            order_idx = 0
            if instance.primary_image:
                ProductImage.objects.create(
                    product=instance,
                    image_url=instance.primary_image,
                    alt_text=instance.name,
                    is_primary=True,
                    order=order_idx,
                )
                seen.add(instance.primary_image)
                order_idx += 1
            for img_url in gallery_images:
                if img_url not in seen:
                    ProductImage.objects.create(
                        product=instance,
                        image_url=img_url,
                        alt_text=instance.name,
                        is_primary=(order_idx == 0),
                        order=order_idx,
                    )
                    seen.add(img_url)
                    order_idx += 1

        return instance


class SellerInventoryItemSerializer(serializers.ModelSerializer):
    """Read serializer for seller inventory listing."""
    category = ProductCategorySummarySerializer(read_only=True)
    inventory_status = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'sku',
            'primary_image',
            'category',
            'available_stock',
            'low_stock_threshold',
            'inventory_status',
            'approval_status',
            'updated_at',
        )


class InventoryAdjustmentSerializer(serializers.Serializer):
    """Validates stock adjustment and threshold updates."""
    ACTION_CHOICES = ('increase', 'decrease', 'set')

    action = serializers.ChoiceField(choices=ACTION_CHOICES, required=False, default='set')
    quantity = serializers.IntegerField(min_value=0, required=False)
    low_stock_threshold = serializers.IntegerField(min_value=0, max_value=10000, required=False)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if 'quantity' not in attrs and 'low_stock_threshold' not in attrs:
            raise serializers.ValidationError(
                'Provide a stock adjustment quantity or a low_stock_threshold.'
            )
        if 'quantity' in attrs and attrs.get('action') in ('increase', 'decrease') and attrs['quantity'] <= 0:
            raise serializers.ValidationError({
                'quantity': 'Adjustment quantity must be greater than 0 for increase or decrease.'
            })
        return attrs


class InventoryHistorySerializer(serializers.ModelSerializer):
    """Immutable read-only serializer for stock adjustment audit records."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    adjusted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryHistory
        fields = (
            'id',
            'product_id',
            'product_name',
            'previous_stock',
            'new_stock',
            'adjustment_amount',
            'reason',
            'adjusted_by_name',
            'created_at',
        )
        read_only_fields = fields

    def get_adjusted_by_name(self, obj):
        if not obj.adjusted_by:
            return 'System'
        return obj.adjusted_by.get_full_name() or obj.adjusted_by.email


class SellerOrderItemSerializer(serializers.ModelSerializer):
    """Seller-scoped serializer for an OrderItem including fulfillment & shipment tracking."""

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'product',
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


class SellerOrderItemStatusUpdateSerializer(serializers.Serializer):
    fulfillment_status = serializers.ChoiceField(choices=OrderItem.FulfillmentStatus.choices)


class SellerOrderItemShipmentSerializer(serializers.Serializer):
    courier_name = serializers.CharField(max_length=120, required=True)
    tracking_number = serializers.CharField(max_length=120, required=True)
    tracking_url = serializers.URLField(max_length=500, required=False, allow_blank=True, default='')
    dispatched_at = serializers.DateTimeField(required=False, allow_null=True)
    estimated_delivery_date = serializers.DateField(required=False, allow_null=True)
    shipment_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    def validate_courier_name(self, value):
        val = (value or '').strip()
        if not val:
            raise serializers.ValidationError('Courier or delivery partner name is required.')
        return val

    def validate_tracking_number(self, value):
        val = (value or '').strip()
        if not val:
            raise serializers.ValidationError('Tracking number is required.')
        return val


class SellerReviewSerializer(serializers.ModelSerializer):
    """Seller-scoped read-only serializer for customer reviews on the seller's products."""
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    product_image = serializers.CharField(source='product.primary_image', read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = (
            'id',
            'product_id',
            'product_name',
            'product_slug',
            'product_image',
            'customer_name',
            'rating',
            'title',
            'comment',
            'is_verified_purchase',
            'seller_reply',
            'seller_replied_at',
            'created_at',
        )
        read_only_fields = fields

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.first_name:
            last_initial = f" {obj.customer.last_name[:1]}." if obj.customer.last_name else ''
            return f"{obj.customer.first_name}{last_initial}"
        return 'Artisan Patron'


class SellerReviewReplySerializer(serializers.Serializer):
    reply = serializers.CharField(min_length=3, max_length=1000, trim_whitespace=True)
    allow_update = serializers.BooleanField(required=False, default=False)

    def validate_reply(self, value):
        cleaned = (value or '').strip()
        if len(cleaned) < 3:
            raise serializers.ValidationError('Reply must be at least 3 characters long.')
        if len(cleaned) > 1000:
            raise serializers.ValidationError('Reply cannot exceed 1000 characters.')
        return cleaned
