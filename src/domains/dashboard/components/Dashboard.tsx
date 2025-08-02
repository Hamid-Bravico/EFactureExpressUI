import React, { useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardInvoiceData, DashboardQuoteData, DashboardStats } from '../types/dashboard.types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface LocalDashboardStats extends DashboardStats {
  monthlyStats: { [monthName: string]: { count: number; amount: number; } };
  topCustomers: Array<{ customerName: string; count: number; amount: number; }>;
  statusDistribution: {
    totalInvoices: number;
    draft: { count: number; amount: number; percentage: number };
    ready: { count: number; amount: number; percentage: number };
    awaitingClearance: { count: number; amount: number; percentage: number };
    validated: { count: number; amount: number; percentage: number };
    rejected: { count: number; amount: number; percentage: number };
  };
}

interface DashboardProps {
  stats: LocalDashboardStats | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

// Fade-in animation utility
const useFadeIn = () => {
  useEffect(() => {
    const element = document.querySelector('.animate-fade-in');
    if (element) {
      (element as HTMLElement).classList.add('animate-fade-in');
    }
  }, []);
};

const Dashboard: React.FC<DashboardProps> = React.memo(({ 
  stats, 
  loading, 
  onRefresh
}) => {
  const { t, i18n } = useTranslation();

  // Format currency based on current language
  const formatCurrency = useCallback((amount: number) => {
    if (i18n.language === 'fr') {
      // French format: 1 234,56 MAD
      return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + ' MAD';
    } else {
      // English format: MAD 1,234.56
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
  }, [i18n.language]);

  // Prepare data for monthly line chart with useMemo
  const monthlyChartData = useMemo(() => {
    if (!stats) return { labels: [], datasets: [] };
    
    return {
      labels: Object.keys(stats.monthlyStats),
      datasets: [
        {
          label: t('dashboard.monthlyAmount'),
          data: Object.values(stats.monthlyStats).map(monthStats => monthStats.amount),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.4,
        },
      ],
    };
  }, [stats, t]);

  // Prepare data for status pie chart
  const statusData = {
    labels: stats ? [
      `${t('invoice.status.draft')} (${stats.statusDistribution.draft.percentage.toFixed(1)}%)`,
      `${t('invoice.status.ready')} (${stats.statusDistribution.ready.percentage.toFixed(1)}%)`,
      `${t('invoice.status.awaitingClearance')} (${stats.statusDistribution.awaitingClearance.percentage.toFixed(1)}%)`,
      `${t('invoice.status.validated')} (${stats.statusDistribution.validated.percentage.toFixed(1)}%)`,
      `${t('invoice.status.rejected')} (${stats.statusDistribution.rejected.percentage.toFixed(1)}%)`,
    ] : [],
    datasets: [
      {
        data: stats ? [
          stats.statusDistribution.draft.count,
          stats.statusDistribution.ready.count,
          stats.statusDistribution.awaitingClearance.count,
          stats.statusDistribution.validated.count,
          stats.statusDistribution.rejected.count
        ] : [],
        backgroundColor: [
          'rgba(156, 163, 175, 0.8)',  // gray for draft
          'rgba(59, 130, 246, 0.8)',   // blue for ready
          'rgba(234, 179, 8, 0.8)',    // yellow for awaiting clearance
          'rgba(34, 197, 94, 0.8)',    // green for validated
          'rgba(239, 68, 68, 0.8)',    // red for rejected
        ],
        borderColor: [
          'rgb(156, 163, 175)',
          'rgb(59, 130, 246)',
          'rgb(234, 179, 8)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for top customers bar chart
  const topCustomersChartData = {
    labels: stats ? stats.topCustomers.map(customer => customer.customerName) : [],
    datasets: [
      {
        label: t('dashboard.customerAmount'),
        data: stats ? stats.topCustomers.map(customer => customer.amount) : [],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  };

  // Chart options with correct formatting and percentage logic
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          title: () => [],
          label: function(context: any) {
            const dataset = context.dataset;
            const value = context.raw || 0;
            const dataSum = dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percent = dataSum > 0 ? ((value / dataSum) * 100).toFixed(1) : '0.0';
            // Only show: Label: value (percent%)
            return `${context.label.split(' (')[0]}: ${value} (${percent}%)`;
          }
        }
      }
    },
  };

  // Custom number formatter for y-axis
  const formatYAxisNumber = (value: number) => {
    return value.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US').replace(/\s/g, '\u2009');
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw || 0;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(tickValue: string | number) {
            return formatYAxisNumber(Number(tickValue));
          },
        },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw || 0;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(tickValue: string | number) {
            return formatYAxisNumber(Number(tickValue));
          },
        },
      },
    },
  };

  // Apply fade-in class to status cards
  useFadeIn();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Early return if no stats available
  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (stats.statusDistribution.totalInvoices === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg p-8 max-w-md mx-auto shadow-sm border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('dashboard.noInvoices')}</h3>
          <p className="text-gray-500 mb-6">{t('dashboard.getStarted')}</p>
          <Link
            to="/invoices"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            {t('common.createInvoice')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('dashboard.welcome')}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('common.refresh')}
        </button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {[{
          label: t('invoice.status.draft'),
          value: stats.statusDistribution.draft.count,
          amount: formatCurrency(stats.statusDistribution.draft.amount),
          icon: (
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          ),
          bg: 'bg-gray-50',
          text: 'text-gray-500',
          tooltip: t('invoice.status.draftDescription')
        }, {
          label: t('invoice.status.ready'),
          value: stats.statusDistribution.ready.count,
          amount: formatCurrency(stats.statusDistribution.ready.amount),
          icon: (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          bg: 'bg-blue-50',
          text: 'text-blue-500',
          tooltip: t('invoice.status.readyDescription')
        }, {
          label: t('invoice.status.awaitingClearance'),
          value: stats.statusDistribution.awaitingClearance.count,
          amount: formatCurrency(stats.statusDistribution.awaitingClearance.amount),
          icon: (
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-yellow-50',
          text: 'text-yellow-600',
          tooltip: t('invoice.status.awaitingClearanceDescription')
        }, {
          label: t('invoice.status.validated'),
          value: stats.statusDistribution.validated.count,
          amount: formatCurrency(stats.statusDistribution.validated.amount),
          icon: (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-green-50',
          text: 'text-green-600',
          tooltip: t('invoice.status.validatedDescription')
        }, {
          label: t('invoice.status.rejected'),
          value: stats.statusDistribution.rejected.count,
          amount: formatCurrency(stats.statusDistribution.rejected.amount),
          icon: (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-red-50',
          text: 'text-red-500',
          tooltip: t('invoice.status.rejectedDescription')
        }].map((card, idx) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow px-3 py-3 sm:px-4 sm:py-4 border border-gray-100 flex items-center space-x-2 sm:space-x-3 transition-transform duration-200 hover:scale-[1.035] hover:shadow-lg focus-within:scale-[1.035] animate-fade-in group relative"
            tabIndex={0}
            aria-label={card.label}
            title={card.tooltip}
            style={{ cursor: 'pointer', animationDelay: `${idx * 60}ms` }}
          >
            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${card.bg} relative group/icon`}>
              {card.icon}
              {/* Tooltip on hover/focus */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 hidden group-hover/icon:block group-focus/icon:block pointer-events-none">
                <div className="bg-black bg-opacity-80 text-xs text-white rounded px-2 py-1 shadow-lg whitespace-nowrap animate-fade-in" style={{fontWeight:400}}>{card.tooltip}</div>
              </div>
            </div>
            <div>
              <div className={`text-xs font-semibold ${card.text} mb-0.5`}>{card.label}</div>
              <div className="text-xl font-bold text-gray-900 leading-tight">{card.value}</div>
              <div className="text-xs text-gray-400">{card.amount}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Gradient divider */}
      <div className="h-1 w-full my-2 rounded-full bg-gradient-to-r from-blue-100 via-indigo-100 to-transparent opacity-70" />
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl shadow px-3 py-3 sm:px-4 sm:py-4 border border-gray-100 flex flex-col animate-fade-in" style={{animationDelay:'100ms'}}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.monthlyTrend')}</h2>
          </div>
          <div className="flex-1 min-h-[260px]">
            <Line options={lineChartOptions} data={monthlyChartData} />
          </div>
        </div>
        {/* Status Distribution Chart */}
        <div className="bg-white rounded-xl shadow px-3 py-3 sm:px-4 sm:py-4 border border-gray-100 flex flex-col animate-fade-in" style={{animationDelay:'160ms'}}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.statusDistribution')}</h2>
          </div>
          <div className="flex-1 min-h-[260px]">
            <Pie options={pieChartOptions} data={statusData} />
          </div>
        </div>
        {/* Top Customers Chart */}
        <div className="bg-white rounded-xl shadow px-3 py-3 sm:px-4 sm:py-4 border border-gray-100 flex flex-col animate-fade-in" style={{animationDelay:'220ms'}}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.topCustomersByAmount')}</h2>
          </div>
          <div className="flex-1 min-h-[260px]">
            <Bar options={barChartOptions} data={topCustomersChartData} />
          </div>
        </div>
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow px-3 py-3 sm:px-4 sm:py-4 border border-gray-100 flex flex-col animate-fade-in" style={{animationDelay:'280ms'}}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t('dashboard.recentInvoices')}</h2>
            <Link 
              to="/invoices" 
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              {t('dashboard.viewAll')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentInvoices.map((invoice, idx) => (
              <div key={invoice.id} className="flex items-center justify-between py-3 px-1 hover:bg-blue-50/40 transition-all duration-200 rounded cursor-pointer animate-fade-in" style={{animationDelay:`${320+idx*40}ms`}}>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {t('common.invoiceNumber')} {invoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(invoice.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(invoice.total)}
                  </p>
                  <p className="text-xs text-gray-400">{invoice.customerName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard; 