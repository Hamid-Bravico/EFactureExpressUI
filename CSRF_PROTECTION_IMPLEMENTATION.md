# CSRF Protection Implementation

## Overview

This document describes the implementation of Cross-Site Request Forgery (CSRF) protection in the EFacture Express application. The system now includes comprehensive CSRF token generation, validation, and management for all state-changing operations.

## Key Features

### 🛡️ CSRF Token Management
- **Automatic Token Generation**: 32-character random tokens with 24-hour expiration
- **Session Storage**: Secure storage in sessionStorage (cleared when tab closes)
- **Token Refresh**: Automatic refresh when tokens are expiring soon (within 1 hour)
- **Validation**: Server-side token validation for all state-changing operations

### 🔒 State-Changing Operations Protected
- **POST Requests**: Create operations (invoices, customers, users)
- **PUT Requests**: Update operations (invoices, customers, users)
- **DELETE Requests**: Delete operations (invoices, customers, users)
- **Authentication**: Login and registration operations

### 🚀 Automatic Integration
- **API Client Enhancement**: SecureApiClient includes CSRF protection
- **Header Management**: Automatic CSRF token injection in headers
- **Response Validation**: CSRF token validation from server responses
- **Backward Compatibility**: Graceful fallback for endpoints without CSRF

## Technical Implementation

### 1. CSRF Manager Class

```typescript
// src/utils/csrf.ts
class CsrfManager {
  // Generate new CSRF token
  generateToken(): string
  
  // Get current token (generate if expired/missing)
  getToken(): string
  
  // Validate token against stored value
  validateToken(token: string): boolean
  
  // Clear token from storage
  clearToken(): void
  
  // Check if token is valid and not expired
  isTokenValid(): boolean
  
  // Refresh token if expiring soon
  refreshTokenIfNeeded(): string
}
```

### 2. Enhanced API Headers

```typescript
// src/config/api.ts
export const getSecureHeaders = (token?: string | null): Record<string, string> => {
  return {
    ...getAuthHeaders(token),
    ...getCsrfHeader(),
  };
};

export const getSecureJsonHeaders = (token?: string | null): Record<string, string> => {
  return {
    ...getSecureHeaders(token),
    'Content-Type': 'application/json',
  };
};
```

### 3. Secure API Client

```typescript
// Enhanced SecureApiClient with CSRF protection
export class SecureApiClient {
  async request(
    url: string, 
    options: RequestInit = {}, 
    requireAuth: boolean = true,
    requireCsrf: boolean = false
  ): Promise<Response> {
    // Add CSRF token for state-changing operations
    if (requireCsrf) {
      const csrfHeaders = getCsrfHeader();
      Object.entries(csrfHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }
    
    // Validate CSRF token from response
    if (requireCsrf && !validateCsrfResponse(response)) {
      throw new Error('CSRF validation failed');
    }
  }
  
  // Convenience methods with CSRF protection
  async post(url: string, data?: any, requireAuth: boolean = true, requireCsrf: boolean = true)
  async put(url: string, data?: any, requireAuth: boolean = true, requireCsrf: boolean = true)
  async delete(url: string, requireAuth: boolean = true, requireCsrf: boolean = true)
}
```

## Backend Requirements

### Required Headers

The backend must validate CSRF tokens in the following headers:
- `X-CSRF-Token`: CSRF token for state-changing operations

### Response Headers

The backend should include CSRF tokens in responses:
- `X-CSRF-Token`: New CSRF token (optional, for token refresh)

### Validation Logic

```typescript
// Backend validation example
const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  const csrfToken = req.headers['x-csrf-token'];
  const storedToken = req.session.csrfToken;
  
  if (!csrfToken || !storedToken || csrfToken !== storedToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  
  next();
};
```

## Usage Examples

### 1. Making Secure API Calls

```typescript
// Using secure headers directly
import { getSecureJsonHeaders } from '../config/api';

const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: getSecureJsonHeaders(token),
  body: JSON.stringify(invoiceData)
});
```

### 2. Using Secure API Client

```typescript
// Using SecureApiClient with automatic CSRF protection
import { secureApiClient } from '../config/api';

// CSRF protection enabled by default for state-changing operations
const response = await secureApiClient.post('/api/invoices', invoiceData);
const response = await secureApiClient.put('/api/invoices/123', updatedData);
const response = await secureApiClient.delete('/api/invoices/123');
```

