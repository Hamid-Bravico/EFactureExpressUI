import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardKpiCards, DashboardPeriodInfo } from '../types/dashboard.types';

interface KpiCardsProps {
  kpiCards: DashboardKpiCards;
  period: DashboardPeriodInfo;
}

const KpiCards: React.FC<KpiCardsProps> = ({ kpiCards, period }) => {
  const { t, i18n } = useTranslation();
  const formatAmount = (amount?: number) => {
    if (amount === undefined) return '0';
    return amount.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
  };

  // Add null check for kpiCards
  if (!kpiCards) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: kpiCards.revenue?.label || t('dashboard.kpiCards.revenue'),
      value: `${formatAmount(kpiCards.revenue?.amount)} MAD`,
      subtitle: period?.display || t('dashboard.periods.thisMonth'),
      borderColor: 'border-t-blue-500'
    },
    {
      title: kpiCards.unpaid?.label || t('dashboard.kpiCards.unpaid'),
      value: `${formatAmount(kpiCards.unpaid?.amount)} MAD`,
      subtitle: t('dashboard.kpiCards.totalOverdue'),
      borderColor: 'border-t-red-500'
    },
    {
      title: kpiCards.awaitingDgi?.label || t('dashboard.kpiCards.awaitingDgi'),
      value: kpiCards.awaitingDgi?.count?.toString() || '0',
      subtitle: t('dashboard.kpiCards.invoices'),
      borderColor: 'border-t-yellow-500'
    },
    {
      title: kpiCards.vatToPay?.label || t('dashboard.kpiCards.vatToPay'),
      value: `${formatAmount(kpiCards.vatToPay?.amount)} MAD`,
      subtitle: kpiCards.vatToPay?.dueDate ? `${t('dashboard.kpiCards.dueDate')}: ${formatDate(kpiCards.vatToPay.dueDate)}` : '',
      borderColor: 'border-t-orange-500'
    },
    {
      title: kpiCards.collected?.label || t('dashboard.kpiCards.collected'),
      value: `${formatAmount(kpiCards.collected?.amount)} MAD`,
      subtitle: period?.display || t('dashboard.periods.thisMonth'),
      borderColor: 'border-t-green-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg p-4 border-t-4 ${card.borderColor} border-l border-r border-b border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200`}
        >
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {card.title}
            </div>
            <div className="text-xl font-bold text-gray-900">
              {card.value}
            </div>
            <div className="text-xs text-gray-500">
              {card.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
