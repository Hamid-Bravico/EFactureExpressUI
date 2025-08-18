import { useState, useCallback, useEffect } from 'react';
import { statsService } from '../api/stats.service';
import { NavbarStats, SidebarCounts, OverdueStats, StatsState, StatsPeriod } from '../types/stats.types';
import { toast } from 'react-hot-toast';
import { isDateWithinSelectedPeriod } from '../utils/stats.utils';
import { useTranslation } from 'react-i18next';

export const useStats = (token: string | null, userRole: string) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsState>({
    navbarStats: null,
    overdueStats: null,
    sidebarCounts: null,
    selectedPeriod: 'month',
    loading: {
      navbar: false,
      overdue: false,
      sidebar: false
    },
    error: {
      navbar: null,
      overdue: null,
      sidebar: null
    }
  });

  const fetchNavbarStats = useCallback(async (period: StatsPeriod = 'month') => {
    if (!token || userRole === 'Clerk') return;
    
    setStats(prev => ({
      ...prev,
      loading: { ...prev.loading, navbar: true },
      error: { ...prev.error, navbar: null },
      selectedPeriod: period
    }));

    try {
      const navbarStats = await statsService.fetchNavbarStats(period);
      setStats(prev => ({
        ...prev,
        navbarStats,
        loading: { ...prev.loading, navbar: false }
      }));
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Failed to fetch navbar stats';
      
      // Handle browser's "Failed to fetch" error
      if (errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError');
      }
      
      setStats(prev => ({
        ...prev,
        loading: { ...prev.loading, navbar: false },
        error: { ...prev.error, navbar: errorMessage }
      }));
      // Don't show toast for automatic stats fetching - only show error in state
    }
  }, [token, userRole]);

  const fetchOverdueStats = useCallback(async () => {
    if (!token) return;
    
    setStats(prev => ({
      ...prev,
      loading: { ...prev.loading, overdue: true },
      error: { ...prev.error, overdue: null }
    }));

    try {
      const overdueStats = await statsService.fetchOverdueStats();
      setStats(prev => ({
        ...prev,
        overdueStats,
        loading: { ...prev.loading, overdue: false }
      }));
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Failed to fetch overdue stats';
      
      // Handle browser's "Failed to fetch" error
      if (errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError');
      }
      
      setStats(prev => ({
        ...prev,
        loading: { ...prev.loading, overdue: false },
        error: { ...prev.error, overdue: errorMessage }
      }));
      // Don't show toast for automatic stats fetching - only show error in state
    }
  }, [token]);

  const fetchSidebarCounts = useCallback(async () => {
    if (!token) return;
    
    setStats(prev => ({
      ...prev,
      loading: { ...prev.loading, sidebar: true },
      error: { ...prev.error, sidebar: null }
    }));

    try {
      const sidebarCounts = await statsService.fetchSidebarCounts();
      setStats(prev => ({
        ...prev,
        sidebarCounts,
        loading: { ...prev.loading, sidebar: false }
      }));
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Failed to fetch sidebar counts';
      
      // Handle browser's "Failed to fetch" error
      if (errorMessage === 'Failed to fetch') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setStats(prev => ({
        ...prev,
        loading: { ...prev.loading, sidebar: false },
        error: { ...prev.error, sidebar: errorMessage }
      }));
      // Don't show toast for automatic stats fetching - only show error in state
    }
  }, [token]);

  const fetchAllStats = useCallback(async (period: StatsPeriod = 'month') => {
    if (!token) return;
    
    // For Clerk users, only fetch sidebar counts
    if (userRole === 'Clerk') {
      setStats(prev => ({
        ...prev,
        loading: { navbar: false, overdue: false, sidebar: true },
        error: { navbar: null, overdue: null, sidebar: null },
        selectedPeriod: period
      }));

      try {
        const sidebarCounts = await statsService.fetchSidebarCounts();
        setStats(prev => ({
          ...prev,
          sidebarCounts,
          loading: { navbar: false, overdue: false, sidebar: false }
        }));
      } catch (error) {
        let errorMessage = error instanceof Error ? error.message : 'Failed to fetch sidebar counts';
        
        // Handle browser's "Failed to fetch" error
        if (errorMessage === 'Failed to fetch') {
          errorMessage = t('errors.networkError');
        }
        
        setStats(prev => ({
          ...prev,
          loading: { navbar: false, overdue: false, sidebar: false },
          error: { navbar: null, overdue: null, sidebar: errorMessage }
        }));
        // Don't show toast for automatic stats fetching - only show error in state
      }
      return;
    }
    
    setStats(prev => ({
      ...prev,
      loading: { navbar: true, overdue: true, sidebar: true },
      error: { navbar: null, overdue: null, sidebar: null },
      selectedPeriod: period
    }));

    try {
      const { navbarStats, overdueStats, sidebarCounts } = await statsService.fetchAllStats(period);
      setStats(prev => ({
        ...prev,
        navbarStats,
        overdueStats,
        sidebarCounts,
        loading: { navbar: false, overdue: false, sidebar: false }
      }));
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
      
      // Handle browser's "Failed to fetch" error
      if (errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError');
      }
      
      setStats(prev => ({
        ...prev,
        loading: { navbar: false, overdue: false, sidebar: false },
        error: { navbar: errorMessage, overdue: errorMessage, sidebar: errorMessage }
      }));
      // Don't show toast for automatic stats fetching - only show error in state
    }
  }, [token, userRole]);

  const updateNavbarStats = useCallback((navbarStats: NavbarStats) => {
    setStats(prev => ({
      ...prev,
      navbarStats
    }));
  }, []);

  const updateOverdueStats = useCallback((overdueStats: OverdueStats) => {
    setStats(prev => ({
      ...prev,
      overdueStats
    }));
  }, []);

  const updateSidebarCounts = useCallback((sidebarCounts: SidebarCounts) => {
    setStats(prev => ({
      ...prev,
      sidebarCounts
    }));
  }, []);

  useEffect(() => {
    if (token) {
      fetchAllStats();
    }
  }, [token, fetchAllStats]);

  // Targeted updates after user actions
  const incrementSidebarCount = useCallback((key: keyof SidebarCounts, delta: number) => {
    setStats(prev => ({
      ...prev,
      sidebarCounts: prev.sidebarCounts
        ? { ...prev.sidebarCounts, [key]: Math.max(0, (prev.sidebarCounts[key] as number) + delta) }
        : prev.sidebarCounts
    }));
  }, []);

  const refreshSidebarCountsSilently = useCallback(async () => {
    if (!token) return;
    try {
      setStats(prev => ({ ...prev, loading: { ...prev.loading, sidebar: true } }));
      const counts = await statsService.fetchSidebarCounts();
      setStats(prev => ({ ...prev, sidebarCounts: counts, loading: { ...prev.loading, sidebar: false } }));
    } catch {
      setStats(prev => ({ ...prev, loading: { ...prev.loading, sidebar: false } }));
    }
  }, [token]);

  const refreshRevenueIfInPeriod = useCallback(async (isoDate: string) => {
    if (!token || userRole === 'Clerk') return;
    const period = stats.selectedPeriod;
    if (isDateWithinSelectedPeriod(isoDate, period)) {
      await fetchNavbarStats(period);
    }
  }, [token, userRole, stats.selectedPeriod, fetchNavbarStats]);

  const refreshOverdueSilently = useCallback(async () => {
    if (!token) return;
    try {
      setStats(prev => ({ ...prev, loading: { ...prev.loading, overdue: true } }));
      const o = await statsService.fetchOverdueStats();
      setStats(prev => ({ ...prev, overdueStats: o, loading: { ...prev.loading, overdue: false } }));
    } catch {
      setStats(prev => ({ ...prev, loading: { ...prev.loading, overdue: false } }));
    }
  }, [token]);

  return {
    stats,
    fetchNavbarStats,
    fetchOverdueStats,
    fetchSidebarCounts,
    fetchAllStats,
    updateNavbarStats,
    updateOverdueStats,
    updateSidebarCounts,
    // targeted helpers
    incrementSidebarCount,
    refreshSidebarCountsSilently,
    refreshRevenueIfInPeriod,
    refreshOverdueSilently
  };
};
