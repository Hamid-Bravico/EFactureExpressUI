import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders, getSecureJsonHeaders, getSecureHeaders } from '../../../config/api';
import { QUOTE_ENDPOINTS } from '../api/quote.endpoints';
import { Quote, NewQuote } from '../types/quote.types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import QuoteList from './QuoteList';

import QuoteForm from './QuoteForm';
import { tokenManager } from '../../../utils/tokenManager';

interface QuoteManagementProps {
  token: string | null;
}

interface QuoteListResponse {
  quotes: Array<{
    id: number;
    quoteNumber: string;
    issueDate: string;
    expiryDate: string;
    customerName: string;
    customer?: {
      id: number;
      name: string;
      ice?: string;
      taxId?: string;
      address?: string;
      email?: string;
      phoneNumber?: string;
    };
    customerId?: number;
    total: number;
    status: string;
    createdBy: string;
    createdById?: string;
    createdAt: string;
    subTotal: number;
    vat: number;
    lines: Array<{
      id?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      taxRate?: number;
      quoteId?: number;
    }>;
    companyId?: string;
    validUntil?: string;
  }>;
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filters: {
    statuses: Array<{ value: string; label: string; count: number; }>;
    customers: Array<{ value: string; label: string; count: number; }>;
  };
}

const QuoteManagement = React.memo(({ token }: QuoteManagementProps) => {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<QuoteListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const fetchQuotes = useCallback(async (filters?: any, sort?: any, pagination?: any) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '') {
            params.append(key, value as string);
          }
        });
      }
      
      if (sort) {
        params.append('sortField', sort.sortField);
        params.append('sortDirection', sort.sortDirection);
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('pageSize', pagination.pageSize.toString());
      }

      const url = `${QUOTE_ENDPOINTS?.LIST || '/api/quotes'}?${params.toString()}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(token),
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch quotes');
      }
      
      const data = await res.json();
      setQuotes(data);
    } catch (e: any) {
      setError(e.message || 'Error fetching quotes');
      toast.error(e.message || t('quote.list.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleCreateQuote = useCallback(async (quote: NewQuote) => {
    console.log(quote);
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.CREATE || '/api/quotes', {
        method: 'POST',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(quote),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.log('Backend error data:', errorData);
        const error = new Error(errorData.message || t('quote.form.errors.submissionFailed'));
        (error as any).errors = errorData.errors;
        throw error;
      }

      const data = await res.json();
      toast.success(t('quote.form.createSuccess'));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.form.errors.submissionFailed'));
      throw error;
    }
  }, [token, t, fetchQuotes]);

  const handleUpdateQuote = useCallback(async (quote: NewQuote, customerName?: string) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.UPDATE?.(quote.id!) || `/api/quotes/${quote.id}`, {
        method: 'PUT',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(quote),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const error = new Error(errorData.message || t('quote.form.errors.submissionFailed'));
        (error as any).errors = errorData.errors;
        throw error;
      }

      toast.success(t('quote.form.updateSuccess'));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.form.errors.submissionFailed'));
      throw error;
    }
  }, [token, t, fetchQuotes]);

  const handleDeleteQuote = useCallback(async (id: number) => {
    try {
      console.log('Attempting to delete quote:', id);
      const url = QUOTE_ENDPOINTS?.DELETE?.(id) || `/api/quotes/${id}`;
      console.log('Delete URL:', url);
      
             const res = await fetch(url, {
         method: 'DELETE',
         headers: getSecureHeaders(token),
       });

      console.log('Delete response status:', res.status);
      console.log('Delete response ok:', res.ok);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Delete error response:', errorText);
        throw new Error(t('quote.list.deleteError'));
      }

      toast.success(t('quote.list.deleteSuccess', { count: 1 }));
      fetchQuotes();
    } catch (error: any) {
      console.error('Delete quote error:', error);
      toast.error(error.message || t('quote.list.deleteError'));
    }
  }, [token, t, fetchQuotes]);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.BULK_DELETE || '/api/quotes/bulk-delete', {
        method: 'DELETE',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        throw new Error(t('quote.list.bulkDeleteError'));
      }

      toast.success(t('quote.list.bulkDeleteSuccess', { count: ids.length }));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.list.bulkDeleteError'));
    }
  }, [token, t, fetchQuotes]);

  const handleBulkSubmit = useCallback(async (ids: number[]) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.BULK_SUBMIT || '/api/quotes/bulk-submit', {
        method: 'POST',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        throw new Error(t('quote.list.bulkSubmitError'));
      }

      toast.success(t('quote.list.bulkSubmitSuccess', { count: ids.length }));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.list.bulkSubmitError'));
    }
  }, [token, t, fetchQuotes]);

  const handleUpdateQuoteStatus = useCallback(async (id: number, status: string) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.UPDATE_STATUS?.(id) || `/api/quotes/${id}/status`, {
        method: 'PUT',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error(t('quote.list.statusUpdateError'));
      }

      toast.success(t('quote.list.statusUpdateSuccess'));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.list.statusUpdateError'));
      throw error;
    }
  }, [token, t, fetchQuotes]);

  const handleConvertToInvoice = useCallback(async (id: number) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.CONVERT_TO_INVOICE?.(id) || `/api/quotes/${id}/convert-to-invoice`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });

      if (!res.ok) {
        throw new Error(t('quote.list.convertToInvoiceError'));
      }

      toast.success(t('quote.list.convertToInvoiceSuccess'));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.list.convertToInvoiceError'));
      throw error;
    }
  }, [token, t, fetchQuotes]);

  const handleDownloadPdf = useCallback(async (id: number) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.DOWNLOAD_PDF?.(id) || `/api/quotes/${id}/pdf`, {
        headers: getAuthHeaders(token),
      });

      if (!res.ok) {
        throw new Error(t('quote.list.downloadError'));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('quote.list.downloadSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.list.downloadError'));
    }
  }, [token, t]);

  const handleSubmitQuote = useCallback(async (id: number) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.SUBMIT?.(id) || `/api/quotes/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });

      if (!res.ok) {
        throw new Error(t('quote.list.submitError'));
      }

      toast.success(t('quote.list.submitSuccess'));
      fetchQuotes();
    } catch (error: any) {
      toast.error(error.message || t('quote.list.submitError'));
    }
  }, [token, t, fetchQuotes]);



  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">{t('common.error')}</h3>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => fetchQuotes()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div></div>
        <button
          onClick={() => setShowQuoteForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('common.newQuote')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <QuoteList
          data={quotes}
          loading={loading}
          onDelete={handleDeleteQuote}
          onDownloadPdf={handleDownloadPdf}
          onSubmit={handleSubmitQuote}
          onCreateQuote={handleCreateQuote}
          onUpdateQuote={handleUpdateQuote}
          onRefreshQuotes={fetchQuotes}

          onBulkDelete={handleBulkDelete}
          onBulkSubmit={handleBulkSubmit}
          onUpdateQuoteStatus={handleUpdateQuoteStatus}
          onConvertToInvoice={handleConvertToInvoice}
        />
      </div>

      {showQuoteForm && (
        <QuoteForm
          onSubmit={handleCreateQuote}
          onClose={() => setShowQuoteForm(false)}

        />
      )}
    </div>
  );
});

export default QuoteManagement; 