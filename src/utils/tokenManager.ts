import { clearCsrfToken } from './csrf';
import { API_BASE_URL } from '../config/constants';

export interface TokenData {
  token: string;
  role: string;
  userId: string;
  company: any;
}

export interface RefreshTokenResponse {
  token?: string;
  refreshToken?: string;
  csrfToken?: string;
  data?: {
    token?: string;
    refreshToken?: string;
    csrfToken?: string;
  };
}

class TokenManager {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly CSRF_TOKEN_KEY = 'csrf_token';
  private readonly ROLE_KEY = 'user_role';
  private readonly USER_ID_KEY = 'user_id';
  private readonly COMPANY_KEY = 'company_data';
  private readonly TOKEN_EXPIRY_KEY = 'token_expiry';
  
  private refreshPromise: Promise<string | null> | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private lastRefreshAt: number = 0;

  // Store token in sessionStorage
  setToken(token: string, refreshToken?: string, csrfToken?: string, skipScheduleRefresh: boolean = false): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    
    if (refreshToken) {
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    
    if (csrfToken) {
      sessionStorage.setItem(this.CSRF_TOKEN_KEY, csrfToken);
    }
    
    // Calculate and store token expiry time
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        sessionStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
        
        // Schedule automatic refresh 5 minutes before expiry (unless this is a refresh operation)
        if (!skipScheduleRefresh) {
          this.scheduleTokenRefresh(expiryTime);
        }
      }
    } catch (error) {
      console.warn('Failed to parse token expiry:', error);
    }
  }

  // Store user data in sessionStorage
  setUserData(role: string, userId: string, company: any): void {
    sessionStorage.setItem(this.ROLE_KEY, role);
    sessionStorage.setItem(this.USER_ID_KEY, userId);
    sessionStorage.setItem(this.COMPANY_KEY, JSON.stringify(company));
  }

  // Get token from sessionStorage
  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  // Get refresh token
  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // Get CSRF token
  getCsrfToken(): string | null {
    return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  // Get user role
  getUserRole(): string | null {
    return sessionStorage.getItem(this.ROLE_KEY);
  }

  // Get user ID
  getUserId(): string | null {
    return sessionStorage.getItem(this.USER_ID_KEY);
  }

  // Get company data
  getCompanyData(): any {
    const companyData = sessionStorage.getItem(this.COMPANY_KEY);
    return companyData ? JSON.parse(companyData) : null;
  }

  // Update company data
  updateCompanyData(updatedCompany: any): void {
    const currentCompany = this.getCompanyData();
    if (currentCompany) {
      const updatedData = { ...currentCompany, ...updatedCompany };
      sessionStorage.setItem(this.COMPANY_KEY, JSON.stringify(updatedData));
    }
  }

  // Clear all auth data
  clearAuthData(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
    sessionStorage.removeItem(this.ROLE_KEY);
    sessionStorage.removeItem(this.USER_ID_KEY);
    sessionStorage.removeItem(this.COMPANY_KEY);
    sessionStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    
    // Clear CSRF cookie
    clearCsrfToken();
    
    // Clear scheduled refresh
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  // Check if token is about to expire (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      const thresholdSeconds = 10; // refresh proactively only when < 10s remain
      return timeUntilExpiry <= thresholdSeconds;
    } catch {
      return false;
    }
  }

  // Get token expiry time
  getTokenExpiry(): number | null {
    const expiryStr = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);
    return expiryStr ? parseInt(expiryStr, 10) : null;
  }

  // Schedule automatic token refresh
  private scheduleTokenRefresh(expiryTime: number): void {
    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    const currentTime = Date.now();
    const ttlMs = expiryTime - currentTime;
    if (ttlMs <= 0) {
      return;
    }
    // Choose a dynamic lead time: at least 10s, at most 5m, or 20% of TTL
    const leadMs = Math.max(10_000, Math.min(5 * 60 * 1000, Math.floor(ttlMs * 0.2)));
    // If TTL is very small, refresh a bit before expiry; ensure at least 1s delay
    const delayMs = Math.max(1_000, ttlMs - leadMs);
    
    this.refreshTimeout = setTimeout(() => {
      this.refreshToken();
    }, delayMs);
  }

  // Refresh token automatically
  private async refreshToken(): Promise<string | null> {
    // Debounce frequent refresh attempts
    const now = Date.now();
    if (this.lastRefreshAt && now - this.lastRefreshAt < 2000) {
      return this.getToken();
    }
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  // Perform the actual token refresh
  private async performTokenRefresh(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        // Must include credentials so the HttpOnly cookie is sent, especially if API is on a different origin
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: RefreshTokenResponse = await response.json();
      // Support both { token } and { data: { token } }
      const newAccessToken = data?.data?.token || data?.token;
      if (!newAccessToken) {
        throw new Error('Invalid refresh response');
      }

      const previousToken = this.getToken();
      // If backend returned the same token, avoid re-dispatching events/scheduling
      if (previousToken === newAccessToken) {
        this.lastRefreshAt = Date.now();
        return newAccessToken;
      }

      // Update stored token (skip scheduling refresh to prevent infinite loop)
      this.setToken(newAccessToken, data?.data?.refreshToken || data?.refreshToken, data?.data?.csrfToken || data?.csrfToken, true);
      
      // Manually schedule the next refresh for the new token
      try {
        const payload = JSON.parse(atob(newAccessToken.split('.')[1]));
        if (payload.exp) {
          const expiryTime = payload.exp * 1000;
          this.scheduleTokenRefresh(expiryTime);
        }
      } catch (error) {
        console.warn('Failed to schedule refresh for new token:', error);
      }
      // Update debounce timestamp
      this.lastRefreshAt = Date.now();
      
      // Dispatch custom event for components to react to token refresh
      window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
        detail: { token: newAccessToken } 
      }));
      
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth data on refresh failure
      this.clearAuthData();
      
      // Dispatch event for components to handle logout
      window.dispatchEvent(new CustomEvent('tokenRefreshFailed'));
      
      return null;
    }
  }

  // Get a valid token (refresh if needed)
  async getValidToken(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    // If token is expiring soon, refresh it
    if (this.isTokenExpiringSoon()) {
      return await this.refreshToken();
    }

    return token;
  }

  // Get all token data
  getTokenData(): TokenData | null {
    const token = this.getToken();
    const role = this.getUserRole();
    const userId = this.getUserId();
    const company = this.getCompanyData();

    if (!token || !role || !userId) {
      return null;
    }

    return { token, role, userId, company };
  }

  // Force refresh token (for manual refresh)
  async forceRefreshToken(): Promise<string | null> {
    // Debounce frequent refresh attempts
    const now = Date.now();
    if (this.lastRefreshAt && now - this.lastRefreshAt < 2000) {
      return this.getToken();
    }
    return await this.refreshToken();
  }
}

export const tokenManager = new TokenManager(); 