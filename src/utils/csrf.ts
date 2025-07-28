// CSRF Protection Utility
// Handles CSRF token reading from cookies for state-changing operations

// Helper function to get CSRF token from cookie
export const getCsrfTokenFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'X-CSRF-TOKEN') {
      return value;
    }
  }
  return null;
};

// Helper function to get CSRF header
export const getCsrfHeader = (): Record<string, string> => {
  const token = getCsrfTokenFromCookie();
  if (!token) {
    throw new Error('CSRF token not found in cookies');
  }
  return {
    'X-CSRF-Token': token
  };
};

// Helper function to validate CSRF token from response
export const validateCsrfResponse = (response: Response): boolean => {
  // For cookie-based CSRF, we don't need to validate response tokens
  // The backend handles validation automatically
  return true;
};

// Helper function to clear CSRF token (for logout)
export const clearCsrfToken = (): void => {
  // Set cookie to expire in the past to delete it
  document.cookie = 'X-CSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

// Helper function to check if CSRF token exists
export const hasCsrfToken = (): boolean => {
  return getCsrfTokenFromCookie() !== null;
}; 