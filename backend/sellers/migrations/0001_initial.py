# Generated for sellers app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SellerProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('store_name', models.CharField(help_text='Public brand or storefront name.', max_length=150, unique=True)),
                ('business_description', models.TextField(blank=True, help_text='About the artisan, craft tradition, and studio.')),
                ('state', models.CharField(help_text='Indian state of origin for the artisan craft.', max_length=100)),
                ('city', models.CharField(help_text='City, town or village of the workshop.', max_length=100)),
                ('craft_category', models.CharField(help_text='Primary craft tradition (e.g. Blue Pottery, Chikankari, Phulkari).', max_length=100)),
                ('application_status', models.CharField(choices=[('PENDING', 'Pending Approval'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('SUSPENDED', 'Suspended')], default='PENDING', help_text='Approval status determined by platform administrator.', max_length=20)),
                ('admin_notes', models.TextField(blank=True, help_text='Internal notes from the administrator regarding application review.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(help_text='The user account associated with this seller store.', on_delete=django.db.models.deletion.CASCADE, related_name='seller_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Seller Profile',
                'verbose_name_plural': 'Seller Profiles',
                'ordering': ['-created_at'],
            },
        ),
    ]
