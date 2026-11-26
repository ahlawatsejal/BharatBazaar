from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from .models import Category, Product, WishlistItem, ProductReview
from .serializers import (
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    WishlistItemSerializer,
    ProductReviewSerializer,
    CreateReviewSerializer,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 48


class CategoryListView(generics.ListAPIView):
    """
    GET /api/categories/
    Returns active craft categories with their live product counts.
    """
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Category.objects.filter(is_active=True)
            .annotate(
                product_count=Count(
                    'products',
                    filter=Q(
                        products__approval_status=Product.ApprovalStatus.APPROVED,
                        products__seller__application_status='APPROVED',
                    ),
                )
            )
            .order_by('name')
        )


class ProductListView(generics.ListAPIView):
    """
    GET /api/products/
    Public product catalogue supporting search, filtering by category, origin,
    price range, sorting, and pagination.
    Only approved products from approved sellers are returned.
    """
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        # Strict business rule: Only approved products from approved sellers
        queryset = Product.objects.filter(
            approval_status=Product.ApprovalStatus.APPROVED,
            seller__application_status='APPROVED',
            category__is_active=True,
        ).select_related('category', 'seller')

        params = self.request.query_params

        # 1. Full-text search across name, short_description, description, craft_type, tags, category
        search = params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(short_description__icontains=search)
                | Q(description__icontains=search)
                | Q(craft_type__icontains=search)
                | Q(tags__icontains=search)
                | Q(category__name__icontains=search)
            )

        # 2. Category filter (by slug or id)
        category_slug = params.get('category', '').strip()
        if category_slug:
            queryset = queryset.filter(
                Q(category__slug__iexact=category_slug) | Q(category__name__iexact=category_slug)
            )

        # 3. State / Origin filter
        state = params.get('state', '').strip()
        if state:
            queryset = queryset.filter(origin_state__iexact=state)

        # 4. Craft type filter
        craft = params.get('craft', '').strip()
        if craft:
            queryset = queryset.filter(craft_type__iexact=craft)

        # 4b. Approved seller filter
        seller_id = params.get('seller', '').strip()
        if seller_id.isdigit():
            queryset = queryset.filter(seller_id=int(seller_id))

        # 5. Price range
        min_price = params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except (ValueError, TypeError):
                pass

        max_price = params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        # 6. Featured filter
        featured = params.get('featured')
        if featured in ['true', 'True', '1']:
            queryset = queryset.filter(is_featured=True)

        # 7. Sorting
        ordering = params.get('ordering', '-created_at')
        if ordering in ('price_asc', 'price'):
            queryset = queryset.order_by('price')
        elif ordering in ('price_desc', '-price'):
            queryset = queryset.order_by('-price')
        elif ordering == 'oldest':
            queryset = queryset.order_by('created_at')
        elif ordering == 'popular':
            queryset = queryset.order_by('-available_stock', '-created_at')
        else:
            # Default: newest first
            queryset = queryset.order_by('-created_at')

        return queryset


