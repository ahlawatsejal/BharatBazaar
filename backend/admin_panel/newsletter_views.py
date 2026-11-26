from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import NewsletterSubscription


class PublicNewsletterSubscribeView(APIView):
    """
    POST /api/newsletter/subscribe/
    Public POST-only endpoint to subscribe an email address to BharatBazaar updates.
    Normalizes email addresses, prevents duplicates, applies rate limiting,
    and never exposes subscriber lists.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'newsletter_subscribe'

    def post(self, request):
        raw_email = (request.data.get('email') or '').strip().lower()
        if not raw_email:
            return Response(
                {'email': ['Please enter an email address.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(raw_email)
        except DjangoValidationError:
            return Response(
                {'email': ['Please enter a valid email address.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _, created = NewsletterSubscription.objects.get_or_create(email=raw_email)
        if not created:
            return Response(
                {
                    'message': 'This email is already subscribed to BharatBazaar updates.',
                    'already_subscribed': True,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'message': 'Thank you for subscribing to BharatBazaar updates.',
                'already_subscribed': False,
            },
            status=status.HTTP_201_CREATED,
        )
