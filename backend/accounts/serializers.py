from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import User
from sellers.models import SellerProfile


class SellerProfileSummarySerializer(serializers.ModelSerializer):
    """Read-only serializer for seller profile details attached to user profile."""
    is_approved = serializers.BooleanField(read_only=True)

    class Meta:
        model = SellerProfile
        fields = (
            'id',
            'store_name',
            'business_description',
            'state',
            'city',
            'craft_category',
            'application_status',
            'is_approved',
            'created_at',
        )
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for retrieving and updating the authenticated user profile."""
    seller_profile = SellerProfileSummarySerializer(read_only=True)
    is_approved_seller = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'phone_number',
            'role',
            'is_active',
            'date_joined',
            'seller_profile',
            'is_approved_seller',
        )
        read_only_fields = ('id', 'email', 'role', 'is_active', 'date_joined')

    def get_is_approved_seller(self, obj):
        if obj.role == User.Role.SELLER and hasattr(obj, 'seller_profile'):
            return obj.seller_profile.is_approved
        return False


class CustomerRegisterSerializer(serializers.Serializer):
    """
    Serializer for public customer registration.
    Enforces password validation, confirmation match, and CUSTOMER role assignment.
    """
    first_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return normalized

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        # Run Django built-in password validators
        try:
            validate_password(password)
        except DjangoValidationError as err:
            raise serializers.ValidationError({'password': list(err.messages)})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')

        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data.get('phone_number', ''),
            role=User.Role.CUSTOMER,
        )
        return user


class SellerRegisterSerializer(serializers.Serializer):
    """
    Serializer for artisan and MSME seller registration.
    Creates a User with SELLER role and a linked SellerProfile with PENDING status.
    """
    # Personal info
    first_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(max_length=15, required=True, trim_whitespace=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)

    # Store info
    store_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    business_description = serializers.CharField(required=False, allow_blank=True, default='')
    state = serializers.CharField(max_length=100, required=True, trim_whitespace=True)
    city = serializers.CharField(max_length=100, required=True, trim_whitespace=True)
    craft_category = serializers.CharField(max_length=100, required=True, trim_whitespace=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('A user with this email address already exists.')
        return normalized

    def validate_store_name(self, value):
        name = value.strip()
        if SellerProfile.objects.filter(store_name__iexact=name).exists():
            raise serializers.ValidationError('A store with this name already exists. Please choose a unique store name.')
        return name

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        try:
            validate_password(password)
        except DjangoValidationError as err:
            raise serializers.ValidationError({'password': list(err.messages)})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')

        # Extract store details
        store_name = validated_data.pop('store_name')
        business_description = validated_data.pop('business_description', '')
        state = validated_data.pop('state')
        city = validated_data.pop('city')
        craft_category = validated_data.pop('craft_category')

        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data['email'],
                password=password,
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                phone_number=validated_data['phone_number'],
                role=User.Role.SELLER,
            )

            SellerProfile.objects.create(
                user=user,
                store_name=store_name,
                business_description=business_description,
                state=state,
                city=city,
                craft_category=craft_category,
                application_status=SellerProfile.ApplicationStatus.PENDING,
            )

        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for authenticating users via email and password.
    Returns JWT access & refresh tokens along with user profile and role details.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        if not email or not password:
            raise serializers.ValidationError('Both email and password are required.')

        user = authenticate(request=self.context.get('request'), username=email, password=password)

        if not user:
            # Fallback if standard backend used email as direct parameter
            try:
                user_obj = User.objects.get(email__iexact=email)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                user = None

        if not user:
            raise serializers.ValidationError('Invalid email or password.')

        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated. Please contact support.')

        refresh = RefreshToken.for_user(user)

        # Check seller approval status if user is a seller
        is_approved_seller = False
        application_status = None
        seller_profile_data = None
        if user.role == User.Role.SELLER and hasattr(user, 'seller_profile'):
            is_approved_seller = user.seller_profile.is_approved
            application_status = user.seller_profile.application_status
            seller_profile_data = SellerProfileSummarySerializer(user.seller_profile).data

        return {
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'role': user.role,
                'is_approved_seller': is_approved_seller,
                'application_status': application_status,
                'seller_profile': seller_profile_data,
            },
        }


class LogoutSerializer(serializers.Serializer):
    """
    Accepts refresh token to invalidate and blacklist on logout.
    """
    refresh = serializers.CharField(required=True)

    def validate(self, attrs):
        self.token = attrs.get('refresh')
        return attrs

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.token)
            token.blacklist()
        except TokenError:
            raise serializers.ValidationError({'refresh': 'Invalid or expired token.'})


class ChangePasswordSerializer(serializers.Serializer):
    """
    Validates current password and updates to a strong new password.
    """
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password does not match.')
        return value

    def validate(self, attrs):
        new_password = attrs.get('new_password')
        confirm = attrs.get('confirm_new_password')
        if new_password != confirm:
            raise serializers.ValidationError({'confirm_new_password': 'New passwords do not match.'})

        user = self.context['request'].user
        try:
            validate_password(new_password, user)
        except DjangoValidationError as err:
            raise serializers.ValidationError({'new_password': list(err.messages)})

        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user
