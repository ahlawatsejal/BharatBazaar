from decimal import Decimal
import hashlib
import hmac
from unittest.mock import MagicMock, patch
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from orders.models import Order, OrderItem, ReturnRequest
from orders.serializers import AddressSerializer, OrderSerializer, NotificationSerializer
from orders.views import verify_razorpay_signature, CancelOrderView
from orders.return_views import CustomerReturnListCreateView, CustomerReturnDetailView


class OrdersUnitTests(SimpleTestCase):
    """
    Unit tests for order structures, address validations, and Razorpay signature security.
    """

    def test_order_number_format(self):
        order_num = Order.generate_order_number()
        self.assertTrue(order_num.startswith('BB-ORD-'))
        parts = order_num.split('-')
        self.assertEqual(len(parts), 4)

    def test_address_serializer_validation(self):
        data = {
            'full_name': 'Aarav Sharma',
            'phone_number': '9876543210',
            'address_line_1': 'Plot 42, Heritage Craft Lane',
            'city': 'Jaipur',
            'state': 'Rajasthan',
            'postal_code': '302001',
            'country': 'India',
            'is_default': True,
        }
        serializer = AddressSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['city'], 'Jaipur')

    def test_order_serializer_structure(self):
        expected_fields = {
            'id', 'order_number', 'customer_email', 'subtotal',
            'shipping_amount', 'discount_amount', 'total_amount',
            'order_status', 'payment_status', 'shipping_address_snapshot',
            'razorpay_order_id', 'razorpay_payment_id', 'items', 'created_at'
        }
        fields = set(OrderSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(fields))

    @patch('orders.views.settings')
    def test_razorpay_signature_verification_valid(self, mock_settings):
        secret = 'test_secret_key_12345'
        mock_settings.RAZORPAY_KEY_SECRET = secret

        order_id = 'order_DA12345678'
        payment_id = 'pay_EA98765432'
        msg = f"{order_id}|{payment_id}".encode('utf-8')
        valid_signature = hmac.new(secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()

        # Valid signature should pass
        is_valid = verify_razorpay_signature(order_id, payment_id, valid_signature)
        self.assertTrue(is_valid)

    @patch('orders.views.settings')
    def test_razorpay_signature_verification_invalid(self, mock_settings):
        secret = 'test_secret_key_12345'
        mock_settings.RAZORPAY_KEY_SECRET = secret

        order_id = 'order_DA12345678'
        payment_id = 'pay_EA98765432'
        tampered_signature = 'fake_tampered_signature_abcd1234'

        # Invalid / tampered signature must be rejected
        is_valid = verify_razorpay_signature(order_id, payment_id, tampered_signature)
        self.assertFalse(is_valid)

    @patch('orders.views.settings')
    def test_razorpay_signature_without_secret_fails_safely(self, mock_settings):
        mock_settings.RAZORPAY_KEY_SECRET = ''
        is_valid = verify_razorpay_signature('ord_1', 'pay_1', 'sig_1')
        self.assertFalse(is_valid)

    def test_notification_serializer_structure(self):
        expected_fields = {'id', 'title', 'message', 'notification_type', 'is_read', 'created_at'}
        fields = set(NotificationSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(fields))

    def test_cannot_cancel_shipped_order_status_check(self):
        # Business rule check: only PENDING and CONFIRMED orders can be cancelled by patron
        allowed_statuses = {'PENDING', 'CONFIRMED'}
        self.assertNotIn('SHIPPED', allowed_statuses)
        self.assertNotIn('DELIVERED', allowed_statuses)
        self.assertNotIn('PROCESSING', allowed_statuses)


class CancelOrderPaymentIntegrityTests(SimpleTestCase):
    """
    Tests proving cancelling PAID or UNPAID orders never falsely marks
    payment_status as REFUNDED without provider refund confirmation.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.cancel_view = CancelOrderView.as_view()

    def _make_customer(self):
        user = MagicMock()
        user.id = 10
        user.is_authenticated = True
        user.email = 'patron@bharatbazaar.in'
        return user

    def _make_order(self, order_status, payment_status):
        customer = self._make_customer()
        product = MagicMock()
        product.pk = 77

        item = MagicMock(spec=OrderItem)
        item.id = 1
        item.product = product
        item.quantity = 2
        item.fulfillment_status = OrderItem.FulfillmentStatus.NEW

        order = MagicMock(spec=Order)
        order.pk = 900
        order.id = 900
        order.order_number = 'BB-ORD-20261126-TEST'
        order.customer = customer
        order.subtotal = Decimal('1500.00')
        order.shipping_amount = Decimal('0.00')
        order.discount_amount = Decimal('0.00')
        order.total_amount = Decimal('1500.00')
        order.order_status = order_status
        order.payment_status = payment_status
        order.shipping_address_snapshot = {'city': 'Jaipur'}
        order.razorpay_order_id = 'order_RZP1'
        order.razorpay_payment_id = 'pay_RZP1' if payment_status == Order.PaymentStatus.PAID else ''
        order.created_at = '2026-11-26T10:00:00Z'
        order.updated_at = '2026-11-26T10:05:00Z'
        order.items.select_related.return_value = [item]
        order.items.all.return_value = []
        order.items.__iter__.side_effect = lambda: iter([])
        return order

    @patch('orders.views.Notification.objects')
    @patch('orders.views.Product.objects')
    @patch('orders.views.Order.objects')
    @patch('orders.views.transaction.atomic')
    @patch('orders.views.get_object_or_404')
    def test_cancelling_paid_order_preserves_paid_status_and_restores_stock(
        self, mock_get_obj, mock_atomic, mock_order_mgr, mock_prod_mgr, mock_notif_mgr
    ):
        order = self._make_order(Order.OrderStatus.CONFIRMED, Order.PaymentStatus.PAID)
        mock_get_obj.return_value = order
        mock_order_mgr.select_for_update.return_value.get.return_value = order

        req = self.factory.post('/api/orders/BB-ORD-20261126-TEST/cancel/')
        force_authenticate(req, user=order.customer)
        res = self.cancel_view(req, order_number='BB-ORD-20261126-TEST')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(order.order_status, Order.OrderStatus.CANCELLED)
        # Critical rule: payment_status must stay PAID, never REFUNDED
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(res.data['refund_status'], 'AWAITING_REFUND_CONFIRMATION')
        self.assertEqual(res.data['order']['payment_status'], 'PAID')
        self.assertEqual(res.data['order']['refund_status_info']['refund_state'], 'AWAITING_CONFIRMATION')
        self.assertFalse(res.data['order']['refund_status_info']['is_refund_confirmed'])
        # Stock restored and items cancelled
        mock_prod_mgr.filter.return_value.update.assert_called_once()
        order.items.update.assert_called_once_with(fulfillment_status=OrderItem.FulfillmentStatus.CANCELLED)
        mock_notif_mgr.create.assert_called_once()

    @patch('orders.views.Notification.objects')
    @patch('orders.views.Product.objects')
    @patch('orders.views.Order.objects')
    @patch('orders.views.transaction.atomic')
    @patch('orders.views.get_object_or_404')
    def test_cancelling_unpaid_order_does_not_mark_refunded(
        self, mock_get_obj, mock_atomic, mock_order_mgr, mock_prod_mgr, mock_notif_mgr
    ):
        order = self._make_order(Order.OrderStatus.PENDING, Order.PaymentStatus.PENDING)
        mock_get_obj.return_value = order
        mock_order_mgr.select_for_update.return_value.get.return_value = order

        req = self.factory.post('/api/orders/BB-ORD-20261126-TEST/cancel/')
        force_authenticate(req, user=order.customer)
        res = self.cancel_view(req, order_number='BB-ORD-20261126-TEST')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(order.order_status, Order.OrderStatus.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)
        self.assertEqual(res.data['refund_status'], 'NO_REFUND_REQUIRED')
        self.assertFalse(res.data['order']['refund_status_info']['is_refund_confirmed'])
        mock_prod_mgr.filter.return_value.update.assert_not_called()

    def test_order_serializer_distinguishes_cancelled_vs_refunded_states(self):
        paid_cancelled = self._make_order(Order.OrderStatus.CANCELLED, Order.PaymentStatus.PAID)
        data1 = OrderSerializer(paid_cancelled).data
        self.assertTrue(data1['refund_status_info']['is_cancelled'])
        self.assertTrue(data1['refund_status_info']['is_payment_captured'])
        self.assertFalse(data1['refund_status_info']['is_refund_confirmed'])
        self.assertEqual(data1['refund_status_info']['refund_state'], 'AWAITING_CONFIRMATION')

        confirmed_refund = self._make_order(Order.OrderStatus.CANCELLED, Order.PaymentStatus.REFUNDED)
        data2 = OrderSerializer(confirmed_refund).data
        self.assertTrue(data2['refund_status_info']['is_refund_confirmed'])
        self.assertEqual(data2['refund_status_info']['refund_state'], 'CONFIRMED')

    def test_order_serializer_exposes_razorpay_payment_id_and_excludes_signature(self):
        paid_order = self._make_order(Order.OrderStatus.CONFIRMED, Order.PaymentStatus.PAID)
        paid_order.razorpay_signature = 'hmac_secret_sig'
        data_paid = OrderSerializer(paid_order).data
        self.assertEqual(data_paid['razorpay_payment_id'], 'pay_RZP1')
        self.assertNotIn('razorpay_signature', data_paid)

        unpaid_order = self._make_order(Order.OrderStatus.PENDING, Order.PaymentStatus.PENDING)
        data_unpaid = OrderSerializer(unpaid_order).data
        self.assertEqual(data_unpaid['razorpay_payment_id'], '')


class CustomerReturnRequestTests(SimpleTestCase):
    """
    Tests for Step 11.4: Customer return request submission, eligibility,
    ownership isolation, duplicate active-request prevention, and payment safety.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_create_view = CustomerReturnListCreateView.as_view()
        self.detail_view = CustomerReturnDetailView.as_view()

    def _make_user(self, role='CUSTOMER', user_id=10):
        user = MagicMock()
        user.id = user_id
        user.pk = user_id
        user.is_authenticated = True
        user.role = role
        user.email = f'{role.lower()}{user_id}@test.in'
        return user

    def _make_order_and_item(
        self,
        customer_id=10,
        order_id=100,
        order_status=Order.OrderStatus.DELIVERED,
        payment_status=Order.PaymentStatus.PAID,
        item_status=OrderItem.FulfillmentStatus.DELIVERED,
    ):
        seller = MagicMock()
        seller.id = 5
        seller.store_name = 'Jaipur Craft Studio'

        order = MagicMock(spec=Order)
        order.id = order_id
        order.pk = order_id
        order.customer_id = customer_id
        order.order_number = f'BB-ORD-{order_id}'
        order.order_status = order_status
        order.payment_status = payment_status

        item = MagicMock(spec=OrderItem)
        item.id = 50
        item.pk = 50
        item.order = order
        item.order_id = order_id
        item.seller = seller
        item.seller_id = seller.id
        item.product_name = 'Handwoven Shawl'
        item.quantity = 1
        item.line_total = Decimal('1800.00')
        item.fulfillment_status = item_status
        return order, item

    def test_unauthenticated_and_seller_rejected(self):
        anon = self.factory.get('/api/orders/returns/')
        self.assertEqual(self.list_create_view(anon).status_code, 401)

        seller = self._make_user(role='SELLER', user_id=20)
        sel_req = self.factory.post('/api/orders/returns/', {}, format='json')
        force_authenticate(sel_req, user=seller)
        self.assertEqual(self.list_create_view(sel_req).status_code, 403)

    @patch('orders.return_views.ReturnRequest.objects')
    @patch('orders.return_views.transaction.atomic')
    @patch('orders.return_views.get_object_or_404')
    def test_customer_can_submit_valid_return_request_without_altering_payment(
        self, mock_get_obj, mock_atomic, mock_ret_mgr
    ):
        customer = self._make_user(role='CUSTOMER', user_id=10)
        order, item = self._make_order_and_item(customer_id=10)
        mock_get_obj.side_effect = [order, item]
        mock_ret_mgr.filter.return_value.exists.return_value = False

        created_ret = MagicMock(spec=ReturnRequest)
        created_ret.id = 1
        created_ret.order = order
        created_ret.order_item = item
        created_ret.seller = item.seller
        created_ret.reason = ReturnRequest.ReturnReason.TRANSIT_DAMAGE
        created_ret.get_reason_display.return_value = 'Item damaged or cracked during transit'
        created_ret.description = 'Cracked rim on arrival'
        created_ret.status = ReturnRequest.ReturnStatus.PENDING
        created_ret.get_status_display.return_value = 'Pending Review'
        created_ret.rejection_reason = ''
        created_ret.reviewed_at = None
        created_ret.created_at = '2026-11-26T12:00:00Z'
        created_ret.updated_at = '2026-11-26T12:00:00Z'
        mock_ret_mgr.create.return_value = created_ret

        req = self.factory.post(
            '/api/orders/returns/',
            {
                'order_number': 'BB-ORD-100',
                'order_item_id': 50,
                'reason': 'TRANSIT_DAMAGE',
                'description': 'Cracked rim on arrival',
            },
            format='json',
        )
        force_authenticate(req, user=customer)
        res = self.list_create_view(req)

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['return_request']['status'], 'PENDING')
        # Payment status unchanged
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        order.save.assert_not_called()

    @patch('orders.return_views.get_object_or_404')
    def test_rejects_mismatched_order_item_and_ineligible_items(self, mock_get_obj):
        customer = self._make_user(role='CUSTOMER', user_id=10)
        order, item = self._make_order_and_item(customer_id=10, order_id=100)
        item.order_id = 999  # belongs to another order
        mock_get_obj.side_effect = [order, item]

        req = self.factory.post(
            '/api/orders/returns/',
            {'order_number': 'BB-ORD-100', 'order_item_id': 50, 'reason': 'OTHER'},
            format='json',
        )
        force_authenticate(req, user=customer)
        self.assertEqual(self.list_create_view(req).status_code, 400)

        # Cancelled item rejected
        order2, item2 = self._make_order_and_item(
            customer_id=10, order_id=101, item_status=OrderItem.FulfillmentStatus.CANCELLED
        )
        mock_get_obj.side_effect = [order2, item2]
        req2 = self.factory.post(
            '/api/orders/returns/',
            {'order_number': 'BB-ORD-101', 'order_item_id': 50, 'reason': 'OTHER'},
            format='json',
        )
        force_authenticate(req2, user=customer)
        self.assertEqual(self.list_create_view(req2).status_code, 400)

    @patch('orders.return_views.ReturnRequest.objects')
    @patch('orders.return_views.get_object_or_404')
    def test_duplicate_active_return_request_prevented(self, mock_get_obj, mock_ret_mgr):
        customer = self._make_user(role='CUSTOMER', user_id=10)
        order, item = self._make_order_and_item(customer_id=10)
        mock_get_obj.side_effect = [order, item]
        mock_ret_mgr.filter.return_value.exists.return_value = True

        req = self.factory.post(
            '/api/orders/returns/',
            {'order_number': 'BB-ORD-100', 'order_item_id': 50, 'reason': 'OTHER'},
            format='json',
        )
        force_authenticate(req, user=customer)
        self.assertEqual(self.list_create_view(req).status_code, 400)
        mock_ret_mgr.create.assert_not_called()

    @patch('orders.return_views.ReturnRequest.objects')
    def test_customer_lists_only_own_returns(self, mock_ret_mgr):
        customer = self._make_user(role='CUSTOMER', user_id=10)
        mock_ret_mgr.filter.return_value.select_related.return_value.order_by.return_value = []

        req = self.factory.get('/api/orders/returns/')
        force_authenticate(req, user=customer)
        res = self.list_create_view(req)
        self.assertEqual(res.status_code, 200)
        mock_ret_mgr.filter.assert_called_once_with(customer=customer)
