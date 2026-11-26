import { useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';
import { useAuth } from './useAuth';
import { CartContext } from './useCart';

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refresh cart from backend
  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getCart();
      setCart(data);
      return data;
    } catch (err) {
      console.warn('Could not load cart:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) refreshCart();
    });
    return () => {
      active = false;
    };
  }, [refreshCart]);

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      const err = new Error('Please sign in to add artisanal crafts to your cart.');
      err.status = 401;
      throw err;
    }
    const result = await cartService.addToCart(productId, quantity);
    if (result && result.cart) {
      setCart(result.cart);
    } else {
      await refreshCart();
    }
    return result;
  };

  // Update item quantity
  const updateQuantity = async (itemId, quantity) => {
    const result = await cartService.updateQuantity(itemId, quantity);
    if (result && result.cart) {
      setCart(result.cart);
    } else {
      await refreshCart();
    }
    return result;
  };

  // Remove item
  const removeItem = async (itemId) => {
    const result = await cartService.removeItem(itemId);
    if (result && result.cart) {
      setCart(result.cart);
    } else {
      await refreshCart();
    }
    return result;
  };

  // Clear cart
  const clearCart = async () => {
    const result = await cartService.clearCart();
    if (result && result.cart) {
      setCart(result.cart);
    } else {
      setCart(null);
    }
    return result;
  };

  const cartCount = cart?.total_items || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        error,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
