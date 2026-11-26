from django.contrib import admin
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    fields = ('product', 'quantity', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'total_items', 'subtotal', 'updated_at')
    search_fields = ('customer__email', 'customer__first_name', 'customer__last_name')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CartItemInline]
