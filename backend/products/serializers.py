from rest_framework import serializers
from .models import Category, Product, ProductImage, WishlistItem, ProductReview
from sellers.models import SellerProfile


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'image_url',
            'is_active',
            'product_count',
        )


class ProductSellerSummarySerializer(serializers.ModelSerializer):
    """
    Public seller profile summary for product cards and details.
    Strictly excludes private user information (email, phone, address, tax details).
    """
    class Meta:
        model = SellerProfile
        fields = (
            'id',
            'store_name',
            'business_description',
            'state',
            'city',
            'craft_category',
        )


class ProductCategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'slug',
        )


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for multi-angle product gallery images.
    """
    class Meta:
        model = ProductImage
        fields = (
            'id',
            'image_url',
            'alt_text',
            'is_primary',
            'order',
        )


class ProductListSerializer(serializers.ModelSerializer):
    """
    Concise serializer for catalogue cards and search grids.
    """
    category = ProductCategorySummarySerializer(read_only=True)
    seller = ProductSellerSummarySerializer(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'short_description',
            'category',
            'seller',
            'price',
            'discount_price',
            'discount_percentage',
            'available_stock',
            'craft_type',
            'origin_state',
            'origin_city',
            'tags',
            'primary_image',
            'is_featured',
            'created_at',
        )


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive serializer for single product detail view.
    Includes full specifications, multi-image gallery, and related craft articles.
    """
    category = ProductCategorySummarySerializer(read_only=True)
    seller = ProductSellerSummarySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    related_products = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'short_description',
            'category',
            'seller',
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
            'related_products',
            'reviews',
            'created_at',
            'updated_at',
        )

    def get_related_products(self, obj):
        related = Product.objects.filter(
            category=obj.category,
            approval_status=Product.ApprovalStatus.APPROVED,
            seller__application_status='APPROVED',
        ).exclude(id=obj.id).select_related('category', 'seller')[:4]
        return ProductListSerializer(related, many=True).data

    def get_reviews(self, obj):
        reviews_qs = obj.customer_reviews.select_related('customer').order_by('-created_at')[:15]
        return [
            {
                'id': r.id,
                'customer_name': f"{r.customer.first_name} {r.customer.last_name[:1]}." if r.customer.first_name else 'Artisan Patron',
                'rating': r.rating,
                'title': r.title,
                'comment': r.comment,
                'is_verified_purchase': r.is_verified_purchase,
                'seller_reply': r.seller_reply,
                'seller_replied_at': r.seller_replied_at,
                'created_at': r.created_at,
            }
            for r in reviews_qs
        ]


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = (
            'id',
            'product',
            'created_at',
        )


class ProductReviewSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = (
            'id',
            'product',
            'customer_name',
            'rating',
            'title',
            'comment',
            'is_verified_purchase',
            'created_at',
            'updated_at',
        )

    def get_customer_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name[:1]}." if obj.customer.first_name else 'Artisan Patron'


class CreateReviewSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    rating = serializers.IntegerField(required=True, min_value=1, max_value=5)
    title = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    comment = serializers.CharField(required=True, min_length=10)
