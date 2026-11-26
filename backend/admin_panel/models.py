from django.conf import settings
from django.db import models


class PlatformSettings(models.Model):
    """
    Singleton configuration record for manageable BharatBazaar marketplace
    information, homepage announcements, and public contact/social links.
    Never stores backend secrets, credentials, or Django settings.
    """

    class AnnouncementType(models.TextChoices):
        INFORMATION = 'INFORMATION', 'Information'
        PROMOTION = 'PROMOTION', 'Promotion'
        NOTICE = 'NOTICE', 'Notice'

    singleton_key = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)

    # Marketplace information
    marketplace_name = models.CharField(max_length=120, default='BharatBazaar')
    marketplace_tagline = models.CharField(max_length=180, blank=True, default="India's Artisans")
    support_email = models.EmailField(default='support@bharatbazaar.in')
    support_phone = models.CharField(max_length=25, blank=True, default='+91 1800-000-0000')
    marketplace_description = models.TextField(
        blank=True,
        default=(
            "India's curated marketplace for authentic handmade products from artisans, "
            "weavers and local MSMEs across every state."
        ),
    )

    # Homepage announcement
    announcement_message = models.CharField(
        max_length=280,
        blank=True,
        default='Free shipping on orders above ₹999',
    )
    announcement_enabled = models.BooleanField(default=True)
    announcement_type = models.CharField(
        max_length=20,
        choices=AnnouncementType.choices,
        default=AnnouncementType.PROMOTION,
    )

    # Contact & social links
    website_url = models.URLField(max_length=300, blank=True, default='')
    instagram_url = models.URLField(max_length=300, blank=True, default='')
    facebook_url = models.URLField(max_length=300, blank=True, default='')
    linkedin_url = models.URLField(max_length=300, blank=True, default='')

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_platform_settings',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Platform Settings'
        verbose_name_plural = 'Platform Settings'

    def __str__(self):
        return f"{self.marketplace_name} Platform Settings"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(singleton_key=1)
        return obj


class NewsletterSubscription(models.Model):
    """
    Stores normalized newsletter subscriber email addresses.
    Public APIs allow POST subscription only and never expose subscriber lists.
    """
    email = models.EmailField(unique=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Newsletter Subscription'
        verbose_name_plural = 'Newsletter Subscriptions'
        ordering = ['-subscribed_at']

    def __str__(self):
        return self.email
