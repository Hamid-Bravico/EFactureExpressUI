import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Quote, NewQuote } from '../types/quote.types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import QuoteForm from './QuoteForm';
import QuoteDetail from './QuoteDetail';
import QuoteStatusBadge from './QuoteStatusBadge';
import { 
  canSelectQuoteForBulkOperation,
  QuoteStatus,
  canUpdateQuote,
  canDeleteQuote
} from '../utils/quote.permissions';
import { tokenManager } from '../../../utils/tokenManager';
import { decodeJWT } from '../../../utils/jwt';

export interface QuoteListResponse {
  quotes: Array<{
    id: number;
    quoteNumber: string;
    issueDate: string;
    expiryDate?: string;
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
    termsAndConditions?: string;
    privateNotes?: string;
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

interface QuoteListProps {
  data: QuoteListResponse | null;
  loading: boolean;
  error?: string | null;
  onDelete: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onSubmit: (id: number) => void;
  onCreateQuote: (quote: NewQuote, customerName?: string) => Promise<void>;
  onUpdateQuote: (quote: NewQuote, customerName?: string) => Promise<void>;
  onRefreshQuotes: (filters?: any, sort?: any, pagination?: any) => Promise<void>;
  disabled?: boolean;
  token: string | null;

  onBulkDelete?: (ids: number[]) => Promise<void>;
  onUpdateQuoteStatus?: (id: number, status: string) => void;
  onOptimisticQuoteStatusUpdate?: (id: number, status: string) => void;
  onConvertToInvoice?: (id: number) => Promise<void>;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  q: string;
  status: string;
  amountFrom: string;
  amountTo: string;
}

const QuoteList: React.FC<QuoteListProps> = React.memo(({
  data,
  loading,
  error,
  onDelete,
  onDownloadPdf,
  onSubmit,
  onCreateQuote,
  onUpdateQuote,
  token,
  onRefreshQuotes,
  disabled = false,


  onBulkDelete,
  onUpdateQuoteStatus,
  onOptimisticQuoteStatusUpdate,
  onConvertToInvoice
}) => {
  const { t, i18n } = useTranslation();
  const [selectedQuotes, setSelectedQuotes] = useState<Set<number>>(new Set());
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ type: 'delete'; count: number } | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ quoteId: number; reason: string } | null>(null);
  const [downloadDropdownOpenId, setDownloadDropdownOpenId] = useState<number | null>(null);
  const downloadDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Filter and sort state
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    q: '',
    status: 'all',
    amountFrom: '',
    amountTo: ''
  });
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const userRole = useMemo(() => {
    const token = tokenManager.getToken();
    if (!token) return 'Clerk';
    
    const decoded = decodeJWT(token);
    return decoded?.role || 'Clerk';
  }, []);

  // Memoized computed values for better performance
  const selectableQuotes = useMemo(() => {
    if (!data?.quotes) return [];
    return data.quotes.filter(quote => 
      canSelectQuoteForBulkOperation(userRole, quote.status as QuoteStatus, 'delete')
    );
  }, [data?.quotes, userRole]);

  const allSelectable = useMemo(() => {
    if (!data?.quotes || selectableQuotes.length === 0) return false;
    return selectedQuotes.size === selectableQuotes.length && selectableQuotes.length > 0;
  }, [data?.quotes, selectedQuotes.size, selectableQuotes.length]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        downloadDropdownOpenId !== null &&
        downloadDropdownRefs.current[downloadDropdownOpenId] &&
        !downloadDropdownRefs.current[downloadDropdownOpenId]?.contains(event.target as Node)
      ) {
        setDownloadDropdownOpenId(null);
      }
    }
    if (downloadDropdownOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadDropdownOpenId]);

  // Keyboard navigation support
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Close dropdowns on Escape
      if (event.key === 'Escape') {
        setDownloadDropdownOpenId(null);
        setShowConfirmDialog(null);
        setRejectionModal(null);
      }
      
      // Select all with Ctrl+A
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        if (data?.quotes && selectableQuotes.length > 0) {
          setSelectedQuotes(new Set(selectableQuotes.map(quote => quote.id)));
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [data?.quotes, selectableQuotes]);



  // Update handleSort to only allow valid sortField values
  const handleSort = useCallback((field: string) => {
    const validFields = ['date', 'expiryDate', 'quoteNumber', 'customer', 'total', 'status'] as const;
    if (!validFields.includes(field as any)) return;
    
    const newSortField = field as typeof validFields[number];
    const newSortDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(newSortField);
    setSortDirection(newSortDirection);
    
    // Trigger API call for sorting
    onRefreshQuotes(filters, { sortField: newSortField, sortDirection: newSortDirection }, { page: currentPage, pageSize });
  }, [sortField, sortDirection, filters, currentPage, pageSize, onRefreshQuotes]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!data?.quotes) return;
    
    if (e.target.checked) {
      setSelectedQuotes(new Set(selectableQuotes.map(quote => quote.id)));
    } else {
      setSelectedQuotes(new Set());
    }
  }, [data?.quotes, selectableQuotes]);

  const handleSelectQuote = useCallback((id: number, status: string) => {
    const quoteStatus = status as QuoteStatus;
    
    // Check if quote can be selected for bulk delete operation
    const canSelectForDelete = canSelectQuoteForBulkOperation(userRole, quoteStatus, 'delete');
    
    if (canSelectForDelete) {
      setSelectedQuotes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    }
  }, [userRole]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Reset to first page when filters change
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      q: '',
      status: 'all',
      amountFrom: '',
      amountTo: ''
    });
    setCurrentPage(1);
    // The useEffect will trigger the API call
  }, []);

  // Apply filters and trigger API call
  const applyFiltersAndSort = useCallback(() => {
    const sortParams = sortField ? { sortField, sortDirection } : undefined;
    onRefreshQuotes(filters, sortParams, { page: currentPage, pageSize });
  }, [filters, sortField, sortDirection, currentPage, pageSize, onRefreshQuotes]);

  // Sync local state with server response
  useEffect(() => {
    if (data?.pagination) {
      setCurrentPage(data.pagination.page);
      setPageSize(data.pagination.pageSize);
    }
  }, [data?.pagination]);



  const handleBulkDelete = useCallback(async () => {
    if (!data?.quotes) return;
    // Allow bulk delete for quotes that can be deleted based on permissions
    const deleteIds = Array.from(selectedQuotes).filter(id => {
      const quote = data.quotes.find(q => q.id === id);
      return quote && canSelectQuoteForBulkOperation(userRole, quote.status as QuoteStatus, 'delete');
    });
    if (deleteIds.length === 0) return;
    setShowConfirmDialog({
      type: 'delete',
      count: deleteIds.length
    });
  }, [selectedQuotes, data?.quotes, userRole]);

  const confirmBulkAction = useCallback(async () => {
    if (!showConfirmDialog || !data?.quotes) return;

    setShowConfirmDialog(null);

    try {
      // Delete quotes that can be deleted based on permissions
      const deleteIds = Array.from(selectedQuotes).filter(id => {
        const quote = data.quotes.find(q => q.id === id);
        return quote && canSelectQuoteForBulkOperation(userRole, quote.status as QuoteStatus, 'delete');
      });
      
      if (onBulkDelete && deleteIds.length > 0) {
        await onBulkDelete(deleteIds);
      }
      setSelectedQuotes(new Set());
    } catch (error) {
      toast.error(
        t('errors.bulkActionFailed', { 
          action: t('quote.actions.delete'),
          error: error instanceof Error ? error.message : t('errors.unknown')
        })
      );
    }
  }, [showConfirmDialog, selectedQuotes, data?.quotes, onBulkDelete, userRole, t]);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm(t('quote.confirm.message', { 
      action: t('quote.delete'),
      count: 1,
      plural: '',
      warning: t('quote.confirm.warning')
    }))) {
      onDelete(id);
    }
  }, [onDelete, t]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    
    // Trigger API call for page size change
    const sortParams = sortField ? { sortField, sortDirection } : undefined;
    onRefreshQuotes(filters, sortParams, { page: 1, pageSize: newPageSize });
  }, [filters, sortField, sortDirection, onRefreshQuotes]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'MAD',
    }).format(amount);
  }, [i18n.language]);

  const isQuoteExpired = useCallback((expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }, []);

  const canEditQuote = useCallback((quote: any) => {
    return canUpdateQuote(userRole, quote.status as QuoteStatus);
  }, [userRole]);

  const canDeleteQuoteLocal = useCallback((quote: any) => {
    return canDeleteQuote(userRole, quote.status as QuoteStatus);
  }, [userRole]);

  const handleEditQuote = useCallback((quoteData: any) => {
    // Map the quote data to match the Quote interface
    const quote: Quote = {
      id: quoteData.id,
      quoteNumber: quoteData.quoteNumber,
      issueDate: quoteData.issueDate,
      expiryDate: quoteData.expiryDate,
      customer: {
        id: quoteData.customer?.id || quoteData.customerId || 0,
        name: quoteData.customerName
      },
      subTotal: quoteData.subTotal,
      vat: quoteData.vat,
      total: quoteData.total,
      lines: quoteData.lines.map((line: any) => ({
        id: line.id || 0,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
        quoteId: quoteData.id,
        taxRate: line.taxRate || 0,
        catalogItemId: line.catalogItemId || null
      })),
      status: quoteData.status,
      createdAt: quoteData.createdAt,
      createdBy: {
        createdById: quoteData.createdById || '',
        name: quoteData.createdBy,
        email: ''
      },
      vatRate: quoteData.vatRate,
      termsAndConditions: quoteData.termsAndConditions,
      privateNotes: quoteData.privateNotes
    };
    setEditingQuote(quote);
    setShowQuoteForm(true);
  }, []);

  const handleQuoteFormSubmit = useCallback(async (quoteData: NewQuote, customerName?: string) => {
    try {
      if (editingQuote) {
        await onUpdateQuote(quoteData, customerName);
      } else {
        await onCreateQuote(quoteData, customerName);
      }
      setShowQuoteForm(false);
    } catch (error: any) {
      toast.error(error.message || t('quote.messages.submissionFailed'));
      throw error;
    }
  }, [editingQuote, onUpdateQuote, onCreateQuote, t]);

  const handleQuoteFormClose = useCallback(() => {
    setShowQuoteForm(false);
    setEditingQuote(undefined);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state handling
  if (error || (!data && !loading)) {
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-6">
            <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{error || t('quote.messages.loadFailed')}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            {t('errors.tryRefreshing')}
          </p>
          <button
            onClick={() => onRefreshQuotes()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{t('quote.filters.title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showFilters ? t('quote.filters.hide') : t('quote.filters.show')}
              <svg 
                className={`w-4 h-4 ml-1.5 transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={applyFiltersAndSort}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 hover:border-blue-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('quote.filters.apply')}
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('quote.filters.reset')}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t('quote.filters.dateRange')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {t('invoice.filters.searchTerm')}
              </label>
              <input
                type="text"
                name="q"
                value={filters.q}
                onChange={handleFilterChange}
                placeholder={t('invoice.filters.searchPlaceholder')}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('quote.filters.status')}
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              >
                <option value="all">{t('quote.filters.all')}</option>
                <option value="0">{t('quote.status.draft')}</option>
                <option value="1">{t('quote.status.sent')}</option>
                <option value="2">{t('quote.status.accepted')}</option>
                <option value="3">{t('quote.status.rejected')}</option>
                <option value="4">{t('quote.status.converted')}</option>
                <option value="5">{t('quote.list.expired')}</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {t('quote.filters.amountRange')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="amountFrom"
                  value={filters.amountFrom}
                  onChange={handleFilterChange}
                  placeholder={t('quote.filters.min')}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
                <input
                  type="number"
                  name="amountTo"
                  value={filters.amountTo}
                  onChange={handleFilterChange}
                  placeholder={t('quote.filters.max')}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedQuotes.size > 0 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in-scale">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4 backdrop-blur-sm bg-white/95">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {t('quote.bulk.selected', { count: selectedQuotes.size })}
                </span>
              </div>
              <div className="flex items-center gap-2">

                <button
                  onClick={handleBulkDelete}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-150 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                    disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('quote.bulk.delete')}
                </button>
                <button
                  onClick={() => setSelectedQuotes(new Set())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  title={t('quote.bulk.clearSelection')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('common.clear')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

             {/* Quotes Table */}
       {!data?.quotes || data.quotes.length === 0 ? (
         <div className="text-center py-16">
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
             <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mx-auto mb-6">
               <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('quote.list.noQuotes')}</h3>
             <p className="text-gray-600 leading-relaxed">
               {Object.values(filters).some(v => v !== '' && v !== 'all') 
                 ? t('quote.list.adjustFilters')
                 : t('quote.list.getStarted')}
             </p>
           </div>
         </div>
       ) : (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-100">
               <thead className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-100">
                 <tr>
                   <th scope="col" className="relative px-4 py-3">
                     <input
                       type="checkbox"
                       className="absolute left-2 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 hover:scale-110"
                       checked={allSelectable}
                       onChange={handleSelectAll}
                     />
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('quoteNumber')}
                   >
                     <div className="flex items-center gap-2">
                       {t('quote.list.quoteNumber')}
                       {sortField === 'quoteNumber' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('date')}
                   >
                     <div className="flex items-center gap-2">
                       {t('quote.list.issueDate')}
                       {sortField === 'date' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('expiryDate')}
                   >
                     <div className="flex items-center gap-2">
                       {t('quote.list.expiryDate')}
                       {sortField === 'expiryDate' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('customer')}
                   >
                     <div className="flex items-center gap-2">
                       {t('quote.list.customer')}
                       {sortField === 'customer' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('total')}
                   >
                     <div className="flex items-center justify-end gap-2">
                       {t('quote.list.amount')}
                       {sortField === 'total' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('status')}
                   >
                     <div className="flex items-center gap-2">
                       {t('quote.list.status')}
                       {sortField === 'status' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                     {t('quote.list.actions')}
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-50">
                 {data?.quotes?.map((quote) => (
                   <React.Fragment key={quote.id}>
                     <tr 
                       className="hover:bg-blue-50/40 cursor-pointer transition-all duration-300 group"
                       onClick={() => setSelectedQuote(selectedQuote === quote.id ? null : quote.id)}
                     >
                       <td className="px-4 py-2 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-r"></div>
                         <input
                           type="checkbox"
                           className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 hover:scale-110"
                           checked={selectedQuotes.has(quote.id)}
                           onChange={() => handleSelectQuote(quote.id, quote.status)}
                           disabled={
                             !canSelectQuoteForBulkOperation(userRole, quote.status as QuoteStatus, 'delete') &&
                             !canSelectQuoteForBulkOperation(userRole, quote.status as QuoteStatus, 'submit')
                           }
                         />
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                          <div 
                            className={`text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center ${quote.createdBy ? 'cursor-help relative group/tooltip' : ''}`}
                            title={quote.createdBy ? t('quote.tooltip.createdBy', { 
                              date: quote.createdAt ? new Date(quote.createdAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : t('common.unknownDate'),
                              name: quote.createdBy
                            }) : undefined}
                          >
                           <span className="text-blue-600 mr-1">#</span>
                           {quote.quoteNumber}
                           {quote.createdBy && (
                             <svg className="w-3 h-3 text-gray-400 ml-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                           )}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                         <div className="text-sm text-gray-700 flex items-center">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           </svg>
                           {new Date(quote.issueDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                         <div className="text-sm text-gray-700 flex items-center">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           </svg>
                           {quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : '-'}
                                                 {isQuoteExpired(quote.expiryDate) && (
                        <span className="ml-1 px-1 py-0 text-xs font-medium text-red-600 bg-red-100 rounded text-[10px]">
                          {t('quote.list.expired')}
                        </span>
                      )}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                         <div 
                           className="text-sm font-medium text-gray-900 flex items-center cursor-help"
                           title={quote.customer?.name || quote.customerName || 'Unknown Customer'}
                         >
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                           </svg>
                           {quote.customer?.name || quote.customerName || 'Unknown Customer'}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap text-right">
                         <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                           </svg>
                           {formatCurrency(quote.total)}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="animate-status-change">
                           <QuoteStatusBadge 
                             status={quote.status}
                           />
                         </div>
                       </td>
                                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end gap-1.5 relative">
                           {canEditQuote(quote) && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleEditQuote(quote);
                               }}
                               className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-all duration-200 p-1.5 rounded-lg hover:bg-blue-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-blue-200"
                               disabled={disabled}
                               title={t('common.edit')}
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                               </svg>
                             </button>
                           )}
                           
                           {canDeleteQuoteLocal(quote) && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDelete(quote.id);
                               }}
                               className="text-red-600 hover:text-red-700 disabled:opacity-50 transition-all duration-200 p-1.5 rounded-lg hover:bg-red-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-red-200"
                               disabled={disabled}
                               title={t('common.delete')}
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                             </button>
                           )}
                         </div>
                       </td>
                     </tr>
                     {selectedQuote === quote.id && (
                       <tr>
                         <td colSpan={8} className="px-6 py-4 bg-gray-50">
                           <QuoteDetail
                             quote={{
                               id: quote.id,
                               quoteNumber: quote.quoteNumber,
                               issueDate: quote.issueDate,
                               expiryDate: quote.expiryDate,
                               customer: {
                                 id: quote.customer?.id || quote.customerId || 0,
                                 name: quote.customer?.name || quote.customerName || 'Unknown Customer',
                                 ice: quote.customer?.ice
                               },
                               subTotal: quote.subTotal,
                               vat: quote.vat,
                               total: quote.total,
                               lines: quote.lines.map((line: any) => ({
                                 id: line.id || 0,
                                 description: line.description,
                                 quantity: line.quantity,
                                 unitPrice: line.unitPrice,
                                 total: line.total,
                                 quoteId: quote.id,
                                 taxRate: line.taxRate || 0
                               })),
                               status: quote.status,
                               createdAt: quote.createdAt,
                               createdBy: {
                                 createdById: quote.createdById || '',
                                 name: quote.createdBy,
                                 email: ''
                               },
                               termsAndConditions: quote.termsAndConditions,
                               privateNotes: quote.privateNotes
                             }}
                             onOptimisticStatusUpdate={onOptimisticQuoteStatusUpdate}
                             onConvertToInvoice={onConvertToInvoice}
                             onDownloadPdf={onDownloadPdf}
                             disabled={disabled}
                             token={token}
                           />
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
       )}

      {/* Pagination */}
      {data?.pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => {
                if (data.pagination.page > 1) {
                  const newPage = data.pagination.page - 1;
                  setCurrentPage(newPage);
                  const sortParams = sortField ? { sortField, sortDirection } : undefined;
                  onRefreshQuotes(filters, sortParams, { page: newPage, pageSize });
                }
              }}
              disabled={data.pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.previous')}
            </button>
            <button
              onClick={() => {
                if (data.pagination.page < data.pagination.totalPages) {
                  const newPage = data.pagination.page + 1;
                  setCurrentPage(newPage);
                  const sortParams = sortField ? { sortField, sortDirection } : undefined;
                  onRefreshQuotes(filters, sortParams, { page: newPage, pageSize });
                }
              }}
              disabled={data.pagination.page >= data.pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next')}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-700">
                  {t('common.pagination.showing')} <span className="font-medium">{((data.pagination.page - 1) * data.pagination.pageSize) + 1}</span> {t('common.pagination.to')} <span className="font-medium">{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalItems)}</span> {t('common.pagination.of')} <span className="font-medium">{data.pagination.totalItems}</span> {t('common.pagination.results')}
                </p>
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">{t('common.pagination.show')}:</label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">{t('common.pagination.perPage')}</span>
              </div>
            </div>
            
            {data.pagination.totalPages > 1 && (
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => {
                      if (data.pagination.page > 1) {
                        const newPage = data.pagination.page - 1;
                        setCurrentPage(newPage);
                        const sortParams = sortField ? { sortField, sortDirection } : undefined;
                        onRefreshQuotes(filters, sortParams, { page: newPage, pageSize });
                      }
                    }}
                    disabled={data.pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('common.previous')}</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(data.pagination.totalPages - 4, data.pagination.page - 2)) + i;
                    if (pageNum > data.pagination.totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          const sortParams = sortField ? { sortField, sortDirection } : undefined;
                          onRefreshQuotes(filters, sortParams, { page: pageNum, pageSize });
                        }}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === data.pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => {
                      if (data.pagination.page < data.pagination.totalPages) {
                        const newPage = data.pagination.page + 1;
                        setCurrentPage(newPage);
                        const sortParams = sortField ? { sortField, sortDirection } : undefined;
                        onRefreshQuotes(filters, sortParams, { page: newPage, pageSize });
                      }
                    }}
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('common.next')}</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-4 ${
                                  'bg-red-100'
              }`}>
                                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('quote.confirm.title', { action: t('quote.delete') })}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {t('quote.confirm.message', { 
                action: t('quote.delete'),
                count: showConfirmDialog.count,
                plural: showConfirmDialog.count !== 1 ? 's' : '',
                warning: showConfirmDialog.type === 'delete' ? t('quote.confirm.warning') : ''
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmBulkAction}
                className="px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 bg-red-600 hover:bg-red-700"
              >
                {t('quote.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mr-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('quote.dgiStatus.rejectionReason')}
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                {rejectionModal.reason}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectionModal(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Form Modal */}
      {showQuoteForm && (
        <QuoteForm
          onSubmit={handleQuoteFormSubmit}
          onClose={handleQuoteFormClose}
          quote={editingQuote}
          disabled={disabled}
        />
      )}
    </div>
  );
});

export default QuoteList; 