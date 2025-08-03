import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders, getSecureJsonHeaders, getSecureHeaders } from '../../../config/api';
import { QUOTE_ENDPOINTS } from '../api/catalog.endpoints';
import { NewQuote } from '../types/catalog.types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import QuoteList, { QuoteListResponse } from './CatalogList';
import QuoteImportCSV from './CatalogImportCSV';
import ErrorModal from '../../../components/ErrorModal';

import QuoteForm from './CatalogForm';

interface QuoteManagementProps {
  token: string | null;
}

const QuoteManagement = React.memo(({ token }: QuoteManagementProps) => {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<QuoteListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: []
  });

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

  const handleCreateQuote = useCallback(async (quote: NewQuote, customerName?: string) => {
    try {
      // Create temporary quote for optimistic update
      const tempQuote = {
        id: Date.now(), // Temporary ID
        quoteNumber: `TEMP-${Date.now()}`,
        issueDate: quote.issueDate,
        expiryDate: quote.expiryDate,
        customerName: customerName || 'Loading...',
        customerId: quote.customerId,
        total: quote.total,
        status: quote.status || 'Draft',
        createdBy: 'Current User',
        createdById: '',
        createdAt: new Date().toISOString(),
        subTotal: quote.subTotal,
        vat: quote.vat,
        lines: quote.lines.map(line => ({
          id: Date.now() + Math.random(),
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          quoteId: Date.now(),
          taxRate: line.taxRate
        })),
        companyId: '',
        termsAndConditions: quote.termsAndConditions,
        privateNotes: quote.privateNotes
      };

      // Optimistically add the quote
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: [tempQuote, ...prev!.quotes],
          pagination: {
            ...prev!.pagination,
            totalItems: prev!.pagination.totalItems + 1,
            totalPages: Math.ceil((prev!.pagination.totalItems + 1) / prev!.pagination.pageSize)
          }
        }));
      }

      const res = await fetch(QUOTE_ENDPOINTS?.CREATE || '/api/quotes', {
        method: 'POST',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(quote),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.filter(q => q.id !== tempQuote.id),
            pagination: {
              ...prev!.pagination,
              totalItems: prev!.pagination.totalItems - 1,
              totalPages: Math.ceil((prev!.pagination.totalItems - 1) / prev!.pagination.pageSize)
            }
          }));
        }

        const errorData = await res.json();
        const error = new Error(errorData.message || t('quote.form.errors.submissionFailed'));
        (error as any).errors = errorData.errors;
        throw error;
      }

      const data = await res.json();
      toast.success(t('quote.form.createSuccess'));
      
      // Replace temporary quote with real data
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => q.id === tempQuote.id ? data : q)
        }));
      }
    } catch (error: any) {
      toast.error(error.message || t('quote.form.errors.submissionFailed'));
      throw error;
    }
  }, [token, t, quotes]);

  const handleUpdateQuote = useCallback(async (quote: NewQuote, customerName?: string) => {
    if (!quote.id) {
      toast.error(t('quote.form.errors.submissionFailed'));
      return;
    }

    try {
      // Store original quote for rollback
      const originalQuote = quotes?.quotes.find(q => q.id === quote.id);
      if (!originalQuote) throw new Error('Quote not found');

      // Optimistically update the quote
      const updatedQuote = {
        ...originalQuote,
        issueDate: quote.issueDate,
        expiryDate: quote.expiryDate,
        customerName: customerName || originalQuote.customerName,
        customer: {
          id: quote.customerId,
          name: customerName || originalQuote.customer?.name || originalQuote.customerName
        },
        customerId: quote.customerId,
        subTotal: quote.subTotal,
        vat: quote.vat,
        total: quote.total,
        status: quote.status,
        lines: quote.lines.map(line => ({
          id: Date.now() + Math.random(),
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          quoteId: quote.id!,
          taxRate: line.taxRate
        })),
        termsAndConditions: quote.termsAndConditions,
        privateNotes: quote.privateNotes
      };

      // Apply optimistic update
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => 
            q.id === quote.id! ? updatedQuote : q
          )
        }));
      }

      const res = await fetch(QUOTE_ENDPOINTS?.UPDATE?.(quote.id!) || `/api/quotes/${quote.id}`, {
        method: 'PUT',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(quote),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === quote.id! ? originalQuote : q
            )
          }));
        }

        const errorData = await res.json();
        const error = new Error(errorData.message || t('quote.form.errors.submissionFailed'));
        (error as any).errors = errorData.errors;
        throw error;
      }

      // Check if response has content before trying to parse
      const responseText = await res.text();
      if (responseText.trim()) {
        try {
          const serverUpdatedQuote = JSON.parse(responseText);
          // Update with server response to ensure consistency
          if (quotes) {
            setQuotes(prev => ({
              ...prev!,
              quotes: prev!.quotes.map(q => 
                q.id === quote.id! ? { ...serverUpdatedQuote, customerName: customerName || q.customerName } : q
              )
            }));
          }
        } catch (parseError) {
          // If response is not valid JSON, keep the optimistic update
        }
      }

      toast.success(t('quote.form.updateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.form.errors.submissionFailed'));
      throw error;
    }
  }, [token, t, quotes]);

  const handleDeleteQuote = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.deletingQuote'));
    
    // Store original data for rollback
    const originalData = quotes;
    const originalQuote = quotes?.quotes.find(q => q.id === id);
    if (!originalQuote) {
      toast.error(t('quote.list.deleteError'), { id: toastId });
      return;
    }

    // Check if this deletion will make the page incomplete
    const willPageBeIncomplete = quotes && 
      quotes.quotes.length === quotes.pagination.pageSize && 
      quotes.pagination.page < quotes.pagination.totalPages;

    try {      
      // Optimistically remove the quote
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.filter(q => q.id !== id),
          pagination: {
            ...prev!.pagination,
            totalItems: prev!.pagination.totalItems - 1,
            totalPages: Math.ceil((prev!.pagination.totalItems - 1) / prev!.pagination.pageSize)
          }
        }));
      }

      const url = QUOTE_ENDPOINTS?.DELETE?.(id) || `/api/quotes/${id}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getSecureHeaders(token),
      });

      if (!res.ok) {
        // Revert optimistic update
        setQuotes(originalData);
        //const errorText = await res.text();
        throw new Error(t('quote.list.deleteError'));
      }

      // If the page will be incomplete, refresh the current page data
      if (willPageBeIncomplete) {
        // Silently refresh the current page to get the missing items
        const queryParams = new URLSearchParams();
        queryParams.append('page', quotes!.pagination.page.toString());
        queryParams.append('pageSize', quotes!.pagination.pageSize.toString());
        
        try {
          const response = await fetch(`${QUOTE_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getAuthHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setQuotes(refreshedData);
          }
        } catch (error) {
          // Failed to refresh page data
        }
      }

      toast.success(t('quote.list.deleteSuccess', { count: 1 }), { id: toastId });
    } catch (error: any) {
      console.error('Delete quote error:', error);
      toast.error(error.message || t('quote.list.deleteError'), { id: toastId });
    }
  }, [token, t, quotes]);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    const toastId = toast.loading(t('quote.bulk.deleting', { count: ids.length }));
    
    // Store original data for rollback
    const originalData = quotes;
    
    // Check if this bulk deletion will make the page incomplete
    const willPageBeIncomplete = quotes && 
      quotes.quotes.length === quotes.pagination.pageSize && 
      ids.length > 0 && 
      quotes.pagination.page < quotes.pagination.totalPages;
    
    try {
      // Optimistically remove all quotes
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.filter(q => !ids.includes(q.id)),
          pagination: {
            ...prev!.pagination,
            totalItems: prev!.pagination.totalItems - ids.length,
            totalPages: Math.ceil((prev!.pagination.totalItems - ids.length) / prev!.pagination.pageSize)
          }
        }));
      }

      // Perform all delete operations
      await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(QUOTE_ENDPOINTS?.DELETE?.(id) || `/api/quotes/${id}`, {
            method: 'DELETE',
            headers: getSecureHeaders(token),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: t('quote.list.deleteError') }));
            throw new Error(errorData.message || t('quote.list.deleteError'));
          }
        })
      );
      
      // If the page will be incomplete, refresh the current page data
      if (willPageBeIncomplete) {
        // Silently refresh the current page to get the missing items
        const queryParams = new URLSearchParams();
        queryParams.append('page', quotes!.pagination.page.toString());
        queryParams.append('pageSize', quotes!.pagination.pageSize.toString());
        
        try {
          const response = await fetch(`${QUOTE_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getAuthHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setQuotes(refreshedData);
          }
        } catch (error) {
          // Failed to refresh page data
        }
      }
      
      toast.success(t('quote.list.bulkDeleteSuccess', { count: ids.length }), { id: toastId });
    } catch (err) {
      // Revert all optimistic updates
      setQuotes(originalData);
      
      const errorMessage = err instanceof Error ? err.message : t('quote.list.bulkDeleteError');
      toast.error(errorMessage, { id: toastId });
    }
  }, [token, t, quotes]);

  const handleBulkSubmit = useCallback(async (ids: number[]) => {
    const toastId = toast.loading(t('quote.bulk.submitting', { count: ids.length }));
    
    // Store original quotes for rollback
    const originalQuotes = quotes?.quotes.filter(q => ids.includes(q.id)) || [];
    
    try {
      // Optimistically update all quotes to "Sent" status
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => 
            ids.includes(q.id) ? { ...q, status: 'Sent' } : q
          )
        }));
      }

      // Perform all submit operations
      const results = await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(QUOTE_ENDPOINTS?.SUBMIT?.(id) || `/api/quotes/${id}/submit`, {
            method: 'POST',
            headers: getSecureHeaders(token),
          });

          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || t('quote.list.submitError'));
          }

          // Check if response has content before trying to parse
          const responseText = await response.text();
          if (responseText.trim()) {
            try {
              const result = JSON.parse(responseText);
              return result;
            } catch (parseError) {
              // If response is not valid JSON, return empty object
              return {};
            }
          } else {
            // If response is empty, return empty object
            return {};
          }
        })
      );
      
      // Update with server responses if needed
      results.forEach((result, index) => {
        if (result && typeof result === 'object' && Object.keys(result).length > 0) {
          // If there's additional data from server, update accordingly
          if (quotes) {
            setQuotes(prev => ({
              ...prev!,
              quotes: prev!.quotes.map(q => 
                q.id === ids[index] ? { ...q, status: 'Sent', ...result } : q
              )
            }));
          }
        }
      });
      
      toast.success(t('quote.list.bulkSubmitSuccess', { count: ids.length }), { id: toastId });
    } catch (err) {
      // Revert all optimistic updates
      if (quotes && originalQuotes.length > 0) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => {
            const originalQuote = originalQuotes.find(orig => orig.id === q.id);
            return originalQuote || q;
          })
        }));
      }
      
      const errorMessage = err instanceof Error ? err.message : t('quote.list.bulkSubmitError');
      toast.error(errorMessage, { id: toastId });
    }
  }, [token, t, quotes]);

  // Add optimistic status update function for UI responsiveness
  const handleOptimisticQuoteStatusUpdate = useCallback((id: number, status: string) => {
    if (quotes) {
      setQuotes(prev => ({
        ...prev!,
        quotes: prev!.quotes.map(q => 
          q.id === id ? { ...q, status } : q
        )
      }));
    }
  }, [quotes]);

  const handleUpdateQuoteStatus = useCallback(async (id: number, status: string) => {
    // Store original quote for rollback
    const originalQuote = quotes?.quotes.find(q => q.id === id);
    if (!originalQuote) {
      toast.error(t('quote.list.statusUpdateError'));
      return;
    }

    try {
      // Optimistically update the status
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => 
            q.id === id ? { ...q, status } : q
          )
        }));
      }

      const res = await fetch(QUOTE_ENDPOINTS?.UPDATE_STATUS?.(id) || `/api/quotes/${id}/status`, {
        method: 'PUT',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === id ? originalQuote : q
            )
          }));
        }
        throw new Error(t('quote.list.statusUpdateError'));
      }

      toast.success(t('quote.list.statusUpdateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.list.statusUpdateError'));
      throw error;
    }
  }, [token, t, quotes]);

  const handleConvertToInvoice = useCallback(async (id: number) => {
    // Store original quote for rollback
    const originalQuote = quotes?.quotes.find(q => q.id === id);
    if (!originalQuote) {
      toast.error(t('quote.list.convertToInvoiceError'));
      return;
    }

    try {
      // Optimistically update quote status to converted
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => 
            q.id === id ? { ...q, status: 'Converted' } : q
          )
        }));
      }

      const res = await fetch(QUOTE_ENDPOINTS?.CONVERT_TO_INVOICE?.(id) || `/api/quotes/${id}/convert`, {
        method: 'POST',
        headers: getSecureJsonHeaders(token),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === id ? originalQuote : q
            )
          }));
        }
        throw new Error(t('quote.list.convertToInvoiceError'));
      }

      const responseData = await res.json();
      const invoiceNumber = responseData.invoiceNumber || 'N/A';
      
      // Create a dismissible success toast with close button
      const toastId = toast.custom(
        (toastInstance) => (
          <div className={`${toastInstance.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t('quote.list.convertToInvoiceSuccess', { invoiceNumber })}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(toastInstance.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity, // Toast will stay until user dismisses it
        }
      );
    } catch (error: any) {
      toast.error(error.message || t('quote.list.convertToInvoiceError'));
      throw error;
    }
  }, [token, t, quotes]);

  const handleDownloadPdf = useCallback(async (id: number) => {
    try {
      const res = await fetch(QUOTE_ENDPOINTS?.DOWNLOAD_PDF?.(id) || `/api/quotes/${id}/pdf-url`, {
        headers: getSecureHeaders(token),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('PDF download failed:', res.status, res.statusText, errorText);
        throw new Error(t('quote.actions.downloadError'));
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

      toast.success(t('quote.actions.downloadSuccess'));
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error(error.message || t('quote.actions.downloadError'));
    }
  }, [token, t]);

  const handleSubmitQuote = useCallback(async (id: number) => {
    // Store original quote for rollback
    const originalQuote = quotes?.quotes.find(q => q.id === id);
    if (!originalQuote) {
      toast.error(t('quote.list.submitError'));
      return;
    }

    try {
      // Optimistically update quote status to sent
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => 
            q.id === id ? { ...q, status: 'Sent' } : q
          )
        }));
      }

      const res = await fetch(QUOTE_ENDPOINTS?.SUBMIT?.(id) || `/api/quotes/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === id ? originalQuote : q
            )
          }));
        }
        throw new Error(t('quote.list.submitError'));
      }

      toast.success(t('quote.list.submitSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('quote.list.submitError'));
    }
  }, [token, t, quotes]);

  const handleImportCSV = useCallback(async (file: File) => {
    setImportLoading(true);
    const toastId = toast.loading(t('common.importingCSV'));
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(QUOTE_ENDPOINTS.IMPORT_CSV, {
        method: "POST",
        headers: getSecureHeaders(token),
        body: formData,
      });

      if (response.status === 401) {
        toast.error(t('common.unauthorized'), { id: toastId });
        return;
      }

      if (response.status === 500) {
        toast.error(t('errors.unexpectedError'), { id: toastId });
        return;
      }

      const data = await response.json();

      if (response.ok) {
        // Success response (200 OK)
        const count = data.data?.count || 0;
        toast.success(data.message || t('success.quotesImported', { count }), { id: toastId });
        await fetchQuotes();
      } else {
        // Validation error response (400/409) - Show in modal
        const errorMessage = data.message || t('errors.failedToImportCSV');
        const details = data.details && Array.isArray(data.details) ? data.details : [];
        
        // Dismiss the loading toast before showing the modal
        toast.dismiss(toastId);
        
        setErrorModal({
          isOpen: true,
          title: t('common.error'),
          message: errorMessage,
          details: details
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.failedToImportCSV');
      
      // Dismiss the loading toast before showing the modal
      toast.dismiss(toastId);
      
      setErrorModal({
        isOpen: true,
        title: t('common.error'),
        message: errorMessage,
        details: []
      });
    } finally {
      setImportLoading(false);
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
        <QuoteImportCSV onImport={handleImportCSV} loading={importLoading} />
        <button
          onClick={() => setShowQuoteForm(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
            importLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
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
          token={token}

          onBulkDelete={handleBulkDelete}
          onBulkSubmit={handleBulkSubmit}
          onUpdateQuoteStatus={handleUpdateQuoteStatus}
          onOptimisticQuoteStatusUpdate={handleOptimisticQuoteStatusUpdate}
          onConvertToInvoice={handleConvertToInvoice}
        />
      </div>

      {showQuoteForm && (
        <QuoteForm
          onSubmit={handleCreateQuote}
          onClose={() => setShowQuoteForm(false)}

        />
      )}

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
});

export default QuoteManagement; 