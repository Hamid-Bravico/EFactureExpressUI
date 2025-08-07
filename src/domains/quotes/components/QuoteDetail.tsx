import React, { useState, useCallback } from 'react';
import { Quote } from '../types/quote.types';
import { ApiResponse } from '../../auth/types/auth.types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import QuoteStatusBadge from './QuoteStatusBadge';
import { getSecureJsonHeaders, API_BASE_URL } from '../../../config/api';

interface QuoteDetailProps {
  quote: Quote;
  onOptimisticStatusUpdate?: (id: number, status: string) => void;
  onConvertToInvoice?: (id: number) => Promise<void>;
  onDownloadPdf?: (id: number) => void;
  disabled?: boolean;
  token: string | null;
}

const QuoteDetail: React.FC<QuoteDetailProps> = ({
  quote,
  onOptimisticStatusUpdate,
  onConvertToInvoice,
  onDownloadPdf,
  disabled = false,
  token
}) => {
  const { t, i18n } = useTranslation();
  const [refreshingStatusId, setRefreshingStatusId] = useState<number | null>(null);

  const formatCurrency = useCallback((amount: number) => {
    if (i18n.language === 'fr') {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + ' MAD';
    } else {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
  }, [i18n.language]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
  }, [i18n.language]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    setRefreshingStatusId(quote.id);
    try {
      if (!token) {
        throw new Error('No valid token available');
      }

      // Map status strings to status codes
      const statusCodeMap: { [key: string]: number } = {
        'Sent': 1,
        'Accepted': 2,
        'Rejected': 3
      };

      const statusCode = statusCodeMap[newStatus];
      if (statusCode === undefined) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const response = await fetch(`${API_BASE_URL}/quotes/${quote.id}/status/${statusCode}`, {
        method: 'POST',
        headers: getSecureJsonHeaders(token)
      });

      const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!response.ok || !responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('quote.list.statusUpdateError'));
      }

      // Call optimistic update to update UI state
      if (onOptimisticStatusUpdate) {
        onOptimisticStatusUpdate(quote.id, newStatus);
      }
      
      toast.success(t('quote.list.statusUpdateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.list.statusUpdateError'));
    } finally {
      setRefreshingStatusId(null);
    }
  }, [quote.id, onOptimisticStatusUpdate, t, token]);

  // Confirmation handlers for status changes
  const handleMarkAsSent = useCallback(() => {
    if (window.confirm(t('quote.confirm.markAsSent', { 
      quoteNumber: quote.quoteNumber 
    }))) {
      handleStatusChange('Sent');
    }
  }, [handleStatusChange, quote.quoteNumber, t]);

  const handleMarkAsAccepted = useCallback(() => {
    if (window.confirm(t('quote.confirm.markAsAccepted', { 
      quoteNumber: quote.quoteNumber 
    }))) {
      handleStatusChange('Accepted');
    }
  }, [handleStatusChange, quote.quoteNumber, t]);

  const handleMarkAsRejected = useCallback(() => {
    if (window.confirm(t('quote.confirm.markAsRejected', { 
      quoteNumber: quote.quoteNumber 
    }))) {
      handleStatusChange('Rejected');
    }
  }, [handleStatusChange, quote.quoteNumber, t]);

  const handleConvertToInvoice = useCallback(async () => {
    if (!onConvertToInvoice) return;

    if (!window.confirm(t('quote.confirm.convertToInvoice', {
      quoteNumber: quote.quoteNumber
    }))) return;

    try {
      await onConvertToInvoice(quote.id);
    } catch (error: any) {
      // Error handling is done in the parent component
    }
  }, [quote.id, quote.quoteNumber, onConvertToInvoice, t]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      if (!token) {
        throw new Error('No valid token available');
      }

      const response = await fetch(`${API_BASE_URL}/quotes/${quote.id}/pdf-url`, {
        method: 'GET',
        headers: getSecureJsonHeaders(token)
      });

      const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!response.ok || !responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('quote.actions.downloadError'));
      }

      const data = responseData.data;
      
      // Open the PDF URL in a new tab
      window.open(data.url, '_blank');
      
      if (onDownloadPdf) {
        onDownloadPdf(quote.id);
      }
    } catch (error: any) {
      toast.error(error.message || t('quote.actions.downloadError'));
    }
  }, [quote.id, onDownloadPdf, t, token]);




  // Calculate totals from lines
  const calculatedSubTotal = quote.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  const calculatedVat = quote.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * (line.taxRate || 20) / 100), 0);
  const calculatedTotal = calculatedSubTotal + calculatedVat;

  return (
    <div className="px-6 py-4 bg-gray-50">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium text-gray-900">{t('quote.details.title')}</h4>
          
                     {/* Action Buttons */}
           <div className="flex gap-2">
             {/* Draft Status */}
             {quote.status === 'Draft' && (
               <>
                 <button
                   onClick={handleMarkAsSent}
                   disabled={disabled || refreshingStatusId === quote.id}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('quote.actions.markAsSent')}
                 </button>
                 {onDownloadPdf && (
                   <button
                     onClick={handleDownloadPdf}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('quote.actions.download')}
                   </button>
                 )}
               </>
             )}

             {/* Sent Status */}
             {quote.status === 'Sent' && (
               <>
                 <button
                   onClick={handleMarkAsAccepted}
                   disabled={disabled || refreshingStatusId === quote.id}
                   className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('quote.actions.markAsAccepted')}
                 </button>
                 <button
                   onClick={handleMarkAsRejected}
                   disabled={disabled || refreshingStatusId === quote.id}
                   className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('quote.actions.markAsRejected')}
                 </button>
                 {onDownloadPdf && (
                   <button
                     onClick={handleDownloadPdf}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('quote.actions.download')}
                   </button>
                 )}
               </>
             )}

             {/* Accepted Status */}
             {quote.status === 'Accepted' && (
               <>
                 {onConvertToInvoice && (
                   <button
                     onClick={handleConvertToInvoice}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-600 text-white border border-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('quote.list.convertToInvoice')}
                   </button>
                 )}
                 {onDownloadPdf && (
                   <button
                     onClick={handleDownloadPdf}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('quote.actions.download')}
                   </button>
                 )}
               </>
             )}

             {/* Rejected Status */}
             {quote.status === 'Rejected' && onDownloadPdf && (
               <button
                 onClick={handleDownloadPdf}
                 disabled={disabled}
                 className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {t('quote.actions.download')}
               </button>
             )}

             {/* Converted Status */}
             {quote.status === 'Converted' && onDownloadPdf && (
               <button
                 onClick={handleDownloadPdf}
                 disabled={disabled}
                 className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {t('quote.actions.download')}
               </button>
             )}
           </div>
        </div>
        
        {/* Quote Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">{t('quote.details.quoteInfo')}</h5>
            <div className="space-y-1 text-gray-600">
              <div><span className="font-medium">{t('quote.details.quoteNumber')}:</span> {quote.quoteNumber}</div>
              <div><span className="font-medium">{t('quote.details.issueDate')}:</span> {formatDate(quote.issueDate)}</div>
              {quote.expiryDate && (
                <div><span className="font-medium">{t('quote.details.expiryDate')}:</span> {formatDate(quote.expiryDate)}</div>
              )}
              <div><span className="font-medium">{t('quote.details.status')}:</span> <QuoteStatusBadge status={quote.status} /></div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-2">{t('quote.details.customerInfo')}</h5>
            <div className="space-y-1 text-gray-600">
              <div><span className="font-medium">{t('quote.details.customerName')}:</span> {quote.customer.name}</div>
              <div><span className="font-medium">{t('quote.details.ice')}:</span> {quote.customer.ice || t('common.notAvailable')}</div>
            </div>
          </div>
        </div>
        
        {/* Line Items Table */}
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('quote.details.description')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('quote.details.quantity')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('quote.details.unitPrice')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('quote.details.taxRate')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('quote.details.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quote.lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">{line.description}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{line.quantity}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    {line.taxRate || 20}%
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    {formatCurrency(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('quote.details.subtotal')}:</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(calculatedSubTotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('quote.details.vat')}:</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(calculatedVat)}
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">{t('quote.details.total')}:</td>
                <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(calculatedTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Private Notes */}
        {quote.privateNotes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="font-medium text-gray-900 mb-2">{t('quote.details.privateNotes')}</h5>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {quote.privateNotes}
            </div>
          </div>
        )}

        {/* Creation Information */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">{t('quote.details.createdBy')}:</span> {quote.createdBy?.name || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">{t('quote.details.createdAt')}:</span> {new Date(quote.createdAt).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default QuoteDetail; 