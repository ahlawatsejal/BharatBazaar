from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from orders.models import Address, Order, OrderItem, ReturnRequest
from products.models import Category, Product
from sellers.models import SellerProfile

User = get_user_model()


def _create_seller(email, store_name, approval_status=SellerProfile.ApplicationStatus.APPROVED):
    user = User.objects.create_user(
        email=email,
        password='StrongTestPassword!123',
        first_name='Artisan',
        last_name='Seller',
        role=User.Role.SELLER,
    )
    profile = SellerProfile.objects.create(
        user=user,
        store_name=store_name,
        business_description='Authentic handmade crafts',
        state='Rajasthan',
        city='Jaipur',
        craft_category='Pottery',
        application_status=approval_status,
    )
    return user, profile


def _create_customer(email, first_name='Aarav', last_name='Sharma'):
    return User.objects.create_user(
        email=email,
        password='StrongTestPassword!123',
        first_name=first_name,
        last_name=last_name,
        role=User.Role.CUSTOMER,
    )


def _create_admin(email='admin.int@bharatbazar.in'):
    return User.objects.create_user(
        email=email,
        password='StrongTestPassword!123',
        first_name='Platform',
        last_name='Admin',
        role=User.Role.ADMIN,
        is_staff=True,
    )


class AuthenticationIntegrationTests(APITestCase):
    """Database-backed tests for customer/seller registration, login, and inactive-user rejection."""

    def test_customer_registration_and_login_returns_jwt_tokens(self):
        reg_res = self.client.post(
            '/api/accounts/register/',
            {
                'first_name': 'Meera',
                'last_name': 'Patel',
                'email': 'Meera.Patel@Example.COM',
                'phone_number': '9876543210',
                'password': 'StrongTestPassword!123',
                'confirm_password': 'StrongTestPassword!123',
            },
            format='json',
        )
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='meera.patel@example.com')
        self.assertEqual(user.role, User.Role.CUSTOMER)

        login_res = self.client.post(
            '/api/accounts/login/',
            {'email': 'meera.patel@example.com', 'password': 'StrongTestPassword!123'},
            format='json',
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data['tokens'])
        self.assertIn('refresh', login_res.data['tokens'])
        self.assertEqual(login_res.data['user']['role'], User.Role.CUSTOMER)

    def test_seller_registration_creates_pending_profile_and_reports_status(self):
        reg_res = self.client.post(
            '/api/accounts/seller/register/',
            {
                'first_name': 'Ramesh',
                'last_name': 'Kumhar',
                'email': 'ramesh.kumhar@example.com',
                'phone_number': '9876543211',
                'password': 'StrongTestPassword!123',
                'confirm_password': 'StrongTestPassword!123',
                'store_name': 'Jaipur Blue Pottery Studio',
                'business_description': 'Traditional hand-painted blue pottery.',
                'state': 'Rajasthan',
                'city': 'Jaipur',
                'craft_category': 'Pottery & Ceramics',
            },
            format='json',
        )
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        profile = SellerProfile.objects.get(store_name='Jaipur Blue Pottery Studio')
        self.assertEqual(profile.application_status, SellerProfile.ApplicationStatus.PENDING)

        login_res = self.client.post(
            '/api/accounts/login/',
            {'email': 'ramesh.kumhar@example.com', 'password': 'StrongTestPassword!123'},
            format='json',
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            login_res.data['user']['seller_profile']['application_status'],
            SellerProfile.ApplicationStatus.PENDING,
        )

    def test_invalid_credentials_and_inactive_users_rejected(self):
        user = _create_customer('inactive.check@example.com')

        bad_login = self.client.post(
            '/api/accounts/login/',
            {'email': 'inactive.check@example.com', 'password': 'WrongPassword!123'},
            format='json',
        )
        self.assertEqual(bad_login.status_code, status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save(update_fields=['is_active'])

        inactive_login = self.client.post(
            '/api/accounts/login/',
            {'email': 'inactive.check@example.com', 'password': 'StrongTestPassword!123'},
            format='json',
        )
        self.assertEqual(inactive_login.status_code, status.HTTP_400_BAD_REQUEST)


class ProductAndCategoryIntegrationTests(APITestCase):
    """Database-backed tests for product creation, admin approval, and active category filtering."""

    def setUp(self):
        self.seller_user, self.seller_profile = _create_seller(
            'seller.prod@example.com', 'Kutch Looms'
        )
        self.admin_user = _create_admin('admin.prod@example.com')
        self.active_cat = Category.objects.create(
            name='Handloom Textiles',
            slug='handloom-textiles',
            description='Woven heritage textiles',
            is_active=True,
        )
        self.inactive_cat = Category.objects.create(
            name='Archived Crafts',
            slug='archived-crafts',
            description='Inactive category',
            is_active=False,
        )

    def test_product_creation_approval_visibility_and_category_filtering(self):
        self.client.force_authenticate(user=self.seller_user)
        create_res = self.client.post(
            '/api/sellers/products/',
            {
                'name': 'Handwoven Patola Dupatta',
                'short_description': 'Authentic double ikat silk dupatta.',
                'description': 'Handwoven by master artisans in Gujarat using natural dyes.',
                'category_id': self.active_cat.id,
                'price': '4500.00',
                'available_stock': 5,
                'sku': 'SKU-PATOLA-001',
                'craft_type': 'Patola Weaving',
                'origin_state': 'Gujarat',
                'origin_city': 'Patan',
            },
            format='json',
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        product_id = create_res.data['id']
        self.assertEqual(create_res.data['approval_status'], Product.ApprovalStatus.PENDING)

        # Unapproved product must not appear in public listing
        self.client.force_authenticate(user=None)
        public_before = self.client.get('/api/products/')
        self.assertEqual(public_before.status_code, status.HTTP_200_OK)
        self.assertEqual(len(public_before.data['results']), 0)

        # Admin approves product
        self.client.force_authenticate(user=self.admin_user)
        approve_res = self.client.post(f'/api/admin/products/{product_id}/approve/', {}, format='json')
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # Also create an approved product under an inactive category (must remain hidden)
        Product.objects.create(
            seller=self.seller_profile,
            category=self.inactive_cat,
            name='Hidden Inactive Cat Item',
            slug='hidden-inactive-cat-item',
            description='Should not be listed publicly.',
            price=Decimal('900.00'),
            available_stock=3,
            sku='SKU-HIDDEN-001',
            craft_type='Woodwork',
            origin_state='Rajasthan',
            approval_status=Product.ApprovalStatus.APPROVED,
        )

        # Public listing shows only approved product in active category
        self.client.force_authenticate(user=None)
        public_after = self.client.get('/api/products/')
        self.assertEqual(public_after.status_code, status.HTTP_200_OK)
        names = [p['name'] for p in public_after.data['results']]
        self.assertEqual(names, ['Handwoven Patola Dupatta'])

        # Categories endpoint returns only active categories with live product_count
        cat_res = self.client.get('/api/categories/')
        self.assertEqual(cat_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cat_res.data), 1)
        self.assertEqual(cat_res.data[0]['slug'], 'handloom-textiles')
        self.assertEqual(cat_res.data[0]['product_count'], 1)


class CartIntegrationTests(APITestCase):
    """Database-backed tests for cart CRUD, stock validation, and customer isolation."""

    def setUp(self):
        _, seller_profile = _create_seller('seller.cart@example.com', 'Bastar Brass Works')
        category = Category.objects.create(name='Dhokra Art', slug='dhokra-art', is_active=True)
        self.product = Product.objects.create(
            seller=seller_profile,
            category=category,
            name='Dhokra Brass Figurine',
            slug='dhokra-brass-figurine',
            description='Lost-wax cast tribal brass art.',
            price=Decimal('1200.00'),
            available_stock=3,
            craft_type='Dhokra',
            origin_state='Chhattisgarh',
            approval_status=Product.ApprovalStatus.APPROVED,
        )
        self.customer_a = _create_customer('cart.a@example.com')
        self.customer_b = _create_customer('cart.b@example.com')

    def test_add_update_remove_and_quantity_validation(self):
        self.client.force_authenticate(user=self.customer_a)

        # Exceeding stock -> 400
        too_many = self.client.post(
            '/api/cart/items/', {'product_id': self.product.id, 'quantity': 5}, format='json'
        )
        self.assertEqual(too_many.status_code, status.HTTP_400_BAD_REQUEST)

        # Zero quantity -> 400
        zero_qty = self.client.post(
            '/api/cart/items/', {'product_id': self.product.id, 'quantity': 0}, format='json'
        )
        self.assertEqual(zero_qty.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid add -> 201/200
        add_res = self.client.post(
            '/api/cart/items/', {'product_id': self.product.id, 'quantity': 2}, format='json'
        )
        self.assertIn(add_res.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))
        item_id = add_res.data['cart']['items'][0]['id']

        # Customer B cannot access or delete Customer A's cart item
        self.client.force_authenticate(user=self.customer_b)
        b_cart = self.client.get('/api/cart/')
        self.assertEqual(b_cart.status_code, status.HTTP_200_OK)
        self.assertEqual(len(b_cart.data['items']), 0)

        b_del = self.client.delete(f'/api/cart/items/{item_id}/')
        self.assertEqual(b_del.status_code, status.HTTP_404_NOT_FOUND)

        # Customer A removes their own cart item
        self.client.force_authenticate(user=self.customer_a)
        a_del = self.client.delete(f'/api/cart/items/{item_id}/')
        self.assertEqual(a_del.status_code, status.HTTP_200_OK)
        self.assertEqual(len(a_del.data['cart']['items']), 0)


class OrderAndPaymentSafetyIntegrationTests(APITestCase):
    """Database-backed tests for multi-seller orders, stock deduction, and payment-safe cancellation."""

    def setUp(self):
        self.seller_one_user, self.seller_one = _create_seller(
            'seller.one@example.com', 'Jaipur Pottery House'
        )
        self.seller_two_user, self.seller_two = _create_seller(
            'seller.two@example.com', 'Varanasi Weavers Guild'
        )
        category = Category.objects.create(name='Heritage Crafts', slug='heritage-crafts', is_active=True)
        self.prod_one = Product.objects.create(
            seller=self.seller_one,
            category=category,
            name='Blue Pottery Vase',
            slug='blue-pottery-vase',
            description='Hand-painted vase.',
            price=Decimal('1500.00'),
            available_stock=10,
            sku='SKU-VASE-001',
            craft_type='Blue Pottery',
            origin_state='Rajasthan',
            approval_status=Product.ApprovalStatus.APPROVED,
        )
        self.prod_two = Product.objects.create(
            seller=self.seller_two,
            category=category,
            name='Banarasi Silk Stole',
            slug='banarasi-silk-stole',
            description='Handwoven silk stole.',
            price=Decimal('2200.00'),
            available_stock=6,
            sku='SKU-STOLE-001',
            craft_type='Banarasi Silk',
            origin_state='Uttar Pradesh',
            approval_status=Product.ApprovalStatus.APPROVED,
        )
        self.customer_a = _create_customer('order.a@example.com')
        self.customer_b = _create_customer('order.b@example.com')
        self.address_a = Address.objects.create(
            customer=self.customer_a,
            full_name='Aarav Sharma',
            phone_number='9876543210',
            address_line_1='42 Heritage Lane',
            city='Pune',
            state='Maharashtra',
            postal_code='411001',
            is_default=True,
        )

    @patch('orders.views.verify_razorpay_signature', return_value=True)
    @patch('orders.views.create_razorpay_order_remote', return_value='rzp_test_int_order_1')
    def test_multi_seller_order_stock_deduction_and_cancel_preserves_paid_status(
        self, _mock_create_rzp, _mock_verify_sig
    ):
        self.client.force_authenticate(user=self.customer_a)
        self.client.post('/api/cart/items/', {'product_id': self.prod_one.id, 'quantity': 2}, format='json')
        self.client.post('/api/cart/items/', {'product_id': self.prod_two.id, 'quantity': 1}, format='json')

        create_res = self.client.post(
            '/api/orders/create/', {'address_id': self.address_a.id}, format='json'
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        order_number = create_res.data['order']['order_number']

        # Customer B cannot access Customer A's order
        self.client.force_authenticate(user=self.customer_b)
        self.assertEqual(self.client.get(f'/api/orders/{order_number}/').status_code, status.HTTP_404_NOT_FOUND)

        # Simulate verified payment callback (with mocked signature check, never calling live Razorpay)
        self.client.force_authenticate(user=self.customer_a)
        verify_res = self.client.post(
            '/api/orders/verify-payment/',
            {
                'order_number': order_number,
                'razorpay_order_id': 'rzp_test_int_order_1',
                'razorpay_payment_id': 'pay_test_int_1',
                'razorpay_signature': 'sig_test_mocked',
            },
            format='json',
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        self.prod_one.refresh_from_db()
        self.prod_two.refresh_from_db()
        self.assertEqual(self.prod_one.available_stock, 8)
        self.assertEqual(self.prod_two.available_stock, 5)

        # Multi-seller isolation: Seller 1 sees only prod_one; Seller 2 sees only prod_two
        self.client.force_authenticate(user=self.seller_one_user)
        s1_order = self.client.get(f'/api/sellers/orders/{order_number}/')
        self.assertEqual(s1_order.status_code, status.HTTP_200_OK)
        self.assertEqual([i['product_name'] for i in s1_order.data['items']], ['Blue Pottery Vase'])

        self.client.force_authenticate(user=self.seller_two_user)
        s2_order = self.client.get(f'/api/sellers/orders/{order_number}/')
        self.assertEqual(s2_order.status_code, status.HTTP_200_OK)
        self.assertEqual([i['product_name'] for i in s2_order.data['items']], ['Banarasi Silk Stole'])

        # Customer cancels PAID order: stock is restored, payment_status remains PAID (never REFUNDED)
        self.client.force_authenticate(user=self.customer_a)
        cancel_res = self.client.post(f'/api/orders/{order_number}/cancel/', {}, format='json')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        order = Order.objects.get(order_number=order_number)
        self.assertEqual(order.order_status, Order.OrderStatus.CANCELLED)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

        self.prod_one.refresh_from_db()
        self.prod_two.refresh_from_db()
        self.assertEqual(self.prod_one.available_stock, 10)
        self.assertEqual(self.prod_two.available_stock, 6)


class ReturnRequestIntegrationTests(APITestCase):
    """Database-backed tests for return request creation, duplicate prevention, ownership, and admin transitions."""

    def setUp(self):
        _, self.seller_profile = _create_seller('seller.ret@example.com', 'Madhubani Studio')
        self.admin_user = _create_admin('admin.ret@example.com')
        self.customer_a = _create_customer('ret.a@example.com')
        self.customer_b = _create_customer('ret.b@example.com')
        cat = Category.objects.create(name='Paintings', slug='paintings', is_active=True)
        product = Product.objects.create(
            seller=self.seller_profile,
            category=cat,
            name='Madhubani Canvas',
            slug='madhubani-canvas',
            description='Hand-painted Mithila art.',
            price=Decimal('1800.00'),
            available_stock=4,
            craft_type='Madhubani',
            origin_state='Bihar',
            approval_status=Product.ApprovalStatus.APPROVED,
        )
        self.order = Order.objects.create(
            customer=self.customer_a,
            order_number='BB-2026-RET01',
            subtotal=Decimal('1800.00'),
            shipping_amount=Decimal('0.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('1800.00'),
            order_status=Order.OrderStatus.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
            shipping_address_snapshot={'city': 'Delhi'},
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=product,
            seller=self.seller_profile,
            product_name=product.name,
            unit_price=Decimal('1800.00'),
            quantity=1,
            line_total=Decimal('1800.00'),
            fulfillment_status=OrderItem.FulfillmentStatus.DELIVERED,
        )

    def test_return_lifecycle_duplicate_prevention_and_ownership(self):
        # Customer B cannot submit return for Customer A's order
        self.client.force_authenticate(user=self.customer_b)
        b_create = self.client.post(
            '/api/orders/returns/',
            {
                'order_number': self.order.order_number,
                'order_item_id': self.order_item.id,
                'reason': ReturnRequest.ReturnReason.TRANSIT_DAMAGE,
                'description': 'Corner frame arrived damaged during transit.',
            },
            format='json',
        )
        self.assertEqual(b_create.status_code, status.HTTP_404_NOT_FOUND)

        # Customer A submits valid return request -> 201
        self.client.force_authenticate(user=self.customer_a)
        a_create = self.client.post(
            '/api/orders/returns/',
            {
                'order_number': self.order.order_number,
                'order_item_id': self.order_item.id,
                'reason': ReturnRequest.ReturnReason.TRANSIT_DAMAGE,
                'description': 'Corner frame arrived damaged during transit.',
            },
            format='json',
        )
        self.assertEqual(a_create.status_code, status.HTTP_201_CREATED)
        return_id = a_create.data['return_request']['id']

        # Duplicate return request -> 400
        dup_res = self.client.post(
            '/api/orders/returns/',
            {
                'order_number': self.order.order_number,
                'order_item_id': self.order_item.id,
                'reason': ReturnRequest.ReturnReason.TRANSIT_DAMAGE,
                'description': 'Submitting duplicate return request.',
            },
            format='json',
        )
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Customer B cannot view Customer A's return detail
        self.client.force_authenticate(user=self.customer_b)
        self.assertEqual(
            self.client.get(f'/api/orders/returns/{return_id}/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # Admin approves and completes return; order payment_status stays PAID
        self.client.force_authenticate(user=self.admin_user)
        app_res = self.client.post(
            f'/api/admin/returns/{return_id}/approve/',
            {'admin_notes': 'Photo evidence verified.'},
            format='json',
        )
        self.assertEqual(app_res.status_code, status.HTTP_200_OK)

        comp_res = self.client.post(f'/api/admin/returns/{return_id}/complete/', {}, format='json')
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)

        ret = ReturnRequest.objects.get(pk=return_id)
        self.assertEqual(ret.status, ReturnRequest.ReturnStatus.COMPLETED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)


class SellerIsolationIntegrationTests(APITestCase):
    """Database-backed tests ensuring strict cross-seller data isolation."""

    def setUp(self):
        self.seller_one_user, self.seller_one = _create_seller(
            'iso.s1@example.com', 'Terracotta Collective'
        )
        self.seller_two_user, self.seller_two = _create_seller(
            'iso.s2@example.com', 'Channapatna Toys'
        )
        cat = Category.objects.create(name='Decor', slug='decor', is_active=True)
        self.s1_product = Product.objects.create(
            seller=self.seller_one,
            category=cat,
            name='Terracotta Lamp',
            slug='terracotta-lamp',
            description='Handcrafted clay lamp.',
            price=Decimal('750.00'),
            available_stock=12,
            craft_type='Terracotta',
            origin_state='West Bengal',
            approval_status=Product.ApprovalStatus.APPROVED,
        )
        customer = _create_customer('iso.cust@example.com')
        order = Order.objects.create(
            customer=customer,
            order_number='BB-2026-ISO01',
            subtotal=Decimal('750.00'),
            shipping_amount=Decimal('99.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('849.00'),
            order_status=Order.OrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
            shipping_address_snapshot={'city': 'Mumbai'},
        )
        OrderItem.objects.create(
            order=order,
            product=self.s1_product,
            seller=self.seller_one,
            product_name=self.s1_product.name,
            unit_price=Decimal('750.00'),
            quantity=1,
            line_total=Decimal('750.00'),
        )

    def test_seller_two_cannot_access_seller_one_products_inventory_orders_or_analytics(self):
        self.client.force_authenticate(user=self.seller_two_user)

        # Products isolation
        prod_list = self.client.get('/api/sellers/products/')
        self.assertEqual(prod_list.status_code, status.HTTP_200_OK)
        items = prod_list.data if isinstance(prod_list.data, list) else prod_list.data.get('results', [])
        self.assertEqual(len(items), 0)
        self.assertEqual(
            self.client.get(f'/api/sellers/products/{self.s1_product.id}/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # Inventory isolation
        inv_patch = self.client.patch(
            f'/api/sellers/inventory/{self.s1_product.id}/',
            {'action': 'increase', 'quantity': 5, 'reason': 'Unauthorized'},
            format='json',
        )
        self.assertEqual(inv_patch.status_code, status.HTTP_404_NOT_FOUND)

        # Orders isolation
        orders_res = self.client.get('/api/sellers/orders/')
        self.assertEqual(orders_res.status_code, status.HTTP_200_OK)
        order_items = orders_res.data if isinstance(orders_res.data, list) else orders_res.data.get('results', [])
        self.assertEqual(len(order_items), 0)
        self.assertEqual(
            self.client.get('/api/sellers/orders/BB-2026-ISO01/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # Analytics isolation
        analytics_res = self.client.get('/api/sellers/analytics/overview/')
        self.assertEqual(analytics_res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(analytics_res.data['total_sales']), 0.0)
        self.assertEqual(analytics_res.data['total_orders'], 0)
