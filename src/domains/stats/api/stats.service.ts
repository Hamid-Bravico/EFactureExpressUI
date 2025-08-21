import { secureApiClient } from '../../../config/api';
import { STATS_ENDPOINTS } from './stats.endpoints';
import { NavbarStats, SidebarCounts, OverdueStats } from '../types/stats.types';
import { ApiResponse } from '../../auth/types/auth.types';

export const statsService = {
  async fetchNavbarStats(period: 'today' | 'week' | 'month'): Promise<NavbarStats> {
    const response = await secureApiClient.get(STATS_ENDPOINTS.NAVBAR(period));
    const responseData: ApiResponse<NavbarStats> = await response.json();
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch navbar stats';
      throw new Error(errorMessage);
    }
    
    return responseData.data!;
  },

  async fetchOverdueStats(): Promise<OverdueStats> {
    // Since the backend doesn't have a separate overdue endpoint yet,
    // we'll fetch navbar stats and extract the overdue data
    const navbarStats = await this.fetchNavbarStats('month');
    return {
      count: navbarStats.overdueStats.count,
      totalAmount: navbarStats.overdueStats.totalAmount,
      lastUpdated: navbarStats.lastUpdated
    };
  },

  async fetchSidebarCounts(): Promise<SidebarCounts> {
    const response = await secureApiClient.get(STATS_ENDPOINTS.SIDEBAR_COUNTS);
    const responseData: ApiResponse<SidebarCounts> = await response.json();

    console.log(responseData);
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch sidebar counts';
      throw new Error(errorMessage);
    }
    
    return responseData.data!;
  },

  async fetchAllStats(period: 'today' | 'week' | 'month' = 'month'): Promise<{
    navbarStats: NavbarStats;
    overdueStats: OverdueStats;
    sidebarCounts: SidebarCounts;
  }> {
    const [navbarStats, sidebarCounts] = await Promise.all([
      this.fetchNavbarStats(period),
      this.fetchSidebarCounts()
    ]);

    // Extract overdue stats from navbar stats
    const overdueStats: OverdueStats = {
      count: navbarStats.overdueStats.count,
      totalAmount: navbarStats.overdueStats.totalAmount,
      lastUpdated: navbarStats.lastUpdated
    };

    return { navbarStats, overdueStats, sidebarCounts };
  }
};
