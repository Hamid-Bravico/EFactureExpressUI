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

export const getJsonHeaders = (token?: string | null): Record<string, string> => {
  return {
    ...getAuthHeaders(token),
    'Content-Type': 'application/json',
  };
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
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