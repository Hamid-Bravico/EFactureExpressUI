import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DashboardPeriod, 
  DashboardSummaryData 
} from '../types/dashboard.types';
import { dashboardEndpoints } from '../api/dashboard.endpoints';
import AlertBanners from './AlertBanners';
import KpiCards from './KpiCards';
import AgedReceivables from './AgedReceivables';
import UrgentActions from './UrgentActions';
import TopDebtorsTable from './TopDebtorsTable';
import MonthlyRevenueChart from './MonthlyRevenueChart';
import { Company } from '../../../types/common';
import { UserRole } from '../../../utils/shared.permissions';

interface DashboardProps {
  company: Company | null;
  userRole?: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ company, userRole }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('this_month');

  const isClerk = userRole === 'Clerk';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardEndpoints.getSummary(selectedPeriod);
      
      if (response.succeeded) {
        setData(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">{t('dashboard.loading.title')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.loading.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.error.title')}</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            {t('dashboard.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.header.title')}</h1>
              <p className="text-sm text-gray-500">{t('dashboard.header.subtitle')}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{t('dashboard.header.period')}</span>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as DashboardPeriod)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[140px]"
              >
                <option value="this_week">{t('dashboard.periods.thisWeek')}</option>
                <option value="this_month">{t('dashboard.periods.thisMonth')}</option>
                <option value="last_month">{t('dashboard.periods.lastMonth')}</option>
                <option value="this_quarter">{t('dashboard.periods.thisQuarter')}</option>
                <option value="this_year">{t('dashboard.periods.thisYear')}</option>
                <option value="last_30_days">{t('dashboard.periods.last30Days')}</option>
                <option value="last_90_days">{t('dashboard.periods.last90Days')}</option>
              </select>
              <button
                onClick={fetchDashboardData}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t('dashboard.header.refresh')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Alert Banners - Always visible */}
          <AlertBanners alerts={data.alerts} />

          {/* Awaiting DGI Indicator - Only visible for Clerk users */}
          {isClerk && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.sections.awaitingDgi')}</h2>
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {data.kpiCards?.awaitingDgi?.label || t('dashboard.kpiCards.awaitingDgi')}
                    </div>
                    <div className="text-3xl font-bold text-yellow-600 mt-1">
                      {data.kpiCards?.awaitingDgi?.count || 0}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t('dashboard.kpiCards.invoices')}
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards Section - Hidden for Clerk users */}
          {!isClerk && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.sections.keyIndicators')}</h2>
              <KpiCards kpiCards={data.kpiCards} period={data.period} />
            </div>
          )}

          {/* Aged Receivables Section - Hidden for Clerk users */}
          {!isClerk && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.sections.receivablesAnalysis')}</h2>
              <AgedReceivables agedReceivables={data.agedReceivables} period={data.period} />
            </div>
          )}

          {/* Two-Column Layout - Conditional based on role */}
          {!isClerk ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <UrgentActions actions={data.urgentActions} />
              <MonthlyRevenueChart chartData={data.monthlyRevenueChart} />
            </div>
          ) : (
            /* For Clerk: Only Urgent Actions in full width */
            <div>
              <UrgentActions actions={data.urgentActions} />
            </div>
          )}

          {/* Top Debtors Table - Always visible */}
          <TopDebtorsTable debtors={data.topDebtors} company={company} />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;