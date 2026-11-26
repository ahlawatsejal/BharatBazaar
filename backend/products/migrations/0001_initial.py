# Generated migration for products app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sellers', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of the craft category (e.g. Handloom & Textiles).', max_length=120, unique=True)),
                ('slug', models.SlugField(help_text='URL-friendly slug generated from the category name.', max_length=140, unique=True)),
                ('description', models.TextField(blank=True, help_text='Overview of the craft traditions included in this category.')),
                ('image_url', models.URLField(blank=True, help_text='Display image representing this craft category.', max_length=500)),
                ('is_active', models.BooleanField(default=True, help_text='Determines whether this category is visible in the marketplace.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Category',
                'verbose_name_plural': 'Categories',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Product title showcasing the handmade article.', max_length=255)),
                ('slug', models.SlugField(help_text='Unique URL identifier for the product detail view.', max_length=255, unique=True)),
                ('description', models.TextField(help_text='Comprehensive product story, materials, and techniques used.')),
                ('short_description', models.CharField(blank=True, default='', help_text='Brief summary for product cards and search previews.', max_length=300)),
                ('price', models.DecimalField(decimal_places=2, help_text='Original retail price in INR (₹).', max_digits=10)),
                ('discount_price', models.DecimalField(blank=True, decimal_places=2, help_text='Discounted promotional price in INR (₹) if applicable.', max_digits=10, null=True)),
                ('available_stock', models.PositiveIntegerField(default=1, help_text='Current stock units available for immediate purchase.')),
                ('sku', models.CharField(help_text='Unique Stock Keeping Unit (e.g. BB-RJ-POT-001).', max_length=64, unique=True)),
                ('craft_type', models.CharField(help_text='Specific craft technique (e.g. Phulkari, Blue Pottery, Chikankari).', max_length=100)),
                ('origin_state', models.CharField(help_text='State in India where the artisan handmade this article.', max_length=100)),
                ('origin_city', models.CharField(help_text='City, town or cluster of origin.', max_length=100)),
                ('tags', models.CharField(blank=True, default='', help_text='Comma-separated keywords for discovery (e.g. handmade, cotton, GI-tagged).', max_length=255)),
                ('primary_image', models.URLField(blank=True, default='', help_text='Primary photograph displaying the product.', max_length=500)),
                ('is_featured', models.BooleanField(default=False, help_text='Whether to highlight this product on the homepage and featured shelf.')),
                ('materials', models.CharField(blank=True, default='', help_text='Artisanal materials (e.g. Pure Mulberry Silk, Natural Terracotta, Brass).', max_length=255)),
                ('dimensions', models.CharField(blank=True, default='', help_text='Physical dimensions or sizing (e.g. 10" x 6" x 6", Free Size).', max_length=150)),
                ('care_instructions', models.TextField(blank=True, default='', help_text='Recommended care instructions to preserve the handmade craft.')),
                ('shipping_info', models.TextField(blank=True, default='', help_text='Shipping timeline and dispatch details.')),
                ('returns_info', models.TextField(blank=True, default='', help_text='Artisan returns and replacement policy.')),
                ('approval_status', models.CharField(choices=[('DRAFT', 'Draft'), ('PENDING', 'Pending Approval'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('INACTIVE', 'Inactive')], default='PENDING', help_text='Administrative moderation status before public listing.', max_length=20)),
                ('admin_feedback', models.TextField(blank=True, default='', help_text='Feedback provided by admin in case of rejection or required revision.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(help_text='Primary craft category.', on_delete=django.db.models.deletion.PROTECT, related_name='products', to='products.category')),
                ('seller', models.ForeignKey(help_text='The artisan seller storefront responsible for this product.', on_delete=django.db.models.deletion.CASCADE, related_name='products', to='sellers.sellerprofile')),
            ],
            options={
                'verbose_name': 'Product',
                'verbose_name_plural': 'Products',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image_url', models.URLField(help_text='Hosted URL of the photograph.', max_length=500)),
                ('alt_text', models.CharField(blank=True, default='', help_text='Accessibility description for screen readers.', max_length=255)),
                ('is_primary', models.BooleanField(default=False, help_text='Whether this photograph is the primary showcase image.')),
                ('order', models.PositiveSmallIntegerField(default=0, help_text='Visual gallery display sequence (ascending).')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(help_text='Artisan product associated with this photograph.', on_delete=django.db.models.deletion.CASCADE, related_name='images', to='products.product')),
            ],
            options={
                'verbose_name': 'Product Image',
                'verbose_name_plural': 'Product Images',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.CreateModel(
            name='WishlistItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(help_text='Customer who saved this craft piece.', on_delete=django.db.models.deletion.CASCADE, related_name='wishlist_items', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(help_text='Saved craft article.', on_delete=django.db.models.deletion.CASCADE, related_name='wishlisted_by', to='products.product')),
            ],
            options={
                'verbose_name': 'Wishlist Item',
                'verbose_name_plural': 'Wishlist Items',
                'ordering': ['-created_at'],
                'unique_together': {('customer', 'product')},
            },
        ),
        migrations.CreateModel(
            name='ProductReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.PositiveSmallIntegerField(help_text='Artisanal rating scale 1 to 5.')),
                ('title', models.CharField(blank=True, default='', help_text='Brief review headline.', max_length=150)),
                ('comment', models.TextField(help_text='Customer reflection on texture, craftsmanship, and delivery.')),
                ('is_verified_purchase', models.BooleanField(default=True, help_text='Whether purchase was validated against historical order logs.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(help_text='Customer authoring the review.', on_delete=django.db.models.deletion.CASCADE, related_name='reviews_written', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(help_text='Reviewed artisan product.', on_delete=django.db.models.deletion.CASCADE, related_name='customer_reviews', to='products.product')),
            ],
            options={
                'verbose_name': 'Product Review',
                'verbose_name_plural': 'Product Reviews',
                'ordering': ['-created_at'],
                'unique_together': {('product', 'customer')},
            },
        ),
    ]
