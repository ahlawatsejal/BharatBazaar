from decimal import Decimal
from rest_framework import serializers
from .models import Cart, CartItem
from products.models import Product


class CartItemProductSummarySerializer(serializers.ModelSerializer):
    seller_store_name = serializers.CharField(source='seller.store_name', read_only=True)
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'primary_image',
            'price',
            'discount_price',
            'available_stock',
            'craft_type',
            'origin_state',
            'seller_store_name',
            'is_available',
        )

    def get_is_available(self, obj):
        return (
            obj.approval_status == Product.ApprovalStatus.APPROVED
            and obj.seller.is_approved
            and obj.category.is_active
            and obj.available_stock > 0
        )


class CartItemSerializer(serializers.ModelSerializer):
    product = CartItemProductSummarySerializer(read_only=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = (
            'id',
            'product',
            'quantity',
            'unit_price',
            'line_total',
            'created_at',
            'updated_at',
        )


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    shipping_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = (
            'id',
            'items',
            'total_items',
            'subtotal',
            'shipping_amount',
            'total_amount',
            'created_at',
            'updated_at',
        )
