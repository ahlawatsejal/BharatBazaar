from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from products.models import Product


def get_or_create_user_cart(user):
    """Retrieves or provisions the single active cart for a customer."""
    cart, _ = Cart.objects.get_or_create(customer=user)
    return cart


class CartView(APIView):
    """
    GET /api/cart/
    Returns authenticated customer's cart with calculated authoritative totals.

    DELETE /api/cart/
    Clears all items from the customer's cart.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_or_create_user_cart(request.user)
        # Prefetch items and product details
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        cart = get_or_create_user_cart(request.user)
        cart.items.all().delete()
        serializer = CartSerializer(cart)
        return Response(
            {
                'message': 'Shopping cart cleared successfully.',
                'cart': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class CartItemAddView(APIView):
    """
    POST /api/cart/items/
    Adds an artisanal product to the customer's cart.
    Prevents duplicates by incrementing quantity.
    Enforces product approval, seller approval, and stock constraints.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Quantity must be a positive integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 1:
            return Response(
                {'detail': 'Quantity must be at least 1.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Fetch product and verify public availability
        try:
            product = Product.objects.select_related('seller', 'category').get(pk=product_id)
        except (Product.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Product does not exist or is invalid.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Enforce approval constraints
        if (
            product.approval_status != Product.ApprovalStatus.APPROVED
            or not product.seller.is_approved
            or not product.category.is_active
        ):
            return Response(
                {'detail': 'This artisanal piece is currently not available for purchase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce stock availability
        if product.available_stock <= 0:
            return Response(
                {'detail': 'This product is currently out of stock.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = get_or_create_user_cart(request.user)

        # 2. Check for existing item to avoid duplicate entries
        cart_item = CartItem.objects.filter(cart=cart, product=product).first()
        if cart_item:
            new_quantity = cart_item.quantity + quantity
            if new_quantity > product.available_stock:
                return Response(
                    {
                        'detail': f'Cannot add {quantity} more. Only {product.available_stock} units available in stock ({cart_item.quantity} already in cart).'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cart_item.quantity = new_quantity
            cart_item.save(update_fields=['quantity', 'updated_at'])
        else:
            if quantity > product.available_stock:
                return Response(
                    {
                        'detail': f'Requested quantity ({quantity}) exceeds available stock ({product.available_stock}).'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cart_item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity,
            )

        # Return updated cart
        serializer = CartSerializer(cart)
        return Response(
            {
                'message': f'"{product.name}" added to cart.',
                'item': CartItemSerializer(cart_item).data,
                'cart': serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class CartItemDetailView(APIView):
    """
    PATCH /api/cart/items/{id}/
    Updates quantity of an existing item in the customer's cart.

    DELETE /api/cart/items/{id}/
    Removes an individual product line from the cart.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        cart = get_or_create_user_cart(request.user)
        cart_item = get_object_or_404(CartItem, pk=item_id, cart=cart)

        try:
            quantity = int(request.data.get('quantity'))
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Quantity must be a valid integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            # If quantity set to 0 or negative, remove item
            cart_item.delete()
            serializer = CartSerializer(cart)
            return Response(
                {
                    'message': 'Item removed from cart.',
                    'cart': serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        # Validate stock
        product = cart_item.product
        if quantity > product.available_stock:
            return Response(
                {
                    'detail': f'Only {product.available_stock} units available in stock.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity', 'updated_at'])

        serializer = CartSerializer(cart)
        return Response(
            {
                'message': 'Cart updated.',
                'item': CartItemSerializer(cart_item).data,
                'cart': serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, item_id):
        cart = get_or_create_user_cart(request.user)
        cart_item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        product_name = cart_item.product.name
        cart_item.delete()

        serializer = CartSerializer(cart)
        return Response(
            {
                'message': f'"{product_name}" removed from cart.',
                'cart': serializer.data,
            },
            status=status.HTTP_200_OK,
        )
