from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.exceptions import PermissionDenied

from accounts.models import User
from sellers.models import SellerProfile
from sellers.permissions import IsApprovedSeller
from sellers.serializers import SellerStoreProfileSerializer, SellerProductWriteSerializer
from sellers.views import (
    SellerDashboardOverviewView,
    SellerProductListCreateView,
    SellerProductDetailView,
    SellerProductImageUploadView,
)
from products.models import Category, Product, ProductReview


class SellerPermissionsAndUnitTests(SimpleTestCase):
    """
    Unit tests for Seller Dashboard permissions, data isolation, and serializers.
    Runs fast in-memory using mocked queries and SimpleTestCase.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = SellerDashboardOverviewView.as_view()
        self.permission = IsApprovedSeller()

    def test_unauthenticated_user_permission_rejected(self):
        request = self.factory.get('/api/sellers/dashboard/')
        request.user = MagicMock()
        request.user.is_authenticated = False

        self.assertFalse(self.permission.has_permission(request, None))

    def test_customer_role_permission_denied(self):
        request = self.factory.get('/api/sellers/dashboard/')
        request.user = MagicMock()
        request.user.is_authenticated = True
        request.user.role = User.Role.CUSTOMER

        with self.assertRaises(PermissionDenied) as ctx:
            self.permission.has_permission(request, None)
        self.assertIn('Access restricted to artisan seller accounts', str(ctx.exception))

    def test_pending_seller_permission_denied(self):
        request = self.factory.get('/api/sellers/dashboard/')
        request.user = MagicMock()
        request.user.is_authenticated = True
        request.user.role = User.Role.SELLER

        mock_profile = MagicMock()
        mock_profile.application_status = SellerProfile.ApplicationStatus.PENDING
        request.user.seller_profile = mock_profile

        with self.assertRaises(PermissionDenied) as ctx:
            self.permission.has_permission(request, None)
        self.assertIn('pending curatorial review', str(ctx.exception))

    def test_rejected_seller_permission_denied(self):
        request = self.factory.get('/api/sellers/dashboard/')
        request.user = MagicMock()
        request.user.is_authenticated = True
        request.user.role = User.Role.SELLER

        mock_profile = MagicMock()
        mock_profile.application_status = SellerProfile.ApplicationStatus.REJECTED
        request.user.seller_profile = mock_profile

        with self.assertRaises(PermissionDenied) as ctx:
            self.permission.has_permission(request, None)
        self.assertIn('not approved', str(ctx.exception))

    def test_approved_seller_permission_granted(self):
        request = self.factory.get('/api/sellers/dashboard/')
        request.user = MagicMock()
        request.user.is_authenticated = True
        request.user.role = User.Role.SELLER

        mock_profile = MagicMock()
        mock_profile.application_status = SellerProfile.ApplicationStatus.APPROVED
        request.user.seller_profile = mock_profile

        self.assertTrue(self.permission.has_permission(request, None))

    def test_store_profile_serializer_fields(self):
        expected_fields = {
            'id', 'store_name', 'business_description', 'craft_category',
            'state', 'city', 'application_status', 'is_approved',
            'seller_name', 'email', 'created_at', 'updated_at'
        }
        serializer = SellerStoreProfileSerializer()
        self.assertEqual(expected_fields, set(serializer.fields.keys()))

    @patch('sellers.views.Product.objects.filter')
    @patch('sellers.views.Order.objects.filter')
    @patch('sellers.views.OrderItem.objects.filter')
    def test_empty_seller_dashboard_response_structure(
        self, mock_orderitem_filter, mock_order_filter, mock_product_filter
    ):
        """
        Verify that a newly approved seller with zero products and zero orders
        receives a 200 OK response with clean zeroed statistics, without crashes.
        """
        # Mock product counts
        mock_prod_qs = MagicMock()
        mock_prod_qs.count.return_value = 0
        mock_prod_qs.filter.return_value.count.return_value = 0
        mock_product_filter.return_value = mock_prod_qs

        # Mock order counts
        mock_order_qs = MagicMock()
        mock_order_qs.distinct.return_value = mock_order_qs
        mock_order_qs.count.return_value = 0
        mock_order_qs.filter.return_value.count.return_value = 0
        mock_order_qs.order_by.return_value = []
        mock_order_filter.return_value = mock_order_qs

        # Mock sales aggregates
        mock_item_qs = MagicMock()
        mock_item_qs.aggregate.return_value = {'total': None}
        mock_item_qs.values.return_value.annotate.return_value.order_by.return_value = []
        mock_orderitem_filter.return_value = mock_item_qs

        # Mock authenticated user and seller profile
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.role = User.Role.SELLER
        mock_user.get_full_name.return_value = 'Ramesh Prajapati'
        mock_user.email = 'ramesh@jaipurpottery.com'

        mock_profile = MagicMock()
        mock_profile.id = 1
        mock_profile.store_name = 'Jaipur Blue Pottery'
        mock_profile.business_description = 'Traditional crafts'
        mock_profile.craft_category = 'Pottery & Ceramics'
        mock_profile.state = 'Rajasthan'
        mock_profile.city = 'Jaipur'
        mock_profile.application_status = SellerProfile.ApplicationStatus.APPROVED
        mock_profile.is_approved = True
        mock_profile.user = mock_user
        mock_profile.created_at = '2026-01-01T00:00:00Z'
        mock_profile.updated_at = '2026-01-01T00:00:00Z'
        mock_user.seller_profile = mock_profile

        request = self.factory.get('/api/sellers/dashboard/')
        request.user = mock_user
        force_authenticate(request, user=mock_user)

        response = self.view(request)
        self.assertEqual(response.status_code, 200)

        data = response.data
        self.assertIn('store', data)
        self.assertIn('stats', data)
        self.assertIn('recent_orders', data)
        self.assertIn('best_selling_products', data)

        stats = data['stats']
        self.assertEqual(stats['total_products'], 0)
        self.assertEqual(stats['active_products'], 0)
        self.assertEqual(stats['out_of_stock_products'], 0)
        self.assertEqual(stats['total_orders'], 0)
        self.assertEqual(stats['pending_orders'], 0)
        self.assertEqual(stats['delivered_orders'], 0)
        self.assertEqual(stats['total_sales'], '0.00')

        self.assertEqual(data['recent_orders'], [])
        self.assertEqual(data['best_selling_products'], [])


class SellerProductManagementUnitTests(SimpleTestCase):
    """Unit tests for seller product CRUD validation, approval workflow, and ownership isolation."""

    def setUp(self):
        self.factory = APIRequestFactory()

    @patch('sellers.serializers.Category.objects.get')
    def test_product_write_serializer_valid_and_discount_check(self, mock_cat_get):
        mock_cat = MagicMock(spec=Category)
        mock_cat_get.return_value = mock_cat

        valid_payload = {
            'name': 'Jaipur Blue Pottery Tea Set',
            'short_description': 'Hand-painted quartz ceramic tea set.',
            'description': 'Authentic Jaipur Blue Pottery crafted with quartz powder and natural cobalt.',
            'category_id': 1,
            'price': '2400.00',
            'discount_price': '1950.00',
            'available_stock': 5,
            'craft_type': 'Blue Pottery',
            'origin_state': 'Rajasthan',
            'origin_city': 'Jaipur',
            'primary_image': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
        }
        serializer = SellerProductWriteSerializer(data=valid_payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        # Invalid: discount_price >= price
        bad_payload = dict(valid_payload, discount_price='2500.00')
        bad_ser = SellerProductWriteSerializer(data=bad_payload)
        self.assertFalse(bad_ser.is_valid())
        self.assertIn('discount_price', bad_ser.errors)

    @patch('sellers.serializers.Category.objects.get')
    def test_product_image_url_validation_rejects_invalid_scheme(self, mock_cat_get):
        mock_cat_get.return_value = MagicMock(spec=Category)
        payload = {
            'name': 'Handloom Shawl',
            'description': 'Pure wool handwoven shawl.',
            'category_id': 1,
            'price': '3000.00',
            'available_stock': 3,
            'craft_type': 'Handloom',
            'origin_state': 'Kashmir',
            'origin_city': 'Srinagar',
            'primary_image': 'ftp://invalid-url.com/img.png',
        }
        serializer = SellerProductWriteSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('primary_image', serializer.errors)

    def test_pending_seller_cannot_create_product(self):
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.role = User.Role.SELLER
        mock_profile = MagicMock()
        mock_profile.application_status = SellerProfile.ApplicationStatus.PENDING
        mock_user.seller_profile = mock_profile

        request = self.factory.post('/api/sellers/products/', {'name': 'Test'}, format='json')
        force_authenticate(request, user=mock_user)

        view = SellerProductListCreateView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 403)

    @patch('sellers.views.Product.objects.select_related')
    def test_seller_cannot_edit_or_delete_another_sellers_product(self, mock_select_related):
        mock_select_related.return_value.prefetch_related.return_value.get.side_effect = Product.DoesNotExist

        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.role = User.Role.SELLER
        mock_profile = MagicMock()
        mock_profile.application_status = SellerProfile.ApplicationStatus.APPROVED
        mock_profile.is_approved = True
        mock_user.seller_profile = mock_profile

        view = SellerProductDetailView.as_view()

        req_patch = self.factory.patch('/api/sellers/products/999/', {'name': 'Hijack'}, format='json')
        force_authenticate(req_patch, user=mock_user)
        res_patch = view(req_patch, pk=999)
        self.assertEqual(res_patch.status_code, 404)

        req_del = self.factory.delete('/api/sellers/products/999/')
        force_authenticate(req_del, user=mock_user)
        res_del = view(req_del, pk=999)
        self.assertEqual(res_del.status_code, 404)

    def test_image_upload_rejects_invalid_extension(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.role = User.Role.SELLER
        mock_profile = MagicMock()
        mock_profile.application_status = SellerProfile.ApplicationStatus.APPROVED
        mock_profile.is_approved = True
        mock_user.seller_profile = mock_profile

        bad_file = SimpleUploadedFile('malware.exe', b'badcontent', content_type='application/octet-stream')
        request = self.factory.post('/api/sellers/products/upload-image/', {'image': bad_file})
        force_authenticate(request, user=mock_user)

        view = SellerProductImageUploadView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn('Unsupported file type', response.data['detail'])


class SellerInventoryAndImageSecurityTests(SimpleTestCase):
    """
    Tests for Step 8.3: Seller Inventory Management, Row-Locked Adjustments,
    Immutable History, Stock Rules, and Binary Image Content Validation.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    def _make_user(self, role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.APPROVED):
        user = MagicMock()
        user.is_authenticated = True
        user.role = role
        user.get_full_name.return_value = 'Gopal Kumawat'
        user.email = 'gopal@example.com'
        if role == User.Role.SELLER:
            profile = MagicMock(spec=SellerProfile)
            profile.id = 10
            profile.application_status = app_status
            profile.is_approved = (app_status == SellerProfile.ApplicationStatus.APPROVED)
            user.seller_profile = profile
        return user

    def test_customer_and_pending_seller_cannot_access_inventory(self):
        from sellers.views import SellerInventoryListView, SellerInventorySummaryView
        list_view = SellerInventoryListView.as_view()
        summary_view = SellerInventorySummaryView.as_view()

        customer = self._make_user(role=User.Role.CUSTOMER)
        req1 = self.factory.get('/api/sellers/inventory/')
        force_authenticate(req1, user=customer)
        self.assertEqual(list_view(req1).status_code, 403)

        pending = self._make_user(role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.PENDING)
        req2 = self.factory.get('/api/sellers/inventory/summary/')
        force_authenticate(req2, user=pending)
        self.assertEqual(summary_view(req2).status_code, 403)

    @patch('sellers.views.Product.objects.filter')
    def test_approved_seller_can_view_own_inventory(self, mock_filter):
        from sellers.views import SellerInventoryListView
        mock_qs = MagicMock()
        mock_qs.select_related.return_value.order_by.return_value = []
        mock_filter.return_value = mock_qs

        seller = self._make_user()
        req = self.factory.get('/api/sellers/inventory/')
        force_authenticate(req, user=seller)
        res = SellerInventoryListView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        mock_filter.assert_called_once_with(seller=seller.seller_profile)

    def test_stock_status_rules_calculation(self):
        p_out = Product(available_stock=0, low_stock_threshold=5)
        self.assertEqual(p_out.inventory_status, 'OUT_OF_STOCK')

        p_low = Product(available_stock=5, low_stock_threshold=5)
        self.assertEqual(p_low.inventory_status, 'LOW_STOCK')

        p_in = Product(available_stock=6, low_stock_threshold=5)
        self.assertEqual(p_in.inventory_status, 'IN_STOCK')

    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.Product.objects.select_for_update')
    def test_seller_cannot_adjust_another_sellers_inventory(self, mock_s4u, mock_atomic):
        from sellers.views import SellerInventoryAdjustView
        mock_s4u.return_value.get.side_effect = Product.DoesNotExist

        seller = self._make_user()
        req = self.factory.patch('/api/sellers/inventory/999/', {'action': 'set', 'quantity': 10}, format='json')
        force_authenticate(req, user=seller)
        res = SellerInventoryAdjustView.as_view()(req, product_id=999)
        self.assertEqual(res.status_code, 404)

    @patch('sellers.views.Product.objects.get')
    def test_seller_cannot_view_another_sellers_history(self, mock_get):
        from sellers.views import SellerInventoryHistoryView
        mock_get.side_effect = Product.DoesNotExist

        seller = self._make_user()
        req = self.factory.get('/api/sellers/inventory/999/history/')
        force_authenticate(req, user=seller)
        res = SellerInventoryHistoryView.as_view()(req, product_id=999)
        self.assertEqual(res.status_code, 404)

    def test_history_endpoint_forbids_mutations(self):
        from sellers.views import SellerInventoryHistoryView
        seller = self._make_user()
        view = SellerInventoryHistoryView.as_view()

        req_patch = self.factory.patch('/api/sellers/inventory/1/history/', {}, format='json')
        force_authenticate(req_patch, user=seller)
        self.assertEqual(view(req_patch, product_id=1).status_code, 405)

        req_del = self.factory.delete('/api/sellers/inventory/1/history/')
        force_authenticate(req_del, user=seller)
        self.assertEqual(view(req_del, product_id=1).status_code, 405)

    def test_invalid_stock_values_rejected(self):
        from sellers.serializers import InventoryAdjustmentSerializer
        # Negative quantity rejected
        ser1 = InventoryAdjustmentSerializer(data={'action': 'set', 'quantity': -5})
        self.assertFalse(ser1.is_valid())
        self.assertIn('quantity', ser1.errors)

        # Zero delta for increase/decrease rejected
        ser2 = InventoryAdjustmentSerializer(data={'action': 'increase', 'quantity': 0})
        self.assertFalse(ser2.is_valid())

        # Non-integer rejected
        ser3 = InventoryAdjustmentSerializer(data={'action': 'set', 'quantity': 'abc'})
        self.assertFalse(ser3.is_valid())

    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.Product.objects.select_for_update')
    def test_decrease_below_zero_rejected(self, mock_s4u, mock_atomic):
        from sellers.views import SellerInventoryAdjustView
        mock_prod = MagicMock(spec=Product)
        mock_prod.available_stock = 3
        mock_s4u.return_value.get.return_value = mock_prod

        seller = self._make_user()
        req = self.factory.patch('/api/sellers/inventory/1/', {'action': 'decrease', 'quantity': 5}, format='json')
        force_authenticate(req, user=seller)
        res = SellerInventoryAdjustView.as_view()(req, product_id=1)
        self.assertEqual(res.status_code, 400)
        self.assertIn('Only 3 units currently available', res.data['detail'])

    @patch('sellers.views.InventoryHistory.objects.create')
    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.Product.objects.select_for_update')
    def test_valid_stock_adjustment_updates_and_logs_history_atomically(
        self, mock_s4u, mock_atomic, mock_history_create
    ):
        from sellers.views import SellerInventoryAdjustView
        mock_prod = Product(id=1, name='Blue Pottery Vase', sku='BB-POT-1', available_stock=4, low_stock_threshold=5)
        mock_prod.category = Category(id=1, name='Pottery', slug='pottery')
        mock_prod.save = MagicMock()
        mock_s4u.return_value.get.return_value = mock_prod

        mock_history = MagicMock()
        mock_history.id = 77
        mock_history.product_id = 1
        mock_history.product.name = 'Blue Pottery Vase'
        mock_history.previous_stock = 4
        mock_history.new_stock = 10
        mock_history.adjustment_amount = 6
        mock_history.reason = 'New kiln batch'
        mock_history.adjusted_by = None
        mock_history.created_at = '2026-11-26T12:00:00Z'
        mock_history_create.return_value = mock_history

        seller = self._make_user()
        req = self.factory.patch(
            '/api/sellers/inventory/1/',
            {'action': 'increase', 'quantity': 6, 'reason': 'New kiln batch'},
            format='json',
        )
        force_authenticate(req, user=seller)
        res = SellerInventoryAdjustView.as_view()(req, product_id=1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(mock_prod.available_stock, 10)
        mock_prod.save.assert_called_once()
        mock_history_create.assert_called_once()

    def test_image_upload_rejects_disguised_non_image_content(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        seller = self._make_user()
        view = SellerProductImageUploadView.as_view()

        # Plain text renamed to .jpg
        fake_jpg = SimpleUploadedFile('evil.jpg', b'<html><script>alert(1)</script></html>', content_type='image/jpeg')
        req1 = self.factory.post('/api/sellers/products/upload-image/', {'image': fake_jpg})
        force_authenticate(req1, user=seller)
        res1 = view(req1)
        self.assertEqual(res1.status_code, 400)
        self.assertIn('Invalid or corrupted image file', res1.data['detail'])

        # PNG bytes disguised as .jpg
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' + b'\x00' * 16
        mismatched = SimpleUploadedFile('wrong.jpg', png_bytes, content_type='image/jpeg')
        req2 = self.factory.post('/api/sellers/products/upload-image/', {'image': mismatched})
        force_authenticate(req2, user=seller)
        res2 = view(req2)
        self.assertEqual(res2.status_code, 400)
        self.assertIn('does not match', res2.data['detail'])

    @patch('sellers.views.default_storage.save')
    def test_image_upload_accepts_valid_jpeg_png_webp_signatures(self, mock_save):
        from django.core.files.uploadedfile import SimpleUploadedFile
        mock_save.return_value = 'products/test.png'
        seller = self._make_user()
        view = SellerProductImageUploadView.as_view()

        samples = [
            ('valid.jpg', b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 24, 'image/jpeg'),
            ('valid.png', b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' + b'\x00' * 20, 'image/png'),
            ('valid.webp', b'RIFF\x24\x00\x00\x00WEBPVP8 ' + b'\x00' * 20, 'image/webp'),
        ]
        for fname, content, ctype in samples:
            f = SimpleUploadedFile(fname, content, content_type=ctype)
            req = self.factory.post('/api/sellers/products/upload-image/', {'image': f})
            force_authenticate(req, user=seller)
            res = view(req)
            self.assertEqual(res.status_code, 201, f'Failed for {fname}: {res.data}')
            self.assertIn('image_url', res.data)


class SellerOrderManagementTests(SimpleTestCase):
    """
    Tests for Step 8.4: Seller Order & Consignment Management, Multi-Vendor Isolation,
    Fulfillment State Machine, Shipment Details, Notifications, and Stock/Payment Integrity.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    def _make_user(self, role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.APPROVED, seller_id=10):
        user = MagicMock()
        user.is_authenticated = True
        user.role = role
        user.get_full_name.return_value = 'Gopal Kumawat'
        user.email = 'gopal@example.com'
        if role == User.Role.SELLER:
            profile = MagicMock(spec=SellerProfile)
            profile.id = seller_id
            profile.store_name = 'Kumawat Blue Art Pottery'
            profile.application_status = app_status
            profile.is_approved = (app_status == SellerProfile.ApplicationStatus.APPROVED)
            user.seller_profile = profile
        return user

    def test_customer_and_pending_seller_cannot_access_seller_orders(self):
        from sellers.views import SellerOrderListView, SellerOrderSummaryView
        list_view = SellerOrderListView.as_view()
        sum_view = SellerOrderSummaryView.as_view()

        cust = self._make_user(role=User.Role.CUSTOMER)
        req1 = self.factory.get('/api/sellers/orders/')
        force_authenticate(req1, user=cust)
        self.assertEqual(list_view(req1).status_code, 403)

        pending = self._make_user(role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.PENDING)
        req2 = self.factory.get('/api/sellers/orders/summary/')
        force_authenticate(req2, user=pending)
        self.assertEqual(sum_view(req2).status_code, 403)

    @patch('sellers.views.Order.objects.select_related')
    def test_seller_cannot_view_another_sellers_order(self, mock_select):
        from orders.models import Order
        from sellers.views import SellerOrderDetailView
        mock_select.return_value.get.side_effect = Order.DoesNotExist

        seller = self._make_user()
        req = self.factory.get('/api/sellers/orders/BB-ORD-999/')
        force_authenticate(req, user=seller)
        res = SellerOrderDetailView.as_view()(req, order_number='BB-ORD-999')
        self.assertEqual(res.status_code, 404)

    @patch('sellers.views.Order.objects.filter')
    def test_seller_order_list_calculates_seller_specific_subtotal_only(self, mock_filter):
        from sellers.views import SellerOrderListView
        from orders.models import Order, OrderItem

        seller = self._make_user(seller_id=10)

        # Mock order with 2 items belonging to this seller (total = 1500 + 500 = 2000)
        item1 = OrderItem(
            id=1, product_name='Blue Pottery Vase', unit_price=Decimal('1500.00'),
            quantity=1, line_total=Decimal('1500.00'), fulfillment_status='NEW'
        )
        item2 = OrderItem(
            id=2, product_name='Ceramic Coaster Set', unit_price=Decimal('250.00'),
            quantity=2, line_total=Decimal('500.00'), fulfillment_status='NEW'
        )
        mock_order = MagicMock(spec=Order)
        mock_order.order_number = 'BB-ORD-20261126-ABCD'
        mock_order.created_at = '2026-11-26T10:00:00Z'
        mock_order.payment_status = 'PAID'
        mock_order.order_status = 'CONFIRMED'
        mock_order.total_amount = Decimal('5000.00')  # Includes another seller's 3000.00!
        mock_order.shipping_address_snapshot = {'full_name': 'Ananya Sharma', 'city': 'Delhi', 'state': 'Delhi'}
        mock_order.customer.get_full_name.return_value = 'Ananya Sharma'
        mock_order.items.filter.return_value.order_by.return_value = [item1, item2]

        mock_qs = MagicMock()
        mock_qs.distinct.return_value.select_related.return_value.order_by.return_value = [mock_order]
        mock_filter.return_value = mock_qs

        req = self.factory.get('/api/sellers/orders/')
        force_authenticate(req, user=seller)
        res = SellerOrderListView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['seller_subtotal'], '2000.00')
        self.assertEqual(res.data[0]['items_count'], 2)
        self.assertEqual(res.data[0]['total_units'], 3)

    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.OrderItem.objects.select_for_update')
    def test_seller_cannot_update_another_sellers_order_item(self, mock_s4u, mock_atomic):
        from orders.models import OrderItem
        from sellers.views import SellerOrderItemStatusView, SellerOrderItemShipmentView

        mock_s4u.return_value.select_related.return_value.get.side_effect = OrderItem.DoesNotExist
        seller = self._make_user()

        req1 = self.factory.patch(
            '/api/sellers/orders/BB-ORD-1/items/99/status/',
            {'fulfillment_status': 'ACCEPTED'},
            format='json',
        )
        force_authenticate(req1, user=seller)
        self.assertEqual(
            SellerOrderItemStatusView.as_view()(req1, order_number='BB-ORD-1', item_id=99).status_code,
            404,
        )

        req2 = self.factory.patch(
            '/api/sellers/orders/BB-ORD-1/items/99/shipment/',
            {'courier_name': 'Delhivery', 'tracking_number': 'DLV123'},
            format='json',
        )
        force_authenticate(req2, user=seller)
        self.assertEqual(
            SellerOrderItemShipmentView.as_view()(req2, order_number='BB-ORD-1', item_id=99).status_code,
            404,
        )

    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.OrderItem.objects.select_for_update')
    def test_unpaid_order_cannot_be_accepted_or_shipped(self, mock_s4u, mock_atomic):
        from orders.models import Order, OrderItem
        from sellers.views import SellerOrderItemStatusView

        mock_order = MagicMock(spec=Order)
        mock_order.payment_status = Order.PaymentStatus.PENDING

        mock_item = MagicMock(spec=OrderItem)
        mock_item.order = mock_order
        mock_item.fulfillment_status = OrderItem.FulfillmentStatus.NEW
        mock_s4u.return_value.select_related.return_value.get.return_value = mock_item

        seller = self._make_user()
        req = self.factory.patch(
            '/api/sellers/orders/BB-ORD-1/items/1/status/',
            {'fulfillment_status': 'ACCEPTED'},
            format='json',
        )
        force_authenticate(req, user=seller)
        res = SellerOrderItemStatusView.as_view()(req, order_number='BB-ORD-1', item_id=1)
        self.assertEqual(res.status_code, 400)
        self.assertIn('payment status', res.data['detail'])

    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.OrderItem.objects.select_for_update')
    def test_invalid_status_transition_rejected_and_stock_untouched(self, mock_s4u, mock_atomic):
        from orders.models import Order, OrderItem
        from sellers.views import SellerOrderItemStatusView

        mock_order = MagicMock(spec=Order)
        mock_order.payment_status = Order.PaymentStatus.PAID

        mock_item = MagicMock(spec=OrderItem)
        mock_item.order = mock_order
        mock_item.fulfillment_status = OrderItem.FulfillmentStatus.NEW
        mock_s4u.return_value.select_related.return_value.get.return_value = mock_item

        seller = self._make_user()
        # Jumping directly from NEW -> SHIPPED must be rejected
        req = self.factory.patch(
            '/api/sellers/orders/BB-ORD-1/items/1/status/',
            {'fulfillment_status': 'SHIPPED'},
            format='json',
        )
        force_authenticate(req, user=seller)
        res = SellerOrderItemStatusView.as_view()(req, order_number='BB-ORD-1', item_id=1)
        self.assertEqual(res.status_code, 400)
        self.assertIn('Invalid status transition', res.data['detail'])
        mock_item.save.assert_not_called()

    def test_multi_seller_parent_order_status_sync_consistency(self):
        from orders.models import Order, OrderItem
        from sellers.views import sync_parent_order_status

        mock_order = MagicMock(spec=Order)
        mock_order.order_status = Order.OrderStatus.CONFIRMED

        # Case 1: Seller A shipped, Seller B still NEW -> parent stays PROCESSING (not SHIPPED)
        mock_order.items.values_list.return_value = [
            OrderItem.FulfillmentStatus.SHIPPED,
            OrderItem.FulfillmentStatus.NEW,
        ]
        sync_parent_order_status(mock_order)
        self.assertEqual(mock_order.order_status, Order.OrderStatus.PROCESSING)

        # Case 2: Both sellers SHIPPED -> parent becomes SHIPPED
        mock_order.items.values_list.return_value = [
            OrderItem.FulfillmentStatus.SHIPPED,
            OrderItem.FulfillmentStatus.SHIPPED,
        ]
        sync_parent_order_status(mock_order)
        self.assertEqual(mock_order.order_status, Order.OrderStatus.SHIPPED)

        # Case 3: Both sellers DELIVERED -> parent becomes DELIVERED
        mock_order.items.values_list.return_value = [
            OrderItem.FulfillmentStatus.DELIVERED,
            OrderItem.FulfillmentStatus.DELIVERED,
        ]
        sync_parent_order_status(mock_order)
        self.assertEqual(mock_order.order_status, Order.OrderStatus.DELIVERED)

    @patch('sellers.views._create_customer_order_notification')
    @patch('sellers.views.transaction.atomic')
    @patch('sellers.views.OrderItem.objects.select_for_update')
    def test_shipment_details_stored_correctly(self, mock_s4u, mock_atomic, mock_notify):
        from orders.models import Order, OrderItem
        from sellers.views import SellerOrderItemShipmentView

        mock_order = Order(order_number='BB-ORD-1', payment_status=Order.PaymentStatus.PAID)

        mock_item = OrderItem(
            id=1, order=mock_order, product_name='Vase', unit_price=Decimal('1000.00'),
            quantity=1, line_total=Decimal('1000.00'), fulfillment_status='READY_TO_DISPATCH'
        )
        mock_item.save = MagicMock()
        mock_s4u.return_value.select_related.return_value.get.return_value = mock_item

        seller = self._make_user()
        req = self.factory.patch(
            '/api/sellers/orders/BB-ORD-1/items/1/shipment/',
            {
                'courier_name': 'BlueDart Express',
                'tracking_number': 'BD99887766',
                'tracking_url': 'https://bluedart.com/track/BD99887766',
                'shipment_notes': 'Fragile double-boxed',
            },
            format='json',
        )
        force_authenticate(req, user=seller)
        res = SellerOrderItemShipmentView.as_view()(req, order_number='BB-ORD-1', item_id=1)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(mock_item.courier_name, 'BlueDart Express')
        self.assertEqual(mock_item.tracking_number, 'BD99887766')
        self.assertEqual(mock_item.tracking_url, 'https://bluedart.com/track/BD99887766')
        mock_item.save.assert_called_once()
        mock_notify.assert_called_once()

    @patch('sellers.views.Notification.objects.create')
    @patch('sellers.views.Notification.objects.filter')
    def test_duplicate_notification_prevented(self, mock_notif_filter, mock_notif_create):
        from orders.models import Order
        from sellers.views import _create_customer_order_notification

        mock_order = MagicMock(spec=Order)
        mock_order.customer = MagicMock()
        mock_notif_filter.return_value.exists.return_value = True

        _create_customer_order_notification(mock_order, 'Title', 'Msg', 'DISPATCH')
        mock_notif_create.assert_not_called()

    def test_customer_order_item_serializer_exposes_tracking_fields(self):
        from orders.serializers import OrderItemSerializer
        fields = set(OrderItemSerializer().fields.keys())
        expected = {
            'fulfillment_status', 'courier_name', 'tracking_number',
            'tracking_url', 'dispatched_at', 'estimated_delivery_date', 'shipment_notes',
        }
        self.assertTrue(expected.issubset(fields))


class SellerAnalyticsTests(SimpleTestCase):
    """
    Tests for Step 8.5: Seller Analytics Overview, Sales, Products, and Orders endpoints.
    Covers authentication, role permissions, seller isolation, unpaid/cancelled exclusion,
    date range validation, empty datasets, and multi-vendor order counts.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    def _make_user(self, role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.APPROVED, seller_id=10):
        user = MagicMock()
        user.is_authenticated = True
        user.role = role
        if role == User.Role.SELLER:
            profile = MagicMock(spec=SellerProfile)
            profile.id = seller_id
            profile.application_status = app_status
            profile.is_approved = (app_status == SellerProfile.ApplicationStatus.APPROVED)
            user.seller_profile = profile
        return user

    def test_anonymous_customer_and_pending_seller_rejected(self):
        from sellers.analytics_views import SellerAnalyticsOverviewView
        view = SellerAnalyticsOverviewView.as_view()

        # Anonymous
        req_anon = self.factory.get('/api/sellers/analytics/overview/')
        self.assertEqual(view(req_anon).status_code, 401)

        # Customer
        req_cust = self.factory.get('/api/sellers/analytics/overview/')
        force_authenticate(req_cust, user=self._make_user(role=User.Role.CUSTOMER))
        self.assertEqual(view(req_cust).status_code, 403)

        # Pending Seller
        req_pend = self.factory.get('/api/sellers/analytics/overview/')
        force_authenticate(
            req_pend,
            user=self._make_user(role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.PENDING),
        )
        self.assertEqual(view(req_pend).status_code, 403)

    def test_date_range_parsing_and_validation(self):
        from rest_framework.exceptions import ValidationError
        from rest_framework.request import Request
        from sellers.analytics_views import _parse_date_range

        # Valid 7d
        req_7d = Request(self.factory.get('/api/sellers/analytics/overview/?range=7d'))
        key, start, end, prev_start, prev_end = _parse_date_range(req_7d)
        self.assertEqual(key, '7d')
        self.assertEqual((end - start).days + 1, 7)
        self.assertEqual((prev_end - prev_start).days + 1, 7)

        # Valid custom
        req_custom = Request(
            self.factory.get('/api/sellers/analytics/overview/?range=custom&start_date=2026-01-01&end_date=2026-01-10')
        )
        key, start, end, _, _ = _parse_date_range(req_custom)
        self.assertEqual(key, 'custom')
        self.assertEqual(start.isoformat(), '2026-01-01')
        self.assertEqual(end.isoformat(), '2026-01-10')

        # Invalid: start > end
        req_bad = Request(
            self.factory.get('/api/sellers/analytics/overview/?range=custom&start_date=2026-02-01&end_date=2026-01-01')
        )
        with self.assertRaises(ValidationError):
            _parse_date_range(req_bad)

    @patch('sellers.analytics_views.OrderItem.objects.filter')
    def test_paid_active_items_excludes_unpaid_and_cancelled_and_isolates_seller(self, mock_filter):
        from datetime import date
        from orders.models import Order, OrderItem
        from sellers.analytics_views import _paid_active_items_qs

        seller = self._make_user(seller_id=42).seller_profile
        start = date(2026, 1, 1)
        end = date(2026, 1, 31)

        _paid_active_items_qs(seller, start, end)

        mock_filter.assert_called_once_with(
            seller=seller,
            order__payment_status=Order.PaymentStatus.PAID,
            order__created_at__date__gte=start,
            order__created_at__date__lte=end,
        )
        mock_filter.return_value.exclude.assert_called_once_with(
            fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED
        )

    @patch('sellers.analytics_views.Product.objects.filter')
    @patch('sellers.analytics_views._paid_active_items_qs')
    def test_empty_analytics_overview_returns_zeros(self, mock_paid_qs, mock_prod_filter):
        from sellers.analytics_views import SellerAnalyticsOverviewView

        empty_items = MagicMock()
        empty_items.aggregate.return_value = {'total': None}
        empty_items.values.return_value.distinct.return_value.count.return_value = 0
        empty_items.values.return_value.annotate.return_value.order_by.return_value.first.return_value = None
        mock_paid_qs.return_value = empty_items

        empty_prods = MagicMock()
        empty_prods.count.return_value = 0
        empty_prods.filter.return_value.count.return_value = 0
        mock_prod_filter.return_value = empty_prods

        seller = self._make_user()
        req = self.factory.get('/api/sellers/analytics/overview/?range=30d')
        force_authenticate(req, user=seller)
        res = SellerAnalyticsOverviewView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total_sales'], '0.00')
        self.assertEqual(res.data['total_orders'], 0)
        self.assertEqual(res.data['average_order_value'], '0.00')
        self.assertIsNone(res.data['best_selling_product'])

    @patch('sellers.analytics_views._paid_active_items_qs')
    def test_sales_analytics_empty_and_comparison(self, mock_paid_qs):
        from sellers.analytics_views import SellerAnalyticsSalesView

        mock_qs = MagicMock()
        mock_qs.annotate.return_value.values.return_value.annotate.return_value.order_by.return_value = []
        mock_qs.aggregate.return_value = {'total': Decimal('2500.00')}
        mock_qs.values.return_value.distinct.return_value.count.return_value = 2
        mock_paid_qs.return_value = mock_qs

        seller = self._make_user()
        req = self.factory.get('/api/sellers/analytics/sales/?range=7d')
        force_authenticate(req, user=seller)
        res = SellerAnalyticsSalesView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['daily_trend'], [])
        self.assertEqual(res.data['monthly_trend'], [])
        self.assertEqual(res.data['comparison']['current_sales'], '2500.00')
        self.assertEqual(res.data['comparison']['current_orders'], 2)

    @patch('sellers.analytics_views.Product.objects.filter')
    def test_product_analytics_structure_and_buckets(self, mock_prod_filter):
        from sellers.analytics_views import SellerAnalyticsProductsView

        p1 = MagicMock(id=1, sku='BB-1', price=Decimal('1000.00'), discount_price=None,
                       available_stock=5, approval_status='APPROVED', units_sold=8, revenue=Decimal('8000.00'))
        p1.name = 'Blue Vase'
        p1.category.name = 'Pottery'
        p2 = MagicMock(id=2, sku='BB-2', price=Decimal('300.00'), discount_price=None,
                       available_stock=10, approval_status='APPROVED', units_sold=1, revenue=Decimal('300.00'))
        p2.name = 'Clay Cup'
        p2.category.name = 'Pottery'
        p3 = MagicMock(id=3, sku='BB-3', price=Decimal('500.00'), discount_price=None,
                       available_stock=4, approval_status='PENDING', units_sold=0, revenue=Decimal('0.00'))
        p3.name = 'New Bowl'
        p3.category.name = 'Pottery'

        mock_qs = MagicMock()
        mock_qs.select_related.return_value.annotate.return_value.order_by.return_value = [p1, p2, p3]
        mock_prod_filter.return_value = mock_qs

        seller = self._make_user()
        req = self.factory.get('/api/sellers/analytics/products/?range=30d')
        force_authenticate(req, user=seller)
        res = SellerAnalyticsProductsView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['best_selling']), 2)
        self.assertEqual(res.data['best_selling'][0]['name'], 'Blue Vase')
        self.assertEqual(len(res.data['low_sales']), 1)
        self.assertEqual(res.data['low_sales'][0]['name'], 'Clay Cup')
        self.assertEqual(len(res.data['no_sales']), 1)
        self.assertEqual(res.data['no_sales'][0]['name'], 'New Bowl')

    @patch('sellers.analytics_views.Order.objects.filter')
    def test_order_analytics_distinct_counts(self, mock_order_filter):
        from sellers.analytics_views import SellerAnalyticsOrdersView

        mock_qs = MagicMock()
        mock_qs.distinct.return_value = mock_qs
        mock_qs.count.return_value = 5
        mock_qs.filter.return_value.distinct.return_value.count.return_value = 1
        mock_order_filter.return_value = mock_qs

        seller = self._make_user()
        req = self.factory.get('/api/sellers/analytics/orders/?range=30d')
        force_authenticate(req, user=seller)
        res = SellerAnalyticsOrdersView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total_orders'], 5)
        self.assertEqual(res.data['new_orders'], 1)
        self.assertEqual(res.data['delivered_orders'], 1)