class ProductDetailView(APIView):
    """
    GET /api/products/<slug>/
    Returns product details for approved products only.
    Optimized with select_related for category and seller, and prefetch_related for images.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = (
                Product.objects.select_related('category', 'seller')
                .prefetch_related('images')
                .get(
                    slug=slug,
                    approval_status=Product.ApprovalStatus.APPROVED,
                    seller__application_status='APPROVED',
                    category__is_active=True,
                )
            )
        except Product.DoesNotExist:
            return Response(
                {'detail': 'Product not found or is currently not available.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductDetailSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FeaturedProductListView(generics.ListAPIView):
    """
    GET /api/products/featured/
    Returns approved featured products for the marketplace showcase.
    """
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = None

    def get_queryset(self):
        return Product.objects.filter(
            approval_status=Product.ApprovalStatus.APPROVED,
            seller__application_status='APPROVED',
            category__is_active=True,
            is_featured=True,
        ).select_related('category', 'seller').order_by('-created_at')[:8]


class IsCustomerRoleUser(BasePermission):
    """Allows access strictly to authenticated users with role=CUSTOMER."""
    message = 'Wishlist is available for customer accounts only.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == User.Role.CUSTOMER
        )


class WishlistView(APIView):
    """
    GET /api/products/wishlist/
    Lists saved artisan pieces for authenticated customer.

    POST /api/products/wishlist/
    Adds approved product to wishlist (idempotent; prevents duplicate entries).
    """
    permission_classes = [IsAuthenticated, IsCustomerRoleUser]

    def get(self, request):
        items = WishlistItem.objects.filter(customer=request.user).select_related('product__seller', 'product__category')
        serializer = WishlistItemSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        product_id = request.data.get('product_id')
        try:
            product = Product.objects.get(
                pk=product_id,
                approval_status=Product.ApprovalStatus.APPROVED,
                seller__application_status='APPROVED',
                category__is_active=True,
            )
        except (Product.DoesNotExist, ValueError, TypeError):
            return Response(
                {'detail': 'Product not found or is currently not available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item, created = WishlistItem.objects.get_or_create(customer=request.user, product=product)
        count = WishlistItem.objects.filter(customer=request.user).count()
        return Response(
            {
                'message': f'"{product.name}" saved to your wishlist.',
                'wishlist_count': count,
                'is_wishlisted': True,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class WishlistDetailView(APIView):
    """
    DELETE /api/products/wishlist/<int:product_id>/
    Removes product from customer's wishlist.
    """
    permission_classes = [IsAuthenticated, IsCustomerRoleUser]

    def delete(self, request, product_id):
        deleted, _ = WishlistItem.objects.filter(customer=request.user, product_id=product_id).delete()
        count = WishlistItem.objects.filter(customer=request.user).count()
        return Response(
            {
                'message': 'Product removed from wishlist.',
                'wishlist_count': count,
                'is_wishlisted': False,
            },
            status=status.HTTP_200_OK,
        )


class WishlistIdsView(APIView):
    """
    GET /api/products/wishlist/ids/
    Returns lightweight array of wishlisted product IDs for fast UI badges.
    """
    permission_classes = [IsAuthenticated, IsCustomerRoleUser]

    def get(self, request):
        ids = list(WishlistItem.objects.filter(customer=request.user).values_list('product_id', flat=True))
        return Response(ids, status=status.HTTP_200_OK)


class MyReviewsView(APIView):
    """
    GET /api/products/reviews/my/
    Lists reviews written by authenticated customer.

    POST /api/products/reviews/
    Submits a review for an authentic piece actually purchased by the customer.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = ProductReview.objects.filter(customer=request.user).select_related('product__seller', 'product__category')
        serializer = ProductReviewSerializer(reviews, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce verified purchase rule: customer must have paid order containing this product
        from orders.models import OrderItem, Order
        has_purchased = OrderItem.objects.filter(
            order__customer=request.user,
            product=product,
            order__payment_status=Order.PaymentStatus.PAID,
        ).exists()

        if not has_purchased:
            return Response(
                {
                    'detail': 'You can only review authentic crafts that you have ordered and confirmed on BharatBazaar.'
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check for duplicate review
        existing = ProductReview.objects.filter(customer=request.user, product=product).first()
        if existing:
            return Response(
                {'detail': 'You have already reviewed this artisanal piece. You can update your existing review.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review = ProductReview.objects.create(
            customer=request.user,
            product=product,
            rating=serializer.validated_data['rating'],
            title=serializer.validated_data.get('title', ''),
            comment=serializer.validated_data['comment'],
            is_verified_purchase=True,
        )

        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewDetailView(APIView):
    """
    PATCH /api/products/reviews/<int:pk>/
    DELETE /api/products/reviews/<int:pk>/
    Updates or deletes customer's own review.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            review = ProductReview.objects.get(pk=pk, customer=request.user)
        except ProductReview.DoesNotExist:
            return Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'rating' in request.data:
            review.rating = int(request.data['rating'])
        if 'title' in request.data:
            review.title = request.data['title']
        if 'comment' in request.data:
            review.comment = request.data['comment']

        review.save()
        return Response(ProductReviewSerializer(review).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            review = ProductReview.objects.get(pk=pk, customer=request.user)
        except ProductReview.DoesNotExist:
            return Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

        review.delete()
        return Response({'message': 'Review deleted successfully.'}, status=status.HTTP_200_OK)
