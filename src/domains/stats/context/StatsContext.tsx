import React, { createContext, useContext, ReactNode } from 'react';
import { useStats } from '../hooks/useStats';
import { NavbarStats, SidebarCounts, OverdueStats, StatsPeriod } from '../types/stats.types';

interface StatsContextType {
  stats: {
    navbarStats: NavbarStats | null;
    overdueStats: OverdueStats | null;
    sidebarCounts: SidebarCounts | null;
    selectedPeriod: StatsPeriod;
    loading: {
      navbar: boolean;
      overdue: boolean;
      sidebar: boolean;
    };
    error: {
      navbar: string | null;
      overdue: string | null;
      sidebar: string | null;
    };
  };
  fetchNavbarStats: (period: 'today' | 'week' | 'month') => Promise<void>;
  fetchOverdueStats: () => Promise<void>;
  fetchSidebarCounts: () => Promise<void>;
  fetchAllStats: (period?: 'today' | 'week' | 'month') => Promise<void>;
  updateNavbarStats: (navbarStats: NavbarStats) => void;
  updateOverdueStats: (overdueStats: OverdueStats) => void;
  updateSidebarCounts: (sidebarCounts: SidebarCounts) => void;
  // targeted helpers
  incrementSidebarCount: (key: keyof SidebarCounts, delta: number) => void;
  refreshSidebarCountsSilently: () => Promise<void>;
  refreshRevenueIfInPeriod: (isoDate: string) => Promise<void>;
  refreshOverdueSilently: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

interface StatsProviderProps {
  children: ReactNode;
  token: string | null;
  userRole: string;
}

export const StatsProvider: React.FC<StatsProviderProps> = ({ children, token, userRole }) => {
  const statsData = useStats(token, userRole);

  return (
    <StatsContext.Provider value={statsData}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStatsContext = () => {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStatsContext must be used within a StatsProvider');
  }
  return context;
};
