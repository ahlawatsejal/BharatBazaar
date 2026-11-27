"""
Django settings for BharatBazaar project.
"""

from datetime import timedelta
from pathlib import Path
import os
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")


def resolve_secret_key(debug_mode: bool, raw_key: str) -> str:
    """
    Requires a strong DJANGO_SECRET_KEY in production (DEBUG=False).
    Allows a local-dev-only fallback strictly when DEBUG=True.
    """
    cleaned = (raw_key or '').strip()
    if not debug_mode:
        if not cleaned or cleaned.startswith('django-insecure-') or len(cleaned) < 32:
            raise ImproperlyConfigured(
                'DJANGO_SECRET_KEY must be configured with at least 32 characters '
                'when DJANGO_DEBUG is False.'
            )
        return cleaned
    return cleaned or 'dev-only-local-bharatbazaar-secret-key'


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DJANGO_DEBUG', 'True').strip().lower() in ('1', 'true', 'yes')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = resolve_secret_key(DEBUG, os.getenv('DJANGO_SECRET_KEY', ''))

ALLOWED_HOSTS = [
    h.strip() for h in os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',') if h.strip()
]

# Production security settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Enable HSTS after confirming production HTTPS works.
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False



# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party applications
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Local project applications
    'accounts.apps.AccountsConfig',
    'sellers.apps.SellersConfig',
    'products.apps.ProductsConfig',
    'cart.apps.CartConfig',
    'orders.apps.OrdersConfig',
    'admin_panel.apps.AdminPanelConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    # CORS middleware placed as high as possible, before CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Custom User Model
AUTH_USER_MODEL = 'accounts.User'



# Database configuration (MySQL — supports DB_* and Railway MYSQL* variables)
_db_options = {
    'charset': 'utf8mb4',
}
_db_ssl_ca = os.getenv('DB_SSL_CA', '').strip()
if _db_ssl_ca:
    _db_options['ssl'] = {'ca': _db_ssl_ca}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME') or os.getenv('MYSQLDATABASE') or 'bharatbazaar',
        'USER': os.getenv('DB_USER') or os.getenv('MYSQLUSER'),
        'PASSWORD': os.getenv('DB_PASSWORD') or os.getenv('MYSQLPASSWORD'),
        'HOST': os.getenv('DB_HOST') or os.getenv('MYSQLHOST'),
        'PORT': os.getenv('DB_PORT') or os.getenv('MYSQLPORT') or '3306',
        'OPTIONS': _db_options,
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


def resolve_drf_renderers(debug_mode: bool) -> tuple:
    """Enable BrowsableAPIRenderer in local development only; JSONRenderer always."""
    if debug_mode:
        return (
            'rest_framework.renderers.JSONRenderer',
            'rest_framework.renderers.BrowsableAPIRenderer',
        )
    return ('rest_framework.renderers.JSONRenderer',)


# Django REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': resolve_drf_renderers(DEBUG),
    'DEFAULT_THROTTLE_RATES': {
        'auth_login': os.getenv('THROTTLE_AUTH_LOGIN', '10/minute'),
        'auth_register': os.getenv('THROTTLE_AUTH_REGISTER', '5/minute'),
        'newsletter_subscribe': os.getenv('THROTTLE_NEWSLETTER', '5/minute'),
    },
}


# Simple JWT configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_TYPE_CLAIM': 'token_type',
}


# CORS configuration

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000'
    ).split(',')
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173'
    ).split(',')
    if origin.strip()
]



# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'


# Media files (supports Railway Volume path via MEDIA_ROOT env var)
MEDIA_URL = 'media/'
MEDIA_ROOT = Path(os.getenv('MEDIA_ROOT', str(BASE_DIR / 'media')))


# Email configuration (Django 5.2 compatible)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# Razorpay Payment Gateway Configuration (Test Mode Only)
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')

