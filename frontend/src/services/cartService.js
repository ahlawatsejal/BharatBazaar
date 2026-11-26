/**
 * BharatBazaar Shopping Cart API Service
 * Built with native browser fetch API and JWT Bearer authorization.
 */

import { buildApiUrl } from '../config/apiConfig';

const API_BASE_URL = buildApiUrl('cart');

function getAuthHeaders() {
  const token = localStorage.getItem('bb_access_token') || localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || data.message || `Cart API Error (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const cartService = {
  /**
   * Fetch authenticated customer's cart
   * GET /api/cart/
   */
  async getCart() {
    const response = await fetch(`${API_BASE_URL}/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Add a product to cart
   * POST /api/cart/items/
   */
  async addToCart(productId, quantity = 1) {
    const response = await fetch(`${API_BASE_URL}/items/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        product_id: productId,
        quantity,
      }),
    });
    return handleResponse(response);
  },

  /**
   * Update quantity of an existing item in cart
   * PATCH /api/cart/items/{itemId}/
   */
  async updateQuantity(itemId, quantity) {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(response);
  },

  /**
   * Remove single item from cart
   * DELETE /api/cart/items/{itemId}/
   */
  async removeItem(itemId) {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Clear all items in cart
   * DELETE /api/cart/
   */
  async clearCart() {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};
