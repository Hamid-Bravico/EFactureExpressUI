import { API_BASE_URL } from '../../../config/constants';

export const CUSTOMER_ENDPOINTS = {
  LIST: `${API_BASE_URL}/customers`,
  CREATE: `${API_BASE_URL}/customers`,
  UPDATE: (id: number) => `${API_BASE_URL}/customers/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/customers/${id}`,
};