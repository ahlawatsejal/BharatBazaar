from unittest.mock import patch, MagicMock
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory
from config.settings import resolve_secret_key, resolve_drf_renderers
from accounts.views import LoginView, CustomerRegisterView, SellerRegisterView, UserProfileView, ChangePasswordView
from accounts.serializers import (
    CustomerRegisterSerializer,
    SellerRegisterSerializer,
    LoginSerializer,
    LogoutSerializer,
    ChangePasswordSerializer,
)


class SerializerValidationTests(SimpleTestCase):
    """
    Unit tests for authentication serializer validation rules.
    Uses mock queries so tests run in memory without requiring live database tables.
    """

    @patch('accounts.models.User.objects.filter')
    def test_customer_registration_password_mismatch(self, mock_user_filter):
        mock_user_filter.return_value.exists.return_value = False
        data = {
            'first_name': 'Aarav',
            'last_name': 'Patel',
            'email': 'aarav@example.com',
            'phone_number': '9876543210',
            'password': 'StrongPassword123!',
            'confirm_password': 'DifferentPassword456!',
        }
        serializer = CustomerRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('confirm_password', serializer.errors)
        self.assertEqual(serializer.errors['confirm_password'], ['Passwords do not match.'])

    @patch('accounts.models.User.objects.filter')
    def test_customer_registration_weak_password(self, mock_user_filter):
        mock_user_filter.return_value.exists.return_value = False
        data = {
            'first_name': 'Aarav',
            'last_name': 'Patel',
            'email': 'aarav@example.com',
            'phone_number': '9876543210',
            'password': 'short',
            'confirm_password': 'short',
        }
        serializer = CustomerRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)

    @patch('accounts.models.User.objects.filter')
    def test_customer_registration_duplicate_email(self, mock_user_filter):
        mock_user_filter.return_value.exists.return_value = True
        data = {
            'first_name': 'Aarav',
            'last_name': 'Patel',
            'email': 'existing@example.com',
            'phone_number': '9876543210',
            'password': 'StrongPassword123!',
            'confirm_password': 'StrongPassword123!',
        }
        serializer = CustomerRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    @patch('accounts.models.User.objects.filter')
    def test_seller_registration_missing_store_name(self, mock_user_filter):
        mock_user_filter.return_value.exists.return_value = False
        data = {
            'first_name': 'Ramesh',
            'last_name': 'Prajapati',
            'email': 'ramesh@example.com',
            'phone_number': '9829012345',
            'password': 'StrongPassword123!',
            'confirm_password': 'StrongPassword123!',
            'store_name': '',
            'state': 'Rajasthan',
            'city': 'Jaipur',
            'craft_category': 'Blue Pottery',
        }
        serializer = SellerRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('store_name', serializer.errors)

    @patch('sellers.models.SellerProfile.objects.filter')
    @patch('accounts.models.User.objects.filter')
    def test_seller_registration_duplicate_store_name(self, mock_user_filter, mock_store_filter):
        mock_user_filter.return_value.exists.return_value = False
        mock_store_filter.return_value.exists.return_value = True
        data = {
            'first_name': 'Ramesh',
            'last_name': 'Prajapati',
            'email': 'ramesh@example.com',
            'phone_number': '9829012345',
            'password': 'StrongPassword123!',
            'confirm_password': 'StrongPassword123!',
            'store_name': 'Existing Pottery',
            'state': 'Rajasthan',
            'city': 'Jaipur',
            'craft_category': 'Blue Pottery',
        }
        serializer = SellerRegisterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('store_name', serializer.errors)

    def test_login_serializer_requires_email_and_password(self):
        serializer = LoginSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        self.assertIn('password', serializer.errors)

    def test_logout_serializer_requires_refresh_token(self):
        serializer = LogoutSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn('refresh', serializer.errors)

    def test_change_password_mismatch_rejected(self):
        mock_user = MagicMock()
        mock_user.check_password.return_value = True
        mock_request = MagicMock()
        mock_request.user = mock_user

        data = {
            'current_password': 'OldPassword123!',
            'new_password': 'NewPassword123!',
            'confirm_new_password': 'DifferentPassword456!',
        }
        serializer = ChangePasswordSerializer(data=data, context={'request': mock_request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('confirm_new_password', serializer.errors)

    def test_change_password_invalid_current_password(self):
        mock_user = MagicMock()
        mock_user.check_password.return_value = False
        mock_request = MagicMock()
        mock_request.user = mock_user

        data = {
            'current_password': 'WrongOldPassword!',
            'new_password': 'ValidNewPassword123!',
            'confirm_new_password': 'ValidNewPassword123!',
        }
        serializer = ChangePasswordSerializer(data=data, context={'request': mock_request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('current_password', serializer.errors)

    def test_change_password_success_valid(self):
        mock_user = MagicMock()
        mock_user.check_password.return_value = True
        mock_request = MagicMock()
        mock_request.user = mock_user

        data = {
            'current_password': 'CorrectOldPassword123!',
            'new_password': 'ValidNewPassword123!',
            'confirm_new_password': 'ValidNewPassword123!',
        }
        serializer = ChangePasswordSerializer(data=data, context={'request': mock_request})
        self.assertTrue(serializer.is_valid(), serializer.errors)


class SecurityAndThrottlingTests(SimpleTestCase):
    """
    Tests for Step 11.1 (BB-01 & BB-02): production secret key enforcement,
    renderer configuration, and scoped auth rate limiting.
    """

    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

    def tearDown(self):
        cache.clear()

    def test_production_rejects_missing_or_insecure_secret_key(self):
        with self.assertRaises(ImproperlyConfigured):
            resolve_secret_key(False, '')
        with self.assertRaises(ImproperlyConfigured):
            resolve_secret_key(False, 'django-insecure-fallback-key-1234567890')
        with self.assertRaises(ImproperlyConfigured):
            resolve_secret_key(False, 'too-short-key')

        strong = 'bharatbazaar-prod-secret-key-with-32-plus-chars'
        self.assertEqual(resolve_secret_key(False, strong), strong)

    def test_local_debug_allows_dev_fallback_secret_key(self):
        dev_key = resolve_secret_key(True, '')
        self.assertTrue(len(dev_key) >= 16)

    def test_renderer_config_always_includes_json(self):
        dev_renderers = resolve_drf_renderers(True)
        self.assertIn('rest_framework.renderers.JSONRenderer', dev_renderers)
        self.assertIn('rest_framework.renderers.BrowsableAPIRenderer', dev_renderers)

        prod_renderers = resolve_drf_renderers(False)
        self.assertEqual(prod_renderers, ('rest_framework.renderers.JSONRenderer',))

    def test_auth_views_configure_scoped_throttles_and_enforce_429(self):
        self.assertEqual(LoginView.throttle_scope, 'auth_login')
        self.assertEqual(CustomerRegisterView.throttle_scope, 'auth_register')
        self.assertEqual(SellerRegisterView.throttle_scope, 'auth_register')
        # Authenticated profile endpoint is not throttled by auth_login/auth_register
        self.assertFalse(hasattr(UserProfileView, 'throttle_scope'))

        view = LoginView.as_view()
        # auth_login is 10/minute: 10 requests allowed (400 validation), 11th returns 429
        for i in range(10):
            req = self.factory.post('/api/accounts/login/', {}, format='json', REMOTE_ADDR='10.0.0.99')
            res = view(req)
            self.assertEqual(res.status_code, 400, f'Request {i+1} unexpectedly returned {res.status_code}')

        blocked_req = self.factory.post('/api/accounts/login/', {}, format='json', REMOTE_ADDR='10.0.0.99')
        blocked_res = view(blocked_req)
        self.assertEqual(blocked_res.status_code, 429)


class AuthSessionAndSellerStatusTests(SimpleTestCase):
    """
    Tests for Step 11.2 (BB-05 & BB-06): LoginSerializer seller_profile payload
    for PENDING/REJECTED/APPROVED/SUSPENDED sellers, CUSTOMER/ADMIN login payload,
    and SimpleJWT refresh token rotation settings.
    """

    def test_simple_jwt_rotation_and_blacklist_enabled(self):
        self.assertTrue(settings.SIMPLE_JWT['ROTATE_REFRESH_TOKENS'])
        self.assertTrue(settings.SIMPLE_JWT['BLACKLIST_AFTER_ROTATION'])

    @patch('accounts.serializers.RefreshToken.for_user')
    @patch('accounts.serializers.authenticate')
    def test_login_serializer_includes_seller_profile_for_all_statuses(self, mock_auth, mock_for_user):
        from accounts.models import User
        from sellers.models import SellerProfile

        mock_refresh = MagicMock()
        mock_refresh.__str__ = lambda self: 'refresh_tok'
        mock_refresh.access_token = 'access_tok'
        mock_for_user.return_value = mock_refresh

        for status_val, expected_approved in [
            (SellerProfile.ApplicationStatus.PENDING, False),
            (SellerProfile.ApplicationStatus.REJECTED, False),
            (SellerProfile.ApplicationStatus.SUSPENDED, False),
            (SellerProfile.ApplicationStatus.APPROVED, True),
        ]:
            user = User(
                id=10,
                email=f'{status_val.lower()}@artisan.in',
                first_name='Asha',
                last_name='Devi',
                role=User.Role.SELLER,
                is_active=True,
            )
            user.seller_profile = SellerProfile(
                id=20,
                store_name='Asha Looms',
                state='Bihar',
                city='Patna',
                craft_category='Madhubani',
                application_status=status_val,
            )
            mock_auth.return_value = user

            ser = LoginSerializer(data={'email': user.email, 'password': 'Password123!'})
            self.assertTrue(ser.is_valid(), ser.errors)
            payload = ser.validated_data
            self.assertEqual(payload['user']['application_status'], status_val)
            self.assertEqual(payload['user']['is_approved_seller'], expected_approved)
            self.assertIsNotNone(payload['user']['seller_profile'])
            self.assertEqual(payload['user']['seller_profile']['application_status'], status_val)
            self.assertEqual(payload['user']['seller_profile']['store_name'], 'Asha Looms')

    @patch('accounts.serializers.RefreshToken.for_user')
    @patch('accounts.serializers.authenticate')
    def test_login_serializer_customer_and_admin_unaffected(self, mock_auth, mock_for_user):
        from accounts.models import User

        mock_refresh = MagicMock()
        mock_refresh.__str__ = lambda self: 'refresh_tok'
        mock_refresh.access_token = 'access_tok'
        mock_for_user.return_value = mock_refresh

        for role in (User.Role.CUSTOMER, User.Role.ADMIN):
            user = User(id=1, email=f'{role.lower()}@test.in', role=role, is_active=True)
            mock_auth.return_value = user
            ser = LoginSerializer(data={'email': user.email, 'password': 'Password123!'})
            self.assertTrue(ser.is_valid(), ser.errors)
            self.assertEqual(ser.validated_data['user']['role'], role)
            self.assertIsNone(ser.validated_data['user']['seller_profile'])

    def test_change_password_view_success_and_rejections(self):
        from rest_framework.test import force_authenticate
        from accounts.models import User

        view = ChangePasswordView.as_view()
        factory = APIRequestFactory()
        user = MagicMock(spec=User)
        user.is_authenticated = True
        user.check_password.return_value = True

        # 1. Valid password change
        req = factory.post(
            '/api/accounts/password/change/',
            {
                'current_password': 'OldPassword123!',
                'new_password': 'NewStrongPassword456!',
                'confirm_new_password': 'NewStrongPassword456!',
            },
            format='json',
        )
        force_authenticate(req, user=user)
        res = view(req)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['message'], 'Password updated successfully.')
        user.set_password.assert_called_once_with('NewStrongPassword456!')
        user.save.assert_called_once_with(update_fields=['password'])

        # 2. Incorrect current password -> 400
        user.check_password.return_value = False
        bad_curr = factory.post(
            '/api/accounts/password/change/',
            {
                'current_password': 'WrongPassword!',
                'new_password': 'NewStrongPassword456!',
                'confirm_new_password': 'NewStrongPassword456!',
            },
            format='json',
        )
        force_authenticate(bad_curr, user=user)
        self.assertEqual(view(bad_curr).status_code, 400)

        # 3. Mismatched confirmation -> 400
        user.check_password.return_value = True
        mismatch = factory.post(
            '/api/accounts/password/change/',
            {
                'current_password': 'OldPassword123!',
                'new_password': 'NewStrongPassword456!',
                'confirm_new_password': 'DifferentPassword789!',
            },
            format='json',
        )
        force_authenticate(mismatch, user=user)
        self.assertEqual(view(mismatch).status_code, 400)
