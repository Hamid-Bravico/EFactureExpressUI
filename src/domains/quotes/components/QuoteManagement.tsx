import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { secureApiClient } from '../../../config/api';
import { QUOTE_ENDPOINTS } from '../api/quote.endpoints';
import { NewQuote } from '../types/quote.types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import QuoteList, { QuoteListResponse } from './QuoteList';
import QuoteImportCSV from './QuoteImportCSV';
import ErrorModal from '../../../components/ErrorModal';
import { canImportCSV } from '../../../utils/shared.permissions';
import { decodeJWT } from '../../../utils/jwt';
import { tokenManager } from '../../../utils/tokenManager';
import { useStatsContext } from '../../stats/context/StatsContext';

import QuoteForm from './QuoteForm';

interface QuoteManagementProps {
  token: string | null;
}

const QuoteManagement = React.memo(({ token }: QuoteManagementProps) => {
  const { t } = useTranslation();
  const { incrementSidebarCount } = useStatsContext();
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
  const lastQuoteFiltersRef = React.useRef<any | undefined>(undefined);
  const lastQuoteSortRef = React.useRef<any | undefined>(undefined);

  // Extract user role from token
  const userRole = useMemo(() => {
    const tokenValue = tokenManager.getToken();
    if (!tokenValue) return 'Clerk';
    
    const decoded = decodeJWT(tokenValue);
    return decoded?.role || 'Clerk';
  }, []);

  const fetchQuotes = useCallback(async (filters?: any, sort?: any, pagination?: any) => {
    setLoading(true);
    setError('');
    try {
      // Persist last used filters and sort for later silent refreshes
      lastQuoteFiltersRef.current = filters;
      lastQuoteSortRef.current = sort;
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

      const url = `${QUOTE_ENDPOINTS?.LIST || '/api/quotes'}${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await secureApiClient.get(url);
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToFetchQuotes'));
      }
      
      const apiData = responseData.data || {};
      const transformed = {
        quotes: Array.isArray(apiData.items) ? apiData.items : (apiData.quotes || []),
        pagination: apiData.pagination || {
          totalItems: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0
        },
        filters: apiData.filters || { statuses: [], customers: [] }
      } as QuoteListResponse;

      setQuotes(transformed);
    } catch (e: any) {
      let errorMessage = e.message || t('errors.anErrorOccurred');
      
      // Handle network error
      if (errorMessage === 'NETWORK_ERROR') {
        errorMessage = t('errors.networkError');
      }
      
      setError(errorMessage);
      // Don't show toast for initial load - only show error in state
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
        lines: quote.lines.map(line => {
          if ('CatalogItemId' in line && line.CatalogItemId) {
            return {
              id: Date.now() + Math.random(),
              description: '',
              quantity: line.quantity,
              unitPrice: 0,
              total: line.quantity * 0,
              quoteId: Date.now(),
              taxRate: 0,
              CatalogItemId: line.CatalogItemId,
            };
          } else {
            const manual = line as any;
            return {
              id: Date.now() + Math.random(),
              description: manual.description,
              quantity: manual.quantity,
              unitPrice: manual.unitPrice,
              total: manual.quantity * manual.unitPrice,
              quoteId: Date.now(),
              taxRate: manual.taxRate,
              CatalogItemId: null,
            };
          }
        }),
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

      const res = await secureApiClient.post(QUOTE_ENDPOINTS?.CREATE || '/api/quotes', quote);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
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

        let errorTitle = t('quote.form.errors.submissionFailed');
        let errorBody = '';
        if (responseData?.errors) {
          if (Array.isArray(responseData.errors)) {
            errorBody = responseData.errors.join('\n');
          } else if (typeof responseData.errors === 'object') {
            errorBody = Object.values(responseData.errors).flat().join('\n');
          }
        }
        if (responseData?.message) {
          errorTitle = responseData.message;
        } else if (responseData?.title) {
          errorTitle = responseData.title;
        }

        const error = new Error(errorBody || errorTitle);
        (error as any).title = errorTitle;
        (error as any).body = errorBody;
        (error as any).errors = responseData?.errors;
        throw error;
      }

      const data = responseData.data;
      
      // Update sidebar count
      incrementSidebarCount('quotesCount', 1);
      
      toast.success(responseData.message || t('quote.messages.created'), {
        duration: 4000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5'
        }
      });
      
      // Replace temporary quote with real data
      if (quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => q.id === tempQuote.id ? data : q)
        }));
      }
    } catch (error: any) {
      let errorTitle = t('quote.form.errors.submissionFailed');
      let errorBody = '';
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (error.title) {
        errorTitle = error.title;
      } else if (typeof error.message === 'string') {
        errorTitle = error.message;
      }
      const formatted = errorBody
        ? `${errorTitle}\n\n${errorBody.split('\n').map((l: string) => `• ${l}`).join('\n')}`
        : errorTitle;
      toast.error(formatted, {
        duration: 5000,
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }
      });
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
          type: originalQuote.customer?.type || 0,
          legalName: customerName || originalQuote.customer?.legalName || originalQuote.customerName || 'Unknown Customer',
          ice: originalQuote.customer?.ice,
          identifiantFiscal: originalQuote.customer?.identifiantFiscal,
          address: originalQuote.customer?.address || '',
          email: originalQuote.customer?.email,
          phoneNumber: originalQuote.customer?.phoneNumber
        },
        customerId: quote.customerId,
        subTotal: quote.subTotal,
        vat: quote.vat,
        total: quote.total,
        status: quote.status,
        lines: quote.lines.map(line => {
          if ('CatalogItemId' in line && line.CatalogItemId) {
            return {
              id: Date.now() + Math.random(),
              description: '',
              quantity: line.quantity,
              unitPrice: 0,
              total: line.quantity * 0,
              quoteId: quote.id!,
              taxRate: 0,
              CatalogItemId: line.CatalogItemId,
            };
          } else {
            const manual = line as any;
            return {
              id: Date.now() + Math.random(),
              description: manual.description,
              quantity: manual.quantity,
              unitPrice: manual.unitPrice,
              total: manual.quantity * manual.unitPrice,
              quoteId: quote.id!,
              taxRate: manual.taxRate,
              CatalogItemId: null,
            };
          }
        }),
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

      const res = await secureApiClient.put(QUOTE_ENDPOINTS?.UPDATE?.(quote.id!) || `/api/quotes/${quote.id}`, quote);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === quote.id! ? originalQuote : q
            )
          }));
        }

        let errorTitle = t('quote.form.errors.submissionFailed');
        let errorBody = '';
        if (responseData?.errors) {
          if (Array.isArray(responseData.errors)) {
            errorBody = responseData.errors.join('\n');
          } else if (typeof responseData.errors === 'object') {
            errorBody = Object.values(responseData.errors).flat().join('\n');
          }
        }
        if (responseData?.message) {
          errorTitle = responseData.message;
        } else if (responseData?.title) {
          errorTitle = responseData.title;
        }
        const error = new Error(errorBody || errorTitle);
        (error as any).title = errorTitle;
        (error as any).body = errorBody;
        (error as any).errors = responseData?.errors;
        throw error;
      }

      // Update with server response to ensure consistency
      if (responseData.data && quotes) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => 
            q.id === quote.id! ? { ...responseData.data, customerName: customerName || q.customerName } : q
          )
        }));
      }

      toast.success(responseData.message || t('quote.messages.updated'), {
        duration: 4000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5'
        }
      });
    } catch (error: any) {
      let errorTitle = t('quote.form.errors.submissionFailed');
      let errorBody = '';
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (error.title) {
        errorTitle = error.title;
      } else if (typeof error.message === 'string') {
        errorTitle = error.message;
      }
      const formatted = errorBody
        ? `${errorTitle}\n\n${errorBody.split('\n').map((l: string) => `• ${l}`).join('\n')}`
        : errorTitle;
      toast.error(formatted, {
        duration: 5000,
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }
      });
      throw error;
    }
  }, [token, t, quotes]);

  const handleDeleteQuote = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.processing'));
    
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
      const res = await secureApiClient.delete(url);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        setQuotes(originalData);
        let errorTitle = t('quote.list.deleteError');
        let errorBody = '';
        if (responseData?.errors) {
          if (Array.isArray(responseData.errors)) {
            errorBody = responseData.errors.join('\n');
          } else if (typeof responseData.errors === 'object') {
            errorBody = Object.values(responseData.errors).flat().join('\n');
          }
        }
        if (responseData?.message) {
          errorTitle = responseData.message;
        } else if (responseData?.title) {
          errorTitle = responseData.title;
        }
        const err = new Error(errorBody || errorTitle);
        (err as any).title = errorTitle;
        (err as any).body = errorBody;
        (err as any).errors = responseData?.errors;
        throw err;
      }

      // If the page will be incomplete, refresh the current page data
      if (willPageBeIncomplete) {
        // Silently refresh the current page to get the missing items
        const queryParams = new URLSearchParams();
        queryParams.append('page', quotes!.pagination.page.toString());
        queryParams.append('pageSize', quotes!.pagination.pageSize.toString());
        // Re-apply last filters
        if (lastQuoteFiltersRef.current) {
          Object.entries(lastQuoteFiltersRef.current).forEach(([key, value]) => {
            if (value && value !== '') queryParams.append(key, value as string);
          });
        }
        // Re-apply last sort
        if (lastQuoteSortRef.current) {
          queryParams.append('sortField', lastQuoteSortRef.current.sortField);
          queryParams.append('sortDirection', lastQuoteSortRef.current.sortDirection);
        }
        
        try {
          const response = await secureApiClient.get(`${QUOTE_ENDPOINTS.LIST}?${queryParams.toString()}`);
          
          const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
          if (response.ok && responseData?.succeeded) {
            const apiData = responseData.data || {};
            const transformed = {
              quotes: Array.isArray(apiData.items) ? apiData.items : (apiData.quotes || []),
              pagination: apiData.pagination || {
                totalItems: 0,
                page: 1,
                pageSize: 20,
                totalPages: 0
              },
              filters: apiData.filters || { statuses: [], customers: [] }
            } as QuoteListResponse;
            setQuotes(transformed);
          }
        } catch (error) {
          // Failed to refresh page data
        }
      } else if (quotes && quotes.quotes.length === 0 && quotes.pagination.page > 1) {
        // If this was the last item on the page and it's not handled above, load previous page
        const prevPage = quotes.pagination.page - 1;
        const queryParams = new URLSearchParams();
        queryParams.append('page', prevPage.toString());
        queryParams.append('pageSize', quotes.pagination.pageSize.toString());
        if (lastQuoteFiltersRef.current) {
          Object.entries(lastQuoteFiltersRef.current).forEach(([key, value]) => {
            if (value && value !== '') queryParams.append(key, value as string);
          });
        }
        if (lastQuoteSortRef.current) {
          queryParams.append('sortField', lastQuoteSortRef.current.sortField);
          queryParams.append('sortDirection', lastQuoteSortRef.current.sortDirection);
        }
        try {
          const response = await secureApiClient.get(`${QUOTE_ENDPOINTS.LIST}?${queryParams.toString()}`);
          const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
          if (response.ok && responseData?.succeeded) {
            const apiData = responseData.data || {};
            const transformed = {
              quotes: Array.isArray(apiData.items) ? apiData.items : (apiData.quotes || []),
              pagination: apiData.pagination || {
                totalItems: 0,
                page: prevPage,
                pageSize: quotes.pagination.pageSize,
                totalPages: 0
              },
              filters: apiData.filters || { statuses: [], customers: [] }
            } as QuoteListResponse;
            setQuotes(transformed);
          }
        } catch (error) {
          // ignore
        }
      }

      // Update sidebar count
      incrementSidebarCount('quotesCount', -1);

      toast.success(responseData.message || t('quote.list.deleteSuccess', { count: 1 }), {
        id: toastId,
        duration: 4000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5'
        }
      });
    } catch (error: any) {
      let errorTitle = t('quote.list.deleteError');
      let errorBody = '';
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (typeof error.message === 'string') {
        errorTitle = error.message;
      }
      const formatted = errorBody
        ? `${errorTitle}\n\n${errorBody.split('\n').map((l: string) => `• ${l}`).join('\n')}`
        : errorTitle;
      toast.error(formatted, {
        id: toastId,
        duration: 5000,
        style: {
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }
      });
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

      // Map to numeric status and call POST /status/{code}
      const statusCodeMap: { [key: string]: number } = { 'Sent': 1, 'Accepted': 2, 'Rejected': 3 };
      const statusCode = statusCodeMap[status];
      const res = await secureApiClient.post(`${QUOTE_ENDPOINTS.UPDATE_STATUS(id)}/${statusCode}`);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === id ? originalQuote : q
            )
          }));
        }
        let errorTitle = t('quote.list.statusUpdateError');
        let errorBody = '';
        if (responseData?.errors) {
          if (Array.isArray(responseData.errors)) {
            errorBody = responseData.errors.join('\n');
          } else if (typeof responseData.errors === 'object') {
            errorBody = Object.values(responseData.errors).flat().join('\n');
          }
        }
        if (responseData?.message) {
          errorTitle = responseData.message;
        } else if (responseData?.title) {
          errorTitle = responseData.title;
        }
        const err = new Error(errorBody || errorTitle);
        (err as any).title = errorTitle;
        (err as any).body = errorBody;
        (err as any).errors = responseData?.errors;
        throw err;
      }

      toast.success(responseData.message || t('quote.list.statusUpdateSuccess'));
    } catch (error: any) {
      let errorTitle = t('quote.list.statusUpdateError');
      let errorBody = '';
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (typeof error.message === 'string') {
        errorTitle = error.message;
      }
      const formatted = errorBody ? `${errorTitle}\n\n${errorBody.split('\n').map((l: string) => `• ${l}`).join('\n')}` : errorTitle;
      toast.error(formatted);
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

      const res = await secureApiClient.post(QUOTE_ENDPOINTS?.CONVERT_TO_INVOICE?.(id) || `/api/quotes/${id}/convert`);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === id ? originalQuote : q
            )
          }));
        }
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('quote.list.convertToInvoiceError'));
      }

      const data = responseData.data;
      const invoiceNumber = data?.newInvoiceNumber || data?.invoiceNumber || 'N/A';
      const successText = responseData.message || t('quote.messages.convertToInvoiceSuccess', { invoiceNumber });
      
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
                  <p className="text-sm font-medium text-gray-900">{successText}</p>
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
      // Revert optimistic update on unexpected/network errors
      if (quotes && originalQuote) {
        setQuotes(prev => ({
          ...prev!,
          quotes: prev!.quotes.map(q => q.id === id ? originalQuote : q)
        }));
      }
      toast.error(error.message || t('quote.messages.convertToInvoiceError'));
      throw error;
    }
  }, [token, t, quotes]);

  const handleDownloadPdf = useCallback(async (id: number) => {
    try {
      const res = await secureApiClient.get(QUOTE_ENDPOINTS?.DOWNLOAD_PDF?.(id) || `/api/quotes/${id}/pdf-url`);

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

      const res = await secureApiClient.post(`${QUOTE_ENDPOINTS.UPDATE_STATUS(id)}/1`);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        if (quotes) {
          setQuotes(prev => ({
            ...prev!,
            quotes: prev!.quotes.map(q => 
              q.id === id ? originalQuote : q
            )
          }));
        }
        let errorTitle = t('quote.list.submitError');
        let errorBody = '';
        if (responseData?.errors) {
          if (Array.isArray(responseData.errors)) {
            errorBody = responseData.errors.join('\n');
          } else if (typeof responseData.errors === 'object') {
            errorBody = Object.values(responseData.errors).flat().join('\n');
          }
        }
        if (responseData?.message) {
          errorTitle = responseData.message;
        } else if (responseData?.title) {
          errorTitle = responseData.title;
        }
        const err = new Error(errorBody || errorTitle);
        (err as any).title = errorTitle;
        (err as any).body = errorBody;
        (err as any).errors = responseData?.errors;
        throw err;
      }

      toast.success(responseData.message || t('quote.list.submitSuccess'));
    } catch (error: any) {
      let errorTitle = t('quote.list.submitError');
      let errorBody = '';
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (typeof error.message === 'string') {
        errorTitle = error.message;
      }
      const formatted = errorBody ? `${errorTitle}\n\n${errorBody.split('\n').map((l: string) => `• ${l}`).join('\n')}` : errorTitle;
      toast.error(formatted);
    }
  }, [token, t, quotes]);

  const handleImportCSV = useCallback(async (file: File) => {
    setImportLoading(true);
    const toastId = toast.loading(t('common.file.importingCSV'));
    let successShown = false;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await secureApiClient.post(QUOTE_ENDPOINTS.IMPORT_CSV, formData, true, true);

      if (response.status === 401) {
        toast.error(t('common.unauthorized'), { id: toastId });
        return;
      }

      if (response.status === 500) {
        toast.error(t('errors.unexpectedError'), { id: toastId });
        return;
      }

      const data = await response.json();

      if (response.ok && data.succeeded) {
        const imported = data.data?.importedCount || data.data?.imported || data.data?.count || 0;
        const total = data.data?.total || data.data?.count || imported;
        const successMessage = data.message || t('common.file.importSuccess', { imported, total });

        // Update sidebar count
        if (imported > 0) {
          incrementSidebarCount('quotesCount', imported);
        }

        toast.dismiss(toastId);
        successShown = true;
        toast.success(successMessage, {
          duration: 4000,
          style: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
          lineHeight: '1.5'
          }
        });
        await fetchQuotes();
      } else {
        const errorMessage = data.message || t('errors.failedToImportCSV');
        const details = (Array.isArray(data.errors) && data.errors.length > 0)
          ? data.errors
          : (Array.isArray(data.details) ? data.details : []);

        toast.dismiss(toastId);
        setErrorModal({
          isOpen: true,
          title: t('common.error'),
          message: errorMessage,
          details
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.failedToImportCSV');
      toast.dismiss(toastId);
      setErrorModal({
        isOpen: true,
        title: t('common.error'),
        message: errorMessage,
        details: []
      });
    } finally {
      setImportLoading(false);
      if (!successShown) {
        toast.dismiss(toastId);
      }
    }
  }, [token, t, fetchQuotes]);



  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        {canImportCSV(userRole) && (
          <QuoteImportCSV onImport={handleImportCSV} loading={importLoading} />
        )}
        <button
          onClick={() => setShowQuoteForm(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
            importLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
                          {t('quote.create')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <QuoteList
          data={quotes}
          loading={loading}
          error={error}
          onDelete={handleDeleteQuote}
          onDownloadPdf={handleDownloadPdf}
          onSubmit={handleSubmitQuote}
          onCreateQuote={handleCreateQuote}
          onUpdateQuote={handleUpdateQuote}
          onRefreshQuotes={fetchQuotes}
          token={token}
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