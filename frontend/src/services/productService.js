/**
 * BharatBazaar Product Catalogue API Service
 * Built with native browser fetch API.
 */

import { API_BASE_URL } from '../config/apiConfig';

/**
 * Helper to handle fetch responses and error parsing
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || data.message || `API error (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const productService = {
  /**
   * Fetch paginated products with search and filtering
   * GET /api/products/?search=&category=&state=&min_price=&max_price=&ordering=&page=
   */
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.search && params.search.trim()) query.set('search', params.search.trim());
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.state && params.state !== 'all') query.set('state', params.state);
    if (params.seller) query.set('seller', params.seller);
    if (params.min_price) query.set('min_price', params.min_price);
    if (params.max_price) query.set('max_price', params.max_price);
    if (params.ordering) query.set('ordering', params.ordering);
    if (params.page && params.page > 1) query.set('page', params.page);

    const queryString = query.toString();
    const url = `${API_BASE_URL}/products/${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Fetch single product detail by slug
   * GET /api/products/{slug}/
   */
  async getProductBySlug(slug) {
    const response = await fetch(`${API_BASE_URL}/products/${slug}/`);
    return handleResponse(response);
  },

  /**
   * Fetch active craft categories
   * GET /api/categories/
   */
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/categories/`);
    return handleResponse(response);
  },

  /**
   * Fetch featured products for carousel / home highlight
   * GET /api/products/featured/
   */
  async getFeaturedProducts() {
    const response = await fetch(`${API_BASE_URL}/products/featured/`);
    return handleResponse(response);
  },
};
