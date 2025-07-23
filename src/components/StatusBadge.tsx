import React from 'react';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: number;
  className?: string;
  onShowRejectionReason?: () => void;
  onEditInvoice?: () => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', onShowRejectionReason, onEditInvoice }) => {
  const { t } = useTranslation();

  const getStatusConfig = (status: number) => {
    switch (status) {
      case 0: // Draft
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          ),
          text: t('invoice.status.draft')
        };
      case 1: // Ready
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          text: t('invoice.status.ready')
        };
      case 2: // AwaitingClearance
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: t('invoice.status.awaitingClearance')
        };
      case 3: // Validated
        return {
          color: 'bg-green-100 text-green-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: t('invoice.status.validated')
        };
      case 4: // Rejected
        return {
          color: 'bg-red-100 text-red-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: t('invoice.status.rejected')
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: null,
          text: t('invoice.status.unknown')
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}>
      {config.icon}
      {config.text}
      {status === 4 && onShowRejectionReason && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowRejectionReason();
          }}
          className="ml-1 text-red-700 hover:text-red-900"
          title={t('invoice.actions.viewRejectionReason')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
      {status === 4 && onEditInvoice && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditInvoice();
          }}
          className="ml-1 text-red-700 hover:text-red-900"
          title={t('invoice.actions.edit')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default StatusBadge; 