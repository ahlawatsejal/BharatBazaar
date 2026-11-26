/**
 * BharatBazaar Artisan Seller Dashboard API Service
 * Centralizes approved seller calls with JWT Bearer authorization.
 */

import { buildApiUrl } from '../config/apiConfig';

const API_BASE_URL = buildApiUrl('sellers');

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
    if (response.status >= 500) {
      const serverError = new Error(
        'The backend server encountered an error while retrieving seller data. Please check server logs.'
      );
      serverError.status = response.status;
      serverError.data = data;
      throw serverError;
    }

    let errorMessage = data.detail || data.message || `Request failed (${response.status})`;
    if (typeof data === 'object' && !data.detail && !data.message) {
      const fieldErrors = Object.entries(data)
        .map(([k, v]) => `${k.replace('_', ' ')}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
        .join(' | ');
      if (fieldErrors) errorMessage = fieldErrors;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return await handleResponse(response);
  } catch (err) {
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch')) {
      const networkError = new Error(
        'Unable to connect to BharatBazaar backend. Please ensure the Django development server is running on port 8000.'
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw err;
  }
}

export const sellerService = {
  /**
   * Fetch complete seller dashboard metrics, inventory counts, and recent orders
   * GET /api/sellers/dashboard/
   */
  async getDashboard() {
    return safeFetch(`${API_BASE_URL}/dashboard/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch current seller storefront profile
   * GET /api/sellers/store/
   */
  async getStoreProfile() {
    return safeFetch(`${API_BASE_URL}/store/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Update storefront details (name, description, city, state, craft category)
   * PATCH /api/sellers/store/
   */
  async updateStoreProfile(profileData) {
    return safeFetch(`${API_BASE_URL}/store/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
  },

  // ─── Seller Product Management ──────────────────────────────────
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.ordering) query.set('ordering', params.ordering);
    const qs = query.toString();
    return safeFetch(`${API_BASE_URL}/products/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async createProduct(productData) {
    return safeFetch(`${API_BASE_URL}/products/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
  },

  async updateProduct(productId, productData) {
    return safeFetch(`${API_BASE_URL}/products/${productId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
  },

  async deleteProduct(productId) {
    return safeFetch(`${API_BASE_URL}/products/${productId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  async uploadProductImage(file) {
    const token = localStorage.getItem('bb_access_token') || localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('image', file);
    return safeFetch(`${API_BASE_URL}/products/upload-image/`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  },

  // ─── Seller Inventory Management ────────────────────────────────
  async getInventory(params = {}) {
    const query = new URLSearchParams();
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.stock_status && params.stock_status !== 'ALL') query.set('stock_status', params.stock_status);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.ordering) query.set('ordering', params.ordering);
    const qs = query.toString();
    return safeFetch(`${API_BASE_URL}/inventory/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getInventorySummary() {
    return safeFetch(`${API_BASE_URL}/inventory/summary/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async adjustInventory(productId, payload) {
    return safeFetch(`${API_BASE_URL}/inventory/${productId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async getInventoryHistory(productId) {
    return safeFetch(`${API_BASE_URL}/inventory/${productId}/history/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  // ─── Seller Order & Consignment Management ──────────────────────
  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.payment_status && params.payment_status !== 'ALL') query.set('payment_status', params.payment_status);
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to) query.set('date_to', params.date_to);
    const qs = query.toString();
    return safeFetch(`${API_BASE_URL}/orders/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getOrderSummary() {
    return safeFetch(`${API_BASE_URL}/orders/summary/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getOrderDetail(orderNumber) {
    return safeFetch(`${API_BASE_URL}/orders/${orderNumber}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async updateOrderItemStatus(orderNumber, itemId, fulfillmentStatus) {
    return safeFetch(`${API_BASE_URL}/orders/${orderNumber}/items/${itemId}/status/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fulfillment_status: fulfillmentStatus }),
    });
  },

  async updateOrderItemShipment(orderNumber, itemId, shipmentData) {
    return safeFetch(`${API_BASE_URL}/orders/${orderNumber}/items/${itemId}/shipment/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(shipmentData),
    });
  },

  // ─── Seller Analytics ───────────────────────────────────────────
  async getAnalyticsOverview(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return safeFetch(`${API_BASE_URL}/analytics/overview/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getAnalyticsSales(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return safeFetch(`${API_BASE_URL}/analytics/sales/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getAnalyticsProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return safeFetch(`${API_BASE_URL}/analytics/products/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getAnalyticsOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return safeFetch(`${API_BASE_URL}/analytics/orders/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  // ─── Seller Reviews & Ratings ───────────────────────────────────
  async getReviews(params = {}) {
    const query = new URLSearchParams();
    if (params.rating && params.rating !== 'ALL') query.set('rating', params.rating);
    if (params.product && params.product !== 'all') query.set('product', params.product);
    if (params.reply_status && params.reply_status !== 'all') query.set('reply_status', params.reply_status);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.page) query.set('page', params.page);
    const qs = query.toString();
    return safeFetch(`${API_BASE_URL}/reviews/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getReviewsSummary() {
    return safeFetch(`${API_BASE_URL}/reviews/summary/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async replyToReview(reviewId, { reply, allow_update = false }) {
    return safeFetch(`${API_BASE_URL}/reviews/${reviewId}/reply/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reply, allow_update }),
    });
  },

  // ─── Seller Notifications ───────────────────────────────────────
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.page) query.set('page', params.page);
    const qs = query.toString();
    return safeFetch(`${API_BASE_URL}/notifications/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getUnreadNotificationCount() {
    return safeFetch(`${API_BASE_URL}/notifications/unread-count/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async markNotificationRead(id) {
    return safeFetch(`${API_BASE_URL}/notifications/${id}/read/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  async markAllNotificationsRead() {
    return safeFetch(`${API_BASE_URL}/notifications/mark-all-read/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Public approved artisan directory (no auth required)
   * GET /api/sellers/public/
   */
  async getPublicArtisans({ search = '', craft = 'all', state = 'all' } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (craft && craft !== 'all') params.set('craft', craft);
    if (state && state !== 'all') params.set('state', state);
    const qs = params.toString();
    return safeFetch(`${API_BASE_URL}/public/${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },
};
