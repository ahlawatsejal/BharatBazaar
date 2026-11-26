/**
 * BharatBazaar Authentication API Service
 * Built with native browser fetch API.
 */

import { buildApiUrl } from '../config/apiConfig';

const API_BASE_URL = buildApiUrl('accounts');

/**
 * Helper to handle fetch errors and parse backend error messages.
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status >= 500) {
      const serverError = new Error(
        'The backend server encountered an unexpected error. Please check server logs or database status.'
      );
      serverError.status = response.status;
      serverError.data = data;
      throw serverError;
    }

    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (data.detail) {
      errorMessage = data.detail;
    } else if (data.message) {
      errorMessage = data.message;
    } else if (typeof data === 'object') {
      // Extract field-specific error messages
      const fieldErrors = Object.entries(data)
        .map(([field, errors]) => {
          const fieldName = field.replace('_', ' ');
          const errText = Array.isArray(errors) ? errors.join(' ') : String(errors);
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: ${errText}`;
        })
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

/**
 * Safe fetch wrapper that distinguishes connection failures from API responses
 */
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return await handleResponse(response);
  } catch (err) {
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('failed to fetch')) {
      const networkError = new Error(
        'Unable to connect to BharatBazaar backend. Please ensure the Django development server is running on http://127.0.0.1:8000.'
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw err;
  }
}

export const authService = {
  /**
   * Customer Registration
   * POST /api/accounts/register/
   */
  async registerCustomer(userData) {
    return safeFetch(`${API_BASE_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  /**
   * Seller / MSME Registration
   * POST /api/accounts/seller/register/
   */
  async registerSeller(sellerData) {
    return safeFetch(`${API_BASE_URL}/seller/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sellerData),
    });
  },

  /**
   * User Login (Customer, Seller, Admin)
   * POST /api/accounts/login/
   */
  async login(email, password) {
    return safeFetch(`${API_BASE_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Refresh JWT Access Token
   * POST /api/accounts/token/refresh/
   */
  async refreshToken(refreshToken) {
    return safeFetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },

  /**
   * Get Current Authenticated User Profile
   * GET /api/accounts/profile/
   */
  async getProfile(accessToken) {
    return safeFetch(`${API_BASE_URL}/profile/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  /**
   * Update Profile
   * PATCH /api/accounts/profile/
   */
  async updateProfile(accessToken, profileData) {
    return safeFetch(`${API_BASE_URL}/profile/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(profileData),
    });
  },

  /**
   * Logout and Blacklist Refresh Token
   * POST /api/accounts/logout/
   */
  async logout(accessToken, refreshToken) {
    return safeFetch(`${API_BASE_URL}/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },
};
