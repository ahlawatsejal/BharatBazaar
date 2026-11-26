from django.db.models import Count, OuterRef, Q, Subquery
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from .models import SellerProfile


class PublicArtisanSerializer(serializers.ModelSerializer):
    """
    Strictly public-safe serializer for approved artisan storefronts.
    Excludes email, phone_number, admin_notes, status_reason, and review metadata.
    """
    artisan_name = serializers.SerializerMethodField()
    approved_products_count = serializers.IntegerField(read_only=True)
    featured_image = serializers.SerializerMethodField()

    class Meta:
        model = SellerProfile
        fields = (
            'id',
            'store_name',
            'artisan_name',
            'business_description',
            'craft_category',
            'city',
            'state',
            'approved_products_count',
            'featured_image',
            'created_at',
        )

    def get_artisan_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or ''
        return ''

    def get_featured_image(self, obj):
        return getattr(obj, 'featured_image', '') or ''


class PublicArtisansListView(APIView):
    """
    GET /api/sellers/public/
    Read-only public directory of APPROVED artisan storefronts.
    Supports ?search=, ?craft=, and ?state=.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        approved_image_subquery = Product.objects.filter(
            seller=OuterRef('pk'),
            approval_status=Product.ApprovalStatus.APPROVED,
            category__is_active=True,
        ).exclude(primary_image='').order_by('-is_featured', '-created_at').values('primary_image')[:1]

        base_qs = (
            SellerProfile.objects.filter(application_status=SellerProfile.ApplicationStatus.APPROVED)
            .select_related('user')
            .annotate(
                approved_products_count=Count(
                    'products',
                    filter=Q(
                        products__approval_status=Product.ApprovalStatus.APPROVED,
                        products__category__is_active=True,
                    ),
                ),
                featured_image=Subquery(approved_image_subquery),
            )
            .order_by('-approved_products_count', 'store_name')
        )

        # Available filter options from approved sellers
        crafts = sorted({c for c in base_qs.values_list('craft_category', flat=True) if c})
        states = sorted({s for s in base_qs.values_list('state', flat=True) if s})

        qs = base_qs
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(store_name__icontains=search)
                | Q(craft_category__icontains=search)
                | Q(city__icontains=search)
                | Q(state__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )

        craft = (request.query_params.get('craft') or '').strip()
        if craft and craft.lower() != 'all':
            qs = qs.filter(craft_category__iexact=craft)

        state = (request.query_params.get('state') or '').strip()
        if state and state.lower() != 'all':
            qs = qs.filter(state__iexact=state)

        serializer = PublicArtisanSerializer(qs, many=True)
        return Response(
            {
                'count': len(serializer.data),
                'artisans': serializer.data,
                'filters': {
                    'crafts': crafts,
                    'states': states,
                },
            },
            status=status.HTTP_200_OK,
        )
