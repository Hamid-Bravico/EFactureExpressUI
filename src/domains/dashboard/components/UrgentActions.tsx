import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardUrgentAction } from '../types/dashboard.types';

interface UrgentActionsProps {
  actions: DashboardUrgentAction[];
}

const UrgentActions: React.FC<UrgentActionsProps> = ({ actions }) => {
  const { t, i18n } = useTranslation();
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return {
          borderColor: 'border-l-red-500',
          bgColor: 'bg-red-50',
          dotColor: 'bg-red-500'
        };
      case 'warning':
        return {
          borderColor: 'border-l-orange-500',
          bgColor: 'bg-orange-50',
          dotColor: 'bg-orange-500'
        };
      case 'info':
        return {
          borderColor: 'border-l-blue-500',
          bgColor: 'bg-blue-50',
          dotColor: 'bg-yellow-500'
        };
      default:
        return {
          borderColor: 'border-l-gray-500',
          bgColor: 'bg-gray-50',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return null;
    return `${amount.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} MAD`;
  };

  // Add null check for actions
  if (!actions || actions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/60">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.urgentActions.title')}</h3>
        </div>
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{t('dashboard.urgentActions.noActions')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.urgentActions.allUpToDate')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-shadow duration-200">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.urgentActions.title')}</h3>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {actions.map((action) => {
            const styles = getSeverityStyles(action.severity);
            return (
              <div 
                key={action.id} 
                className={`${styles.bgColor} border-l-4 ${styles.borderColor} rounded-lg p-3 flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${styles.dotColor}`}></div>
                  <div className="text-sm text-gray-900">{action.description}</div>
                </div>
                {action.amount && (
                  <div className="text-sm font-medium text-gray-900">
                    {formatAmount(action.amount)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UrgentActions;
