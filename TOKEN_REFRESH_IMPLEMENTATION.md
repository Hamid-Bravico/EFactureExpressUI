# Automatic Token Refresh Implementation

## Overview

This document describes the implementation of automatic JWT token refresh functionality in the EFacture Express application. The system now automatically refreshes tokens before they expire, ensuring seamless user experience while maintaining security.

## Key Features

### 🔄 Automatic Token Refresh
- **Proactive Refresh**: Tokens are refreshed 5 minutes before expiration
- **Background Processing**: Refresh happens automatically without user intervention
- **Retry Logic**: Failed requests due to expired tokens are automatically retried
- **Event-Driven**: Components are notified of token refresh events

### 🛡️ Security Enhancements
- **Refresh Token Storage**: Secure storage of refresh tokens in sessionStorage
- **Token Expiry Tracking**: Automatic calculation and tracking of token expiration
- **Graceful Degradation**: Proper logout on refresh failure
- **XSS Protection**: Using sessionStorage instead of localStorage

## Technical Implementation

### 1. Enhanced TokenManager Class

```typescript
// Key new methods in TokenManager
class TokenManager {
  // Store token and refresh token
  setToken(token: string, refreshToken?: string): void
  
  // Check if token is expiring soon (within 5 minutes)
  isTokenExpiringSoon(): boolean
  
  // Get a valid token (refresh if needed)
  async getValidToken(): Promise<string | null>
  
  // Force refresh token
  async forceRefreshToken(): Promise<string | null>
}
```

### 2. Secure API Client

```typescript
// Automatic token refresh in API requests
export class SecureApiClient {
  async request(url: string, options: RequestInit, requireAuth: boolean = true): Promise<Response> {
    // Get valid token (refresh if needed)
    const token = await tokenManager.getValidToken();
    
    // Handle 401 responses with automatic retry
    if (response.status === 401 && requireAuth) {
      const refreshedToken = await tokenManager.forceRefreshToken();
      if (refreshedToken) {
        return await fetch(url, requestOptions); // Retry with new token
      }
    }
  }
}
```

### 3. Event-Driven Architecture

```typescript
// Custom events for token refresh
window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
  detail: { token: newToken } 
}));

window.dispatchEvent(new CustomEvent('tokenRefreshFailed'));
```

## Backend Requirements

### Required Endpoints

The backend must implement a refresh token endpoint:

```typescript
// POST /api/auth/refresh
{
  "refreshToken": "string"
}

// Response
{
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token" // Optional
}
```

### JWT Token Structure

The JWT tokens should include:
- `exp`: Expiration timestamp
- `role`: User role
- `userId`: User identifier
- `email`: User email

## Usage Examples

### 1. Making Authenticated API Calls

```typescript
// Using the secure API client
import { secureApiClient, API_ENDPOINTS } from '../config/api';

// Automatic token refresh handled internally
const response = await secureApiClient.get(API_ENDPOINTS.INVOICES.LIST);
const data = await response.json();
```

### 2. Manual Token Refresh

```typescript
import { tokenManager } from '../utils/tokenManager';

// Force refresh token
const newToken = await tokenManager.forceRefreshToken();
if (newToken) {
  console.log('Token refreshed successfully');
} else {
  console.log('Token refresh failed');
}
```

### 3. Listening to Token Events

```typescript
// In React components
useEffect(() => {
  const handleTokenRefresh = (event: CustomEvent) => {
    const newToken = event.detail?.token;
    // Update component state with new token
  };

  const handleTokenRefreshFailed = () => {
    // Redirect to login or show logout message
  };

  window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
  window.addEventListener('tokenRefreshFailed', handleTokenRefreshFailed);

  return () => {
    window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    window.removeEventListener('tokenRefreshFailed', handleTokenRefreshFailed);
  };
}, []);
```

## Security Benefits

### 1. Reduced Token Exposure Window
- Tokens are refreshed proactively before expiration
- Shorter token lifetimes can be used safely
- Reduced risk of token theft

### 2. Seamless User Experience
- No unexpected logouts due to token expiration
- Background refresh without user intervention
- Automatic retry of failed requests

### 3. Proper Error Handling
- Graceful degradation on refresh failure
- Clear user feedback for authentication issues
- Automatic logout on security failures

## Configuration

### Token Expiry Settings

```typescript
// In TokenManager class
private readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutes
private readonly TOKEN_EXPIRY_KEY = 'token_expiry';
```

### Refresh Token Storage

```typescript
// Secure storage in sessionStorage
private readonly REFRESH_TOKEN_KEY = 'refresh_token';
sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
```

## Migration Guide

### For Existing Components

1. **Replace direct fetch calls** with `secureApiClient`:
```typescript
// Before
const response = await fetch(url, {
  headers: getAuthHeaders(token)
});

// After
const response = await secureApiClient.get(url);
```

2. **Update token handling** to use `tokenManager`:
```typescript
// Before
const token = localStorage.getItem('token');

// After
const token = await tokenManager.getValidToken();
```

3. **Add event listeners** for token refresh events:
```typescript
useEffect(() => {
  const handleTokenRefresh = (event: CustomEvent) => {
    // Handle token refresh
  };
  window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
  return () => window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
}, []);
```

## Testing

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Verify token is stored with refresh token
- [ ] Wait for token to expire (or modify expiry time)
- [ ] Verify automatic refresh occurs 5 minutes before expiry
- [ ] Test API calls during token refresh
- [ ] Verify failed refresh results in logout
- [ ] Test refresh token endpoint with invalid token

### Automated Testing

```typescript
// Example test for token refresh
describe('Token Refresh', () => {
  it('should automatically refresh token before expiry', async () => {
    // Mock token with short expiry
    const mockToken = createMockJWT({ exp: Date.now() / 1000 + 300 }); // 5 minutes
    
    tokenManager.setToken(mockToken, 'refresh_token');
    
    // Wait for refresh to be scheduled
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify refresh was called
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'refresh_token' })
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Refresh token not available**
   - Ensure backend returns refresh token on login
   - Check that refresh token is properly stored

2. **Token refresh failing**
   - Verify refresh endpoint is implemented on backend
   - Check network connectivity
   - Validate refresh token format

3. **Multiple refresh attempts**
   - TokenManager prevents simultaneous refresh attempts
   - Check for race conditions in component code

### Debug Information

```typescript
// Enable debug logging
console.log('Token expiry:', tokenManager.getTokenExpiry());
console.log('Is expiring soon:', tokenManager.isTokenExpiringSoon());
console.log('Is authenticated:', tokenManager.isAuthenticated());
```

## Future Enhancements

1. **HTTP-Only Cookies**: Move to secure cookie-based token storage
2. **Refresh Token Rotation**: Implement refresh token rotation for enhanced security
3. **Offline Support**: Cache refresh tokens for offline functionality
4. **Multiple Tab Support**: Synchronize token refresh across browser tabs

## Security Considerations

- Refresh tokens are stored in sessionStorage (cleared when tab closes)
- Automatic refresh happens 5 minutes before expiry
- Failed refresh results in immediate logout
- All token operations are centralized in TokenManager
- Event-driven architecture for component synchronization 