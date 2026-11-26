from django.contrib import admin
from .models import SellerProfile


@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = (
        'store_name',
        'user',
        'craft_category',
        'state',
        'city',
        'application_status',
        'created_at',
    )
    list_filter = ('application_status', 'state', 'craft_category', 'created_at')
    search_fields = ('store_name', 'user__email', 'user__first_name', 'user__last_name', 'city')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Store Information', {
            'fields': ('user', 'store_name', 'business_description', 'craft_category'),
        }),
        ('Location', {
            'fields': ('city', 'state'),
        }),
        ('Verification & Approval', {
            'fields': ('application_status', 'admin_notes', 'created_at', 'updated_at'),
        }),
    )

    actions = ['approve_sellers', 'reject_sellers', 'suspend_sellers']

    @admin.action(description='Approve selected seller applications')
    def approve_sellers(self, request, queryset):
        queryset.update(application_status=SellerProfile.ApplicationStatus.APPROVED)

    @admin.action(description='Reject selected seller applications')
    def reject_sellers(self, request, queryset):
        queryset.update(application_status=SellerProfile.ApplicationStatus.REJECTED)

    @admin.action(description='Suspend selected sellers')
    def suspend_sellers(self, request, queryset):
        queryset.update(application_status=SellerProfile.ApplicationStatus.SUSPENDED)
