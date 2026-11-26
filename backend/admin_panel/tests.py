from decimal import Decimal
from unittest.mock import MagicMock, patch
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from sellers.models import SellerProfile
from orders.models import Order, OrderItem, ReturnRequest
from admin_panel.return_views import (
    AdminReturnListView,
    AdminReturnDetailView,
    AdminReturnApproveView,
    AdminReturnRejectView,
    AdminReturnCompleteView,
)
from admin_panel.views import AdminDashboardSummaryView
from admin_panel.seller_views import (
    AdminSellerListView,
    AdminSellerDetailView,
    AdminSellerApproveView,
    AdminSellerRejectView,
    AdminSellerSuspendView,
    AdminSellerReactivateView,
)
from admin_panel.product_views import (
    AdminProductListView,
    AdminProductDetailView,
    AdminProductApproveView,
    AdminProductRejectView,
    AdminProductSuspendView,
)
from admin_panel.customer_views import (
    AdminCustomerListView,
    AdminCustomerDetailView,
    AdminCustomerDeactivateView,
    AdminCustomerActivateView,
)
from admin_panel.order_views import (
    AdminOrderListView,
    AdminOrderSummaryView,
    AdminOrderDetailView,
)
from admin_panel.payment_views import (
    AdminPaymentListView,
    AdminPaymentSummaryView,
    AdminPaymentDetailView,
)
from admin_panel.analytics_views import AdminPlatformAnalyticsView
from admin_panel.settings_views import AdminPlatformSettingsView, PublicPlatformSettingsView
from admin_panel.newsletter_views import PublicNewsletterSubscribeView
from admin_panel.models import PlatformSettings, NewsletterSubscription
from products.models import Product, Category


class AdminDashboardSummaryTests(SimpleTestCase):
    """
    Tests for Step 9.1: Admin permission checks, role isolation,
    multi-vendor parent order counting, paid order filtering, and empty states.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminDashboardSummaryView.as_view()

    def _make_user(self, role=User.Role.ADMIN, seller_status=None):
        user = MagicMock()
        user.is_authenticated = True
        user.role = role
        user.email = f'{role.lower()}@bharatbazaar.in'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def test_anonymous_user_rejected(self):
        req = self.factory.get('/api/admin/dashboard/summary/')
        res = self.view(req)
        self.assertEqual(res.status_code, 401)

    def test_customer_rejected(self):
        req = self.factory.get('/api/admin/dashboard/summary/')
        force_authenticate(req, user=self._make_user(role=User.Role.CUSTOMER))
        res = self.view(req)
        self.assertEqual(res.status_code, 403)

    def test_approved_and_pending_sellers_rejected(self):
        req1 = self.factory.get('/api/admin/dashboard/summary/')
        force_authenticate(
            req1,
            user=self._make_user(role=User.Role.SELLER, seller_status=SellerProfile.ApplicationStatus.APPROVED),
        )
        self.assertEqual(self.view(req1).status_code, 403)

        req2 = self.factory.get('/api/admin/dashboard/summary/')
        force_authenticate(
            req2,
            user=self._make_user(role=User.Role.SELLER, seller_status=SellerProfile.ApplicationStatus.PENDING),
        )
        self.assertEqual(self.view(req2).status_code, 403)

    @patch('admin_panel.views.Order.objects')
    @patch('admin_panel.views.Product.objects')
    @patch('admin_panel.views.SellerProfile.objects')
    @patch('admin_panel.views.User.objects')
    def test_admin_receives_empty_database_zero_stats(
        self, mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr
    ):
        mock_user_mgr.filter.return_value.count.return_value = 0

        mock_seller_mgr.aggregate.return_value = {
            'total_sellers': 0,
            'pending_sellers': 0,
            'approved_sellers': 0,
            'rejected_sellers': 0,
            'suspended_sellers': 0,
        }
        mock_seller_mgr.order_by.return_value = []

        mock_prod_mgr.aggregate.return_value = {
            'total_products': 0,
            'pending_products': 0,
            'approved_products': 0,
            'rejected_products': 0,
        }

        mock_order_mgr.count.return_value = 0
        mock_order_mgr.filter.return_value.aggregate.return_value = {
            'paid_orders': 0,
            'total_paid_order_value': None,
        }
        mock_order_mgr.order_by.return_value = []

        req = self.factory.get('/api/admin/dashboard/summary/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.view(req)
        self.assertEqual(res.status_code, 200)

        stats = res.data['stats']
        self.assertEqual(stats['total_customers'], 0)
        self.assertEqual(stats['total_sellers'], 0)
        self.assertEqual(stats['total_products'], 0)
        self.assertEqual(stats['total_orders'], 0)
        self.assertEqual(stats['paid_orders'], 0)
        self.assertEqual(stats['total_paid_order_value'], '0.00')
        self.assertEqual(res.data['recent_sellers'], [])
        self.assertEqual(res.data['recent_orders'], [])

    @patch('admin_panel.views.Order.objects')
    @patch('admin_panel.views.Product.objects')
    @patch('admin_panel.views.SellerProfile.objects')
    @patch('admin_panel.views.User.objects')
    def test_admin_summary_calculations_and_paid_order_filtering(
        self, mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr
    ):
        mock_user_mgr.filter.return_value.count.return_value = 25

        mock_seller_mgr.aggregate.return_value = {
            'total_sellers': 10,
            'pending_sellers': 3,
            'approved_sellers': 5,
            'rejected_sellers': 1,
            'suspended_sellers': 1,
        }
        mock_seller_mgr.order_by.return_value = []

        mock_prod_mgr.aggregate.return_value = {
            'total_products': 40,
            'pending_products': 6,
            'approved_products': 32,
            'rejected_products': 2,
        }

        # 12 total parent orders, only 8 PAID (unpaid/failed excluded)
        mock_order_mgr.count.return_value = 12
        mock_order_mgr.filter.return_value.aggregate.return_value = {
            'paid_orders': 8,
            'total_paid_order_value': Decimal('24500.00'),
        }
        mock_order_mgr.order_by.return_value = []

        req = self.factory.get('/api/admin/dashboard/summary/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.view(req)
        self.assertEqual(res.status_code, 200)

        # Verify paid order query excludes unpaid/failed
        mock_order_mgr.filter.assert_called_once_with(payment_status=Order.PaymentStatus.PAID)

        stats = res.data['stats']
        self.assertEqual(stats['total_customers'], 25)
        self.assertEqual(stats['total_sellers'], 10)
        self.assertEqual(stats['pending_sellers'], 3)
        self.assertEqual(stats['approved_sellers'], 5)
        self.assertEqual(stats['rejected_sellers'], 1)
        self.assertEqual(stats['suspended_sellers'], 1)
        self.assertEqual(stats['total_products'], 40)
        self.assertEqual(stats['pending_products'], 6)
        self.assertEqual(stats['approved_products'], 32)
        self.assertEqual(stats['rejected_products'], 2)
        self.assertEqual(stats['total_orders'], 12)
        self.assertEqual(stats['paid_orders'], 8)
        self.assertEqual(stats['total_paid_order_value'], '24500.00')


class AdminSellerManagementTests(SimpleTestCase):
    """
    Tests for Step 9.2: Admin seller application list, detail, approve,
    reject, suspend, reactivate, permissions, notifications, and data preservation.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminSellerListView.as_view()
        self.detail_view = AdminSellerDetailView.as_view()
        self.approve_view = AdminSellerApproveView.as_view()
        self.reject_view = AdminSellerRejectView.as_view()
        self.suspend_view = AdminSellerSuspendView.as_view()
        self.reactivate_view = AdminSellerReactivateView.as_view()

    def _make_user(self, role=User.Role.ADMIN, user_id=1, email='admin@bharatbazaar.in', seller_status=None):
        user = MagicMock(spec=User)
        user.id = user_id
        user.is_authenticated = True
        user.role = role
        user.email = email
        user.first_name = 'Aarav'
        user.last_name = 'Mehta'
        user.phone_number = '+919876543210'
        user.is_active = True
        user.is_superuser = False
        user.is_staff = (role == User.Role.ADMIN)
        user.get_full_name.return_value = f'{user.first_name} {user.last_name}'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _make_seller(self, pk=10, status_val=SellerProfile.ApplicationStatus.PENDING):
        owner = self._make_user(
            role=User.Role.SELLER,
            user_id=100 + pk,
            email=f'artisan{pk}@bharatbazaar.in',
        )
        seller = MagicMock(spec=SellerProfile)
        seller.id = pk
        seller.pk = pk
        seller.user = owner
        seller.store_name = f'Jaipur Pottery Studio {pk}'
        seller.business_description = 'Traditional handcrafted blue pottery.'
        seller.craft_category = 'Blue Pottery'
        seller.city = 'Jaipur'
        seller.state = 'Rajasthan'
        seller.application_status = status_val
        seller.admin_notes = ''
        seller.status_reason = ''
        seller.reviewed_by = None
        seller.reviewed_at = None
        seller.products_count = 3
        seller.created_at = '2026-11-20T10:00:00Z'
        seller.updated_at = '2026-11-20T10:00:00Z'
        return seller

    def test_anonymous_customer_and_seller_access_denied(self):
        endpoints = [
            ('get', self.list_view, '/api/admin/sellers/', {}),
            ('get', self.detail_view, '/api/admin/sellers/10/', {'pk': 10}),
            ('post', self.approve_view, '/api/admin/sellers/10/approve/', {'pk': 10}),
            ('post', self.reject_view, '/api/admin/sellers/10/reject/', {'pk': 10}),
            ('post', self.suspend_view, '/api/admin/sellers/10/suspend/', {'pk': 10}),
            ('post', self.reactivate_view, '/api/admin/sellers/10/reactivate/', {'pk': 10}),
        ]
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=2, email='cust@bharatbazaar.in')
        approved_seller = self._make_user(
            role=User.Role.SELLER,
            user_id=3,
            email='seller@bharatbazaar.in',
            seller_status=SellerProfile.ApplicationStatus.APPROVED,
        )

        for method, view_fn, url, kwargs in endpoints:
            anon_req = getattr(self.factory, method)(url)
            self.assertEqual(view_fn(anon_req, **kwargs).status_code, 401)

            cust_req = getattr(self.factory, method)(url)
            force_authenticate(cust_req, user=customer)
            self.assertEqual(view_fn(cust_req, **kwargs).status_code, 403)

            sel_req = getattr(self.factory, method)(url)
            force_authenticate(sel_req, user=approved_seller)
            self.assertEqual(view_fn(sel_req, **kwargs).status_code, 403)

    @patch('admin_panel.seller_views.SellerProfile.objects')
    def test_admin_can_list_and_filter_sellers(self, mock_seller_mgr):
        s1 = self._make_seller(pk=1, status_val=SellerProfile.ApplicationStatus.PENDING)
        qs = MagicMock()
        qs.annotate.return_value = qs
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__len__.return_value = 1
        qs.__getitem__.return_value = [s1]
        mock_seller_mgr.select_related.return_value = qs

        req = self.factory.get('/api/admin/sellers/?status=PENDING&search=Jaipur')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['store_name'], 'Jaipur Pottery Studio 1')
        self.assertEqual(res.data['results'][0]['application_status'], 'PENDING')

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Product.objects')
    @patch('admin_panel.seller_views.get_object_or_404')
    def test_admin_can_view_seller_detail(self, mock_get_obj, mock_prod_mgr, mock_order_mgr):
        seller = self._make_seller(pk=5, status_val=SellerProfile.ApplicationStatus.APPROVED)
        mock_get_obj.return_value = seller
        mock_prod_mgr.filter.return_value.count.return_value = 4
        mock_prod_mgr.filter.return_value.filter.return_value.count.return_value = 2
        mock_order_mgr.filter.return_value.distinct.return_value.count.return_value = 7

        req = self.factory.get('/api/admin/sellers/5/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.detail_view(req, pk=5)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['store_name'], 'Jaipur Pottery Studio 5')
        self.assertEqual(res.data['owner']['email'], 'artisan5@bharatbazaar.in')
        self.assertNotIn('password', res.data['owner'])
        self.assertEqual(res.data['stats']['total_orders'], 7)

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Product.objects')
    @patch('admin_panel.seller_views.Notification.objects')
    @patch('admin_panel.seller_views.transaction.atomic')
    @patch('admin_panel.seller_views.get_object_or_404')
    def test_approve_pending_seller_updates_status_notifies_and_allows_seller_access(
        self, mock_get_obj, mock_atomic, mock_notif_mgr, mock_prod_mgr, mock_order_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1)
        seller = self._make_seller(pk=10, status_val=SellerProfile.ApplicationStatus.PENDING)
        mock_get_obj.return_value = seller
        mock_prod_mgr.filter.return_value.count.return_value = 0
        mock_prod_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.distinct.return_value.count.return_value = 0

        req = self.factory.post('/api/admin/sellers/10/approve/', {'admin_notes': 'Verified craft'}, format='json')
        force_authenticate(req, user=admin_user)
        res = self.approve_view(req, pk=10)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(seller.application_status, SellerProfile.ApplicationStatus.APPROVED)
        self.assertEqual(seller.reviewed_by, admin_user)
        self.assertIsNotNone(seller.reviewed_at)
        self.assertFalse(seller.user.is_superuser)
        self.assertFalse(seller.user.is_staff)
        mock_notif_mgr.create.assert_called_once()
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['customer'], seller.user)

        # Verify IsApprovedSeller now grants access
        from sellers.permissions import IsApprovedSeller
        seller_user = seller.user
        seller_user.seller_profile = seller
        seller_req = self.factory.get('/api/sellers/dashboard/')
        seller_req.user = seller_user
        self.assertTrue(IsApprovedSeller().has_permission(seller_req, None))

    def test_reject_requires_reason(self):
        admin_user = self._make_user(role=User.Role.ADMIN)
        req = self.factory.post('/api/admin/sellers/10/reject/', {'reason': '   '}, format='json')
        force_authenticate(req, user=admin_user)
        res = self.reject_view(req, pk=10)
        self.assertEqual(res.status_code, 400)

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Product.objects')
    @patch('admin_panel.seller_views.Notification.objects')
    @patch('admin_panel.seller_views.transaction.atomic')
    @patch('admin_panel.seller_views.get_object_or_404')
    def test_suspend_blocks_seller_apis_and_preserves_data_and_reactivate_restores(
        self, mock_get_obj, mock_atomic, mock_notif_mgr, mock_prod_mgr, mock_order_mgr
    ):
        from rest_framework.exceptions import PermissionDenied
        from sellers.permissions import IsApprovedSeller

        admin_user = self._make_user(role=User.Role.ADMIN)
        seller = self._make_seller(pk=12, status_val=SellerProfile.ApplicationStatus.APPROVED)
        mock_get_obj.return_value = seller
        mock_prod_mgr.filter.return_value.count.return_value = 5
        mock_prod_mgr.filter.return_value.filter.return_value.count.return_value = 4
        mock_order_mgr.filter.return_value.distinct.return_value.count.return_value = 9

        # 1. Suspend without reason fails
        bad_req = self.factory.post('/api/admin/sellers/12/suspend/', {}, format='json')
        force_authenticate(bad_req, user=admin_user)
        self.assertEqual(self.suspend_view(bad_req, pk=12).status_code, 400)

        # 2. Suspend with reason succeeds & does not delete products/orders
        susp_req = self.factory.post(
            '/api/admin/sellers/12/suspend/',
            {'reason': 'Fulfillment compliance review'},
            format='json',
        )
        force_authenticate(susp_req, user=admin_user)
        susp_res = self.suspend_view(susp_req, pk=12)
        self.assertEqual(susp_res.status_code, 200)
        self.assertEqual(seller.application_status, SellerProfile.ApplicationStatus.SUSPENDED)
        self.assertEqual(seller.status_reason, 'Fulfillment compliance review')
        mock_prod_mgr.filter.return_value.delete.assert_not_called()
        mock_order_mgr.filter.return_value.delete.assert_not_called()

        # 3. Suspended seller is blocked by IsApprovedSeller
        seller_user = seller.user
        seller_user.seller_profile = seller
        seller_req = self.factory.get('/api/sellers/dashboard/')
        seller_req.user = seller_user
        with self.assertRaises(PermissionDenied):
            IsApprovedSeller().has_permission(seller_req, None)

        # 4. Reactivate restores APPROVED access
        react_req = self.factory.post('/api/admin/sellers/12/reactivate/', {}, format='json')
        force_authenticate(react_req, user=admin_user)
        react_res = self.reactivate_view(react_req, pk=12)
        self.assertEqual(react_res.status_code, 200)
        self.assertEqual(seller.application_status, SellerProfile.ApplicationStatus.APPROVED)
        self.assertEqual(seller.status_reason, '')
        self.assertTrue(IsApprovedSeller().has_permission(seller_req, None))
        self.assertEqual(mock_notif_mgr.create.call_count, 2)

    @patch('admin_panel.seller_views.Notification.objects')
    @patch('admin_panel.seller_views.transaction.atomic')
    @patch('admin_panel.seller_views.get_object_or_404')
    def test_invalid_transitions_rejected_without_duplicate_notifications(
        self, mock_get_obj, mock_atomic, mock_notif_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN)

        # Approve already APPROVED seller -> 400
        approved_seller = self._make_seller(pk=20, status_val=SellerProfile.ApplicationStatus.APPROVED)
        mock_get_obj.return_value = approved_seller
        req1 = self.factory.post('/api/admin/sellers/20/approve/', {}, format='json')
        force_authenticate(req1, user=admin_user)
        self.assertEqual(self.approve_view(req1, pk=20).status_code, 400)

        # Suspend PENDING seller -> 400
        pending_seller = self._make_seller(pk=21, status_val=SellerProfile.ApplicationStatus.PENDING)
        mock_get_obj.return_value = pending_seller
        req2 = self.factory.post('/api/admin/sellers/21/suspend/', {'reason': 'Invalid'}, format='json')
        force_authenticate(req2, user=admin_user)
        self.assertEqual(self.suspend_view(req2, pk=21).status_code, 400)

        # Reactivate APPROVED seller -> 400
        mock_get_obj.return_value = approved_seller
        req3 = self.factory.post('/api/admin/sellers/20/reactivate/', {}, format='json')
        force_authenticate(req3, user=admin_user)
        self.assertEqual(self.reactivate_view(req3, pk=20).status_code, 400)

        # Reject APPROVED seller -> 400
        req4 = self.factory.post('/api/admin/sellers/20/reject/', {'reason': 'Invalid'}, format='json')
        force_authenticate(req4, user=admin_user)
        self.assertEqual(self.reject_view(req4, pk=20).status_code, 400)

        mock_notif_mgr.create.assert_not_called()


