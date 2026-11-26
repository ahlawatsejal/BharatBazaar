from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User
from products.models import Category, Product, WishlistItem
from products.views import CategoryListView, ProductListView, WishlistView, WishlistDetailView, WishlistIdsView
from products.serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductSellerSummarySerializer,
    WishlistItemSerializer,
    ProductReviewSerializer,
    CreateReviewSerializer,
)


class CatalogueSerializerUnitTests(SimpleTestCase):
    """
    Unit tests for product catalogue and detail serializers and business logic.
    """

    @patch.object(Category.objects, 'filter')
    def test_category_serializer_fields(self, mock_filter):
        mock_qs = MagicMock()
        mock_qs.exists.return_value = False
        mock_filter.return_value = mock_qs

        data = {
            'name': 'Pottery & Ceramics',
            'slug': 'pottery-ceramics',
            'description': 'Jaipur Blue Pottery and Terracotta.',
            'image_url': 'https://example.com/pottery.jpg',
            'is_active': True,
        }
        serializer = CategorySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['name'], 'Pottery & Ceramics')

    def test_product_list_serializer_structure(self):
        expected_fields = {
            'id', 'name', 'slug', 'short_description', 'category',
            'seller', 'price', 'discount_price', 'discount_percentage',
            'available_stock', 'craft_type', 'origin_state', 'origin_city',
            'tags', 'primary_image', 'is_featured', 'created_at'
        }
        serializer_fields = set(ProductListSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(serializer_fields))

    def test_product_detail_serializer_structure(self):
        expected_fields = {
            'id', 'name', 'slug', 'description', 'short_description',
            'category', 'seller', 'price', 'discount_price',
            'discount_percentage', 'available_stock', 'sku', 'craft_type',
            'origin_state', 'origin_city', 'tags', 'primary_image',
            'images', 'materials', 'dimensions', 'care_instructions',
            'shipping_info', 'returns_info', 'is_featured',
            'related_products', 'created_at', 'updated_at'
        }
        serializer_fields = set(ProductDetailSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(serializer_fields))

    def test_product_image_serializer_structure(self):
        expected_fields = {'id', 'image_url', 'alt_text', 'is_primary', 'order'}
        serializer_fields = set(ProductImageSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(serializer_fields))

    def test_seller_summary_excludes_private_fields(self):
        serializer_fields = set(ProductSellerSummarySerializer().fields.keys())
        # Strictly verify no sensitive PII is exposed in public seller summary
        self.assertNotIn('email', serializer_fields)
        self.assertNotIn('phone_number', serializer_fields)
        self.assertNotIn('admin_notes', serializer_fields)
        self.assertTrue({'id', 'store_name', 'business_description', 'state', 'city'}.issubset(serializer_fields))

    def test_wishlist_serializer_structure(self):
        expected_fields = {'id', 'product', 'created_at'}
        fields = set(WishlistItemSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(fields))

    def test_create_review_serializer_validation(self):
        valid_data = {
            'product_id': 1,
            'rating': 5,
            'title': 'Stunning Glaze and Craft',
            'comment': 'The hand-painted floral motifs are exceptionally authentic and beautiful.',
        }
        serializer = CreateReviewSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        invalid_data = {
            'product_id': 1,
            'rating': 6, # Exceeds 5
            'comment': 'Too short', # Less than 10 chars
        }
        invalid_serializer = CreateReviewSerializer(data=invalid_data)
        self.assertFalse(invalid_serializer.is_valid())
        self.assertIn('rating', invalid_serializer.errors)
        self.assertIn('comment', invalid_serializer.errors)


