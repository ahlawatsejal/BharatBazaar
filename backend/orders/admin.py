from django.contrib import admin
from .models import Address, Order, OrderItem


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'full_name', 'phone_number', 'city', 'state', 'postal_code', 'is_default')
    search_fields = ('customer__email', 'full_name', 'phone_number', 'city', 'state', 'postal_code')
    list_filter = ('state', 'is_default')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('product_name', 'seller', 'unit_price', 'quantity', 'line_total', 'craft_type')
    readonly_fields = ('product_name', 'seller', 'unit_price', 'quantity', 'line_total', 'craft_type')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number',
        'customer',
        'total_amount',
        'order_status',
        'payment_status',
        'razorpay_payment_id',
        'created_at',
    )
    list_filter = ('order_status', 'payment_status', 'created_at')
    search_fields = ('order_number', 'customer__email', 'razorpay_order_id', 'razorpay_payment_id')
    readonly_fields = ('order_number', 'created_at', 'updated_at')
    inlines = [OrderItemInline]
