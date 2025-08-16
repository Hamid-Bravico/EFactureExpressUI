import { API_BASE_URL } from '../../../config/constants';

export const NOTIFICATION_ENDPOINTS = {
  LIST: (params: string) => `${API_BASE_URL}/notifications${params ? `?${params}` : ''}`,
  COUNTS: `${API_BASE_URL}/notifications/counts`,
  MARK_READ: (id: number) => `${API_BASE_URL}/notifications/${id}/mark-read`,
  MARK_ALL_READ: `${API_BASE_URL}/notifications/mark-all-read`,
};
