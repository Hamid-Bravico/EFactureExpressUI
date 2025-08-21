// CSRF Protection Utility
// Handles CSRF token management for state-changing operations

import { tokenManager } from './tokenManager';

// Helper function to get CSRF token from storage
export const getCsrfTokenFromStorage = (): string | null => {
  return tokenManager.getCsrfToken();
};

// Helper function to get CSRF header
export const getCsrfHeader = (): Record<string, string> => {
  const token = getCsrfTokenFromStorage();
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
  // For stored CSRF tokens, we don't need to validate response tokens
  // The backend handles validation automatically
  return true;
};

// Helper function to clear CSRF token (for logout)
export const clearCsrfToken = (): void => {
  // CSRF token is cleared by tokenManager.clearAuthData()
};

// Helper function to check if CSRF token exists
export const hasCsrfToken = (): boolean => {
  return getCsrfTokenFromStorage() !== null;
}; 