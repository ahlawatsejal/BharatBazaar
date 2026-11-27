"""
URL configuration for BharatBazaar backend.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from products.views import CategoryListView
from admin_panel.newsletter_views import PublicNewsletterSubscribeView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Accounts & Authentication API routes
    path('api/accounts/', include('accounts.urls')),

    # Platform Admin API routes
    path('api/admin/', include('admin_panel.urls')),

    # Public Newsletter Subscription
    path('api/newsletter/subscribe/', PublicNewsletterSubscribeView.as_view(), name='newsletter_subscribe'),

    # Artisan Sellers API routes
    path('api/sellers/', include('sellers.urls')),

    # Products & Marketplace Discovery
    path('api/products/', include('products.urls')),
    path('api/categories/', CategoryListView.as_view(), name='category_list'),

    # Shopping Cart
    path('api/cart/', include('cart.urls')),

    # Orders, Addresses & Payments
    path('api/orders/', include('orders.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
