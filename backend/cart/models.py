from decimal import Decimal
from django.conf import settings
from django.db import models


class Cart(models.Model):
    """
    Shopping cart associated with a single registered customer.
    One active cart per customer.
    """
    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        help_text='Customer who owns this shopping cart.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Shopping Cart'
        verbose_name_plural = 'Shopping Carts'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Cart for {self.customer.email}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.line_total for item in self.items.all())

    @property
    def shipping_amount(self):
        """Free shipping above ₹999; ₹99 flat rate otherwise (0 when cart is empty)."""
        sub = self.subtotal
        if sub == 0:
            return Decimal('0.00')
        if sub >= Decimal('999.00'):
            return Decimal('0.00')
        return Decimal('99.00')

    @property
    def total_amount(self):
        return self.subtotal + self.shipping_amount


class CartItem(models.Model):
    """
    Individual artisanal product line in a customer's cart.
    Prevents duplicate entries for the same product via unique_together constraint.
    """
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='Parent cart containing this item.',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='cart_items',
        help_text='Selected artisan product.',
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text='Quantity of units selected by customer.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        unique_together = ('cart', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in cart {self.cart_id}"

    @property
    def unit_price(self):
        """Authoritative unit price calculated strictly on backend."""
        if self.product.discount_price and self.product.discount_price > Decimal('0.00'):
            return self.product.discount_price
        return self.product.price

    @property
    def line_total(self):
        return self.unit_price * self.quantity
