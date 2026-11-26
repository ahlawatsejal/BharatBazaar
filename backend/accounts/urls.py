from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CustomerDashboardSummaryView,
    CustomerRegisterView,
    LoginView,
    LogoutView,
    SellerRegisterView,
    UserProfileView,
)

app_name = 'accounts'

urlpatterns = [
    # Customer registration
    path('register/', CustomerRegisterView.as_view(), name='customer_register'),

    # Seller registration
    path('seller/register/', SellerRegisterView.as_view(), name='seller_register'),

    # Authentication & JWT
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # User Profile & Dashboard
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('password/change/', ChangePasswordView.as_view(), name='password_change'),
    path('dashboard-summary/', CustomerDashboardSummaryView.as_view(), name='dashboard_summary'),
]
