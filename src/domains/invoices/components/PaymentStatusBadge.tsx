import React from 'react';
import { useTranslation } from 'react-i18next';

interface PaymentStatusBadgeProps {
  amountPaid: number;
  total: number;
  className?: string;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ 
  amountPaid, 
  total, 
  className = '' 
}) => {
  const { t, i18n } = useTranslation();

  // Format currency based on current language
  const formatCurrency = (amount: number) => {
    const formatters = {
      fr: new Intl.NumberFormat('fr-FR', { 
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      en: new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    };
    
    if (i18n.language === 'fr') {
      return formatters.fr.format(amount) + ' MAD';
    } else {
      return formatters.en.format(amount);
    }
  };

  const getPaymentStatus = () => {
    if (amountPaid === 0) {
      return {
        color: 'bg-red-100 text-red-800',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        ),
        text: 'Unpaid',
        percentage: 0
      };
    } else if (amountPaid >= total) {
      return {
        color: 'bg-green-100 text-green-800',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        text: 'Paid',
        percentage: 100
      };
    } else {
      const percentage = Math.round((amountPaid / total) * 100);
      return {
        color: 'bg-yellow-100 text-yellow-800',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        text: 'Partial',
        percentage
      };
    }
  };

  const status = getPaymentStatus();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${status.color} ${className}`}>
      {status.icon}
      <span className="font-semibold">{formatCurrency(amountPaid)}</span>
      <span className="text-xs opacity-75">/</span>
      <span className="text-xs opacity-75">{formatCurrency(total)}</span>
      {status.percentage > 0 && status.percentage < 100 && (
        <span className="text-xs font-medium">({status.percentage}%)</span>
      )}
    </div>
  );
};

export default PaymentStatusBadge;
