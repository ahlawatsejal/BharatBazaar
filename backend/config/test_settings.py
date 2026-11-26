"""
Isolated test settings for running Django database-backed integration tests
without requiring MySQL CREATE DATABASE privileges or touching the development database.
"""
from .settings import *  # noqa: F401, F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