### 3. Manual CSRF Token Management

```typescript
import { csrfManager } from '../utils/csrf';

// Generate new token
const token = csrfManager.generateToken();

// Get current token
const currentToken = csrfManager.getToken();

// Validate token
const isValid = csrfManager.validateToken(token);

// Clear token
csrfManager.clearToken();
```

## Security Benefits

### 1. CSRF Attack Prevention
- **Token Validation**: All state-changing operations require valid CSRF tokens
- **Session Binding**: Tokens are bound to user sessions
- **Expiration**: Tokens expire after 24 hours for security

### 2. XSS Protection Enhancement
- **Session Storage**: CSRF tokens stored in sessionStorage (cleared when tab closes)
- **Token Isolation**: Tokens are not accessible to other tabs/windows
- **Automatic Cleanup**: Tokens are cleared on logout

### 3. Token Management
- **Automatic Generation**: New tokens generated when needed
- **Expiration Handling**: Tokens refreshed before expiration
- **Validation**: Server-side validation of all tokens

## Migration Guide

### 1. Update API Calls

**Before:**
```typescript
const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: getJsonHeaders(token),
  body: JSON.stringify(data)
});
```

**After:**
```typescript
const response = await fetch('/api/invoices', {
  method: 'POST',
  headers: getSecureJsonHeaders(token),
  body: JSON.stringify(data)
});
```

### 2. Update Components

**Before:**
```typescript
import { getAuthHeaders, getJsonHeaders } from '../config/api';
```

**After:**
```typescript
import { getAuthHeaders, getJsonHeaders, getSecureHeaders, getSecureJsonHeaders } from '../config/api';
```

### 3. Backend Integration

The backend must:
1. Generate CSRF tokens on login
2. Validate CSRF tokens for state-changing operations
3. Include CSRF tokens in responses (optional)
4. Handle CSRF validation failures gracefully

## Testing Checklist

### Manual Testing
- [ ] CSRF tokens are generated on login
- [ ] State-changing operations require valid CSRF tokens
- [ ] Invalid CSRF tokens are rejected
- [ ] CSRF tokens expire after 24 hours
- [ ] CSRF tokens are cleared on logout
- [ ] CSRF tokens are refreshed automatically

### Automated Testing
```typescript
describe('CSRF Protection', () => {
  test('should require CSRF token for POST requests', async () => {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: getJsonHeaders(token), // Missing CSRF
      body: JSON.stringify(data)
    });
    expect(response.status).toBe(403);
  });
  
  test('should accept valid CSRF token', async () => {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: getSecureJsonHeaders(token), // Includes CSRF
      body: JSON.stringify(data)
    });
    expect(response.status).toBe(200);
  });
});
```

## Troubleshooting

### Common Issues

1. **CSRF Token Missing**
   - Ensure `getSecureHeaders()` or `getSecureJsonHeaders()` is used
   - Check that CSRF tokens are being generated on login

2. **CSRF Validation Failed**
   - Verify backend is validating CSRF tokens correctly
   - Check token expiration and refresh logic

3. **Backward Compatibility**
   - Endpoints without CSRF protection will continue to work
   - CSRF validation is optional and can be disabled

### Debug Information

```typescript
// Enable CSRF debugging
const debugCsrf = () => {
  console.log('CSRF Token:', csrfManager.getToken());
  console.log('Token Valid:', csrfManager.isTokenValid());
  console.log('Token Expiry:', sessionStorage.getItem('csrf_expiry'));
};
```

## Future Enhancements

### 1. Advanced CSRF Protection
- **Double Submit Cookie**: Additional cookie-based validation
- **Synchronizer Token**: Server-side token synchronization
- **Custom Headers**: Additional security headers

### 2. Token Rotation
- **Automatic Rotation**: Regular token rotation for enhanced security
- **Graceful Transition**: Smooth transition between old and new tokens
- **Audit Trail**: Logging of token usage and validation

### 3. Enhanced Validation
- **Origin Validation**: Check request origin against allowed domains
- **Referer Validation**: Validate HTTP referer headers
- **Custom Validation**: Application-specific validation rules

## Conclusion

The CSRF protection implementation provides comprehensive security for state-changing operations while maintaining backward compatibility and user experience. The system automatically handles token generation, validation, and refresh, ensuring robust protection against CSRF attacks. 