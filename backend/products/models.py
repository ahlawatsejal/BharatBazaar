from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    """
    Craft category for organizing artisanal products across India.
    """
    name = models.CharField(
        max_length=120,
        unique=True,
        help_text='Name of the craft category (e.g. Handloom & Textiles).',
    )
    slug = models.SlugField(
        max_length=140,
        unique=True,
        help_text='URL-friendly slug generated from the category name.',
    )
    description = models.TextField(
        blank=True,
        help_text='Overview of the craft traditions included in this category.',
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        help_text='Display image representing this craft category.',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Determines whether this category is visible in the marketplace.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Artisan and MSME product listed for discovery and sale.
    Strictly requires approval by administrator and can only belong to an approved seller.
    """

    class ApprovalStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        INACTIVE = 'INACTIVE', 'Inactive'

    name = models.CharField(
        max_length=255,
        help_text='Product title showcasing the handmade article.',
    )
    slug = models.SlugField(
        max_length=255,
        unique=True,
        help_text='Unique URL identifier for the product detail view.',
    )
    description = models.TextField(
        help_text='Comprehensive product story, materials, and techniques used.',
    )
    short_description = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='Brief summary for product cards and search previews.',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
        help_text='Primary craft category.',
    )
    seller = models.ForeignKey(
        'sellers.SellerProfile',
        on_delete=models.CASCADE,
        related_name='products',
        help_text='The artisan seller storefront responsible for this product.',
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Original retail price in INR (₹).',
    )
    discount_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Discounted promotional price in INR (₹) if applicable.',
    )
    available_stock = models.PositiveIntegerField(
        default=1,
        help_text='Current stock units available for immediate purchase.',
    )
    low_stock_threshold = models.PositiveIntegerField(
        default=5,
        help_text='Stock threshold at or below which the product is flagged as Low Stock.',
    )
    sku = models.CharField(
        max_length=64,
        unique=True,
        help_text='Unique Stock Keeping Unit (e.g. BB-RJ-POT-001).',
    )
    craft_type = models.CharField(
        max_length=100,
        help_text='Specific craft technique (e.g. Phulkari, Blue Pottery, Chikankari).',
    )
    origin_state = models.CharField(
        max_length=100,
        help_text='State in India where the artisan handmade this article.',
    )
    origin_city = models.CharField(
        max_length=100,
        help_text='City, town or cluster of origin.',
    )
    tags = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Comma-separated keywords for discovery (e.g. handmade, cotton, GI-tagged).',
    )
    primary_image = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Primary photograph displaying the product.',
    )
    is_featured = models.BooleanField(
        default=False,
        help_text='Whether to highlight this product on the homepage and featured shelf.',
    )
    materials = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Artisanal materials (e.g. Pure Mulberry Silk, Natural Terracotta, Brass).',
    )
    dimensions = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text='Physical dimensions or sizing (e.g. 10" x 6" x 6", Free Size).',
    )
    care_instructions = models.TextField(
        blank=True,
        default='',
        help_text='Recommended care instructions to preserve the handmade craft.',
    )
    shipping_info = models.TextField(
        blank=True,
        default='',
        help_text='Shipping timeline and dispatch details.',
    )
    returns_info = models.TextField(
        blank=True,
        default='',
        help_text='Artisan returns and replacement policy.',
    )
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        help_text='Administrative moderation status before public listing.',
    )
    admin_feedback = models.TextField(
        blank=True,
        default='',
        help_text='Feedback provided by admin in case of rejection or required revision.',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_products',
        help_text='Platform administrator who performed the last product moderation review.',
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp of the last administrative product moderation review.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (₹{self.price}) — {self.seller.store_name}"

    @property
    def is_publicly_visible(self):
        """Returns True if product is approved and seller application is approved."""
        return (
            self.approval_status == self.ApprovalStatus.APPROVED
            and self.seller.is_approved
            and self.category.is_active
        )

    @property
    def discount_percentage(self):
        if self.discount_price and self.discount_price < self.price:
            return round(((self.price - self.discount_price) / self.price) * 100)
        return None

    @property
    def inventory_status(self):
        if self.available_stock <= 0:
            return 'OUT_OF_STOCK'
        if self.available_stock <= self.low_stock_threshold:
            return 'LOW_STOCK'
        return 'IN_STOCK'


class ProductImage(models.Model):
    """
    High-resolution showcase and gallery images for an artisan product.
    Supports thumbnail selection, main image zoom, and multi-angle display.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        help_text='Artisan product associated with this photograph.',
    )
    image_url = models.URLField(
        max_length=500,
        help_text='Hosted URL of the photograph.',
    )
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Accessibility description for screen readers.',
    )
    is_primary = models.BooleanField(
        default=False,
        help_text='Whether this photograph is the primary showcase image.',
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        help_text='Visual gallery display sequence (ascending).',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['order', 'id']

    def __str__(self):
        return f"Gallery image {self.id} for {self.product.name}"


class WishlistItem(models.Model):
    """
    Artisan products saved by an authenticated customer.
    Persists across sessions and logouts. Prevents duplicates.
    """
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
        help_text='Customer who saved this craft piece.',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by',
        help_text='Saved craft article.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Wishlist Item'
        verbose_name_plural = 'Wishlist Items'
        unique_together = ('customer', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.customer.email} saved {self.product.name}"


class ProductReview(models.Model):
    """
    Verified customer reviews for artisan pieces actually purchased and delivered.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='customer_reviews',
        help_text='Reviewed artisan product.',
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_written',
        help_text='Customer authoring the review.',
    )
    rating = models.PositiveSmallIntegerField(
        help_text='Artisanal rating scale 1 to 5.',
    )
    title = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text='Brief review headline.',
    )
    comment = models.TextField(
        help_text='Customer reflection on texture, craftsmanship, and delivery.',
    )
    is_verified_purchase = models.BooleanField(
        default=True,
        help_text='Whether purchase was validated against historical order logs.',
    )
    seller_reply = models.TextField(
        blank=True,
        default='',
        help_text='Optional artisan seller response to this customer review.',
    )
    seller_replied_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when the seller posted their reply.',
    )
    seller_replied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seller_review_replies',
        help_text='Seller user who authored the reply.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product Review'
        verbose_name_plural = 'Product Reviews'
        unique_together = ('product', 'customer')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ by {self.customer.email} for {self.product.name}"
