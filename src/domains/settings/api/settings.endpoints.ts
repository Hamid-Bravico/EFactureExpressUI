import { API_BASE_URL } from '../../../config/constants';

export const SETTINGS_ENDPOINTS = {
  BASE: `${API_BASE_URL}/settings`,
  BY_KEY: (key: string) => `${API_BASE_URL}/settings/${encodeURIComponent(key)}`,
};


