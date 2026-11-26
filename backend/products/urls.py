from django.urls import path
from .views import (
    CategoryListView,
    FeaturedProductListView,
    ProductDetailView,
    ProductListView,
    WishlistView,
    WishlistDetailView,
    WishlistIdsView,
    MyReviewsView,
    ReviewDetailView,
)

app_name = 'products'

urlpatterns = [
    # Catalogue & Discovery
    path('', ProductListView.as_view(), name='product_list'),
    path('featured/', FeaturedProductListView.as_view(), name='featured_products'),

    # Wishlist (Authenticated Customer)
    path('wishlist/', WishlistView.as_view(), name='wishlist'),
    path('wishlist/ids/', WishlistIdsView.as_view(), name='wishlist_ids'),
    path('wishlist/<int:product_id>/', WishlistDetailView.as_view(), name='wishlist_detail'),

    # Product Reviews
    path('reviews/my/', MyReviewsView.as_view(), name='my_reviews'),
    path('reviews/', MyReviewsView.as_view(), name='create_review'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review_detail'),

    # Dynamic Product Detail by slug
    path('<slug:slug>/', ProductDetailView.as_view(), name='product_detail'),
]
