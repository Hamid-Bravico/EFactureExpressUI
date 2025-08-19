import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardTopDebtor } from '../types/dashboard.types';

interface TopDebtorsTableProps {
  debtors: DashboardTopDebtor[];
}

const TopDebtorsTable: React.FC<TopDebtorsTableProps> = ({ debtors }) => {
  const { t, i18n } = useTranslation();
  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} MAD`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical':
        return t('dashboard.topDebtors.statusLabels.critical');
      case 'warning':
        return t('dashboard.topDebtors.statusLabels.warning');
      case 'attention':
        return t('dashboard.topDebtors.statusLabels.attention');
      case 'normal':
        return t('dashboard.topDebtors.statusLabels.normal');
      default:
        return status;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'attention':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Add null check for debtors
  if (!debtors || debtors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.topDebtors.title')}</h3>
        </div>
        <div className="p-12 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>{t('dashboard.topDebtors.noDebtors')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.topDebtors.title')}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('dashboard.topDebtors.customer')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('dashboard.topDebtors.amount')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('dashboard.topDebtors.delay')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('dashboard.topDebtors.status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('dashboard.topDebtors.action')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {debtors.map((debtor) => (
              <tr key={debtor.customerId} className="hover:bg-gray-50/50 transition-colors duration-150">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {debtor.customerName}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatAmount(debtor.amountDue)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-700">
                    {debtor.daysLate} {t('dashboard.topDebtors.days')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyles(debtor.status)}`}>
                    {getStatusLabel(debtor.status)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
                    {t('dashboard.topDebtors.remind')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopDebtorsTable;
