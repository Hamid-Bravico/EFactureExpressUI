import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface StatusBadgeProps {
  status: number;
  className?: string;
  onShowRejectionReason?: () => void;
  dgiSubmissionId?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', onShowRejectionReason, dgiSubmissionId }) => {
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

  const handleCopyDgiSubmissionId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dgiSubmissionId) {
      setIsCopying(true);
      try {
        await navigator.clipboard.writeText(dgiSubmissionId);
        toast.success(t('common.copied'));
      } catch (err) {
        console.error('Failed to copy DGI Submission ID:', err);
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
      {status === 2 && dgiSubmissionId && (
        <>
          <button
            onClick={handleCopyDgiSubmissionId}
            disabled={isCopying}
            className="ml-1 text-yellow-700 hover:text-yellow-900 disabled:opacity-50"
            title={t('invoice.actions.copyDgiSubmissionId')}
          >
            {isCopying ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </>
      )}
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

    </div>
  );
};

export default StatusBadge; 