class SellerReviewsManagementTests(SimpleTestCase):
    """
    Tests for Step 8.6: Seller Reviews & Ratings Management, Reply Validation,
    Ownership Isolation, Read-Only Customer Review Integrity, and Notifications.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    def _make_user(self, role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.APPROVED, seller_id=10):
        user = MagicMock()
        user.is_authenticated = True
        user.role = role
        user.email = 'gopal@example.com'
        if role == User.Role.SELLER:
            profile = MagicMock(spec=SellerProfile)
            profile.id = seller_id
            profile.store_name = 'Kumawat Blue Art Pottery'
            profile.application_status = app_status
            profile.is_approved = (app_status == SellerProfile.ApplicationStatus.APPROVED)
            user.seller_profile = profile
        return user

    def test_anonymous_customer_and_pending_seller_rejected(self):
        from sellers.reviews_views import SellerReviewListView, SellerReviewSummaryView
        list_view = SellerReviewListView.as_view()
        sum_view = SellerReviewSummaryView.as_view()

        req_anon = self.factory.get('/api/sellers/reviews/')
        self.assertEqual(list_view(req_anon).status_code, 401)

        req_cust = self.factory.get('/api/sellers/reviews/')
        force_authenticate(req_cust, user=self._make_user(role=User.Role.CUSTOMER))
        self.assertEqual(list_view(req_cust).status_code, 403)

        req_pend = self.factory.get('/api/sellers/reviews/summary/')
        force_authenticate(
            req_pend,
            user=self._make_user(role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.PENDING),
        )
        self.assertEqual(sum_view(req_pend).status_code, 403)

    @patch('sellers.reviews_views.ProductReview.objects.filter')
    def test_approved_seller_views_only_own_reviews(self, mock_filter):
        from sellers.reviews_views import SellerReviewListView
        mock_qs = MagicMock()
        mock_qs.select_related.return_value.order_by.return_value = []
        mock_filter.return_value = mock_qs

        seller = self._make_user(seller_id=15)
        req = self.factory.get('/api/sellers/reviews/')
        force_authenticate(req, user=seller)
        res = SellerReviewListView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        mock_filter.assert_called_once_with(product__seller=seller.seller_profile)

    @patch('sellers.reviews_views.ProductReview.objects.select_related')
    def test_seller_cannot_view_or_reply_to_another_sellers_review(self, mock_sr):
        from sellers.reviews_views import SellerReviewDetailView, SellerReviewReplyView
        mock_sr.return_value.get.side_effect = ProductReview.DoesNotExist

        seller = self._make_user()
        req1 = self.factory.get('/api/sellers/reviews/999/')
        force_authenticate(req1, user=seller)
        self.assertEqual(SellerReviewDetailView.as_view()(req1, review_id=999).status_code, 404)

        req2 = self.factory.post('/api/sellers/reviews/999/reply/', {'reply': 'Thank you!'}, format='json')
        force_authenticate(req2, user=seller)
        self.assertEqual(SellerReviewReplyView.as_view()(req2, review_id=999).status_code, 404)

    def test_invalid_or_excessively_long_reply_rejected(self):
        from sellers.serializers import SellerReviewReplySerializer
        ser_short = SellerReviewReplySerializer(data={'reply': 'Hi'})
        self.assertFalse(ser_short.is_valid())
        self.assertIn('reply', ser_short.errors)

        ser_long = SellerReviewReplySerializer(data={'reply': 'A' * 1001})
        self.assertFalse(ser_long.is_valid())
        self.assertIn('reply', ser_long.errors)

    @patch('sellers.reviews_views.Notification.objects.create')
    @patch('sellers.reviews_views.Notification.objects.filter')
    @patch('sellers.reviews_views.ProductReview.objects.select_related')
    def test_seller_reply_saved_preserves_customer_review_and_notifies(
        self, mock_sr, mock_notif_filter, mock_notif_create
    ):
        from sellers.reviews_views import SellerReviewReplyView

        mock_customer = MagicMock()
        mock_product = MagicMock()
        mock_product.id = 5
        mock_product.name = 'Jaipur Blue Vase'
        mock_product.slug = 'jaipur-blue-vase'
        mock_product.primary_image = ''

        mock_review = MagicMock(spec=ProductReview)
        mock_review.id = 12
        mock_review.product = mock_product
        mock_review.customer = mock_customer
        mock_review.rating = 5
        mock_review.title = 'Beautiful craft'
        mock_review.comment = 'Truly authentic work!'
        mock_review.is_verified_purchase = True
        mock_review.seller_reply = ''
        mock_review.seller_replied_at = None
        mock_review.created_at = '2026-11-26T10:00:00Z'
        mock_sr.return_value.get.return_value = mock_review

        mock_notif_filter.return_value.exists.return_value = False

        seller = self._make_user()
        # Attempt to inject rating=1 in payload; seller cannot alter customer rating or comment
        req = self.factory.post(
            '/api/sellers/reviews/12/reply/',
            {'reply': 'Thank you for supporting Jaipur artisans!', 'rating': 1, 'comment': 'Hacked'},
            format='json',
        )
        force_authenticate(req, user=seller)
        res = SellerReviewReplyView.as_view()(req, review_id=12)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(mock_review.seller_reply, 'Thank you for supporting Jaipur artisans!')
        self.assertEqual(mock_review.rating, 5)
        self.assertEqual(mock_review.comment, 'Truly authentic work!')
        mock_review.save.assert_called_once_with(
            update_fields=['seller_reply', 'seller_replied_at', 'seller_replied_by', 'updated_at']
        )
        mock_notif_create.assert_called_once()

    @patch('sellers.reviews_views.ProductReview.objects.select_related')
    def test_duplicate_reply_without_allow_update_rejected(self, mock_sr):
        from sellers.reviews_views import SellerReviewReplyView

        mock_review = MagicMock(spec=ProductReview)
        mock_review.seller_reply = 'Existing reply'
        mock_sr.return_value.get.return_value = mock_review

        seller = self._make_user()
        req = self.factory.post(
            '/api/sellers/reviews/12/reply/',
            {'reply': 'Overwriting accidentally'},
            format='json',
        )
        force_authenticate(req, user=seller)
        res = SellerReviewReplyView.as_view()(req, review_id=12)
        self.assertEqual(res.status_code, 400)
        self.assertIn('allow_update=true', res.data['detail'])

    @patch('sellers.reviews_views.ProductReview.objects.filter')
    def test_summary_statistics_and_empty_state(self, mock_filter):
        from sellers.reviews_views import SellerReviewSummaryView

        # Empty reviews
        mock_filter.return_value.aggregate.return_value = {
            'total_reviews': 0,
            'avg_rating': None,
            'five_star': 0,
            'four_star': 0,
            'three_star': 0,
            'two_star': 0,
            'one_star': 0,
            'unreplied_count': 0,
        }
        seller = self._make_user()
        req = self.factory.get('/api/sellers/reviews/summary/')
        force_authenticate(req, user=seller)
        res_empty = SellerReviewSummaryView.as_view()(req)
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(res_empty.data['total_reviews'], 0)
        self.assertEqual(res_empty.data['average_rating'], 0.0)

        # Populated reviews
        mock_filter.return_value.aggregate.return_value = {
            'total_reviews': 4,
            'avg_rating': 4.5,
            'five_star': 3,
            'four_star': 0,
            'three_star': 1,
            'two_star': 0,
            'one_star': 0,
            'unreplied_count': 2,
        }
        res_pop = SellerReviewSummaryView.as_view()(req)
        self.assertEqual(res_pop.status_code, 200)
        self.assertEqual(res_pop.data['total_reviews'], 4)
        self.assertEqual(res_pop.data['average_rating'], 4.5)
        self.assertEqual(res_pop.data['five_star'], 3)
        self.assertEqual(res_pop.data['unreplied_count'], 2)


class SellerNotificationsAndSettingsTests(SimpleTestCase):
    """
    Tests for Step 8.7: Seller Notifications ownership, unread counts, mark-read,
    and Seller Settings store retrieval.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    def _make_user(self, role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.APPROVED):
        user = MagicMock()
        user.is_authenticated = True
        user.role = role
        user.email = 'gopal@example.com'
        user.get_full_name.return_value = 'Gopal Kumawat'
        if role == User.Role.SELLER:
            profile = MagicMock(spec=SellerProfile)
            profile.id = 10
            profile.store_name = 'Kumawat Blue Art Pottery'
            profile.business_description = 'Traditional crafts'
            profile.craft_category = 'Pottery & Ceramics'
            profile.state = 'Rajasthan'
            profile.city = 'Jaipur'
            profile.application_status = app_status
            profile.is_approved = (app_status == SellerProfile.ApplicationStatus.APPROVED)
            profile.user = user
            profile.created_at = '2026-01-01T00:00:00Z'
            profile.updated_at = '2026-01-01T00:00:00Z'
            user.seller_profile = profile
        return user

    def test_customer_and_pending_seller_rejected_from_seller_notifications(self):
        from sellers.notifications_views import SellerNotificationListView, SellerNotificationUnreadCountView
        list_view = SellerNotificationListView.as_view()
        count_view = SellerNotificationUnreadCountView.as_view()

        req_cust = self.factory.get('/api/sellers/notifications/')
        force_authenticate(req_cust, user=self._make_user(role=User.Role.CUSTOMER))
        self.assertEqual(list_view(req_cust).status_code, 403)

        req_pend = self.factory.get('/api/sellers/notifications/unread-count/')
        force_authenticate(
            req_pend,
            user=self._make_user(role=User.Role.SELLER, app_status=SellerProfile.ApplicationStatus.PENDING),
        )
        self.assertEqual(count_view(req_pend).status_code, 403)

    @patch('sellers.notifications_views.Notification.objects.filter')
    def test_approved_seller_views_own_notifications_and_unread_count(self, mock_filter):
        from sellers.notifications_views import SellerNotificationListView, SellerNotificationUnreadCountView

        mock_qs = MagicMock()
        mock_qs.order_by.return_value = mock_qs
        mock_qs.count.return_value = 3
        mock_qs.filter.return_value.count.return_value = 3
        mock_qs.__len__.return_value = 0
        mock_qs.__getitem__.return_value = []
        mock_filter.return_value = mock_qs

        seller = self._make_user()
        req = self.factory.get('/api/sellers/notifications/')
        force_authenticate(req, user=seller)
        res = SellerNotificationListView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['unread_count'], 3)
        mock_filter.assert_called_with(customer=seller)

        req_cnt = self.factory.get('/api/sellers/notifications/unread-count/')
        force_authenticate(req_cnt, user=seller)
        res_cnt = SellerNotificationUnreadCountView.as_view()(req_cnt)
        self.assertEqual(res_cnt.status_code, 200)
        self.assertEqual(res_cnt.data['unread_count'], 3)

    @patch('sellers.notifications_views.Notification.objects.get')
    def test_seller_cannot_mark_another_users_notification_read(self, mock_get):
        from orders.models import Notification
        from sellers.notifications_views import SellerNotificationMarkReadView

        mock_get.side_effect = Notification.DoesNotExist
        seller = self._make_user()
        req = self.factory.post('/api/sellers/notifications/999/read/')
        force_authenticate(req, user=seller)
        res = SellerNotificationMarkReadView.as_view()(req, pk=999)
        self.assertEqual(res.status_code, 404)

    @patch('sellers.notifications_views.Notification.objects.get')
    def test_mark_single_notification_as_read(self, mock_get):
        from orders.models import Notification
        from sellers.notifications_views import SellerNotificationMarkReadView

        mock_notif = Notification(
            id=5, title='New Paid Order', message='Order received', notification_type='ORDER', is_read=False
        )
        mock_notif.save = MagicMock()
        mock_get.return_value = mock_notif

        seller = self._make_user()
        req = self.factory.post('/api/sellers/notifications/5/read/')
        force_authenticate(req, user=seller)
        res = SellerNotificationMarkReadView.as_view()(req, pk=5)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(mock_notif.is_read)
        mock_notif.save.assert_called_once_with(update_fields=['is_read'])

    @patch('sellers.notifications_views.Notification.objects.filter')
    def test_mark_all_as_read_scoped_to_authenticated_seller(self, mock_filter):
        from sellers.notifications_views import SellerNotificationMarkAllReadView
        mock_filter.return_value.update.return_value = 4

        seller = self._make_user()
        req = self.factory.post('/api/sellers/notifications/mark-all-read/')
        force_authenticate(req, user=seller)
        res = SellerNotificationMarkAllReadView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['updated_count'], 4)
        mock_filter.assert_called_once_with(customer=seller, is_read=False)

    def test_settings_store_profile_retrieves_authenticated_seller(self):
        from sellers.views import SellerStoreProfileView
        seller = self._make_user()
        req = self.factory.get('/api/sellers/store/')
        force_authenticate(req, user=seller)
        res = SellerStoreProfileView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['store_name'], 'Kumawat Blue Art Pottery')
        self.assertEqual(res.data['application_status'], 'APPROVED')


