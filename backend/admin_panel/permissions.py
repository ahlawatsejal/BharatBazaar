from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from accounts.models import User


class IsAdminRoleUser(BasePermission):
    """
    Strictly allows access only to authenticated users with role == ADMIN.
    Rejects customers and all seller states (pending, approved, rejected, suspended).
    """
    message = 'Access restricted to BharatBazaar platform administrators.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role != User.Role.ADMIN:
            raise PermissionDenied(self.message)

        return True
