from django.conf import settings
from django.db import models


class SellerProfile(models.Model):
    """
    Seller profile representing an artisan, local manufacturer, or MSME.
    Linked 1-to-1 with a User who has the SELLER role.
    Requires admin approval (application_status) before publishing listings.
    """

    class ApplicationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seller_profile',
        help_text='The user account associated with this seller store.',
    )
    store_name = models.CharField(
        max_length=150,
        unique=True,
        help_text='Public brand or storefront name.',
    )
    business_description = models.TextField(
        blank=True,
        help_text='About the artisan, craft tradition, and studio.',
    )
    state = models.CharField(
        max_length=100,
        help_text='Indian state of origin for the artisan craft.',
    )
    city = models.CharField(
        max_length=100,
        help_text='City, town or village of the workshop.',
    )
    craft_category = models.CharField(
        max_length=100,
        help_text='Primary craft tradition (e.g. Blue Pottery, Chikankari, Phulkari).',
    )
    application_status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
        help_text='Approval status determined by platform administrator.',
    )
    admin_notes = models.TextField(
        blank=True,
        help_text='Internal notes from the administrator regarding application review.',
    )
    status_reason = models.TextField(
        blank=True,
        default='',
        help_text='Reason provided when rejecting or suspending a seller.',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_sellers',
        help_text='Platform administrator who performed the last status review.',
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp of the last administrative status review.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Seller Profile'
        verbose_name_plural = 'Seller Profiles'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.store_name} ({self.get_application_status_display()})"

    @property
    def is_approved(self):
        return self.application_status == self.ApplicationStatus.APPROVED


class InventoryHistory(models.Model):
    """
    Immutable audit log of stock adjustments performed by an artisan seller.
    """
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='inventory_history',
        help_text='The product whose stock was adjusted.',
    )
    seller = models.ForeignKey(
        SellerProfile,
        on_delete=models.CASCADE,
        related_name='inventory_history',
        help_text='The seller storefront owning the product.',
    )
    adjusted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inventory_adjustments',
        help_text='Authenticated user who performed the stock adjustment.',
    )
    previous_stock = models.PositiveIntegerField(
        help_text='Available stock before this adjustment.',
    )
    new_stock = models.PositiveIntegerField(
        help_text='Available stock after this adjustment.',
    )
    adjustment_amount = models.IntegerField(
        help_text='Signed delta applied (new_stock - previous_stock).',
    )
    reason = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Optional explanation for the stock adjustment.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Inventory History'
        verbose_name_plural = 'Inventory Histories'
        ordering = ['-created_at']

    def __str__(self):
        sign = '+' if self.adjustment_amount >= 0 else ''
        return f"{self.product.name}: {self.previous_stock} -> {self.new_stock} ({sign}{self.adjustment_amount})"
