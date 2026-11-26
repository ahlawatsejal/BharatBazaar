from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from accounts.models import User
from .models import SellerProfile


class IsApprovedSeller(BasePermission):
    """
    Permission check for operational Seller Dashboard routes:
    - User must be authenticated.
    - User role must be SELLER.
    - SellerProfile must have application_status == APPROVED.
    """
    message = 'You do not have permission to access the artisan seller workspace.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role != User.Role.SELLER:
            raise PermissionDenied('Access restricted to artisan seller accounts.')

        if not hasattr(user, 'seller_profile'):
            raise PermissionDenied('No artisan seller profile found for this account.')

        profile = user.seller_profile
        if profile.application_status == SellerProfile.ApplicationStatus.PENDING:
            raise PermissionDenied('Your artisan application is currently pending curatorial review.')

        if profile.application_status == SellerProfile.ApplicationStatus.REJECTED:
            raise PermissionDenied('Your artisan application was not approved. Please contact support.')

        if profile.application_status == SellerProfile.ApplicationStatus.SUSPENDED:
            raise PermissionDenied('Your seller storefront is currently suspended. Please contact concierge.')

        return profile.application_status == SellerProfile.ApplicationStatus.APPROVED