class ProductSearchTests(SimpleTestCase):
    """
    Tests for Step 11.5 (BB-09): Public product search across name, description,
    craft_type, tags, and category; exclusion of unapproved/inactive products;
    empty search; no matches; and combining search with existing filters.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ProductListView.as_view()

    @patch('products.views.Product.objects')
    def test_search_enforces_approved_products_and_filters_case_insensitively(self, mock_prod_mgr):
        qs = MagicMock()
        qs.select_related.return_value = qs
        qs.filter.return_value = qs
        qs.order_by.return_value = qs
        qs.__len__.return_value = 0
        qs.__getitem__.return_value = []
        mock_prod_mgr.filter.return_value = qs

        req = self.factory.get('/api/products/?search=Blue%20Pottery&category=pottery&state=Rajasthan')
        res = self.view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 0)
        self.assertEqual(res.data['results'], [])

        # Base queryset strictly requires APPROVED product, APPROVED seller, active category
        mock_prod_mgr.filter.assert_called_once_with(
            approval_status=Product.ApprovalStatus.APPROVED,
            seller__application_status='APPROVED',
            category__is_active=True,
        )
        # Search Q() + category + state filters applied on queryset
        self.assertGreaterEqual(qs.filter.call_count, 3)

    @patch('products.views.Product.objects')
    def test_empty_search_whitespace_does_not_apply_search_filter(self, mock_prod_mgr):
        qs = MagicMock()
        qs.select_related.return_value = qs
        qs.filter.return_value = qs
        qs.order_by.return_value = qs
        qs.__len__.return_value = 0
        qs.__getitem__.return_value = []
        mock_prod_mgr.filter.return_value = qs

        req = self.factory.get('/api/products/?search=%20%20%20')
        res = self.view(req)
        self.assertEqual(res.status_code, 200)
        qs.filter.assert_not_called()


class WishlistSecurityAndPersistenceTests(SimpleTestCase):
    """
    Tests for Step 11.6 (BB-10): Customer-only wishlist access, unapproved product
    rejection, idempotent additions, customer-scoped listing & deletion.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.wishlist_view = WishlistView.as_view()
        self.detail_view = WishlistDetailView.as_view()
        self.ids_view = WishlistIdsView.as_view()

    def _make_user(self, role=User.Role.CUSTOMER, user_id=10):
        user = User(id=user_id, email=f'{role.lower()}{user_id}@test.in', role=role, is_active=True)
        return user

    def test_unauthenticated_and_non_customer_roles_rejected(self):
        for view_fn, method, url, kwargs in [
            (self.wishlist_view, 'get', '/api/products/wishlist/', {}),
            (self.wishlist_view, 'post', '/api/products/wishlist/', {}),
            (self.detail_view, 'delete', '/api/products/wishlist/5/', {'product_id': 5}),
            (self.ids_view, 'get', '/api/products/wishlist/ids/', {}),
        ]:
            anon = getattr(self.factory, method)(url)
            self.assertEqual(view_fn(anon, **kwargs).status_code, 401)

            seller_req = getattr(self.factory, method)(url)
            force_authenticate(seller_req, user=self._make_user(role=User.Role.SELLER, user_id=20))
            self.assertEqual(view_fn(seller_req, **kwargs).status_code, 403)

            admin_req = getattr(self.factory, method)(url)
            force_authenticate(admin_req, user=self._make_user(role=User.Role.ADMIN, user_id=30))
            self.assertEqual(view_fn(admin_req, **kwargs).status_code, 403)

    @patch('products.views.WishlistItem.objects')
    @patch('products.views.Product.objects')
    def test_customer_adds_approved_product_and_duplicate_prevented(self, mock_prod_mgr, mock_wl_mgr):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=10)
        prod = MagicMock(spec=Product)
        prod.id = 42
        prod.name = 'Jaipur Blue Vase'
        mock_prod_mgr.get.return_value = prod
        mock_wl_mgr.get_or_create.side_effect = [(MagicMock(), True), (MagicMock(), False)]
        mock_wl_mgr.filter.return_value.count.return_value = 1

        req1 = self.factory.post('/api/products/wishlist/', {'product_id': 42}, format='json')
        force_authenticate(req1, user=customer)
        res1 = self.wishlist_view(req1)
        self.assertEqual(res1.status_code, 201)
        self.assertTrue(res1.data['is_wishlisted'])

        # Duplicate add -> 200 idempotent, count stays 1
        req2 = self.factory.post('/api/products/wishlist/', {'product_id': 42}, format='json')
        force_authenticate(req2, user=customer)
        res2 = self.wishlist_view(req2)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data['wishlist_count'], 1)

        # Verify approved product constraint was checked
        mock_prod_mgr.get.assert_called_with(
            pk=42,
            approval_status=Product.ApprovalStatus.APPROVED,
            seller__application_status='APPROVED',
            category__is_active=True,
        )

    @patch('products.views.Product.objects')
    def test_unapproved_or_missing_product_cannot_be_added(self, mock_prod_mgr):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=10)
        mock_prod_mgr.get.side_effect = Product.DoesNotExist

        req = self.factory.post('/api/products/wishlist/', {'product_id': 99}, format='json')
        force_authenticate(req, user=customer)
        res = self.wishlist_view(req)
        self.assertEqual(res.status_code, 400)

    @patch('products.views.WishlistItem.objects')
    def test_customer_lists_and_deletes_only_own_wishlist(self, mock_wl_mgr):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=10)
        mock_wl_mgr.filter.return_value.select_related.return_value = []
        mock_wl_mgr.filter.return_value.delete.return_value = (1, {})
        mock_wl_mgr.filter.return_value.count.return_value = 0

        get_req = self.factory.get('/api/products/wishlist/')
        force_authenticate(get_req, user=customer)
        self.assertEqual(self.wishlist_view(get_req).status_code, 200)
        mock_wl_mgr.filter.assert_called_with(customer=customer)

        del_req = self.factory.delete('/api/products/wishlist/42/')
        force_authenticate(del_req, user=customer)
        res_del = self.detail_view(del_req, product_id=42)
        self.assertEqual(res_del.status_code, 200)
        self.assertFalse(res_del.data['is_wishlisted'])
        mock_wl_mgr.filter.assert_any_call(customer=customer, product_id=42)


class CategoryListTests(SimpleTestCase):
    """
    Tests for Step 11.9: Public CategoryListView returns only active categories
    with approved-product counts and allows anonymous access.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = CategoryListView.as_view()

    @patch('products.views.Category.objects')
    def test_get_queryset_filters_active_categories_only(self, mock_cat_mgr):
        mock_qs = MagicMock()
        mock_annotated = MagicMock()
        mock_qs.annotate.return_value = mock_annotated
        mock_annotated.order_by.return_value = []
        mock_cat_mgr.filter.return_value = mock_qs

        req = self.factory.get('/api/categories/')
        res = self.view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])
        mock_cat_mgr.filter.assert_called_once_with(is_active=True)

    @patch('products.views.Category.objects')
    def test_public_categories_serialize_expected_fields(self, mock_cat_mgr):
        active_cat = MagicMock(
            id=1,
            name='Handloom Sarees',
            slug='handloom-sarees',
            description='Traditional handwoven sarees.',
            image_url='https://example.com/saree.jpg',
            is_active=True,
            product_count=12,
        )
        # Ensure MagicMock name attribute returns string
        active_cat.name = 'Handloom Sarees'
        mock_qs = MagicMock()
        mock_qs.annotate.return_value.order_by.return_value = [active_cat]
        mock_cat_mgr.filter.return_value = mock_qs

        req = self.factory.get('/api/categories/')
        res = self.view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['slug'], 'handloom-sarees')
        self.assertEqual(res.data[0]['product_count'], 12)
        self.assertTrue(res.data[0]['is_active'])
