from django.contrib import admin
from .models import Category, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image_url', 'alt_text', 'is_primary', 'order')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    inlines = [ProductImageInline]
    list_display = (
        'name',
        'category',
        'seller',
        'price',
        'discount_price',
        'available_stock',
        'craft_type',
        'origin_state',
        'is_featured',
        'approval_status',
        'created_at',
    )
    list_filter = (
        'approval_status',
        'is_featured',
        'category',
        'origin_state',
        'craft_type',
        'created_at',
    )
    search_fields = (
        'name',
        'sku',
        'seller__store_name',
        'craft_type',
        'origin_state',
        'origin_city',
        'tags',
    )
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('General Information', {
            'fields': ('name', 'slug', 'category', 'seller', 'sku', 'is_featured'),
        }),
        ('Descriptions & Media', {
            'fields': ('short_description', 'description', 'primary_image', 'tags'),
        }),
        ('Specifications & Care', {
            'fields': ('materials', 'dimensions', 'care_instructions', 'shipping_info', 'returns_info'),
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'discount_price', 'available_stock'),
        }),
        ('Artisan Origin', {
            'fields': ('craft_type', 'origin_city', 'origin_state'),
        }),
        ('Moderation & Approval', {
            'fields': ('approval_status', 'admin_feedback', 'created_at', 'updated_at'),
        }),
    )

    actions = ['approve_products', 'reject_products', 'mark_featured', 'unmark_featured']

    @admin.action(description='Approve selected products for marketplace catalogue')
    def approve_products(self, request, queryset):
        queryset.update(approval_status=Product.ApprovalStatus.APPROVED)

    @admin.action(description='Reject selected products')
    def reject_products(self, request, queryset):
        queryset.update(approval_status=Product.ApprovalStatus.REJECTED)

    @admin.action(description='Feature selected products on homepage')
    def mark_featured(self, request, queryset):
        queryset.update(is_featured=True)

    @admin.action(description='Remove featured status')
    def unmark_featured(self, request, queryset):
        queryset.update(is_featured=False)
