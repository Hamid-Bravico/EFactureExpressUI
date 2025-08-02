import React, { useState, useCallback } from 'react';
import { Quote } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import QuoteForm from './QuoteForm';

interface QuoteDetailProps {
  quote: Quote;
  onEdit?: (quote: Quote) => void;
  onDelete?: (id: number) => void;
  onStatusChange?: (id: number, status: string) => void;
  onConvertToInvoice?: (id: number) => Promise<void>;
  onDownloadPdf?: (id: number) => void;
  disabled?: boolean;
}

const QuoteDetail: React.FC<QuoteDetailProps> = ({
  quote,
  onEdit,
  onDelete,
  onStatusChange,
  onConvertToInvoice,
  onDownloadPdf,
  disabled = false
}) => {
  const { t, i18n } = useTranslation();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
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

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(quote);
    } else {
      setShowEditForm(true);
    }
  }, [quote, onEdit]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(quote.id);
      setShowConfirmDelete(false);
    }
  }, [quote.id, onDelete]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!onStatusChange) return;

    setRefreshingStatusId(quote.id);
    try {
      await onStatusChange(quote.id, newStatus);
      toast.success(t('quote.list.statusUpdateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.list.statusUpdateError'));
    } finally {
      setRefreshingStatusId(null);
    }
  }, [quote.id, onStatusChange, t]);

  const handleConvertToInvoice = useCallback(async () => {
    if (!onConvertToInvoice) return;

    try {
      await onConvertToInvoice(quote.id);
      toast.success(t('quote.list.convertToInvoiceSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.list.convertToInvoiceError'));
    }
  }, [quote.id, onConvertToInvoice, t]);

  const handleDownloadPdf = useCallback(() => {
    if (onDownloadPdf) {
      onDownloadPdf(quote.id);
    }
  }, [quote.id, onDownloadPdf]);

  const canEditQuote = quote.status === 'Draft'; // Only draft quotes can be edited
  const canDeleteQuote = quote.status === 'Draft'; // Only draft quotes can be deleted
  const canChangeStatus = ['Draft', 'Sent', 'Rejected'].includes(quote.status); // Only certain statuses can be changed
  const canConvertToInvoice = quote.status === 'Accepted'; // Only accepted quotes can be converted

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
            {canEditQuote && (
              <button
                onClick={handleEdit}
                disabled={disabled}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('quote.actions.edit')}
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
            
            {canConvertToInvoice && onConvertToInvoice && (
              <button
                onClick={handleConvertToInvoice}
                disabled={disabled}
                className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('quote.list.convertToInvoice')}
              </button>
            )}
            
            {canDeleteQuote && onDelete && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={disabled}
                className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('quote.actions.delete')}
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
              <div><span className="font-medium">{t('quote.details.status')}:</span> <StatusBadge status={quote.status} /></div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-2">{t('quote.details.customerInfo')}</h5>
            <div className="space-y-1 text-gray-600">
              <div><span className="font-medium">{t('quote.details.customerName')}:</span> {quote.customer.name}</div>
              <div><span className="font-medium">{t('quote.details.customerId')}:</span> {quote.customer.id}</div>
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

      {/* Edit Form Modal */}
      {showEditForm && (
        <QuoteForm
          onSubmit={async (quoteData, customerName) => {
            // Handle form submission
            setShowEditForm(false);
          }}
          onClose={() => setShowEditForm(false)}
          quote={quote}
          disabled={disabled}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('quote.detail.confirmDelete')}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('quote.detail.deleteWarning')}
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetail; 