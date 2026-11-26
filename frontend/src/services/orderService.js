/**
 * BharatBazaar Orders, Addresses & Payments API Service
 * Built with native browser fetch API and JWT Bearer authorization.
 */

import { buildApiUrl } from '../config/apiConfig';

const API_BASE_URL = buildApiUrl('orders');

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
    const error = new Error(data.detail || data.message || `Orders API Error (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const orderService = {
  /**
   * Fetch customer shipping addresses
   * GET /api/orders/addresses/
   */
  async getAddresses() {
    const response = await fetch(`${API_BASE_URL}/addresses/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Create a new shipping address
   * POST /api/orders/addresses/
   */
  async createAddress(addressData) {
    const response = await fetch(`${API_BASE_URL}/addresses/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(addressData),
    });
    return handleResponse(response);
  },

  /**
   * Update existing address
   * PATCH /api/orders/addresses/{id}/
   */
  async updateAddress(addressId, addressData) {
    const response = await fetch(`${API_BASE_URL}/addresses/${addressId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(addressData),
    });
    return handleResponse(response);
  },

  /**
   * Delete an address
   * DELETE /api/orders/addresses/{id}/
   */
  async deleteAddress(addressId) {
    const response = await fetch(`${API_BASE_URL}/addresses/${addressId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Set address as default
   * POST /api/orders/addresses/{id}/default/
   */
  async setDefaultAddress(addressId) {
    const response = await fetch(`${API_BASE_URL}/addresses/${addressId}/default/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Check Razorpay payment configuration
   * GET /api/orders/payment-config/
   */
  async getPaymentConfig() {
    const response = await fetch(`${API_BASE_URL}/payment-config/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Create a pending order from cart and initiate checkout
   * POST /api/orders/create/
   */
  async createOrder(addressId) {
    const response = await fetch(`${API_BASE_URL}/create/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ address_id: addressId }),
    });
    return handleResponse(response);
  },

  /**
   * Verify Razorpay payment signature and confirm order
   * POST /api/orders/verify-payment/
   */
  async verifyPayment(paymentPayload) {
    const response = await fetch(`${API_BASE_URL}/verify-payment/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentPayload),
    });
    return handleResponse(response);
  },

  /**
   * Fetch order confirmation details by order number
   * GET /api/orders/{orderNumber}/
   */
  async getOrderByNumber(orderNumber) {
    const response = await fetch(`${API_BASE_URL}/${orderNumber}/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Fetch customer's past orders
   * GET /api/orders/
   */
  async getOrderHistory() {
    const response = await fetch(`${API_BASE_URL}/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};