class AdminCustomerManagementTests(SimpleTestCase):
    """
    Tests for Step 9.4: Admin customer list, detail, deactivate, activate,
    permissions, self-deactivation block, customer-only restriction,
    invalid transitions, and notifications.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminCustomerListView.as_view()
        self.detail_view = AdminCustomerDetailView.as_view()
        self.deactivate_view = AdminCustomerDeactivateView.as_view()
        self.activate_view = AdminCustomerActivateView.as_view()

    def _make_user(self, role=User.Role.ADMIN, user_id=1, email='admin@bharatbazaar.in', is_active=True, seller_status=None):
        user = MagicMock(spec=User)
        user.id = user_id
        user.pk = user_id
        user.is_authenticated = True
        user.role = role
        user.email = email
        user.first_name = 'Test'
        user.last_name = 'User'
        user.phone_number = '+919876543210'
        user.is_active = is_active
        user.is_staff = (role == User.Role.ADMIN)
        user.is_superuser = False
        user.date_joined = '2026-01-01T10:00:00Z'
        user.updated_at = '2026-11-26T10:00:00Z'
        user.get_full_name.return_value = f'{user.first_name} {user.last_name}'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def test_anonymous_customer_and_seller_access_denied(self):
        endpoints = [
            ('get', self.list_view, '/api/admin/customers/', {}),
            ('get', self.detail_view, '/api/admin/customers/50/', {'pk': 50}),
            ('post', self.deactivate_view, '/api/admin/customers/50/deactivate/', {'pk': 50}),
            ('post', self.activate_view, '/api/admin/customers/50/activate/', {'pk': 50}),
        ]
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=2, email='patron@test.com')
        seller = self._make_user(
            role=User.Role.SELLER, user_id=3, email='artisan@test.com',
            seller_status=SellerProfile.ApplicationStatus.APPROVED,
        )

        for method, view_fn, url, kwargs in endpoints:
            anon_req = getattr(self.factory, method)(url)
            self.assertEqual(view_fn(anon_req, **kwargs).status_code, 401)

            cust_req = getattr(self.factory, method)(url)
            force_authenticate(cust_req, user=customer)
            self.assertEqual(view_fn(cust_req, **kwargs).status_code, 403)

            sel_req = getattr(self.factory, method)(url)
            force_authenticate(sel_req, user=seller)
            self.assertEqual(view_fn(sel_req, **kwargs).status_code, 403)

    @patch('admin_panel.customer_views.User.objects')
    def test_admin_can_list_customers_with_search_and_filter(self, mock_user_mgr):
        c1 = self._make_user(role=User.Role.CUSTOMER, user_id=50, email='aarav@test.com')
        c1.order_count = 3
        c1.total_spent = Decimal('5600.00')
        qs = MagicMock()
        qs.annotate.return_value = qs
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__len__.return_value = 1
        qs.__getitem__.return_value = [c1]
        mock_user_mgr.filter.return_value = qs

        req = self.factory.get('/api/admin/customers/?active=true&search=aarav')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['email'], 'aarav@test.com')
        self.assertNotIn('password', res.data['results'][0])

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Address.objects')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_admin_can_view_customer_detail(self, mock_get_obj, mock_addr_mgr, mock_order_mgr):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=55, email='meera@test.com')
        mock_get_obj.return_value = customer
        mock_addr_mgr.filter.return_value.order_by.return_value = []
        mock_order_mgr.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.order_by.return_value = []

        req = self.factory.get('/api/admin/customers/55/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.detail_view(req, pk=55)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email'], 'meera@test.com')
        self.assertNotIn('password', res.data)

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Address.objects')
    @patch('admin_panel.customer_views.Notification.objects')
    @patch('admin_panel.customer_views.transaction.atomic')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_deactivate_customer_blocks_account_and_notifies(
        self, mock_get_obj, mock_atomic, mock_notif_mgr, mock_addr_mgr, mock_order_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1)
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=60, email='patron60@test.com', is_active=True)
        mock_get_obj.return_value = customer
        mock_addr_mgr.filter.return_value.order_by.return_value = []
        mock_order_mgr.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.order_by.return_value = []

        req = self.factory.post('/api/admin/customers/60/deactivate/')
        force_authenticate(req, user=admin_user)
        res = self.deactivate_view(req, pk=60)

        self.assertEqual(res.status_code, 200)
        self.assertFalse(customer.is_active)
        mock_notif_mgr.create.assert_called_once()
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['customer'], customer)
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['notification_type'], 'ACCOUNT')

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Address.objects')
    @patch('admin_panel.customer_views.Notification.objects')
    @patch('admin_panel.customer_views.transaction.atomic')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_activate_restores_account_and_notifies(
        self, mock_get_obj, mock_atomic, mock_notif_mgr, mock_addr_mgr, mock_order_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1)
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=61, email='patron61@test.com', is_active=False)
        mock_get_obj.return_value = customer
        mock_addr_mgr.filter.return_value.order_by.return_value = []
        mock_order_mgr.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.order_by.return_value = []

        req = self.factory.post('/api/admin/customers/61/activate/')
        force_authenticate(req, user=admin_user)
        res = self.activate_view(req, pk=61)

        self.assertEqual(res.status_code, 200)
        self.assertTrue(customer.is_active)
        mock_notif_mgr.create.assert_called_once()

    @patch('admin_panel.customer_views.get_object_or_404')
    def test_admin_cannot_deactivate_own_account(self, mock_get_obj):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1, email='admin@test.com')
        # Simulate a customer with same id as admin (edge case)
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=1, email='admin@test.com')
        mock_get_obj.return_value = customer

        req = self.factory.post('/api/admin/customers/1/deactivate/')
        force_authenticate(req, user=admin_user)
        res = self.deactivate_view(req, pk=1)

        self.assertEqual(res.status_code, 400)
        self.assertIn('own account', res.data['detail'])

    @patch('admin_panel.customer_views.Notification.objects')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_duplicate_deactivation_and_activation_rejected(self, mock_get_obj, mock_notif_mgr):
        admin_user = self._make_user(role=User.Role.ADMIN)

        # Already inactive -> deactivate again
        inactive_cust = self._make_user(role=User.Role.CUSTOMER, user_id=70, is_active=False)
        mock_get_obj.return_value = inactive_cust
        req1 = self.factory.post('/api/admin/customers/70/deactivate/')
        force_authenticate(req1, user=admin_user)
        self.assertEqual(self.deactivate_view(req1, pk=70).status_code, 400)

        # Already active -> activate again
        active_cust = self._make_user(role=User.Role.CUSTOMER, user_id=71, is_active=True)
        mock_get_obj.return_value = active_cust
        req2 = self.factory.post('/api/admin/customers/71/activate/')
        force_authenticate(req2, user=admin_user)
        self.assertEqual(self.activate_view(req2, pk=71).status_code, 400)

        mock_notif_mgr.create.assert_not_called()


class AdminProductModerationTests(SimpleTestCase):
    """
    Tests for Step 9.3: Admin product moderation list, detail, approve, reject,
    suspend (INACTIVE), permissions, mandatory reasons, notifications,
    and preservation of seller reapproval & public visibility rules.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminProductListView.as_view()
        self.detail_view = AdminProductDetailView.as_view()
        self.approve_view = AdminProductApproveView.as_view()
        self.reject_view = AdminProductRejectView.as_view()
        self.suspend_view = AdminProductSuspendView.as_view()

    def _make_user(self, role=User.Role.ADMIN, user_id=1, email='admin@bharatbazaar.in', seller_status=None):
        user = MagicMock(spec=User)
        user.id = user_id
        user.is_authenticated = True
        user.role = role
        user.email = email
        user.first_name = 'Meera'
        user.last_name = 'Kapoor'
        user.get_full_name.return_value = 'Meera Kapoor'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _make_product(self, pk=50, approval_status=Product.ApprovalStatus.PENDING):
        owner = self._make_user(role=User.Role.SELLER, user_id=200 + pk, email=f'seller{pk}@bharatbazaar.in')
        seller = MagicMock(spec=SellerProfile)
        seller.id = 20 + pk
        seller.store_name = f'Kutch Craft Collective {pk}'
        seller.application_status = SellerProfile.ApplicationStatus.APPROVED
        seller.is_approved = True
        seller.city = 'Bhuj'
        seller.state = 'Gujarat'
        seller.user = owner

        category = MagicMock(spec=Category)
        category.id = 3
        category.name = 'Handloom Textiles'
        category.slug = 'handloom-textiles'
        category.is_active = True

        product = MagicMock(spec=Product)
        product.id = pk
        product.pk = pk
        product.name = f'Handwoven Ajrakh Shawl {pk}'
        product.slug = f'handwoven-ajrakh-shawl-{pk}'
        product.sku = f'BB-AJR-{pk}'
        product.short_description = 'Natural dyed cotton shawl.'
        product.description = 'Hand-block printed Ajrakh shawl crafted in Kutch.'
        product.price = Decimal('2400.00')
        product.discount_price = Decimal('2100.00')
        product.available_stock = 12
        product.low_stock_threshold = 5
        product.craft_type = 'Ajrakh'
        product.origin_state = 'Gujarat'
        product.origin_city = 'Bhuj'
        product.tags = 'ajrakh,cotton'
        product.materials = 'Organic Cotton'
        product.dimensions = '2m x 1m'
        product.care_instructions = 'Hand wash cold'
        product.shipping_info = 'Ships in 3 days'
        product.returns_info = '7 days return'
        product.primary_image = 'https://res.cloudinary.com/demo/image/upload/shawl.jpg'
        product.is_featured = False
        product.approval_status = approval_status
        product.admin_feedback = ''
        product.reviewed_by = None
        product.reviewed_at = None
        product.created_at = '2026-11-25T10:00:00Z'
        product.updated_at = '2026-11-25T10:00:00Z'
        product.category = category
        product.seller = seller
        product.images.all.return_value = []
        return product

    def test_anonymous_customer_and_seller_access_denied(self):
        endpoints = [
            ('get', self.list_view, '/api/admin/products/', {}),
            ('get', self.detail_view, '/api/admin/products/50/', {'pk': 50}),
            ('post', self.approve_view, '/api/admin/products/50/approve/', {'pk': 50}),
            ('post', self.reject_view, '/api/admin/products/50/reject/', {'pk': 50}),
            ('post', self.suspend_view, '/api/admin/products/50/suspend/', {'pk': 50}),
        ]
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=2, email='patron@bharatbazaar.in')
        seller = self._make_user(
            role=User.Role.SELLER,
            user_id=3,
            email='artisan@bharatbazaar.in',
            seller_status=SellerProfile.ApplicationStatus.APPROVED,
        )

        for method, view_fn, url, kwargs in endpoints:
            anon_req = getattr(self.factory, method)(url)
            self.assertEqual(view_fn(anon_req, **kwargs).status_code, 401)

            cust_req = getattr(self.factory, method)(url)
            force_authenticate(cust_req, user=customer)
            self.assertEqual(view_fn(cust_req, **kwargs).status_code, 403)

            sel_req = getattr(self.factory, method)(url)
            force_authenticate(sel_req, user=seller)
            self.assertEqual(view_fn(sel_req, **kwargs).status_code, 403)

    @patch('admin_panel.product_views.Product.objects')
    def test_admin_can_list_filter_and_search_products(self, mock_prod_mgr):
        p1 = self._make_product(pk=51, approval_status=Product.ApprovalStatus.PENDING)
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__len__.return_value = 1
        qs.__getitem__.return_value = [p1]
        mock_prod_mgr.select_related.return_value = qs

        req = self.factory.get('/api/admin/products/?status=PENDING&search=Ajrakh')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['name'], 'Handwoven Ajrakh Shawl 51')
        self.assertEqual(res.data['results'][0]['approval_status'], 'PENDING')

    @patch('admin_panel.product_views.get_object_or_404')
    def test_admin_can_view_product_detail_without_sensitive_fields(self, mock_get_obj):
        product = self._make_product(pk=52, approval_status=Product.ApprovalStatus.PENDING)
        mock_get_obj.return_value = product

        req = self.factory.get('/api/admin/products/52/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.detail_view(req, pk=52)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['name'], 'Handwoven Ajrakh Shawl 52')
        self.assertEqual(res.data['seller']['store_name'], 'Kutch Craft Collective 52')
        self.assertNotIn('password', res.data['seller'])

    @patch('admin_panel.product_views.Notification.objects')
    @patch('admin_panel.product_views.transaction.atomic')
    @patch('admin_panel.product_views.get_object_or_404')
    def test_approve_pending_product_records_audit_and_notifies_seller(
        self, mock_get_obj, mock_atomic, mock_notif_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN)
        product = self._make_product(pk=55, approval_status=Product.ApprovalStatus.PENDING)
        mock_get_obj.return_value = product

        req = self.factory.post('/api/admin/products/55/approve/', {}, format='json')
        force_authenticate(req, user=admin_user)
        res = self.approve_view(req, pk=55)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(product.approval_status, Product.ApprovalStatus.APPROVED)
        self.assertEqual(product.reviewed_by, admin_user)
        self.assertIsNotNone(product.reviewed_at)
        product.delete.assert_not_called()
        mock_notif_mgr.create.assert_called_once()
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['customer'], product.seller.user)
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['notification_type'], 'PRODUCT')

    def test_reject_and_suspend_require_reason(self):
        admin_user = self._make_user(role=User.Role.ADMIN)
        rej_req = self.factory.post('/api/admin/products/55/reject/', {'reason': '   '}, format='json')
        force_authenticate(rej_req, user=admin_user)
        self.assertEqual(self.reject_view(rej_req, pk=55).status_code, 400)

        susp_req = self.factory.post('/api/admin/products/55/suspend/', {}, format='json')
        force_authenticate(susp_req, user=admin_user)
        self.assertEqual(self.suspend_view(susp_req, pk=55).status_code, 400)

    @patch('admin_panel.product_views.Notification.objects')
    @patch('admin_panel.product_views.transaction.atomic')
    @patch('admin_panel.product_views.get_object_or_404')
    def test_suspend_approved_product_sets_inactive_preserves_stock_and_notifies(
        self, mock_get_obj, mock_atomic, mock_notif_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN)
        product = self._make_product(pk=56, approval_status=Product.ApprovalStatus.APPROVED)
        mock_get_obj.return_value = product

        req = self.factory.post(
            '/api/admin/products/56/suspend/',
            {'reason': 'Misleading GI tag claim'},
            format='json',
        )
        force_authenticate(req, user=admin_user)
        res = self.suspend_view(req, pk=56)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(product.approval_status, Product.ApprovalStatus.INACTIVE)
        self.assertEqual(product.admin_feedback, 'Misleading GI tag claim')
        self.assertEqual(product.available_stock, 12)
        product.delete.assert_not_called()
        mock_notif_mgr.create.assert_called_once()

    @patch('admin_panel.product_views.Notification.objects')
    @patch('admin_panel.product_views.transaction.atomic')
    @patch('admin_panel.product_views.get_object_or_404')
    def test_invalid_transitions_rejected_without_duplicate_notifications(
        self, mock_get_obj, mock_atomic, mock_notif_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN)

        approved_prod = self._make_product(pk=60, approval_status=Product.ApprovalStatus.APPROVED)
        mock_get_obj.return_value = approved_prod
        req1 = self.factory.post('/api/admin/products/60/approve/', {}, format='json')
        force_authenticate(req1, user=admin_user)
        self.assertEqual(self.approve_view(req1, pk=60).status_code, 400)

        req2 = self.factory.post('/api/admin/products/60/reject/', {'reason': 'Invalid'}, format='json')
        force_authenticate(req2, user=admin_user)
        self.assertEqual(self.reject_view(req2, pk=60).status_code, 400)

        pending_prod = self._make_product(pk=61, approval_status=Product.ApprovalStatus.PENDING)
        mock_get_obj.return_value = pending_prod
        req3 = self.factory.post('/api/admin/products/61/suspend/', {'reason': 'Invalid'}, format='json')
        force_authenticate(req3, user=admin_user)
        self.assertEqual(self.suspend_view(req3, pk=61).status_code, 400)

        rejected_prod = self._make_product(pk=62, approval_status=Product.ApprovalStatus.REJECTED)
        mock_get_obj.return_value = rejected_prod
        req4 = self.factory.post('/api/admin/products/62/approve/', {}, format='json')
        force_authenticate(req4, user=admin_user)
        self.assertEqual(self.approve_view(req4, pk=62).status_code, 400)

        mock_notif_mgr.create.assert_not_called()


