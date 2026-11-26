from django.urls import path
from .views import AdminDashboardSummaryView
from .seller_views import (
    AdminSellerListView,
    AdminSellerDetailView,
    AdminSellerApproveView,
    AdminSellerRejectView,
    AdminSellerSuspendView,
    AdminSellerReactivateView,
)
from .product_views import (
    AdminProductListView,
    AdminProductDetailView,
    AdminProductApproveView,
    AdminProductRejectView,
    AdminProductSuspendView,
)
from .customer_views import (
    AdminCustomerListView,
    AdminCustomerDetailView,
    AdminCustomerDeactivateView,
    AdminCustomerActivateView,
)
from .order_views import (
    AdminOrderListView,
    AdminOrderSummaryView,
    AdminOrderDetailView,
)
from .payment_views import (
    AdminPaymentListView,
    AdminPaymentSummaryView,
    AdminPaymentDetailView,
)
from .analytics_views import AdminPlatformAnalyticsView
from .settings_views import AdminPlatformSettingsView, PublicPlatformSettingsView
from .return_views import (
    AdminReturnListView,
    AdminReturnDetailView,
    AdminReturnApproveView,
    AdminReturnRejectView,
    AdminReturnCompleteView,
)

app_name = 'admin_panel'

urlpatterns = [
    path('dashboard/summary/', AdminDashboardSummaryView.as_view(), name='dashboard_summary'),
    path('sellers/', AdminSellerListView.as_view(), name='seller_list'),
    path('sellers/<int:pk>/', AdminSellerDetailView.as_view(), name='seller_detail'),
    path('sellers/<int:pk>/approve/', AdminSellerApproveView.as_view(), name='seller_approve'),
    path('sellers/<int:pk>/reject/', AdminSellerRejectView.as_view(), name='seller_reject'),
    path('sellers/<int:pk>/suspend/', AdminSellerSuspendView.as_view(), name='seller_suspend'),
    path('sellers/<int:pk>/reactivate/', AdminSellerReactivateView.as_view(), name='seller_reactivate'),
    path('products/', AdminProductListView.as_view(), name='product_list'),
    path('products/<int:pk>/', AdminProductDetailView.as_view(), name='product_detail'),
    path('products/<int:pk>/approve/', AdminProductApproveView.as_view(), name='product_approve'),
    path('products/<int:pk>/reject/', AdminProductRejectView.as_view(), name='product_reject'),
    path('products/<int:pk>/suspend/', AdminProductSuspendView.as_view(), name='product_suspend'),
    path('customers/', AdminCustomerListView.as_view(), name='customer_list'),
    path('customers/<int:pk>/', AdminCustomerDetailView.as_view(), name='customer_detail'),
    path('customers/<int:pk>/deactivate/', AdminCustomerDeactivateView.as_view(), name='customer_deactivate'),
    path('customers/<int:pk>/activate/', AdminCustomerActivateView.as_view(), name='customer_activate'),
    path('orders/', AdminOrderListView.as_view(), name='order_list'),
    path('orders/summary/', AdminOrderSummaryView.as_view(), name='order_summary'),
    path('orders/<str:order_number>/', AdminOrderDetailView.as_view(), name='order_detail'),
    path('payments/', AdminPaymentListView.as_view(), name='payment_list'),
    path('payments/summary/', AdminPaymentSummaryView.as_view(), name='payment_summary'),
    path('payments/<str:identifier>/', AdminPaymentDetailView.as_view(), name='payment_detail'),
    path('analytics/', AdminPlatformAnalyticsView.as_view(), name='platform_analytics'),
    path('settings/', AdminPlatformSettingsView.as_view(), name='platform_settings'),
    path('public-settings/', PublicPlatformSettingsView.as_view(), name='public_platform_settings'),
    path('returns/', AdminReturnListView.as_view(), name='return_list'),
    path('returns/<int:pk>/', AdminReturnDetailView.as_view(), name='return_detail'),
    path('returns/<int:pk>/approve/', AdminReturnApproveView.as_view(), name='return_approve'),
    path('returns/<int:pk>/reject/', AdminReturnRejectView.as_view(), name='return_reject'),
    path('returns/<int:pk>/complete/', AdminReturnCompleteView.as_view(), name='return_complete'),
]
