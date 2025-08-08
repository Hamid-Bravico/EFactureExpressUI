import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface InvoiceStatusBadgeProps {
  status: number; // 0 = Draft, 1 = Ready, 2 = AwaitingClearance, 3 = Validated, 4 = Rejected
  className?: string;
  onShowRejectionReason?: () => void;
  dgiSubmissionId?: string;
  dgiRejectionReason?: string;
}

const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ 
  status, 
  className = '', 
  onShowRejectionReason, 
  dgiSubmissionId,
  dgiRejectionReason
}) => {
  const { t } = useTranslation();
  const [isCopying, setIsCopying] = useState(false);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  const handleCopyDgiSubmissionId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dgiSubmissionId) {
      setIsCopying(true);
      try {
        await navigator.clipboard.writeText(dgiSubmissionId);
        toast.success(t('common.copied'));
      } catch (err) {
        toast.error(t('errors.copyFailed'));
      } finally {
        setIsCopying(false);
      }
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}>
      {config.icon}
      {config.text}
      {status === 3 && dgiSubmissionId && (
        <button
          onClick={handleCopyDgiSubmissionId}
          disabled={isCopying}
          className="ml-1 text-green-600 hover:text-green-700 transition-colors duration-200"
          title={t('invoice.actions.copyDgiId')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
      {status === 4 && dgiRejectionReason && (
        <button
          onClick={onShowRejectionReason}
          className="ml-1 text-red-600 hover:text-red-700 transition-colors duration-200"
          title={dgiRejectionReason}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default InvoiceStatusBadge;