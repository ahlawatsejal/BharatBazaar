from decimal import Decimal
import uuid
from django.conf import settings
from django.db import models


class Address(models.Model):
    """
    Customer shipping addresses.
    Customers can maintain multiple addresses and designate a primary default.
    """
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='addresses',
        help_text='Customer who owns this shipping destination.',
    )
    full_name = models.CharField(
        max_length=150,
        help_text='Recipient full name for delivery.',
    )
    phone_number = models.CharField(
        max_length=20,
        help_text='Recipient contact telephone / mobile number.',
    )
    address_line_1 = models.CharField(
        max_length=255,
        help_text='House / Flat number, building, street, or lane.',
    )
    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Apartment, suite, unit, or landmark (optional).',
    )
    city = models.CharField(
        max_length=100,
        help_text='City, town or district.',
    )
    state = models.CharField(
        max_length=100,
        help_text='Indian state or union territory.',
    )
    postal_code = models.CharField(
        max_length=20,
        help_text='PIN Code / Postal code.',
    )
    country = models.CharField(
        max_length=100,
        default='India',
        help_text='Country name.',
    )
    is_default = models.BooleanField(
        default=False,
        help_text='Whether this is the preferred default shipping address.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Shipping Address'
        verbose_name_plural = 'Shipping Addresses'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.city}, {self.state} - {self.postal_code})"

    def save(self, *args, **kwargs):
        if self.is_default:
            # Clear default status on other addresses belonging to this customer
            Address.objects.filter(customer=self.customer, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Order(models.Model):
    """
    Authoritative customer order supporting multi-seller artisanal items.
    Maintains historical snapshots of pricing, product names, and shipping address.
    """

    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Payment'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        PROCESSING = 'PROCESSING', 'Processing with Artisans'
        SHIPPED = 'SHIPPED', 'Dispatched'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
        help_text='Customer who placed the order.',
    )
    order_number = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text='Unique human-readable reference (e.g. BB-ORD-20261124-A1B2).',
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Sum total of items prior to shipping or tax.',
    )
    shipping_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Shipping and logistics charges.',
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Promotional coupon discounts applied.',
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Authoritative final payable order total in INR (₹).',
    )
    order_status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        help_text='Current fulfillment lifecycle status.',
    )
    payment_status = models.CharField(
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        help_text='Razorpay payment status.',
    )
    shipping_address_snapshot = models.JSONField(
        help_text='Immutable snapshot of delivery address at checkout time.',
    )
    razorpay_order_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Order identifier returned by Razorpay payment gateway.',
    )
    razorpay_payment_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Verified payment transaction ID returned upon success.',
    )
    razorpay_signature = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='HMAC SHA-256 signature verified server-side.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number} — ₹{self.total_amount} ({self.get_order_status_display()})"

    @staticmethod
    def generate_order_number():
        """Generates a clean unique order identifier."""
        short_id = uuid.uuid4().hex[:8].upper()
        from django.utils import timezone
        date_str = timezone.now().strftime('%Y%m%d')
        return f"BB-ORD-{date_str}-{short_id}"


class OrderItem(models.Model):
    """
    Individual line item in an Order.
    Preserves historical unit price and title even if artisan alters catalog later.
    Includes seller-specific fulfillment status and consignment shipment details
    so multi-vendor orders progress independently per artisan studio.
    """

    class FulfillmentStatus(models.TextChoices):
        NEW = 'NEW', 'New Order'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        PROCESSING = 'PROCESSING', 'Processing'
        READY_TO_DISPATCH = 'READY_TO_DISPATCH', 'Ready to Dispatch'
        SHIPPED = 'SHIPPED', 'Shipped'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='Parent order.',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        help_text='Linked catalog product.',
    )
    seller = models.ForeignKey(
        'sellers.SellerProfile',
        on_delete=models.PROTECT,
        related_name='order_items',
        help_text='Artisan or MSME seller fulfilling this item.',
    )
    product_name = models.CharField(
        max_length=255,
        help_text='Historical snapshot of product title.',
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Historical price at moment of purchase.',
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text='Number of units ordered.',
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='unit_price * quantity snapshot.',
    )
    craft_type = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Artisanal technique.',
    )
    origin_state = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Artisan state of origin.',
    )
    primary_image = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Image snapshot at purchase.',
    )

    # Seller-specific fulfillment & shipment tracking
    fulfillment_status = models.CharField(
        max_length=25,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.NEW,
        help_text='Seller-level fulfillment state for this item.',
    )
    courier_name = models.CharField(
        max_length=120,
        blank=True,
        default='',
        help_text='Courier or delivery partner name.',
    )
    tracking_number = models.CharField(
        max_length=120,
        blank=True,
        default='',
        help_text='Consignment tracking number.',
    )
    tracking_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='External tracking URL if provided by courier.',
    )
    dispatched_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when seller dispatched the consignment.',
    )
    estimated_delivery_date = models.DateField(
        null=True,
        blank=True,
        help_text='Estimated delivery date.',
    )
    shipment_notes = models.TextField(
        blank=True,
        default='',
        help_text='Packaging or courier notes from the seller.',
    )
    status_updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp of last fulfillment or shipment update.',
    )

    class Meta:
        verbose_name = 'Order Line Item'
        verbose_name_plural = 'Order Line Items'

    def __str__(self):
        return f"{self.quantity}x {self.product_name} in {self.order.order_number}"


class Notification(models.Model):
    """
    Transactional and status notifications for customer orders and account events.
    """
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text='Recipient customer.',
    )
    title = models.CharField(
        max_length=150,
        help_text='Notification summary headline.',
    )
    message = models.TextField(
        help_text='Detailed notification message.',
    )
    notification_type = models.CharField(
        max_length=50,
        default='ORDER',
        help_text='Category: ORDER, PAYMENT, DISPATCH, RETURN, SECURITY.',
    )
    is_read = models.BooleanField(
        default=False,
        help_text='Whether the customer has acknowledged this notice.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Customer Notification'
        verbose_name_plural = 'Customer Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{'READ' if self.is_read else 'NEW'}] {self.title} -> {self.customer.email}"


class ReturnRequest(models.Model):
    """
    Database-backed customer return / replacement request tied to a specific OrderItem.
    Used strictly for return-request tracking and admin review; does not initiate
    gateway refunds, alter payment_status, or modify product stock.
    """

    class ReturnReason(models.TextChoices):
        TRANSIT_DAMAGE = 'TRANSIT_DAMAGE', 'Item damaged or cracked during transit'
        WRONG_ITEM = 'WRONG_ITEM', 'Different article received than ordered'
        WEAVE_DEFECT = 'WEAVE_DEFECT', 'Significant structural or weave tear'
        SIZE_MISMATCH = 'SIZE_MISMATCH', 'Sizing differs from product specification'
        OTHER = 'OTHER', 'Other handcrafted concern'

    class ReturnStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        COMPLETED = 'COMPLETED', 'Completed'

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='return_requests',
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name='return_requests',
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.PROTECT,
        related_name='return_requests',
    )
    seller = models.ForeignKey(
        'sellers.SellerProfile',
        on_delete=models.PROTECT,
        related_name='return_requests',
    )
    reason = models.CharField(max_length=40, choices=ReturnReason.choices)
    description = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=ReturnStatus.choices,
        default=ReturnStatus.PENDING,
    )
    admin_notes = models.TextField(blank=True, default='')
    rejection_reason = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_return_requests',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Return Request'
        verbose_name_plural = 'Return Requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"Return #{self.id} ({self.order.order_number} - {self.status})"
