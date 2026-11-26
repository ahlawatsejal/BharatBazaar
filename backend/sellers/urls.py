from django.urls import path
from .views import (
    SellerDashboardOverviewView,
    SellerStoreProfileView,
    SellerProductListCreateView,
    SellerProductDetailView,
    SellerProductImageUploadView,
    SellerInventoryListView,
    SellerInventorySummaryView,
    SellerInventoryAdjustView,
    SellerInventoryHistoryView,
    SellerOrderListView,
    SellerOrderSummaryView,
    SellerOrderDetailView,
    SellerOrderItemStatusView,
    SellerOrderItemShipmentView,
)
from .analytics_views import (
    SellerAnalyticsOverviewView,
    SellerAnalyticsSalesView,
    SellerAnalyticsProductsView,
    SellerAnalyticsOrdersView,
)
from .reviews_views import (
    SellerReviewListView,
    SellerReviewSummaryView,
    SellerReviewDetailView,
    SellerReviewReplyView,
)
from .notifications_views import (
    SellerNotificationListView,
    SellerNotificationUnreadCountView,
    SellerNotificationMarkReadView,
    SellerNotificationMarkAllReadView,
)
from .public_views import PublicArtisansListView

app_name = 'sellers'

urlpatterns = [
    path('public/', PublicArtisansListView.as_view(), name='public_artisans'),
    path('dashboard/', SellerDashboardOverviewView.as_view(), name='dashboard'),
    path('store/', SellerStoreProfileView.as_view(), name='store_profile'),

    # Product Management
    path('products/', SellerProductListCreateView.as_view(), name='seller_products'),
    path('products/upload-image/', SellerProductImageUploadView.as_view(), name='seller_product_image_upload'),
    path('products/<int:pk>/', SellerProductDetailView.as_view(), name='seller_product_detail'),

    # Inventory Management
    path('inventory/', SellerInventoryListView.as_view(), name='seller_inventory'),
    path('inventory/summary/', SellerInventorySummaryView.as_view(), name='seller_inventory_summary'),
    path('inventory/<int:product_id>/', SellerInventoryAdjustView.as_view(), name='seller_inventory_adjust'),
    path('inventory/<int:product_id>/history/', SellerInventoryHistoryView.as_view(), name='seller_inventory_history'),

    # Order & Consignment Management
    path('orders/', SellerOrderListView.as_view(), name='seller_orders'),
    path('orders/summary/', SellerOrderSummaryView.as_view(), name='seller_orders_summary'),
    path('orders/<str:order_number>/', SellerOrderDetailView.as_view(), name='seller_order_detail'),
    path('orders/<str:order_number>/items/<int:item_id>/status/', SellerOrderItemStatusView.as_view(), name='seller_order_item_status'),
    path('orders/<str:order_number>/items/<int:item_id>/shipment/', SellerOrderItemShipmentView.as_view(), name='seller_order_item_shipment'),

    # Seller Analytics
    path('analytics/overview/', SellerAnalyticsOverviewView.as_view(), name='seller_analytics_overview'),
    path('analytics/sales/', SellerAnalyticsSalesView.as_view(), name='seller_analytics_sales'),
    path('analytics/products/', SellerAnalyticsProductsView.as_view(), name='seller_analytics_products'),
    path('analytics/orders/', SellerAnalyticsOrdersView.as_view(), name='seller_analytics_orders'),

    # Seller Reviews & Ratings
    path('reviews/', SellerReviewListView.as_view(), name='seller_reviews'),
    path('reviews/summary/', SellerReviewSummaryView.as_view(), name='seller_reviews_summary'),
    path('reviews/<int:review_id>/', SellerReviewDetailView.as_view(), name='seller_review_detail'),
    path('reviews/<int:review_id>/reply/', SellerReviewReplyView.as_view(), name='seller_review_reply'),

    # Seller Notifications
    path('notifications/', SellerNotificationListView.as_view(), name='seller_notifications'),
    path('notifications/unread-count/', SellerNotificationUnreadCountView.as_view(), name='seller_notifications_unread_count'),
    path('notifications/mark-all-read/', SellerNotificationMarkAllReadView.as_view(), name='seller_notifications_mark_all_read'),
    path('notifications/<int:pk>/read/', SellerNotificationMarkReadView.as_view(), name='seller_notification_mark_read'),
]
