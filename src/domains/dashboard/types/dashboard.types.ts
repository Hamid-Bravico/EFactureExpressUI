export type DashboardPeriod = 
  | "this_week" 
  | "this_month" 
  | "last_month" 
  | "this_quarter" 
  | "this_year" 
  | "last_30_days" 
  | "last_90_days";

export interface DashboardPeriodInfo {
  display: string;
  startDate: string;
  endDate: string;
}

export interface DashboardAlerts {
  dgiRejectedCount: number;
  overdueClients60PlusDays: number;
  vatDeclarationDueDays: number;
}

export interface DashboardKpiCard {
  amount?: number;
  count?: number;
  dueDate?: string;
  label: string;
}

export interface DashboardKpiCards {
  revenue: DashboardKpiCard;
  unpaid: DashboardKpiCard;
  awaitingDgi: DashboardKpiCard;
  vatToPay: DashboardKpiCard;
  collected: DashboardKpiCard;
}

export interface DashboardAgedBucket {
  amount: number;
  invoiceCount: number;
}

export interface DashboardAgedReceivables {
  days0_30: DashboardAgedBucket;
  days31_60: DashboardAgedBucket;
  days_Over_60: DashboardAgedBucket;
  collectionRate: number;
}

export type UrgentActionType = "DGI_REJECTION" | "LATE_PAYMENT" | "OLD_DRAFT";
export type ActionSeverity = "error" | "warning" | "info";

export interface DashboardUrgentAction {
  id: string;
  type: UrgentActionType;
  severity: ActionSeverity;
  description: string;
  amount?: number;
}

export type DebtorStatus = "critical" | "warning" | "attention" | "normal";

export interface DashboardTopDebtor {
  customerId: number;
  customerName: string;
  amountDue: number;
  daysLate: number;
  status: DebtorStatus;
}

export interface DashboardChartDataPoint {
  month: string;
  revenue: number;
  collected: number;
}

export interface DashboardMonthlyRevenueChart {
  currency: string;
  series: DashboardChartDataPoint[];
}

export interface DashboardSummaryData {
  period: DashboardPeriodInfo;
  alerts: DashboardAlerts;
  kpiCards: DashboardKpiCards;
  agedReceivables: DashboardAgedReceivables;
  urgentActions: DashboardUrgentAction[];
  topDebtors: DashboardTopDebtor[];
  monthlyRevenueChart: DashboardMonthlyRevenueChart;
}

export interface DashboardSummaryResponse {
  succeeded: boolean;
  message: string;
  data: DashboardSummaryData;
}