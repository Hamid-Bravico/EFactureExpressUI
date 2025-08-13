import { useState, useCallback, useEffect } from "react";
import { DashboardFilters } from "../types/dashboard.types";
import { ApiResponse } from "../../auth/types/auth.types";
import { API_BASE_URL } from "../../../config/constants";
import { secureApiClient } from "../../../config/api";
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Dashboard from "./Dashboard";

interface DashboardManagementProps {
  token: string | null;
}

export default function DashboardManagement({ token }: DashboardManagementProps) {
  const { t } = useTranslation();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({});
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async (filters?: DashboardFilters) => {
    setDashboardLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
        if (filters.status !== undefined) queryParams.append('status', filters.status.toString());
      }
      const url = `${API_BASE_URL}/dashboard/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await secureApiClient.get(url);
      const responseData: ApiResponse<any> = await response.json().catch(() => ({ succeeded: false, message: 'Failed to parse response' }));
      if (!response.ok || !responseData?.succeeded) {
        const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch dashboard stats';
        throw new Error(errorMessage);
      }
      setDashboardStats(responseData.data || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Handle dashboard filter changes
  const handleDashboardFiltersChange = useCallback((filters: DashboardFilters) => {
    setDashboardFilters(filters);
    fetchDashboardStats(filters);
  }, [fetchDashboardStats]);

  useEffect(() => {
    if (token) {
      fetchDashboardStats();
    }
  }, [token, fetchDashboardStats]);

  return (
    <Dashboard
      stats={dashboardStats}
      loading={dashboardLoading}
      filters={dashboardFilters}
      onRefresh={() => fetchDashboardStats(dashboardFilters)}
      onFiltersChange={handleDashboardFiltersChange}
    />
  );
}
