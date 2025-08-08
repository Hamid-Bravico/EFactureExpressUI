import { tokenManager } from '../utils/tokenManager';
import { getCsrfHeader, validateCsrfResponse } from '../utils/csrf';
import { API_BASE_URL } from './constants';

export const getAcceptLanguageHeader = (): string => {
  const currentLanguage = localStorage.getItem('i18nextLng') || 'fr';
  return currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
};



export const getSecureHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept-Language': getAcceptLanguageHeader(),
    ...getCsrfHeader(),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const getJsonHeaders = (token?: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept-Language': getAcceptLanguageHeader(),
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
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
    // Token refreshed successfully
  };

  private handleTokenRefreshFailed = () => {
    // Token refresh failed, user should be logged out
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
      // If no token is available yet, try a refresh once before failing
      if (!token) {
        const refreshed = await tokenManager.forceRefreshToken();
        token = refreshed;
        if (!token) {
          throw new Error('No valid token available');
        }
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
    
    if (!headers.has('Content-Type')) {
      const hasStringBody = typeof (options as any).body === 'string';
      const isFormData = options.body instanceof FormData;
      
      if (hasStringBody) {
        headers.set('Content-Type', 'application/json');
      } else if (options.body && !isFormData) {
        headers.set('Content-Type', 'application/json');
      }
      // Don't set Content-Type for FormData - let browser handle it automatically
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      // Always include credentials for cross-origin cookie refresh and CSRF cookies
      credentials: 'include'
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Validate CSRF token from response if required
      if (requireCsrf && !validateCsrfResponse(response)) {
        throw new Error('CSRF validation failed');
      }
      
      // Handle 401 Unauthorized - try to refresh token and retry once
      if (response.status === 401 && requireAuth) {
        // Attempt refresh using HttpOnly cookie
        const refreshedToken = await tokenManager.forceRefreshToken();
        if (refreshedToken) {
          headers.set('Authorization', `Bearer ${refreshedToken}`);
          return await fetch(url, requestOptions);
        }
        tokenManager.clearAuthData();
        throw new Error('Authentication failed');
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
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined)
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

 