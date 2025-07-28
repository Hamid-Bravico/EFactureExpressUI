import { tokenManager } from '../utils/tokenManager';
import { getCsrfHeader, validateCsrfResponse } from '../utils/csrf';

export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const getAcceptLanguageHeader = (): string => {
  const currentLanguage = localStorage.getItem('i18nextLng') || 'fr';
  return currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
};

export const getAuthHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept-Language': getAcceptLanguageHeader(),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const getSecureHeaders = (token?: string | null): Record<string, string> => {
  return {
    ...getAuthHeaders(token),
    ...getCsrfHeader(),
  };
};

export const getJsonHeaders = (token?: string | null): Record<string, string> => {
  return {
    ...getAuthHeaders(token),
    'Content-Type': 'application/json',
  };
};

export const getSecureJsonHeaders = (token?: string | null): Record<string, string> => {
  return {
    ...getSecureHeaders(token),
    'Content-Type': 'application/json',
  };
};

// Enhanced API client with automatic token refresh
export class SecureApiClient {
  private static instance: SecureApiClient;
  
  private constructor() {
    // Listen for token refresh events
    window.addEventListener('tokenRefreshed', this.handleTokenRefresh.bind(this) as EventListener);
    window.addEventListener('tokenRefreshFailed', this.handleTokenRefreshFailed.bind(this) as EventListener);
  }

  static getInstance(): SecureApiClient {
    if (!SecureApiClient.instance) {
      SecureApiClient.instance = new SecureApiClient();
    }
    return SecureApiClient.instance;
  }

  private handleTokenRefresh = (event: CustomEvent) => {
    console.log('Token refreshed successfully');
  };

  private handleTokenRefreshFailed = () => {
    console.log('Token refresh failed, user should be logged out');
    // Redirect to login or show logout message
    window.location.href = '/login';
  };

  // Make authenticated API request with automatic token refresh and CSRF protection
  async request(
    url: string, 
    options: RequestInit = {}, 
    requireAuth: boolean = true,
    requireCsrf: boolean = false
  ): Promise<Response> {
    let token: string | null = null;
    
    if (requireAuth) {
      // Get valid token (refresh if needed)
      token = await tokenManager.getValidToken();
      if (!token) {
        throw new Error('No valid token available');
      }
    }

    // Add auth headers if token is available
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept-Language', getAcceptLanguageHeader());
    
    // Add CSRF token for state-changing operations
    if (requireCsrf) {
      const csrfHeaders = getCsrfHeader();
      Object.entries(csrfHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }
    
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Validate CSRF token from response if required
      if (requireCsrf && !validateCsrfResponse(response)) {
        throw new Error('CSRF validation failed');
      }
      
      // Handle 401 Unauthorized - try to refresh token and retry once
      if (response.status === 401 && requireAuth) {
        const refreshedToken = await tokenManager.forceRefreshToken();
        if (refreshedToken) {
          // Retry the request with the new token
          headers.set('Authorization', `Bearer ${refreshedToken}`);
          return await fetch(url, requestOptions);
        } else {
          // Refresh failed, clear auth and throw error
          tokenManager.clearAuthData();
          throw new Error('Authentication failed');
        }
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Convenience methods for common HTTP methods
  async get(url: string, requireAuth: boolean = true): Promise<Response> {
    return this.request(url, { method: 'GET' }, requireAuth, false);
  }

  async post(url: string, data?: any, requireAuth: boolean = true, requireCsrf: boolean = true): Promise<Response> {
    return this.request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, requireAuth, requireCsrf);
  }

  async put(url: string, data?: any, requireAuth: boolean = true, requireCsrf: boolean = true): Promise<Response> {
    return this.request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }, requireAuth, requireCsrf);
  }

  async delete(url: string, requireAuth: boolean = true, requireCsrf: boolean = true): Promise<Response> {
    return this.request(url, { method: 'DELETE' }, requireAuth, requireCsrf);
  }
}

// Export singleton instance
export const secureApiClient = SecureApiClient.getInstance();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    USERS: `${API_BASE_URL}/users`,
  },
  INVOICES: {
    LIST: `${API_BASE_URL}/invoices`,
    CREATE: `${API_BASE_URL}/invoices`,
    UPDATE: (id: number) => `${API_BASE_URL}/invoices/${id}`,
    DELETE: (id: number) => `${API_BASE_URL}/invoices/${id}`,
    PDF: (id: number) => `${API_BASE_URL}/invoices/${id}/pdf-url`,
    JSON: (id: number) => `${API_BASE_URL}/invoices/${id}/json-url`,
    IMPORT: `${API_BASE_URL}/invoices/import-csv`,
    SUBMIT: (id: number) => `${API_BASE_URL}/invoices/${id}/dgi-submit`,
    DGI_STATUS: (id: number) => `${API_BASE_URL}/invoices/${id}/dgi-status`,
  },
  CUSTOMERS: {
    LIST: `${API_BASE_URL}/customers`,
    CREATE: `${API_BASE_URL}/customers`,
    UPDATE: (id: number) => `${API_BASE_URL}/customers/${id}`,
    DELETE: (id: number) => `${API_BASE_URL}/customers/${id}`,
  },
}; 