class AdminCustomerManagementTests(SimpleTestCase):
    """
    Tests for Step 9.4: Admin customer list, detail, deactivate, activate,
    permissions, self-deactivation block, customer-only restriction,
    invalid transitions, and notifications.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminCustomerListView.as_view()
        self.detail_view = AdminCustomerDetailView.as_view()
        self.deactivate_view = AdminCustomerDeactivateView.as_view()
        self.activate_view = AdminCustomerActivateView.as_view()

    def _make_user(self, role=User.Role.ADMIN, user_id=1, email='admin@bharatbazaar.in', is_active=True, seller_status=None):
        user = MagicMock(spec=User)
        user.id = user_id
        user.pk = user_id
        user.is_authenticated = True
        user.role = role
        user.email = email
        user.first_name = 'Test'
        user.last_name = 'User'
        user.phone_number = '+919876543210'
        user.is_active = is_active
        user.is_staff = (role == User.Role.ADMIN)
        user.is_superuser = False
        user.date_joined = '2026-01-01T10:00:00Z'
        user.updated_at = '2026-11-26T10:00:00Z'
        user.get_full_name.return_value = f'{user.first_name} {user.last_name}'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def test_anonymous_customer_and_seller_access_denied(self):
        endpoints = [
            ('get', self.list_view, '/api/admin/customers/', {}),
            ('get', self.detail_view, '/api/admin/customers/50/', {'pk': 50}),
            ('post', self.deactivate_view, '/api/admin/customers/50/deactivate/', {'pk': 50}),
            ('post', self.activate_view, '/api/admin/customers/50/activate/', {'pk': 50}),
        ]
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=2, email='patron@test.com')
        seller = self._make_user(
            role=User.Role.SELLER, user_id=3, email='artisan@test.com',
            seller_status=SellerProfile.ApplicationStatus.APPROVED,
        )

        for method, view_fn, url, kwargs in endpoints:
            anon_req = getattr(self.factory, method)(url)
            self.assertEqual(view_fn(anon_req, **kwargs).status_code, 401)

            cust_req = getattr(self.factory, method)(url)
            force_authenticate(cust_req, user=customer)
            self.assertEqual(view_fn(cust_req, **kwargs).status_code, 403)

            sel_req = getattr(self.factory, method)(url)
            force_authenticate(sel_req, user=seller)
            self.assertEqual(view_fn(sel_req, **kwargs).status_code, 403)

    @patch('admin_panel.customer_views.User.objects')
    def test_admin_can_list_customers_with_search_and_filter(self, mock_user_mgr):
        c1 = self._make_user(role=User.Role.CUSTOMER, user_id=50, email='aarav@test.com')
        c1.order_count = 3
        c1.total_spent = Decimal('5600.00')
        qs = MagicMock()
        qs.annotate.return_value = qs
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__len__.return_value = 1
        qs.__getitem__.return_value = [c1]
        mock_user_mgr.filter.return_value = qs

        req = self.factory.get('/api/admin/customers/?active=true&search=aarav')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['email'], 'aarav@test.com')
        self.assertNotIn('password', res.data['results'][0])

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Address.objects')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_admin_can_view_customer_detail(self, mock_get_obj, mock_addr_mgr, mock_order_mgr):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=55, email='meera@test.com')
        mock_get_obj.return_value = customer
        mock_addr_mgr.filter.return_value.order_by.return_value = []
        mock_order_mgr.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.order_by.return_value = []

        req = self.factory.get('/api/admin/customers/55/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.detail_view(req, pk=55)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email'], 'meera@test.com')
        self.assertNotIn('password', res.data)

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Address.objects')
    @patch('admin_panel.customer_views.Notification.objects')
    @patch('admin_panel.customer_views.transaction.atomic')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_deactivate_customer_blocks_account_and_notifies(
        self, mock_get_obj, mock_atomic, mock_notif_mgr, mock_addr_mgr, mock_order_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1)
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=60, email='patron60@test.com', is_active=True)
        mock_get_obj.return_value = customer
        mock_addr_mgr.filter.return_value.order_by.return_value = []
        mock_order_mgr.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.order_by.return_value = []

        req = self.factory.post('/api/admin/customers/60/deactivate/')
        force_authenticate(req, user=admin_user)
        res = self.deactivate_view(req, pk=60)

        self.assertEqual(res.status_code, 200)
        self.assertFalse(customer.is_active)
        mock_notif_mgr.create.assert_called_once()
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['customer'], customer)
        self.assertEqual(mock_notif_mgr.create.call_args.kwargs['notification_type'], 'ACCOUNT')

    @patch('admin_panel.serializers.Order.objects')
    @patch('admin_panel.serializers.Address.objects')
    @patch('admin_panel.customer_views.Notification.objects')
    @patch('admin_panel.customer_views.transaction.atomic')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_activate_restores_account_and_notifies(
        self, mock_get_obj, mock_atomic, mock_notif_mgr, mock_addr_mgr, mock_order_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1)
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=61, email='patron61@test.com', is_active=False)
        mock_get_obj.return_value = customer
        mock_addr_mgr.filter.return_value.order_by.return_value = []
        mock_order_mgr.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.count.return_value = 0
        mock_order_mgr.filter.return_value.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.aggregate.return_value = {'total': None}
        mock_order_mgr.filter.return_value.order_by.return_value = []

        req = self.factory.post('/api/admin/customers/61/activate/')
        force_authenticate(req, user=admin_user)
        res = self.activate_view(req, pk=61)

        self.assertEqual(res.status_code, 200)
        self.assertTrue(customer.is_active)
        mock_notif_mgr.create.assert_called_once()

    @patch('admin_panel.customer_views.get_object_or_404')
    def test_admin_cannot_deactivate_own_account(self, mock_get_obj):
        admin_user = self._make_user(role=User.Role.ADMIN, user_id=1, email='admin@test.com')
        # Simulate a customer with same id as admin (edge case)
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=1, email='admin@test.com')
        mock_get_obj.return_value = customer

        req = self.factory.post('/api/admin/customers/1/deactivate/')
        force_authenticate(req, user=admin_user)
        res = self.deactivate_view(req, pk=1)

        self.assertEqual(res.status_code, 400)
        self.assertIn('own account', res.data['detail'])

    @patch('admin_panel.customer_views.Notification.objects')
    @patch('admin_panel.customer_views.get_object_or_404')
    def test_duplicate_deactivation_and_activation_rejected(self, mock_get_obj, mock_notif_mgr):
        admin_user = self._make_user(role=User.Role.ADMIN)

        # Already inactive -> deactivate again
        inactive_cust = self._make_user(role=User.Role.CUSTOMER, user_id=70, is_active=False)
        mock_get_obj.return_value = inactive_cust
        req1 = self.factory.post('/api/admin/customers/70/deactivate/')
        force_authenticate(req1, user=admin_user)
        self.assertEqual(self.deactivate_view(req1, pk=70).status_code, 400)

        # Already active -> activate again
        active_cust = self._make_user(role=User.Role.CUSTOMER, user_id=71, is_active=True)
        mock_get_obj.return_value = active_cust
        req2 = self.factory.post('/api/admin/customers/71/activate/')
        force_authenticate(req2, user=admin_user)
        self.assertEqual(self.activate_view(req2, pk=71).status_code, 400)

        mock_notif_mgr.create.assert_not_called()


class AdminOrderManagementTests(SimpleTestCase):
    """
    Tests for Step 9.5: Admin order list, summary, detail, permissions,
    multi-vendor seller groupings, filters, pagination, read-only safety,
    and exclusion of sensitive payment/auth fields.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminOrderListView.as_view()
        self.summary_view = AdminOrderSummaryView.as_view()
        self.detail_view = AdminOrderDetailView.as_view()

    def _make_user(self, role=User.Role.ADMIN, user_id=1, email='admin@bharatbazaar.in', seller_status=None):
        user = MagicMock(spec=User)
        user.id = user_id
        user.pk = user_id
        user.is_authenticated = True
        user.role = role
        user.email = email
        user.first_name = 'Aarav'
        user.last_name = 'Mehta'
        user.phone_number = '+919876543210'
        user.is_active = True
        user.get_full_name.return_value = 'Aarav Mehta'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _make_order_item(self, item_id, seller_id, store_name, product_name, status_val, tracking=''):
        seller = MagicMock(spec=SellerProfile)
        seller.id = seller_id
        seller.store_name = store_name
        seller.city = 'Jaipur'
        seller.state = 'Rajasthan'

        product = MagicMock(spec=Product)
        product.id = 100 + item_id
        product.slug = f'artisan-item-{item_id}'

        item = MagicMock(spec=OrderItem)
        item.id = item_id
        item.product = product
        item.product_id = product.id
        item.seller = seller
        item.seller_id = seller_id
        item.product_name = product_name
        item.unit_price = Decimal('1200.00')
        item.quantity = 1
        item.line_total = Decimal('1200.00')
        item.craft_type = 'Blue Pottery'
        item.origin_state = 'Rajasthan'
        item.primary_image = 'https://res.cloudinary.com/demo/image/upload/pot.jpg'
        item.fulfillment_status = status_val
        item.courier_name = 'BlueDart' if tracking else ''
        item.tracking_number = tracking
        item.tracking_url = f'https://track.example.com/{tracking}' if tracking else ''
        item.dispatched_at = '2026-11-25T12:00:00Z' if tracking else None
        item.estimated_delivery_date = '2026-11-29' if tracking else None
        item.shipment_notes = 'Fragile wrap' if tracking else ''
        item.status_updated_at = '2026-11-25T12:00:00Z'
        return item

    def _make_multivendor_order(self, order_number='BB-ORD-20261126-ABCD1234'):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=55, email='patron@test.com')
        item1 = self._make_order_item(
            1, seller_id=10, store_name='Jaipur Blue Pottery',
            product_name='Handpainted Vase', status_val=OrderItem.FulfillmentStatus.SHIPPED,
            tracking='BD123456',
        )
        item2 = self._make_order_item(
            2, seller_id=20, store_name='Kutch Looms',
            product_name='Ajrakh Stole', status_val=OrderItem.FulfillmentStatus.PROCESSING,
            tracking='',
        )

        order = MagicMock(spec=Order)
        order.id = 501
        order.order_number = order_number
        order.customer = customer
        order.subtotal = Decimal('2400.00')
        order.shipping_amount = Decimal('0.00')
        order.discount_amount = Decimal('0.00')
        order.total_amount = Decimal('2400.00')
        order.order_status = Order.OrderStatus.PROCESSING
        order.payment_status = Order.PaymentStatus.PAID
        order.shipping_address_snapshot = {
            'full_name': 'Aarav Mehta',
            'phone_number': '+919876543210',
            'address_line_1': '12 Heritage Lane',
            'address_line_2': '',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'postal_code': '400001',
        }
        order.razorpay_order_id = 'order_RZP123'
        order.razorpay_payment_id = 'pay_RZP456'
        order.razorpay_signature = 'secret_hmac_signature_value'
        order.created_at = '2026-11-26T09:00:00Z'
        order.updated_at = '2026-11-26T10:00:00Z'
        order.item_count = 2
        order.seller_count = 2
        order.items.all.return_value = [item1, item2]
        order.items.__iter__.side_effect = lambda: iter([item1, item2])
        return order

    def test_anonymous_customer_and_seller_access_denied(self):
        endpoints = [
            (self.list_view, '/api/admin/orders/', {}),
            (self.summary_view, '/api/admin/orders/summary/', {}),
            (self.detail_view, '/api/admin/orders/BB-ORD-1/', {'order_number': 'BB-ORD-1'}),
        ]
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=2, email='cust@test.com')
        seller = self._make_user(
            role=User.Role.SELLER, user_id=3, email='seller@test.com',
            seller_status=SellerProfile.ApplicationStatus.APPROVED,
        )

        for view_fn, url, kwargs in endpoints:
            anon_req = self.factory.get(url)
            self.assertEqual(view_fn(anon_req, **kwargs).status_code, 401)

            cust_req = self.factory.get(url)
            force_authenticate(cust_req, user=customer)
            self.assertEqual(view_fn(cust_req, **kwargs).status_code, 403)

            sel_req = self.factory.get(url)
            force_authenticate(sel_req, user=seller)
            self.assertEqual(view_fn(sel_req, **kwargs).status_code, 403)

    @patch('admin_panel.order_views.Order.objects')
    def test_admin_order_summary_aggregates_platform_stats(self, mock_order_mgr):
        mock_order_mgr.aggregate.return_value = {
            'total_orders': 15,
            'paid_orders': 11,
            'pending_payment_orders': 2,
            'failed_orders': 1,
            'refunded_orders': 1,
            'pending_orders': 2,
            'confirmed_orders': 3,
            'processing_orders': 4,
            'shipped_orders': 2,
            'delivered_orders': 3,
            'cancelled_orders': 1,
            'total_paid_gmv': Decimal('34500.00'),
        }

        req = self.factory.get('/api/admin/orders/summary/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.summary_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total_orders'], 15)
        self.assertEqual(res.data['paid_orders'], 11)
        self.assertEqual(res.data['total_paid_gmv'], '34500.00')
        self.assertEqual(res.data['cancelled_orders'], 1)

    @patch('admin_panel.order_views.Order.objects')
    def test_admin_order_list_filters_search_and_pagination(self, mock_order_mgr):
        order = self._make_multivendor_order()
        qs = MagicMock()
        qs.annotate.return_value = qs
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.distinct.return_value = qs
        qs.__len__.return_value = 1
        qs.__getitem__.return_value = [order]
        mock_order_mgr.select_related.return_value = qs

        req = self.factory.get(
            '/api/admin/orders/?order_status=PROCESSING&payment_status=PAID'
            '&date_from=2026-11-01&date_to=2026-11-30&seller=Jaipur&search=ABCD1234'
        )
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        row = res.data['results'][0]
        self.assertEqual(row['order_number'], 'BB-ORD-20261126-ABCD1234')
        self.assertEqual(row['item_count'], 2)
        self.assertEqual(row['seller_count'], 2)
        self.assertEqual(row['payment_status'], 'PAID')
        self.assertEqual(row['order_status'], 'PROCESSING')
        self.assertNotIn('razorpay_signature', row)
        self.assertNotIn('password', row['customer'])

    def test_admin_order_list_rejects_invalid_date_format(self):
        req = self.factory.get('/api/admin/orders/?date_from=26-11-2026')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)
        self.assertEqual(res.status_code, 400)
        self.assertIn('YYYY-MM-DD', res.data['detail'])

    @patch('admin_panel.order_views.get_object_or_404')
    def test_admin_order_detail_multivendor_and_safe_serialization(self, mock_get_obj):
        order = self._make_multivendor_order()
        mock_get_obj.return_value = order

        req = self.factory.get('/api/admin/orders/BB-ORD-20261126-ABCD1234/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.detail_view(req, order_number='BB-ORD-20261126-ABCD1234')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['order_number'], 'BB-ORD-20261126-ABCD1234')
        self.assertEqual(len(res.data['items']), 2)
        self.assertEqual(len(res.data['seller_groups']), 2)

        # Multi-vendor distinct fulfillment statuses preserved
        statuses = {g['store_name']: g['items'][0]['fulfillment_status'] for g in res.data['seller_groups']}
        self.assertEqual(statuses['Jaipur Blue Pottery'], 'SHIPPED')
        self.assertEqual(statuses['Kutch Looms'], 'PROCESSING')
        self.assertEqual(res.data['seller_groups'][0]['items'][0]['tracking_number'], 'BD123456')

        # Safe payment info without exposing raw signature or secrets
        self.assertEqual(res.data['payment_reference']['razorpay_order_id'], 'order_RZP123')
        self.assertEqual(res.data['payment_reference']['razorpay_payment_id'], 'pay_RZP456')
        self.assertTrue(res.data['payment_reference']['signature_verified'])
        self.assertNotIn('razorpay_signature', res.data)
        self.assertNotIn('razorpay_signature', res.data['payment_reference'])
        self.assertNotIn('password', res.data['customer'])

        # Read-only: order was never saved or deleted
        order.save.assert_not_called()
        order.delete.assert_not_called()

    def test_admin_order_endpoints_are_read_only(self):
        admin_user = self._make_user(role=User.Role.ADMIN)
        post_req = self.factory.post('/api/admin/orders/BB-ORD-1/', {}, format='json')
        force_authenticate(post_req, user=admin_user)
        self.assertEqual(self.detail_view(post_req, order_number='BB-ORD-1').status_code, 405)

        del_req = self.factory.delete('/api/admin/orders/BB-ORD-1/')
        force_authenticate(del_req, user=admin_user)
        self.assertEqual(self.detail_view(del_req, order_number='BB-ORD-1').status_code, 405)


class AdminPaymentManagementTests(SimpleTestCase):
    """
    Tests for Step 9.6: Admin payment list, summary, detail, permissions,
    safe serialization, cancelled vs refunded distinction, missing optional fields,
    and read-only enforcement.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminPaymentListView.as_view()
        self.summary_view = AdminPaymentSummaryView.as_view()
        self.detail_view = AdminPaymentDetailView.as_view()

    def _make_user(self, role=User.Role.ADMIN, user_id=1, email='admin@bharatbazaar.in', seller_status=None):
        user = MagicMock(spec=User)
        user.id = user_id
        user.pk = user_id
        user.is_authenticated = True
        user.role = role
        user.email = email
        user.first_name = 'Priya'
        user.last_name = 'Nair'
        user.phone_number = '+919876543210'
        user.is_active = True
        user.get_full_name.return_value = 'Priya Nair'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _make_payment_order(
        self,
        order_number='BB-ORD-20261126-PAY1',
        payment_status=Order.PaymentStatus.PAID,
        order_status=Order.OrderStatus.CONFIRMED,
        rzp_order_id='order_RZP999',
        rzp_payment_id='pay_RZP888',
        rzp_signature='hmac_secret_sig',
        amount=Decimal('3200.00'),
    ):
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=44, email='buyer@test.com')
        order = MagicMock(spec=Order)
        order.id = 701
        order.order_number = order_number
        order.customer = customer
        order.subtotal = amount
        order.shipping_amount = Decimal('0.00')
        order.discount_amount = Decimal('0.00')
        order.total_amount = amount
        order.payment_status = payment_status
        order.order_status = order_status
        order.razorpay_order_id = rzp_order_id
        order.razorpay_payment_id = rzp_payment_id
        order.razorpay_signature = rzp_signature
        order.shipping_address_snapshot = {'city': 'Pune', 'state': 'Maharashtra'}
        order.created_at = '2026-11-26T10:00:00Z'
        order.updated_at = '2026-11-26T10:05:00Z'
        order.items.all.return_value = []
        order.items.__iter__.side_effect = lambda: iter([])
        return order

    def test_anonymous_customer_and_seller_access_denied(self):
        endpoints = [
            (self.list_view, '/api/admin/payments/', {}),
            (self.summary_view, '/api/admin/payments/summary/', {}),
            (self.detail_view, '/api/admin/payments/BB-ORD-1/', {'identifier': 'BB-ORD-1'}),
        ]
        customer = self._make_user(role=User.Role.CUSTOMER, user_id=2, email='cust@test.com')
        seller = self._make_user(
            role=User.Role.SELLER, user_id=3, email='seller@test.com',
            seller_status=SellerProfile.ApplicationStatus.APPROVED,
        )

        for view_fn, url, kwargs in endpoints:
            anon_req = self.factory.get(url)
            self.assertEqual(view_fn(anon_req, **kwargs).status_code, 401)

            cust_req = self.factory.get(url)
            force_authenticate(cust_req, user=customer)
            self.assertEqual(view_fn(cust_req, **kwargs).status_code, 403)

            sel_req = self.factory.get(url)
            force_authenticate(sel_req, user=seller)
            self.assertEqual(view_fn(sel_req, **kwargs).status_code, 403)

    @patch('admin_panel.payment_views.Order.objects')
    def test_payment_summary_counts_confirmed_refunds_only(self, mock_order_mgr):
        mock_order_mgr.aggregate.return_value = {
            'total_transactions': 20,
            'total_paid_amount': Decimal('48000.00'),
            'paid_count': 14,
            'pending_count': 3,
            'failed_count': 2,
            'refunded_count': 1,
            'refunded_amount': Decimal('1500.00'),
            'cancelled_not_refunded_count': 2,
        }

        req = self.factory.get('/api/admin/payments/summary/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.summary_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['total_paid_amount'], '48000.00')
        self.assertEqual(res.data['paid_count'], 14)
        self.assertEqual(res.data['refunded_count'], 1)
        self.assertEqual(res.data['refunded_amount'], '1500.00')
        self.assertEqual(res.data['cancelled_not_refunded_count'], 2)
        self.assertFalse(res.data['has_gateway_refund_records'])

    @patch('admin_panel.payment_views.Order.objects')
    def test_payment_list_filters_pagination_and_excludes_secrets(self, mock_order_mgr):
        order = self._make_payment_order()
        qs = MagicMock()
        qs.order_by.return_value = qs
        qs.filter.return_value = qs
        qs.__len__.return_value = 1
        qs.__getitem__.return_value = [order]
        mock_order_mgr.select_related.return_value = qs

        req = self.factory.get(
            '/api/admin/payments/?payment_status=PAID&date_from=2026-11-01'
            '&date_to=2026-11-30&razorpay_payment_id=pay_RZP888&search=PAY1'
        )
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        row = res.data['results'][0]
        self.assertEqual(row['amount'], '3200.00')
        self.assertEqual(row['payment_status'], 'PAID')
        self.assertTrue(row['signature_verified'])
        self.assertNotIn('razorpay_signature', row)
        self.assertNotIn('password', row['customer'])

    def test_payment_list_rejects_invalid_date(self):
        req = self.factory.get('/api/admin/payments/?date_to=invalid-date')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.list_view(req)
        self.assertEqual(res.status_code, 400)

    @patch('admin_panel.payment_views.Order.objects')
    def test_cancelled_order_not_falsely_marked_refunded_and_missing_fields_safe(self, mock_order_mgr):
        cancelled_unpaid = self._make_payment_order(
            order_number='BB-ORD-20261126-CANC',
            payment_status=Order.PaymentStatus.FAILED,
            order_status=Order.OrderStatus.CANCELLED,
            rzp_order_id='',
            rzp_payment_id='',
            rzp_signature='',
        )
        base_qs = MagicMock()
        base_qs.prefetch_related.return_value = base_qs
        base_qs.filter.return_value.first.return_value = cancelled_unpaid
        mock_order_mgr.select_related.return_value = base_qs

        req = self.factory.get('/api/admin/payments/BB-ORD-20261126-CANC/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.detail_view(req, identifier='BB-ORD-20261126-CANC')

        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['signature_verified'])
        self.assertIsNone(res.data['payment_method'])
        self.assertTrue(res.data['cancellation_refund_info']['is_order_cancelled'])
        self.assertFalse(res.data['cancellation_refund_info']['is_payment_refunded'])
        self.assertIsNone(res.data['cancellation_refund_info']['refund_amount'])
        self.assertNotIn('razorpay_signature', res.data)

        # Read-only: no mutation
        cancelled_unpaid.save.assert_not_called()
        cancelled_unpaid.delete.assert_not_called()

    def test_payment_endpoints_are_read_only(self):
        admin_user = self._make_user(role=User.Role.ADMIN)
        post_req = self.factory.post('/api/admin/payments/BB-ORD-1/', {}, format='json')
        force_authenticate(post_req, user=admin_user)
        self.assertEqual(self.detail_view(post_req, identifier='BB-ORD-1').status_code, 405)


class AdminPlatformAnalyticsTests(SimpleTestCase):
    """
    Tests for Step 9.7: Admin platform analytics permissions, financial accuracy
    (paid GMV vs profit omission, cancelled unpaid excluded, cancelled paid not
    counted as refunded), date filtering, empty database, and top products/sellers.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AdminPlatformAnalyticsView.as_view()

    def _make_user(self, role=User.Role.ADMIN, seller_status=None):
        user = MagicMock(spec=User)
        user.id = 1
        user.is_authenticated = True
        user.role = role
        user.email = f'{role.lower()}@bharatbazaar.in'
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _setup_empty_analytics_mocks(
        self, mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr, mock_item_mgr
    ):
        # Customers
        cust_qs = MagicMock()
        cust_qs.count.return_value = 0
        cust_qs.filter.return_value = cust_qs
        cust_qs.annotate.return_value.values.return_value.annotate.return_value.order_by.return_value = []
        mock_user_mgr.filter.return_value = cust_qs

        # Sellers
        seller_qs = MagicMock()
        seller_qs.aggregate.return_value = {
            'total_sellers': 0,
            'pending_sellers': 0,
            'approved_sellers': 0,
            'rejected_sellers': 0,
            'suspended_sellers': 0,
        }
        seller_qs.filter.return_value = seller_qs
        seller_qs.count.return_value = 0
        seller_qs.annotate.return_value.values.return_value.annotate.return_value.order_by.return_value = []
        mock_seller_mgr.all.return_value = seller_qs

        # Products
        mock_prod_mgr.aggregate.return_value = {
            'total_products': 0,
            'pending_products': 0,
            'approved_products': 0,
            'inactive_products': 0,
            'rejected_products': 0,
        }
        prod_reg_qs = MagicMock()
        prod_reg_qs.exclude.return_value.values.return_value.annotate.return_value.order_by.return_value = []
        mock_prod_mgr.filter.return_value = prod_reg_qs

        # Orders
        order_qs = MagicMock()
        order_qs.filter.return_value = order_qs
        order_qs.aggregate.return_value = {
            'total_orders': 0,
            'paid_orders': 0,
            'pending_payments': 0,
            'failed_payments': 0,
            'cancelled_orders': 0,
            'cancelled_paid_orders': 0,
            'confirmed_refunds_count': 0,
            'confirmed_refunds_amount': None,
            'paid_gmv': None,
            'status_pending': 0,
            'status_confirmed': 0,
            'status_processing': 0,
            'status_shipped': 0,
            'status_delivered': 0,
            'status_cancelled': 0,
        }
        order_qs.annotate.return_value.values.return_value.annotate.return_value.order_by.return_value = []
        mock_order_mgr.all.return_value = order_qs

        # OrderItems
        item_qs = MagicMock()
        item_qs.exclude.return_value = item_qs
        item_qs.filter.return_value = item_qs
        item_qs.values.return_value.annotate.return_value.order_by.return_value = []
        mock_item_mgr.filter.return_value = item_qs

    def test_anonymous_customer_and_seller_rejected(self):
        anon_req = self.factory.get('/api/admin/analytics/')
        self.assertEqual(self.view(anon_req).status_code, 401)

        cust_req = self.factory.get('/api/admin/analytics/')
        force_authenticate(cust_req, user=self._make_user(role=User.Role.CUSTOMER))
        self.assertEqual(self.view(cust_req).status_code, 403)

        sel_req = self.factory.get('/api/admin/analytics/')
        force_authenticate(
            sel_req,
            user=self._make_user(role=User.Role.SELLER, seller_status=SellerProfile.ApplicationStatus.APPROVED),
        )
        self.assertEqual(self.view(sel_req).status_code, 403)

    def test_analytics_endpoint_is_read_only(self):
        req = self.factory.post('/api/admin/analytics/', {}, format='json')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        self.assertEqual(self.view(req).status_code, 405)

    def test_invalid_custom_date_range_rejected(self):
        admin_user = self._make_user(role=User.Role.ADMIN)
        req1 = self.factory.get('/api/admin/analytics/?range=custom')
        force_authenticate(req1, user=admin_user)
        self.assertEqual(self.view(req1).status_code, 400)

        req2 = self.factory.get('/api/admin/analytics/?range=custom&start_date=2026-11-20&end_date=2026-11-10')
        force_authenticate(req2, user=admin_user)
        self.assertEqual(self.view(req2).status_code, 400)

    @patch('admin_panel.analytics_views.OrderItem.objects')
    @patch('admin_panel.analytics_views.Order.objects')
    @patch('admin_panel.analytics_views.Product.objects')
    @patch('admin_panel.analytics_views.SellerProfile.objects')
    @patch('admin_panel.analytics_views.User.objects')
    def test_empty_database_returns_zero_metrics(
        self, mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr, mock_item_mgr
    ):
        self._setup_empty_analytics_mocks(
            mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr, mock_item_mgr
        )

        req = self.factory.get('/api/admin/analytics/?range=all')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['period']['range'], 'all')
        self.assertIsNone(res.data['period']['start_date'])
        self.assertEqual(res.data['overview']['total_orders'], 0)
        self.assertEqual(res.data['overview']['paid_gmv'], '0.00')
        self.assertEqual(res.data['overview']['average_paid_order_value'], '0.00')
        self.assertEqual(res.data['overview']['confirmed_refunds_count'], 0)
        self.assertEqual(res.data['top_products'], [])
        self.assertEqual(res.data['top_sellers'], [])
        self.assertIn('platform_profit_and_net_revenue', res.data['unavailable_metrics'])

    @patch('admin_panel.analytics_views.OrderItem.objects')
    @patch('admin_panel.analytics_views.Order.objects')
    @patch('admin_panel.analytics_views.Product.objects')
    @patch('admin_panel.analytics_views.SellerProfile.objects')
    @patch('admin_panel.analytics_views.User.objects')
    def test_financial_accuracy_top_products_sellers_and_date_filter(
        self, mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr, mock_item_mgr
    ):
        self._setup_empty_analytics_mocks(
            mock_user_mgr, mock_seller_mgr, mock_prod_mgr, mock_order_mgr, mock_item_mgr
        )

        # Populate realistic order aggregate:
        # 10 total orders: 5 PAID (including 1 cancelled-but-paid), 3 PENDING, 2 FAILED, 0 REFUNDED
        order_qs = mock_order_mgr.all.return_value
        order_qs.aggregate.return_value = {
            'total_orders': 10,
            'paid_orders': 5,
            'pending_payments': 3,
            'failed_payments': 2,
            'cancelled_orders': 3,
            'cancelled_paid_orders': 1,
            'confirmed_refunds_count': 0,
            'confirmed_refunds_amount': None,
            'paid_gmv': Decimal('12500.00'),
            'status_pending': 3,
            'status_confirmed': 2,
            'status_processing': 1,
            'status_shipped': 1,
            'status_delivered': 0,
            'status_cancelled': 3,
        }

        # Populate top products and top sellers
        item_qs = mock_item_mgr.filter.return_value.exclude.return_value.filter.return_value
        item_qs.values.return_value.annotate.return_value.order_by.side_effect = [
            # top_products
            [
                {
                    'product_id': 11,
                    'product_name': 'Jaipur Blue Pottery Vase',
                    'seller__store_name': 'Jaipur Crafts',
                    'units_sold': 4,
                    'paid_sales': Decimal('6400.00'),
                    'order_count': 3,
                }
            ],
            # top_sellers
            [
                {
                    'seller_id': 21,
                    'seller__store_name': 'Jaipur Crafts',
                    'seller__city': 'Jaipur',
                    'seller__state': 'Rajasthan',
                    'paid_sales': Decimal('6400.00'),
                    'units_sold': 4,
                    'order_count': 3,
                }
            ],
            # popular_categories
            [],
        ]

        req = self.factory.get('/api/admin/analytics/?range=7d')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['period']['range'], '7d')
        ov = res.data['overview']
        self.assertEqual(ov['paid_gmv'], '12500.00')
        self.assertEqual(ov['average_paid_order_value'], '2500.00')
        # Cancelled paid orders must NOT inflate confirmed refunds
        self.assertEqual(ov['cancelled_orders'], 3)
        self.assertEqual(ov['cancelled_paid_orders'], 1)
        self.assertEqual(ov['confirmed_refunds_count'], 0)
        self.assertEqual(ov['confirmed_refunds_amount'], '0.00')
        # Top products and sellers
        self.assertEqual(res.data['top_products'][0]['product_name'], 'Jaipur Blue Pottery Vase')
        self.assertEqual(res.data['top_products'][0]['units_sold'], 4)
        self.assertEqual(res.data['top_sellers'][0]['store_name'], 'Jaipur Crafts')
        self.assertEqual(res.data['top_sellers'][0]['paid_sales'], '6400.00')


