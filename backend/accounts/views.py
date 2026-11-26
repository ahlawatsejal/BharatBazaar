from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    ChangePasswordSerializer,
    CustomerRegisterSerializer,
    LoginSerializer,
    LogoutSerializer,
    SellerRegisterSerializer,
    UserProfileSerializer,
)


class CustomerRegisterView(APIView):
    """
    POST /api/accounts/register/
    Registers a new Customer on BharatBazaar and returns JWT tokens.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

    def post(self, request):
        serializer = CustomerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens immediately upon registration
        refresh = RefreshToken.for_user(user)
        user_data = UserProfileSerializer(user).data

        return Response(
            {
                'message': 'Account created successfully. Welcome to BharatBazaar!',
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': user_data,
            },
            status=status.HTTP_201_CREATED,
        )


class SellerRegisterView(APIView):
    """
    POST /api/accounts/seller/register/
    Submits a new artisan / MSME seller application with PENDING status.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

    def post(self, request):
        serializer = SellerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        user_data = UserProfileSerializer(user).data

        return Response(
            {
                'message': (
                    'Your seller application has been submitted successfully! '
                    'Our curatorial team will review your application within 24-48 hours. '
                    'You will be notified once approved.'
                ),
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': user_data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/accounts/login/
    Authenticates user via email and password, returning JWT access & refresh tokens.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    """
    GET /api/accounts/profile/
    PATCH /api/accounts/profile/
    Retrieves or updates the authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/accounts/logout/
    Blacklists the provided refresh token to invalidate user session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    POST /api/accounts/password/change/
    Updates customer password securely using Django's password hashers.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class CustomerDashboardSummaryView(APIView):
    """
    GET /api/accounts/dashboard-summary/
    Provides aggregated statistics and metrics for the Customer Dashboard overview.
    Uses actual customer records from the database.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from orders.models import Order, Address
        from orders.serializers import OrderSerializer
        from products.models import WishlistItem, Product
        from products.serializers import ProductListSerializer

        orders_qs = Order.objects.filter(customer=user)
        total_orders = orders_qs.count()
        pending_deliveries = orders_qs.filter(order_status__in=['CONFIRMED', 'PROCESSING', 'SHIPPED']).count()
        delivered_orders = orders_qs.filter(order_status='DELIVERED').count()
        total_spent = sum((o.total_amount for o in orders_qs.filter(payment_status='PAID')), 0)

        wishlist_count = WishlistItem.objects.filter(customer=user).count()
        addresses_count = Address.objects.filter(customer=user).count()

        recent_orders = orders_qs.prefetch_related('items')[:5]
        recent_orders_data = OrderSerializer(recent_orders, many=True).data

        # Recommended products: featured approved items
        recommended = Product.objects.filter(
            approval_status=Product.ApprovalStatus.APPROVED,
            seller__application_status='APPROVED',
            category__is_active=True,
            is_featured=True,
        ).select_related('category', 'seller')[:4]
        recommended_data = ProductListSerializer(recommended, many=True).data

        return Response(
            {
                'customer': {
                    'name': f"{user.first_name} {user.last_name}".strip() or user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'phone_number': user.phone_number,
                    'member_since': user.date_joined,
                },
                'stats': {
                    'total_orders': total_orders,
                    'pending_deliveries': pending_deliveries,
                    'delivered_orders': delivered_orders,
                    'wishlist_count': wishlist_count,
                    'saved_addresses_count': addresses_count,
                    'total_spent': total_spent,
                },
                'recent_orders': recent_orders_data,
                'recommended_products': recommended_data,
            },
            status=status.HTTP_200_OK,
        )