class PublicArtisansDirectoryTests(SimpleTestCase):
    """
    Tests for Step 11.8 (BB-08): Public read-only artisan directory API
    returns only APPROVED sellers and excludes all private PII.
    """

    def setUp(self):
        self.factory = APIRequestFactory()

    @patch('sellers.public_views.SellerProfile.objects')
    def test_public_artisans_returns_approved_only_and_excludes_pii(self, mock_seller_mgr):
        from sellers.public_views import PublicArtisansListView

        owner = MagicMock()
        owner.get_full_name.return_value = 'Ramesh Kumawat'
        owner.email = 'private@artisan.in'
        owner.phone_number = '+919876543210'

        seller = MagicMock(spec=SellerProfile)
        seller.id = 12
        seller.store_name = 'Kumawat Blue Art Pottery'
        seller.user = owner
        seller.business_description = 'Handcrafted Jaipur pottery.'
        seller.craft_category = 'Blue Pottery'
        seller.city = 'Jaipur'
        seller.state = 'Rajasthan'
        seller.approved_products_count = 4
        seller.featured_image = 'https://example.com/pot.jpg'
        seller.created_at = '2026-11-20T10:00:00Z'

        qs = MagicMock()
        qs.select_related.return_value = qs
        qs.annotate.return_value = qs
        qs.order_by.return_value = qs
        qs.values_list.side_effect = [['Blue Pottery'], ['Rajasthan']]
        qs.filter.return_value = qs
        qs.__iter__.side_effect = lambda: iter([seller])
        mock_seller_mgr.filter.return_value = qs

        req = self.factory.get('/api/sellers/public/?search=Jaipur&craft=Blue%20Pottery&state=Rajasthan')
        res = PublicArtisansListView.as_view()(req)

        self.assertEqual(res.status_code, 200)
        mock_seller_mgr.filter.assert_called_once_with(
            application_status=SellerProfile.ApplicationStatus.APPROVED
        )
        self.assertEqual(res.data['count'], 1)
        row = res.data['artisans'][0]
        self.assertEqual(row['store_name'], 'Kumawat Blue Art Pottery')
        self.assertEqual(row['artisan_name'], 'Ramesh Kumawat')
        self.assertEqual(row['approved_products_count'], 4)
        for forbidden in ('email', 'phone_number', 'admin_notes', 'status_reason', 'reviewed_by'):
            self.assertNotIn(forbidden, row)

    def test_public_artisans_is_read_only(self):
        from sellers.public_views import PublicArtisansListView
        req = self.factory.post('/api/sellers/public/', {}, format='json')
        res = PublicArtisansListView.as_view()(req)
        self.assertEqual(res.status_code, 405)
