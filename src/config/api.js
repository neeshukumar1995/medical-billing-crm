/**
 * API Configuration
 * Centralized configuration for backend URLs and API settings
 */

// Backend base URL - can be overridden by environment variable
export const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://crm-backend.test';

// API base URL (includes /api path)
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

// Image base URL for profile images and other assets
export const IMAGE_BASE_URL = BACKEND_BASE_URL;

// API endpoints
export const API_ENDPOINTS = {
  USERS: '/users',
  ROLES: '/roles',
  PERMISSIONS: '/permissions',
  LEADS: '/leads',
  DASHBOARD: '/dashboard',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  AUTH: {
    LOGIN: '/login',
    LOGOUT: '/logout',
    REFRESH: '/refresh',
    PROFILE: '/profile'
  }
};

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Retry configuration
export const RETRY_CONFIG = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    return error.code === 'NETWORK_ERROR' ||
           error.code === 'TIMEOUT' ||
           (error.response && error.response.status >= 500);
  }
};

// Environment check
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Helper function to construct full image URLs
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${IMAGE_BASE_URL}/${imagePath}`;
};

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export default {
  BACKEND_BASE_URL,
  API_BASE_URL,
  IMAGE_BASE_URL,
  API_ENDPOINTS,
  DEFAULT_HEADERS,
  REQUEST_TIMEOUT,
  RETRY_CONFIG,
  isDevelopment,
  isProduction,
  getImageUrl,
  getApiUrl
};