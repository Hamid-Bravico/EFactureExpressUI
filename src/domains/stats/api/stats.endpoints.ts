import { API_BASE_URL } from '../../../config/constants';

export const STATS_ENDPOINTS = {
  NAVBAR: (period: 'today' | 'week' | 'month') => `${API_BASE_URL}/stats/navbar?period=${period}`,
  OVERDUE: `${API_BASE_URL}/stats/overdue`,
  SIDEBAR_COUNTS: `${API_BASE_URL}/stats/sidebar-counts`,
};
