import { useState, useCallback } from "react";
import { Company } from "../../../types/common";
import { tokenManager } from "../../../utils/tokenManager";
import { decodeJWT } from "../../../utils/jwt";
import { AUTH_ENDPOINTS } from "../api/auth.endpoints";
import { getJsonHeaders, getSecureHeaders } from "../../../config/api";
import { useTranslation } from 'react-i18next';

export function useAuthHandlers() {
  const { t } = useTranslation();

  // ─── AUTH STATE ───────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = tokenManager.getToken();
    return storedToken || null;
  });

  const [company, setCompany] = useState<Company | null>(() => {
    const storedCompany = tokenManager.getCompanyData();
    return storedCompany;
  });

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: getJsonHeaders(),
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const responseData = await response.json();
      if (!responseData.succeeded) {
        const errorMessage = responseData.errors?.join(', ') || responseData.message || t('errors.invalidCredentials');
        throw new Error(errorMessage);
      }
      if (!responseData.data) {
        throw new Error(t('errors.invalidResponse'));
      }
      const data = responseData.data;
      if (!data.token) {
        throw new Error(t('errors.invalidResponse'));
      }
      const decoded = decodeJWT(data.token);
      if (!decoded) {
        throw new Error(t('errors.invalidResponse'));
      }
      if (!decoded.role) {
        throw new Error(t('errors.invalidRole'));
      }
      if (!decoded.userId) {
        throw new Error(t('errors.invalidUserId'));
      }
      tokenManager.setToken(data.token);
      tokenManager.setUserData(decoded.role, decoded.userId, data.companyDetails);
      if (data.companyDetails) {
        setCompany(data.companyDetails);
      }
      setToken(data.token);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(t('errors.failedToFetch'));
      }
      throw error;
    }
  }, [t]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch(AUTH_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: getSecureHeaders(token),
        credentials: 'include',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout request failed:', error);
      }
      tokenManager.clearAuthData();
      setToken(null);
      setCompany(null);
    }
  }, [token]);

  return {
    token,
    setToken,
    company,
    setCompany,
    handleLogin,
    handleLogout,
  };
}