class AdminPlatformSettingsTests(SimpleTestCase):
    """
    Tests for Step 9.8: Admin-only platform settings GET/PUT, customer/seller rejection,
    singleton get_solo initialization, validation of email/URL/phone, preserving
    settings on failed validation, and exclusion of backend secrets.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin_view = AdminPlatformSettingsView.as_view()
        self.public_view = PublicPlatformSettingsView.as_view()

    def _make_user(self, role=User.Role.ADMIN, seller_status=None):
        user = User(
            id=1,
            email=f'{role.lower()}@bharatbazaar.in',
            role=role,
            is_active=True,
        )
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _make_settings_obj(self):
        obj = PlatformSettings(
            singleton_key=1,
            marketplace_name='BharatBazaar',
            marketplace_tagline="India's Artisans",
            support_email='support@bharatbazaar.in',
            support_phone='+91 1800-000-0000',
            marketplace_description='Curated handmade marketplace.',
            announcement_message='Free shipping on orders above ₹999',
            announcement_enabled=True,
            announcement_type=PlatformSettings.AnnouncementType.PROMOTION,
            website_url='https://bharatbazaar.in',
            instagram_url='https://instagram.com/bharatbazaar',
            facebook_url='',
            linkedin_url='',
        )
        return obj

    def test_anonymous_customer_and_seller_rejected(self):
        for method in ('get', 'put', 'patch'):
            anon_req = getattr(self.factory, method)('/api/admin/settings/')
            self.assertEqual(self.admin_view(anon_req).status_code, 401)

            cust_req = getattr(self.factory, method)('/api/admin/settings/')
            force_authenticate(cust_req, user=self._make_user(role=User.Role.CUSTOMER))
            self.assertEqual(self.admin_view(cust_req).status_code, 403)

            sel_req = getattr(self.factory, method)('/api/admin/settings/')
            force_authenticate(
                sel_req,
                user=self._make_user(role=User.Role.SELLER, seller_status=SellerProfile.ApplicationStatus.APPROVED),
            )
            self.assertEqual(self.admin_view(sel_req).status_code, 403)

    @patch('admin_panel.models.PlatformSettings.objects')
    def test_get_solo_creates_initial_settings_safely(self, mock_mgr):
        obj = self._make_settings_obj()
        mock_mgr.get_or_create.return_value = (obj, True)

        result = PlatformSettings.get_solo()
        mock_mgr.get_or_create.assert_called_once_with(singleton_key=1)
        self.assertEqual(result.marketplace_name, 'BharatBazaar')

    @patch('admin_panel.settings_views.PlatformSettings.get_solo')
    def test_admin_can_read_settings_and_secrets_never_exposed(self, mock_get_solo):
        mock_get_solo.return_value = self._make_settings_obj()

        req = self.factory.get('/api/admin/settings/')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.admin_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['marketplace_name'], 'BharatBazaar')
        self.assertEqual(res.data['support_email'], 'support@bharatbazaar.in')
        for forbidden in ('SECRET_KEY', 'RAZORPAY_KEY_SECRET', 'DATABASES', 'password', 'CLOUDINARY'):
            self.assertNotIn(forbidden, res.data)

        # Public endpoint also returns safe fields only
        pub_req = self.factory.get('/api/admin/public-settings/')
        pub_res = self.public_view(pub_req)
        self.assertEqual(pub_res.status_code, 200)
        self.assertEqual(pub_res.data['announcement_message'], 'Free shipping on orders above ₹999')
        self.assertNotIn('updated_by_email', pub_res.data)

    @patch('admin_panel.models.PlatformSettings.save')
    @patch('admin_panel.settings_views.transaction.atomic')
    @patch('admin_panel.settings_views.PlatformSettings.get_solo')
    def test_admin_can_update_valid_settings(self, mock_get_solo, mock_atomic, mock_save):
        obj = self._make_settings_obj()
        mock_get_solo.return_value = obj

        payload = {
            'marketplace_name': 'BharatBazaar Craft Hub',
            'marketplace_tagline': 'Handcrafted in India',
            'support_email': 'care@bharatbazaar.in',
            'support_phone': '+91 9876543210',
            'marketplace_description': 'Authentic regional crafts.',
            'announcement_message': 'Festive Craft Fair Live',
            'announcement_enabled': True,
            'announcement_type': 'NOTICE',
            'website_url': 'https://bharatbazaar.in',
            'instagram_url': 'https://instagram.com/bharatbazaar',
            'facebook_url': 'https://facebook.com/bharatbazaar',
            'linkedin_url': 'https://linkedin.com/company/bharatbazaar',
        }
        req = self.factory.put('/api/admin/settings/', payload, format='json')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.admin_view(req)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['settings']['marketplace_name'], 'BharatBazaar Craft Hub')
        self.assertEqual(res.data['settings']['announcement_type'], 'NOTICE')
        mock_save.assert_called_once()

    @patch('admin_panel.models.PlatformSettings.save')
    @patch('admin_panel.settings_views.PlatformSettings.get_solo')
    def test_invalid_email_and_urls_rejected_and_settings_preserved(self, mock_get_solo, mock_save):
        obj = self._make_settings_obj()
        mock_get_solo.return_value = obj

        bad_payload = {
            'marketplace_name': 'BharatBazaar',
            'support_email': 'not-an-email',
            'website_url': 'ftp://invalid-scheme.com',
            'instagram_url': 'not a url',
        }
        req = self.factory.put('/api/admin/settings/', bad_payload, format='json')
        force_authenticate(req, user=self._make_user(role=User.Role.ADMIN))
        res = self.admin_view(req)

        self.assertEqual(res.status_code, 400)
        self.assertIn('support_email', res.data)
        self.assertIn('website_url', res.data)
        self.assertIn('instagram_url', res.data)
        # Existing settings preserved
        mock_save.assert_not_called()
        self.assertEqual(obj.support_email, 'support@bharatbazaar.in')


class AdminReturnManagementTests(SimpleTestCase):
    """
    Tests for Step 11.4: Admin return-request review APIs, role enforcement,
    approve/reject/complete transitions, mandatory rejection reason, notifications,
    and payment-status immutability.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.list_view = AdminReturnListView.as_view()
        self.detail_view = AdminReturnDetailView.as_view()
        self.approve_view = AdminReturnApproveView.as_view()
        self.reject_view = AdminReturnRejectView.as_view()
        self.complete_view = AdminReturnCompleteView.as_view()

    def _make_user(self, role=User.Role.ADMIN, seller_status=None):
        user = User(id=1, email=f'{role.lower()}@bharatbazaar.in', role=role, is_active=True)
        if seller_status:
            user.seller_profile = SellerProfile(application_status=seller_status)
        return user

    def _make_return_request(self, status_val=ReturnRequest.ReturnStatus.PENDING):
        customer = User(id=10, email='patron@test.in', first_name='Aarav', last_name='Patel', role=User.Role.CUSTOMER)
        order = MagicMock(spec=Order)
        order.order_number = 'BB-ORD-500'
        order.payment_status = Order.PaymentStatus.PAID
        order.order_status = Order.OrderStatus.DELIVERED

        item = MagicMock(spec=OrderItem)
        item.id = 55
        item.product_name = 'Brass Diya Set'
        item.quantity = 1
        item.unit_price = Decimal('999.00')
        item.line_total = Decimal('999.00')
        item.fulfillment_status = OrderItem.FulfillmentStatus.DELIVERED

        seller = MagicMock(spec=SellerProfile)
        seller.id = 8
        seller.store_name = 'Moradabad Brass'
        seller.city = 'Moradabad'
        seller.state = 'UP'

        ret = MagicMock(spec=ReturnRequest)
        ret.id = 300
        ret.customer = customer
        ret.order = order
        ret.order_item = item
        ret.seller = seller
        ret.reason = ReturnRequest.ReturnReason.TRANSIT_DAMAGE
        ret.get_reason_display.return_value = 'Item damaged or cracked during transit'
        ret.description = 'Dent on base'
        ret.status = status_val
        ret.get_status_display.return_value = status_val
        ret.admin_notes = ''
        ret.rejection_reason = ''
        ret.reviewed_by = None
        ret.reviewed_at = None
        ret.created_at = '2026-11-26T12:00:00Z'
        ret.updated_at = '2026-11-26T12:00:00Z'
        return ret

    def test_anonymous_customer_and_seller_rejected(self):
        endpoints = [
            ('get', self.list_view, '/api/admin/returns/', {}),
            ('get', self.detail_view, '/api/admin/returns/300/', {'pk': 300}),
            ('post', self.approve_view, '/api/admin/returns/300/approve/', {'pk': 300}),
            ('post', self.reject_view, '/api/admin/returns/300/reject/', {'pk': 300}),
            ('post', self.complete_view, '/api/admin/returns/300/complete/', {'pk': 300}),
        ]
        cust = self._make_user(role=User.Role.CUSTOMER)
        seller = self._make_user(role=User.Role.SELLER, seller_status=SellerProfile.ApplicationStatus.APPROVED)

        for method, view_fn, url, kwargs in endpoints:
            self.assertEqual(view_fn(getattr(self.factory, method)(url), **kwargs).status_code, 401)
            r_c = getattr(self.factory, method)(url)
            force_authenticate(r_c, user=cust)
            self.assertEqual(view_fn(r_c, **kwargs).status_code, 403)
            r_s = getattr(self.factory, method)(url)
            force_authenticate(r_s, user=seller)
            self.assertEqual(view_fn(r_s, **kwargs).status_code, 403)

    @patch('admin_panel.return_views.Notification.objects')
    @patch('admin_panel.return_views.transaction.atomic')
    @patch('admin_panel.return_views.get_object_or_404')
    def test_admin_approve_and_complete_notifies_and_preserves_payment(
        self, mock_get_obj, mock_atomic, mock_notif_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN)
        ret = self._make_return_request(status_val=ReturnRequest.ReturnStatus.PENDING)
        mock_get_obj.return_value = ret

        req1 = self.factory.post('/api/admin/returns/300/approve/', {'admin_notes': 'Verified'}, format='json')
        force_authenticate(req1, user=admin_user)
        res1 = self.approve_view(req1, pk=300)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(ret.status, ReturnRequest.ReturnStatus.APPROVED)
        self.assertEqual(ret.order.payment_status, Order.PaymentStatus.PAID)
        ret.order.save.assert_not_called()
        mock_notif_mgr.create.assert_called_once()

        # Complete the approved return
        req2 = self.factory.post('/api/admin/returns/300/complete/', {}, format='json')
        force_authenticate(req2, user=admin_user)
        res2 = self.complete_view(req2, pk=300)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(ret.status, ReturnRequest.ReturnStatus.COMPLETED)
        self.assertEqual(ret.order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(mock_notif_mgr.create.call_count, 2)

    @patch('admin_panel.return_views.Notification.objects')
    @patch('admin_panel.return_views.transaction.atomic')
    @patch('admin_panel.return_views.get_object_or_404')
    def test_reject_requires_reason_and_invalid_transitions_rejected(
        self, mock_get_obj, mock_atomic, mock_notif_mgr
    ):
        admin_user = self._make_user(role=User.Role.ADMIN)
        ret = self._make_return_request(status_val=ReturnRequest.ReturnStatus.PENDING)
        mock_get_obj.return_value = ret

        # Empty reason -> 400
        bad_rej = self.factory.post('/api/admin/returns/300/reject/', {'reason': '  '}, format='json')
        force_authenticate(bad_rej, user=admin_user)
        self.assertEqual(self.reject_view(bad_rej, pk=300).status_code, 400)

        # Valid reject -> 200
        good_rej = self.factory.post('/api/admin/returns/300/reject/', {'reason': 'Outside 7-day window'}, format='json')
        force_authenticate(good_rej, user=admin_user)
        self.assertEqual(self.reject_view(good_rej, pk=300).status_code, 200)
        self.assertEqual(ret.status, ReturnRequest.ReturnStatus.REJECTED)
        mock_notif_mgr.create.assert_called_once()

        # Invalid transition: complete a REJECTED request -> 400, no duplicate notification
        bad_comp = self.factory.post('/api/admin/returns/300/complete/', {}, format='json')
        force_authenticate(bad_comp, user=admin_user)
        self.assertEqual(self.complete_view(bad_comp, pk=300).status_code, 400)
        self.assertEqual(mock_notif_mgr.create.call_count, 1)


class PublicNewsletterSubscribeTests(SimpleTestCase):
    """
    Tests for Step 11.9: Public newsletter subscription endpoint.
    Verifies email normalization, duplicate handling, invalid email rejection,
    rate-limit configuration, and non-exposure of subscriber lists.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = PublicNewsletterSubscribeView.as_view()

    @patch('admin_panel.newsletter_views.NewsletterSubscription.objects')
    def test_valid_email_subscribes_and_normalizes(self, mock_sub_mgr):
        mock_sub_mgr.get_or_create.return_value = (MagicMock(), True)

        req = self.factory.post(
            '/api/newsletter/subscribe/',
            {'email': '  Artisan.Fan@Example.COM  '},
            format='json',
        )
        res = self.view(req)

        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data['already_subscribed'])
        mock_sub_mgr.get_or_create.assert_called_once_with(email='artisan.fan@example.com')

    @patch('admin_panel.newsletter_views.NewsletterSubscription.objects')
    def test_duplicate_email_returns_200_idempotently(self, mock_sub_mgr):
        mock_sub_mgr.get_or_create.return_value = (MagicMock(), False)

        req = self.factory.post(
            '/api/newsletter/subscribe/',
            {'email': 'repeat@example.com'},
            format='json',
        )
        res = self.view(req)

        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['already_subscribed'])

    def test_invalid_and_empty_emails_rejected_with_400(self):
        req_empty = self.factory.post('/api/newsletter/subscribe/', {'email': '   '}, format='json')
        self.assertEqual(self.view(req_empty).status_code, 400)

        req_bad = self.factory.post('/api/newsletter/subscribe/', {'email': 'not-an-email'}, format='json')
        self.assertEqual(self.view(req_bad).status_code, 400)

    def test_get_method_not_allowed_so_subscribers_not_exposed(self):
        req = self.factory.get('/api/newsletter/subscribe/')
        res = self.view(req)
        self.assertEqual(res.status_code, 405)

    @patch('admin_panel.newsletter_views.NewsletterSubscription.objects')
    def test_rate_limit_enforced_when_throttle_rejects(self, mock_sub_mgr):
        with patch.object(
            PublicNewsletterSubscribeView,
            'check_throttles',
            side_effect=lambda req: PublicNewsletterSubscribeView.throttled(
                PublicNewsletterSubscribeView(), req, 60
            ),
        ):
            req = self.factory.post(
                '/api/newsletter/subscribe/',
                {'email': 'burst@example.com'},
                format='json',
            )
            res = self.view(req)
            self.assertEqual(res.status_code, 429)
        mock_sub_mgr.get_or_create.assert_not_called()
