from decimal import Decimal
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import SimpleTestCase
from cart.models import Cart, CartItem
from cart.serializers import CartSerializer, CartItemSerializer
from products.models import Product


class CartUnitTests(SimpleTestCase):
    """
    Unit tests for cart calculations, pricing rules, and serializers.
    """

    def test_cart_shipping_rule_free_above_999(self):
        cart = Cart()
        item1 = MagicMock()
        item1.quantity = 1
        item1.line_total = Decimal('1200.00')

        with patch.object(Cart, 'items') as mock_items:
            mock_items.all.return_value = [item1]
            self.assertEqual(cart.subtotal, Decimal('1200.00'))
            self.assertEqual(cart.shipping_amount, Decimal('0.00'))
            self.assertEqual(cart.total_amount, Decimal('1200.00'))

    def test_cart_shipping_rule_charge_below_999(self):
        cart = Cart()
        item1 = MagicMock()
        item1.quantity = 1
        item1.line_total = Decimal('450.00')

        with patch.object(Cart, 'items') as mock_items:
            mock_items.all.return_value = [item1]
            self.assertEqual(cart.subtotal, Decimal('450.00'))
            self.assertEqual(cart.shipping_amount, Decimal('99.00'))
            self.assertEqual(cart.total_amount, Decimal('549.00'))

    def test_cart_empty_has_zero_shipping(self):
        cart = Cart()
        with patch.object(Cart, 'items') as mock_items:
            mock_items.all.return_value = []
            self.assertEqual(cart.subtotal, Decimal('0.00'))
            self.assertEqual(cart.shipping_amount, Decimal('0.00'))
            self.assertEqual(cart.total_amount, Decimal('0.00'))

    def test_cart_item_unit_price_uses_discount_when_available(self):
        item = CartItem(quantity=2)
        product = Product(price=Decimal('2000.00'), discount_price=Decimal('1500.00'))
        item.product = product

        self.assertEqual(item.unit_price, Decimal('1500.00'))
        self.assertEqual(item.line_total, Decimal('3000.00'))

    def test_cart_item_unit_price_falls_back_to_retail_price(self):
        item = CartItem(quantity=3)
        product = Product(price=Decimal('2000.00'), discount_price=None)
        item.product = product

        self.assertEqual(item.unit_price, Decimal('2000.00'))
        self.assertEqual(item.line_total, Decimal('6000.00'))

    def test_cart_serializer_structure(self):
        expected_fields = {
            'id', 'items', 'total_items', 'subtotal',
            'shipping_amount', 'total_amount', 'created_at', 'updated_at'
        }
        fields = set(CartSerializer().fields.keys())
        self.assertTrue(expected_fields.issubset(fields))
