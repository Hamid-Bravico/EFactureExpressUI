import { API_BASE_URL } from '../../../config/api';

export const QUOTE_ENDPOINTS = {
  LIST: `${API_BASE_URL}/catalog`,
  CREATE: `${API_BASE_URL}/catalog`,
  UPDATE: (id: number) => `${API_BASE_URL}/catalog/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/catalog/${id}`,
  IMPORT_CSV: `${API_BASE_URL}/catalog/import-csv`,
  BULK_DELETE: `${API_BASE_URL}/catalog/bulk-delete`
};