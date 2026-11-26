/**
 * BharatBazaar Platform Admin API Service
 * Centralizes admin-only API calls with JWT Bearer authorization.
 */

import { buildApiUrl } from '../config/apiConfig';

const API_BASE_URL = buildApiUrl('admin');

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
        'The backend server encountered an unexpected error while loading admin data.'
      );
      serverError.status = response.status;
      throw serverError;
    }
    const detail =
      data.detail ||
      data.message ||
      (Array.isArray(data.reason) ? data.reason[0] : null) ||
      `Request failed (${response.status})`;
    const error = new Error(detail);
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
        'Unable to connect to BharatBazaar backend. Please ensure the Django server is running on port 8000.'
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw err;
  }
}

export const adminService = {
  /**
   * Fetch platform-wide admin dashboard summary metrics
   * GET /api/admin/dashboard/summary/
   */
  async getDashboardSummary() {
    return safeFetch(`${API_BASE_URL}/dashboard/summary/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * List seller applications with optional status, search, and pagination
   * GET /api/admin/sellers/
   */
  async getSellers({ status = 'ALL', search = '', page = 1, pageSize = 10 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return safeFetch(`${API_BASE_URL}/sellers/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch single seller application & storefront detail
   * GET /api/admin/sellers/<id>/
   */
  async getSellerDetail(sellerId) {
    return safeFetch(`${API_BASE_URL}/sellers/${sellerId}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Approve a PENDING seller application
   * POST /api/admin/sellers/<id>/approve/
   */
  async approveSeller(sellerId, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/sellers/${sellerId}/approve/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_notes: adminNotes }),
    });
  },

  /**
   * Reject a PENDING seller application (reason required)
   * POST /api/admin/sellers/<id>/reject/
   */
  async rejectSeller(sellerId, reason, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/sellers/${sellerId}/reject/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason, admin_notes: adminNotes }),
    });
  },

  /**
   * Suspend an APPROVED seller storefront (reason required)
   * POST /api/admin/sellers/<id>/suspend/
   */
  async suspendSeller(sellerId, reason, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/sellers/${sellerId}/suspend/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason, admin_notes: adminNotes }),
    });
  },

  /**
   * Reactivate a SUSPENDED seller storefront
   * POST /api/admin/sellers/<id>/reactivate/
   */
  async reactivateSeller(sellerId, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/sellers/${sellerId}/reactivate/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_notes: adminNotes }),
    });
  },

  /**
   * List products for admin moderation with optional status, search, and pagination
   * GET /api/admin/products/
   */
  async getProducts({ status = 'ALL', search = '', page = 1, pageSize = 10 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return safeFetch(`${API_BASE_URL}/products/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch single product moderation detail
   * GET /api/admin/products/<id>/
   */
  async getProductDetail(productId) {
    return safeFetch(`${API_BASE_URL}/products/${productId}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Approve a PENDING or INACTIVE product
   * POST /api/admin/products/<id>/approve/
   */
  async approveProduct(productId, adminFeedback = '') {
    return safeFetch(`${API_BASE_URL}/products/${productId}/approve/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_feedback: adminFeedback }),
    });
  },

  /**
   * Reject a PENDING product (reason required)
   * POST /api/admin/products/<id>/reject/
   */
  async rejectProduct(productId, reason) {
    return safeFetch(`${API_BASE_URL}/products/${productId}/reject/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Suspend an APPROVED product to INACTIVE (reason required)
   * POST /api/admin/products/<id>/suspend/
   */
  async suspendProduct(productId, reason) {
    return safeFetch(`${API_BASE_URL}/products/${productId}/suspend/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * List customers with optional active filter, search, and pagination
   * GET /api/admin/customers/
   */
  async getCustomers({ active = '', search = '', page = 1, pageSize = 10 } = {}) {
    const params = new URLSearchParams();
    if (active === 'true' || active === 'false') params.set('active', active);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return safeFetch(`${API_BASE_URL}/customers/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch single customer detail
   * GET /api/admin/customers/<id>/
   */
  async getCustomerDetail(customerId) {
    return safeFetch(`${API_BASE_URL}/customers/${customerId}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Deactivate a customer account
   * POST /api/admin/customers/<id>/deactivate/
   */
  async deactivateCustomer(customerId) {
    return safeFetch(`${API_BASE_URL}/customers/${customerId}/deactivate/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Reactivate a deactivated customer account
   * POST /api/admin/customers/<id>/activate/
   */
  async activateCustomer(customerId) {
    return safeFetch(`${API_BASE_URL}/customers/${customerId}/activate/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch platform-wide order summary statistics
   * GET /api/admin/orders/summary/
   */
  async getOrdersSummary() {
    return safeFetch(`${API_BASE_URL}/orders/summary/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * List platform-wide orders with filters and pagination
   * GET /api/admin/orders/
   */
  async getOrders({
    orderStatus = 'ALL',
    paymentStatus = 'ALL',
    dateFrom = '',
    dateTo = '',
    seller = '',
    search = '',
    page = 1,
    pageSize = 10,
  } = {}) {
    const params = new URLSearchParams();
    if (orderStatus && orderStatus !== 'ALL') params.set('order_status', orderStatus);
    if (paymentStatus && paymentStatus !== 'ALL') params.set('payment_status', paymentStatus);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (seller.trim()) params.set('seller', seller.trim());
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return safeFetch(`${API_BASE_URL}/orders/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch complete read-only order details by order_number
   * GET /api/admin/orders/<order_number>/
   */
  async getOrderDetail(orderNumber) {
    return safeFetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderNumber)}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch platform-wide payment summary statistics
   * GET /api/admin/payments/summary/
   */
  async getPaymentsSummary() {
    return safeFetch(`${API_BASE_URL}/payments/summary/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * List platform-wide payments with filters and pagination
   * GET /api/admin/payments/
   */
  async getPayments({
    paymentStatus = 'ALL',
    dateFrom = '',
    dateTo = '',
    search = '',
    page = 1,
    pageSize = 10,
  } = {}) {
    const params = new URLSearchParams();
    if (paymentStatus && paymentStatus !== 'ALL') params.set('payment_status', paymentStatus);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return safeFetch(`${API_BASE_URL}/payments/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch read-only payment & order details by identifier (order_number or Razorpay ID)
   * GET /api/admin/payments/<identifier>/
   */
  async getPaymentDetail(identifier) {
    return safeFetch(`${API_BASE_URL}/payments/${encodeURIComponent(identifier)}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch platform-wide analytics metrics, trends, and insights
   * GET /api/admin/analytics/
   */
  async getPlatformAnalytics({ range = '30d', start_date = '', end_date = '' } = {}) {
    const params = new URLSearchParams();
    params.set('range', range);
    if (range === 'custom' && start_date && end_date) {
      params.set('start_date', start_date);
      params.set('end_date', end_date);
    }
    return safeFetch(`${API_BASE_URL}/analytics/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Fetch admin platform settings
   * GET /api/admin/settings/
   */
  async getPlatformSettings() {
    return safeFetch(`${API_BASE_URL}/settings/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  /**
   * Update admin platform settings
   * PUT /api/admin/settings/
   */
  async updatePlatformSettings(payload) {
    return safeFetch(`${API_BASE_URL}/settings/`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch public-safe marketplace settings for storefront components
   * GET /api/admin/public-settings/
   */
  async getPublicPlatformSettings() {
    return safeFetch(`${API_BASE_URL}/public-settings/`, {
      method: 'GET',
    });
  },

  /**
   * List customer return requests with status, date, and search filters
   * GET /api/admin/returns/
   */
  async getReturns({ status = 'ALL', dateFrom = '', dateTo = '', search = '', page = 1, pageSize = 10 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return safeFetch(`${API_BASE_URL}/returns/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getReturnDetail(id) {
    return safeFetch(`${API_BASE_URL}/returns/${id}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async approveReturn(id, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/returns/${id}/approve/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_notes: adminNotes }),
    });
  },

  async rejectReturn(id, reason, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/returns/${id}/reject/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason, admin_notes: adminNotes }),
    });
  },

  async completeReturn(id, adminNotes = '') {
    return safeFetch(`${API_BASE_URL}/returns/${id}/complete/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_notes: adminNotes }),
    });
  },
};
