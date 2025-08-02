// Dashboard-specific aggregated data types
// These types define the shape of data that Dashboard needs without importing from other domains

export interface DashboardInvoiceData {
  id: number;
  invoiceNumber: string;
  date: string;
  customerName: string;
  total: number;
  status: number;
  createdBy: string;
}

export interface DashboardQuoteData {
  id: number;
  quoteNumber: string;
  issueDate: string;
  customerName: string;
  total: number;
  status: string;
  createdBy: string;
}

export interface DashboardCustomerData {
  id: number;
  name: string;
  email?: string;
  phoneNumber?: string;
}

export interface DashboardUserData {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface DashboardStats {
  totalInvoices: number;
  totalQuotes: number;
  totalCustomers: number;
  totalUsers: number;
  recentInvoices: DashboardInvoiceData[];
  recentQuotes: DashboardQuoteData[];
}