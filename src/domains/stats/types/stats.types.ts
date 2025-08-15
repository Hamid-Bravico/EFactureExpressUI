export type StatsPeriod = 'today' | 'week' | 'month';

export interface NavbarStats {
  period: string;
  periodType: StatsPeriod;
  periodRevenue: number;
  overdueStats: {
    count: number;
    totalAmount: number;
  };
  lastUpdated: string;
}

export interface OverdueStats {
  count: number;
  totalAmount: number;
  lastUpdated: string;
}

export interface SidebarCounts {
  customersCount: number;
  invoicesCount: number;
  quotesCount: number;
  creditNotesCount: number;
  lastUpdated: string;
}

export interface StatsState {
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
}
