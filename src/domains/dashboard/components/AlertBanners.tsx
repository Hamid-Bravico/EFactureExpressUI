import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardAlerts } from '../types/dashboard.types';

interface AlertBannersProps {
  alerts: DashboardAlerts;
}

const AlertBanners: React.FC<AlertBannersProps> = ({ alerts }) => {
  const { t } = useTranslation();
  // Add null check for alerts
  if (!alerts) {
    return null;
  }

  const alertItems = [
    {
      condition: alerts.dgiRejectedCount > 0,
      type: 'error',
      icon: '⚠',
      message: t('dashboard.alertBanners.dgiRejected', { count: alerts.dgiRejectedCount }),
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      textColor: 'text-red-800'
    },
    {
      condition: alerts.overdueClients60PlusDays > 0,
      type: 'warning',
      icon: '⚠',
      message: t('dashboard.alertBanners.overdueClients', { count: alerts.overdueClients60PlusDays }),
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-800'
    },
    {
      condition: alerts.vatDeclarationDueDays > 0,
      type: 'info',
      icon: '⚠',
      message: t('dashboard.alertBanners.vatDeclarationDue', { count: alerts.vatDeclarationDueDays }),
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800'
    }
  ];

  const visibleAlerts = alertItems.filter(alert => alert.condition);

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-8">
        {visibleAlerts.map((alert, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-red-600 text-xl font-bold">⚠</span>
            <span className="text-gray-900 text-sm font-semibold">{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertBanners;
