from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier
    for authentication instead of usernames.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        extra_fields.setdefault('role', User.Role.CUSTOMER)
        extra_fields.setdefault('is_active', True)

        # Ensure public registration cannot assign ADMIN role
        if extra_fields.get('role') == User.Role.ADMIN and not extra_fields.get('is_staff'):
            raise ValueError('Admin role requires staff status')

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields['role'] = User.Role.ADMIN

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model for BharatBazaar supporting three roles:
    CUSTOMER, SELLER, and ADMIN.

    Email is the unique authentication identifier.
    """

    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Customer'
        SELLER = 'SELLER', 'Seller'
        ADMIN = 'ADMIN', 'Admin'

    # Remove the username field requirement or make it optional
    username = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        help_text='Optional username. Email is used for primary login.',
    )
    email = models.EmailField(
        'email address',
        unique=True,
        error_messages={
            'unique': 'A user with that email already exists.',
        },
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        default='',
        help_text='Contact phone number with optional country code.',
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        help_text='Designates the role of this user on BharatBazaar.',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when the user profile was last updated.',
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        full_name = self.get_full_name().strip()
        if full_name:
            return f"{full_name} ({self.email}) [{self.role}]"
        return f"{self.email} [{self.role}]"

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER

    @property
    def is_seller(self):
        return self.role == self.Role.SELLER

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN
