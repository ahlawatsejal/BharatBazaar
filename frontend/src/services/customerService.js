/**
 * BharatBazaar Customer Dashboard API Service
 * Centralizes private customer account calls with JWT Bearer authentication.
 */

import { API_BASE_URL as API_ROOT } from '../config/apiConfig';

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

export const customerService = {
  // ─── Profile & Account ──────────────────────────────────────────
  async getProfile() {
    const res = await fetch(`${API_ROOT}/accounts/profile/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_ROOT}/accounts/profile/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return handleResponse(res);
  },

  async changePassword(passwordData) {
    const res = await fetch(`${API_ROOT}/accounts/password/change/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(passwordData),
    });
    return handleResponse(res);
  },

  async getDashboardSummary() {
    const res = await fetch(`${API_ROOT}/accounts/dashboard-summary/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ─── Wishlist ───────────────────────────────────────────────────
  async getWishlist() {
    const res = await fetch(`${API_ROOT}/products/wishlist/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async addToWishlist(productId) {
    const res = await fetch(`${API_ROOT}/products/wishlist/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: productId }),
    });
    return handleResponse(res);
  },

  async removeFromWishlist(productId) {
    const res = await fetch(`${API_ROOT}/products/wishlist/${productId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getWishlistIds() {
    const res = await fetch(`${API_ROOT}/products/wishlist/ids/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ─── Reviews ────────────────────────────────────────────────────
  async getMyReviews() {
    const res = await fetch(`${API_ROOT}/products/reviews/my/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async submitReview(reviewData) {
    const res = await fetch(`${API_ROOT}/products/reviews/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData),
    });
    return handleResponse(res);
  },

  async updateReview(reviewId, updateData) {
    const res = await fetch(`${API_ROOT}/products/reviews/${reviewId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  async deleteReview(reviewId) {
    const res = await fetch(`${API_ROOT}/products/reviews/${reviewId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ─── Notifications ──────────────────────────────────────────────
  async getNotifications() {
    const res = await fetch(`${API_ROOT}/orders/notifications/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_ROOT}/orders/notifications/${id}/read/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_ROOT}/orders/notifications/mark-all-read/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ─── Orders & Returns ───────────────────────────────────────────
  async cancelOrder(orderNumber) {
    const res = await fetch(`${API_ROOT}/orders/${orderNumber}/cancel/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getReturnRequests() {
    const res = await fetch(`${API_ROOT}/orders/returns/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async submitReturnRequest(payload) {
    const res = await fetch(`${API_ROOT}/orders/returns/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getReturnRequestDetail(id) {
    const res = await fetch(`${API_ROOT}/orders/returns/${id}/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
