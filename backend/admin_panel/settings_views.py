from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PlatformSettings
from .permissions import IsAdminRoleUser
from .serializers import PlatformSettingsSerializer, PublicPlatformSettingsSerializer


class AdminPlatformSettingsView(APIView):
    """
    GET /api/admin/settings/
    PUT / PATCH /api/admin/settings/
    Admin-only endpoint to inspect and update manageable platform settings.
    Never exposes backend secrets or Django configuration.
    """
    permission_classes = [IsAuthenticated, IsAdminRoleUser]

    def get(self, request):
        settings_obj = PlatformSettings.get_solo()
        serializer = PlatformSettingsSerializer(settings_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self._update(request, partial=False)

    def patch(self, request):
        return self._update(request, partial=True)

    def _update(self, request, partial=False):
        settings_obj = PlatformSettings.get_solo()
        serializer = PlatformSettingsSerializer(settings_obj, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save(updated_by=request.user)

        return Response(
            {
                'message': 'Platform settings updated successfully.',
                'settings': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class PublicPlatformSettingsView(APIView):
    """
    GET /api/admin/public-settings/
    Read-only public endpoint exposing safe marketplace branding, announcement,
    and contact/social links for storefront components (AnnouncementBar, Footer).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = PlatformSettings.get_solo()
        serializer = PublicPlatformSettingsSerializer(settings_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
