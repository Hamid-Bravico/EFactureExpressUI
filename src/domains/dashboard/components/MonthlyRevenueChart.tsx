import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DashboardMonthlyRevenueChart } from '../types/dashboard.types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyRevenueChartProps {
  chartData: DashboardMonthlyRevenueChart;
}

const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ chartData }) => {
  const { t, i18n } = useTranslation();
  // Add null check for chartData
  if (!chartData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.monthlyRevenue.title')}</h3>
        </div>
        <div className="p-12 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>{t('dashboard.monthlyRevenue.noData')}</p>
        </div>
      </div>
    );
  }

  const formatAmount = (value: number) => {
    return `${value.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} ${chartData.currency}`;
  };

  const data = {
    labels: chartData.series.map(item => item.month),
    datasets: [
      {
        label: t('dashboard.monthlyRevenue.revenue'),
        data: chartData.series.map(item => item.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: t('dashboard.monthlyRevenue.collected'),
        data: chartData.series.map(item => item.collected),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return formatAmount(context.raw);
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          borderColor: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: 'rgba(0, 0, 0, 0.6)',
          font: {
            size: 12,
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          borderColor: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: 'rgba(0, 0, 0, 0.6)',
          font: {
            size: 12,
          },
                     callback: function(tickValue: string | number) {
             const value = Number(tickValue);
             if (value >= 1000000) {
               return `${(value / 1000000).toFixed(1)}M`;
             } else if (value >= 1000) {
               return `${(value / 1000).toFixed(0)}K`;
             }
             return value.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
           },
        },
        beginAtZero: true,
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(59, 130, 246)',
      },
    },
  };

  if (!chartData.series || chartData.series.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.monthlyRevenue.title')}</h3>
        </div>
        <div className="p-12 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>{t('dashboard.monthlyRevenue.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-shadow duration-200">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.monthlyRevenue.title')}</h3>
        <span className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">{chartData.currency}</span>
      </div>
      <div className="pb-6 pl-6 pr-6 pt-0">
        <div className="h-56">
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export default MonthlyRevenueChart;
