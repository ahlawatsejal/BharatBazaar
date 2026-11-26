from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0001_initial'),
        ('sellers', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Address',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(help_text='Recipient full name for delivery.', max_length=150)),
                ('phone_number', models.CharField(help_text='Recipient contact telephone / mobile number.', max_length=20)),
                ('address_line_1', models.CharField(help_text='House / Flat number, building, street, or lane.', max_length=255)),
                ('address_line_2', models.CharField(blank=True, default='', help_text='Apartment, suite, unit, or landmark (optional).', max_length=255)),
                ('city', models.CharField(help_text='City, town or district.', max_length=100)),
                ('state', models.CharField(help_text='Indian state or union territory.', max_length=100)),
                ('postal_code', models.CharField(help_text='PIN Code / Postal code.', max_length=20)),
                ('country', models.CharField(default='India', help_text='Country name.', max_length=100)),
                ('is_default', models.BooleanField(default=False, help_text='Whether this is the preferred default shipping address.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(help_text='Customer who owns this shipping destination.', on_delete=django.db.models.deletion.CASCADE, related_name='addresses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Shipping Address',
                'verbose_name_plural': 'Shipping Addresses',
                'ordering': ['-is_default', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order_number', models.CharField(db_index=True, help_text='Unique human-readable reference (e.g. BB-ORD-20261124-A1B2).', max_length=64, unique=True)),
                ('subtotal', models.DecimalField(decimal_places=2, help_text='Sum total of items prior to shipping or tax.', max_digits=12)),
                ('shipping_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Shipping and logistics charges.', max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Promotional coupon discounts applied.', max_digits=10)),
                ('total_amount', models.DecimalField(decimal_places=2, help_text='Authoritative final payable order total in INR (₹).', max_digits=12)),
                ('order_status', models.CharField(choices=[('PENDING', 'Pending Payment'), ('CONFIRMED', 'Confirmed'), ('PROCESSING', 'Processing with Artisans'), ('SHIPPED', 'Dispatched'), ('DELIVERED', 'Delivered'), ('CANCELLED', 'Cancelled')], default='PENDING', help_text='Current fulfillment lifecycle status.', max_length=30)),
                ('payment_status', models.CharField(choices=[('PENDING', 'Pending'), ('PAID', 'Paid'), ('FAILED', 'Failed'), ('REFUNDED', 'Refunded')], default='PENDING', help_text='Razorpay payment status.', max_length=30)),
                ('shipping_address_snapshot', models.JSONField(help_text='Immutable snapshot of delivery address at checkout time.')),
                ('razorpay_order_id', models.CharField(blank=True, default='', help_text='Order identifier returned by Razorpay payment gateway.', max_length=100)),
                ('razorpay_payment_id', models.CharField(blank=True, default='', help_text='Verified payment transaction ID returned upon success.', max_length=100)),
                ('razorpay_signature', models.CharField(blank=True, default='', help_text='HMAC SHA-256 signature verified server-side.', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(help_text='Customer who placed the order.', on_delete=django.db.models.deletion.PROTECT, related_name='orders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Order',
                'verbose_name_plural': 'Orders',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('product_name', models.CharField(help_text='Historical snapshot of product title.', max_length=255)),
                ('unit_price', models.DecimalField(decimal_places=2, help_text='Historical price at moment of purchase.', max_digits=10)),
                ('quantity', models.PositiveIntegerField(default=1, help_text='Number of units ordered.')),
                ('line_total', models.DecimalField(decimal_places=2, help_text='unit_price * quantity snapshot.', max_digits=12)),
                ('craft_type', models.CharField(blank=True, default='', help_text='Artisanal technique.', max_length=100)),
                ('origin_state', models.CharField(blank=True, default='', help_text='Artisan state of origin.', max_length=100)),
                ('primary_image', models.URLField(blank=True, default='', help_text='Image snapshot at purchase.', max_length=500)),
                ('order', models.ForeignKey(help_text='Parent order.', on_delete=django.db.models.deletion.CASCADE, related_name='items', to='orders.order')),
                ('product', models.ForeignKey(blank=True, help_text='Linked catalog product.', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='order_items', to='products.product')),
                ('seller', models.ForeignKey(help_text='Artisan or MSME seller fulfilling this item.', on_delete=django.db.models.deletion.PROTECT, related_name='order_items', to='sellers.sellerprofile')),
            ],
            options={
                'verbose_name': 'Order Line Item',
                'verbose_name_plural': 'Order Line Items',
            },
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text='Notification summary headline.', max_length=150)),
                ('message', models.TextField(help_text='Detailed notification message.')),
                ('notification_type', models.CharField(default='ORDER', help_text='Category: ORDER, PAYMENT, DISPATCH, RETURN, SECURITY.', max_length=50)),
                ('is_read', models.BooleanField(default=False, help_text='Whether the customer has acknowledged this notice.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(help_text='Recipient customer.', on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Customer Notification',
                'verbose_name_plural': 'Customer Notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
