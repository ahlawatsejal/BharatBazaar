from django.urls import path
from .views import (
    AddressListCreateView,
    AddressDetailView,
    AddressSetDefaultView,
    PaymentConfigView,
    CreateOrderView,
    VerifyPaymentView,
    OrderDetailView,
    OrderListView,
    CancelOrderView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
)
from .return_views import (
    CustomerReturnListCreateView,
    CustomerReturnDetailView,
)

app_name = 'orders'

urlpatterns = [
    # Shipping Address Management
    path('addresses/', AddressListCreateView.as_view(), name='address-list-create'),
    path('addresses/<int:pk>/', AddressDetailView.as_view(), name='address-detail'),
    path('addresses/<int:pk>/default/', AddressSetDefaultView.as_view(), name='address-set-default'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),

    # Customer Return Requests (must appear before <str:order_number>/)
    path('returns/', CustomerReturnListCreateView.as_view(), name='return-list-create'),
    path('returns/<int:pk>/', CustomerReturnDetailView.as_view(), name='return-detail'),

    # Razorpay Payment Config
    path('payment-config/', PaymentConfigView.as_view(), name='payment-config'),

    # Orders & Checkout
    path('create/', CreateOrderView.as_view(), name='order-create'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('', OrderListView.as_view(), name='order-list'),
    path('<str:order_number>/cancel/', CancelOrderView.as_view(), name='order-cancel'),
    path('<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),
]
