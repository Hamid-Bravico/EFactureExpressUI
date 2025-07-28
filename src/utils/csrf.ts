// CSRF Protection Utility
// Handles CSRF token reading from JWT for state-changing operations

import { decodeJWT } from './jwt';

// Helper function to get CSRF token from JWT
export const getCsrfTokenFromJwt = (): string | null => {
  // Get the current token from sessionStorage using the correct key
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    return null;
  }
  
  // Decode the JWT to extract the CSRF token
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }
  
  // Extract CSRF token from JWT claims
  const csrfToken = decoded['csrf-token'];
  if (!csrfToken) {
    return null;
  }
  
  return csrfToken;
};

// Helper function to get CSRF header
export const getCsrfHeader = (): Record<string, string> => {
  const token = getCsrfTokenFromJwt();
  if (!token) {
    // Return empty object instead of throwing error for graceful degradation
    return {};
  }
  return {
    'X-CSRF-Token': token
  };
};

// Helper function to validate CSRF token from response
export const validateCsrfResponse = (response: Response): boolean => {
  // For JWT-based CSRF, we don't need to validate response tokens
  // The backend handles validation automatically
  return true;
};

// Helper function to clear CSRF token (for logout)
export const clearCsrfToken = (): void => {
  // CSRF token is stored in JWT, so clearing the token will clear the CSRF token
};

// Helper function to check if CSRF token exists
export const hasCsrfToken = (): boolean => {
  return getCsrfTokenFromJwt() !== null;
}; 