import { API_BASE_URL } from '../../../config/api';

export const USER_ENDPOINTS = {
  LIST: `${API_BASE_URL}/users`,
  CREATE: `${API_BASE_URL}/users`,
  UPDATE: (id: string) => `${API_BASE_URL}/users/${id}`,
  DELETE: (id: string) => `${API_BASE_URL}/users/${id}`,
};