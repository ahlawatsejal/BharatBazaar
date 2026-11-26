from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsApprovedSeller
from .serializers import SellerReviewSerializer, SellerReviewReplySerializer
from products.models import ProductReview
from orders.models import Notification


class SellerReviewPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class SellerReviewListView(APIView):
    """
    GET /api/sellers/reviews/
    Lists customer reviews strictly for products belonging to request.user.seller_profile.
    Supports ?rating=, ?product=, ?reply_status=, ?start_date=, ?end_date=, ?search=, and pagination.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        qs = (
            ProductReview.objects.filter(product__seller=seller)
            .select_related('product', 'customer')
            .order_by('-created_at')
        )

        rating = request.query_params.get('rating', '').strip()
        if rating and rating.isdigit():
            r_val = int(rating)
            if 1 <= r_val <= 5:
                qs = qs.filter(rating=r_val)

        product_id = request.query_params.get('product', '').strip()
        if product_id and product_id.isdigit():
            qs = qs.filter(product_id=int(product_id))

        reply_status = request.query_params.get('reply_status', '').strip().lower()
        if reply_status == 'replied':
            qs = qs.exclude(seller_reply='')
        elif reply_status == 'unreplied':
            qs = qs.filter(Q(seller_reply='') | Q(seller_reply__isnull=True))

        start_date = request.query_params.get('start_date', '').strip()
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)

        end_date = request.query_params.get('end_date', '').strip()
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(product__name__icontains=search)
                | Q(title__icontains=search)
                | Q(comment__icontains=search)
            )

        paginator = SellerReviewPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = SellerReviewSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class SellerReviewSummaryView(APIView):
    """
    GET /api/sellers/reviews/summary/
    Returns real database-computed rating distribution and reply statistics
    for the authenticated seller's products.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request):
        seller = request.user.seller_profile
        qs = ProductReview.objects.filter(product__seller=seller)

        agg = qs.aggregate(
            total_reviews=Count('id'),
            avg_rating=Avg('rating'),
            five_star=Count('id', filter=Q(rating=5)),
            four_star=Count('id', filter=Q(rating=4)),
            three_star=Count('id', filter=Q(rating=3)),
            two_star=Count('id', filter=Q(rating=2)),
            one_star=Count('id', filter=Q(rating=1)),
            unreplied_count=Count('id', filter=Q(seller_reply='') | Q(seller_reply__isnull=True)),
        )

        avg_val = agg['avg_rating']
        average_rating = (
            float(Decimal(str(avg_val)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
            if avg_val is not None
            else 0.0
        )

        return Response(
            {
                'total_reviews': agg['total_reviews'] or 0,
                'average_rating': average_rating,
                'five_star': agg['five_star'] or 0,
                'four_star': agg['four_star'] or 0,
                'three_star': agg['three_star'] or 0,
                'two_star': agg['two_star'] or 0,
                'one_star': agg['one_star'] or 0,
                'unreplied_count': agg['unreplied_count'] or 0,
            },
            status=status.HTTP_200_OK,
        )


class SellerReviewDetailView(APIView):
    """
    GET /api/sellers/reviews/<int:review_id>/
    Returns a single review belonging to the authenticated seller's product.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def get(self, request, review_id):
        seller = request.user.seller_profile
        try:
            review = ProductReview.objects.select_related('product', 'customer').get(
                pk=review_id,
                product__seller=seller,
            )
        except ProductReview.DoesNotExist:
            return Response(
                {'detail': 'Review not found for your storefront products.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SellerReviewSerializer(review).data, status=status.HTTP_200_OK)


class SellerReviewReplyView(APIView):
    """
    POST /api/sellers/reviews/<int:review_id>/reply/
    Allows an approved seller to reply to a review on their own product.
    Preserves original customer rating and review content.
    Sends a duplicate-safe in-app notification to the reviewing customer.
    """
    permission_classes = [IsAuthenticated, IsApprovedSeller]

    def post(self, request, review_id):
        serializer = SellerReviewReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        seller = request.user.seller_profile
        try:
            review = ProductReview.objects.select_related('product', 'customer').get(
                pk=review_id,
                product__seller=seller,
            )
        except ProductReview.DoesNotExist:
            return Response(
                {'detail': 'Review not found for your storefront products.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        allow_update = serializer.validated_data.get('allow_update', False)
        if review.seller_reply and not allow_update:
            return Response(
                {'detail': 'A reply has already been posted for this review. Pass allow_update=true to edit your reply.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review.seller_reply = serializer.validated_data['reply']
        review.seller_replied_at = timezone.now()
        review.seller_replied_by = request.user
        review.save(update_fields=['seller_reply', 'seller_replied_at', 'seller_replied_by', 'updated_at'])

        # Notify reviewing customer without duplicates
        if review.customer:
            notif_title = f'{seller.store_name} replied to your review'
            notif_msg = f'{seller.store_name} responded to your review on "{review.product.name}".'
            if not Notification.objects.filter(
                customer=review.customer,
                title=notif_title,
                message=notif_msg,
            ).exists():
                Notification.objects.create(
                    customer=review.customer,
                    title=notif_title,
                    message=notif_msg,
                    notification_type='ORDER',
                )

        return Response(SellerReviewSerializer(review).data, status=status.HTTP_200_OK)
