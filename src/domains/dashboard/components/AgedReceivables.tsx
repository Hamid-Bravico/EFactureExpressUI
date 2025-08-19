import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardAgedReceivables, DashboardPeriodInfo } from '../types/dashboard.types';

interface AgedReceivablesProps {
  agedReceivables: DashboardAgedReceivables;
  period: DashboardPeriodInfo;
}

const AgedReceivables: React.FC<AgedReceivablesProps> = ({ 
  agedReceivables, 
  period
}) => {
  const { t, i18n } = useTranslation();
  const formatAmount = (amount: number) => {
    return amount.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
  };

  // Add null check for agedReceivables
  if (!agedReceivables) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const buckets = [
    {
      title: t('dashboard.agedReceivables.days0_30'),
      amount: agedReceivables.days0_30?.amount || 0,
      count: agedReceivables.days0_30?.invoiceCount || 0
    },
    {
      title: t('dashboard.agedReceivables.days31_60'),
      amount: agedReceivables.days31_60?.amount || 0,
      count: agedReceivables.days31_60?.invoiceCount || 0
    },
    {
      title: t('dashboard.agedReceivables.daysOver60'),
      amount: agedReceivables.days_Over_60?.amount || 0,
      count: agedReceivables.days_Over_60?.invoiceCount || 0
    },
    {
      title: t('dashboard.agedReceivables.collectionRate'),
      value: `${agedReceivables.collectionRate || 0}%`,
      subtitle: period?.display || t('dashboard.periods.thisMonth')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {buckets.map((bucket, index) => (
        <div
          key={index}
          className="bg-white rounded-lg p-4 shadow-sm flex justify-between items-center"
        >
          <div className="text-sm text-gray-500 font-medium">
            {bucket.title}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-800">
              {bucket.value || `${formatAmount(bucket.amount || 0)} MAD`}
            </div>
            <div className="text-xs text-gray-400">
              {bucket.subtitle || (bucket.count !== null ? `${bucket.count} ${t('dashboard.agedReceivables.invoices')}` : '')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgedReceivables;
