import { API_BASE_URL } from '../../../config/constants';
import { secureApiClient } from '../../../config/api';
import { DashboardPeriod, DashboardSummaryResponse } from '../types/dashboard.types';

export const dashboardEndpoints = {
  // Get dashboard summary with optional period filter
  getSummary: async (period?: DashboardPeriod): Promise<DashboardSummaryResponse> => {
    const url = new URL(`${API_BASE_URL}/dashboard/summary`);
    
    if (period) {
      url.searchParams.append('period', period);
    }

    const response = await secureApiClient.get(url.toString());

    if (!response.ok) {
      throw new Error(`Dashboard API error: ${response.status}`);
    }

    return response.json();
  },
};
