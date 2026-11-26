/**
 * Centralized API base URL configuration for BharatBazaar frontend.
 * Reads VITE_API_URL from Vite environment variables with local fallback.
 * Normalizes trailing slashes so requests never produce duplicate slashes.
 */
const DEFAULT_API_URL = 'http://localhost:8000/api';

export function normalizeApiBaseUrl(rawUrl) {
  const candidate = (rawUrl || '').trim();
  const base = candidate || DEFAULT_API_URL;
  return base.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export function buildApiUrl(subPath = '') {
  const cleanSubPath = String(subPath || '').replace(/^\/+/, '');
  return cleanSubPath ? `${API_BASE_URL}/${cleanSubPath}` : API_BASE_URL;
}
