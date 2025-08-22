import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CreditNoteForm from './CreditNoteForm';
import CreditNoteDetail from './CreditNoteDetail';
import ErrorModal from '../../../components/ErrorModal';
import { UserRole } from '../../../utils/shared.permissions';
import { tokenManager } from '../../../utils/tokenManager';
import { CreditNote, NewCreditNote } from '../types/creditNote.types';
import { canDeleteCreditNote, CreditNoteStatus } from '../utils/creditNote.permissions';
import CreditNoteStatusBadge from './CreditNoteStatusBadge';

interface CreditNoteListResponse {
  creditNotes: Array<{
    id: number;
    creditNoteNumber: string;
    date: string;
    customerName: string;
    customer?: {
      id: number;
      type: number;
      legalName: string;
      ice?: string;
      identifiantFiscal?: string;
      address: string;
      email?: string;
      phoneNumber?: string;
    };
    customerId?: number;
    total: number;
    status: number;
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
      creditNoteId?: number;
    }>;
    companyId?: string;
    dgiSubmissionId?: string;
    dgiRejectionReason?: string;
    warnings?: string[];
    originalInvoiceId?: number;
    isVatExempt?: boolean;
    vatExemptionReason?: string;
    paymentMethod?: number;
    paymentReference?: string;
    originalInvoice?: {
      id: number;
      invoiceNumber: string;
      date: string;
      customer: {
        id: number;
        legalName: string;
      };
    };
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

interface CreditNoteListProps {
  data: CreditNoteListResponse | null;
  loading: boolean;
  error?: string | null;
  onDelete: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onSubmit: (id: number) => void;
  onCreateCreditNote: (creditNote: NewCreditNote) => Promise<void>;
  onUpdateCreditNote: (creditNote: NewCreditNote, customerName?: string) => Promise<void>;
  onRefreshCreditNotes: (filters?: any, sort?: any, pagination?: any) => Promise<void>;
  disabled?: boolean;
  importLoading: boolean;
  onImportCSV: (file: File) => Promise<void>;
  onUpdateCreditNoteStatus?: (id: number, status: number, dgiSubmissionId?: string, dgiRejectionReason?: string) => void;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
  status: string;
  amountFrom: string;
  amountTo: string;
}

const CreditNoteList: React.FC<CreditNoteListProps> = React.memo(({
  data,
  loading,
  error,
  onDelete,
  onDownloadPdf,
  onSubmit,
  onCreateCreditNote,
  onUpdateCreditNote,
  onRefreshCreditNotes,
  disabled = false,
  importLoading,
  onImportCSV,
  onUpdateCreditNoteStatus
}) => {
  const { t, i18n } = useTranslation();
  const [selectedCreditNote, setSelectedCreditNote] = useState<number | null>(null);
  // Use a union type for sortField - no default sorting
  const [sortField, setSortField] = useState<'date' | 'creditNoteNumber' | 'customer' | 'total' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreditNoteForm, setShowCreditNoteForm] = useState(false);
  const [editingCreditNote, setEditingCreditNote] = useState<CreditNote | undefined>();
  const [rejectionReasonModal, setRejectionReasonModal] = useState<{
    isOpen: boolean;
    reason: string;
  }>({
    isOpen: false,
    reason: ''
  });





  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
    status: 'all',
    amountFrom: '',
    amountTo: ''
  });

  const userRole = useMemo(() => 
    tokenManager.getUserRole() as UserRole || 'Clerk', 
    []
  );

  // Fetch creditNotes when component mounts
  useEffect(() => {
    onRefreshCreditNotes();
  }, [onRefreshCreditNotes]);





  // Update handleSort to only allow valid sortField values
  const handleSort = useCallback((field: string) => {
    const validFields = ['date', 'creditNoteNumber', 'customer', 'total', 'status'] as const;
    if (!validFields.includes(field as any)) return;
    
    const newSortField = field as typeof validFields[number];
    const newSortDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(newSortField);
    setSortDirection(newSortDirection);
    
    // Trigger API call for sorting
    onRefreshCreditNotes(filters, { sortField: newSortField, sortDirection: newSortDirection }, { page: currentPage, pageSize });
  }, [sortField, sortDirection, filters, currentPage, pageSize, onRefreshCreditNotes]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
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
    onRefreshCreditNotes(filters, sortParams, { page: currentPage, pageSize });
  }, [filters, sortField, sortDirection, currentPage, pageSize, onRefreshCreditNotes]);

  // Sync local state with server response
  useEffect(() => {
    if (data?.pagination) {
      setCurrentPage(data.pagination.page);
      setPageSize(data.pagination.pageSize);
    }
  }, [data?.pagination]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    
    // Trigger API call for page size change
    const sortParams = sortField ? { sortField, sortDirection } : undefined;
    onRefreshCreditNotes(filters, sortParams, { page: 1, pageSize: newPageSize });
  }, [filters, sortField, sortDirection, onRefreshCreditNotes]);









  const handleEditCreditNote = useCallback(async (creditNote: any) => {
    try {
      // Transform the server response format to match the CreditNote type expected by CreditNoteForm
      // Use the customer data directly from the server response
      if (!creditNote.customer && !creditNote.customerName) {
        throw new Error('CreditNote customer data is missing');
      }
      
      // Transform the creditNote data
      const transformedCreditNote: CreditNote = {
        id: creditNote.id || 0,
        creditNoteNumber: creditNote.creditNoteNumber || '',
        date: creditNote.date || new Date().toISOString().split('T')[0],
        customer: { 
          id: creditNote.customer?.id || 0,
          type: creditNote.customer?.type || 0,
          legalName: creditNote.customer?.legalName || creditNote.customerName || 'Unknown Customer',
          ice: creditNote.customer?.ice,
          identifiantFiscal: creditNote.customer?.identifiantFiscal,
          address: creditNote.customer?.address || '',
          email: creditNote.customer?.email,
          phoneNumber: creditNote.customer?.phoneNumber
        },
        subTotal: creditNote.subTotal || 0,
        vat: creditNote.vat || 0,
        total: creditNote.total || 0,
        status: creditNote.status || 0,
        lines: (creditNote.lines || []).map((line: any, index: number) => ({
          id: line.id || index, // Use line ID if available, otherwise use index
          description: line.description || '',
          quantity: line.quantity || 1,
          unitPrice: line.unitPrice || 0,
          total: line.total || 0,
          creditNoteId: creditNote.id,
          taxRate: line.taxRate, // Use actual tax rate from server
          catalogItemId: line.catalogItemId || null
        })),
        createdAt: creditNote.createdAt || new Date().toISOString(),
        createdBy: {
          createdById: creditNote.createdById || '',
          name: creditNote.createdBy || 'Unknown',
          email: ''
        },
        dgiSubmissionId: creditNote.dgiSubmissionId || undefined,
        dgiRejectionReason: creditNote.dgiRejectionReason || undefined,
        originalInvoiceId: creditNote.originalInvoiceId || undefined,
        isVatExempt: creditNote.isVatExempt || false,
        vatExemptionReason: creditNote.vatExemptionReason || undefined,
        paymentMethod: creditNote.paymentMethod || 1, // Default to BankTransfer
        paymentReference: creditNote.paymentReference || undefined
      };
      
      setEditingCreditNote(transformedCreditNote);
      setShowCreditNoteForm(true);
    } catch (error) {
      toast.error(t('errors.failedToFetchCreditNote'));
    }
  }, [t]);

  const handleCreditNoteFormSubmit = useCallback(async (creditNote: NewCreditNote, customerName?: string) => {
    if (editingCreditNote) {
      await onUpdateCreditNote(creditNote, customerName);
    } else {
      await onCreateCreditNote(creditNote);
    }
    setShowCreditNoteForm(false);
    setEditingCreditNote(undefined);
  }, [editingCreditNote, onUpdateCreditNote, onCreateCreditNote]);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm(t('creditNote.confirm.delete'))) {
      onDelete(id);
    }
  }, [onDelete, t]);

  const handleShowRejectionReason = useCallback((reason: string) => {
    setRejectionReasonModal({
      isOpen: true,
      reason
    });
  }, []);

  // Helper functions for Edit/Delete buttons (similar to QuoteList pattern)
  const canEditCreditNote = useCallback((creditNote: any) => {
    return creditNote.status === 0; // Only draft creditNotes can be edited
  }, []);

  const canDeleteCreditNoteLocal = useCallback((creditNote: any) => {
    return canDeleteCreditNote(userRole, creditNote.status);
  }, [userRole]);



  // Format currency based on current language - memoized for performance
  const formatCurrency = useMemo(() => {
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
    
    return (amount: number) => {
      if (i18n.language === 'fr') {
        return formatters.fr.format(amount) + ' MAD';
      } else {
        return formatters.en.format(amount);
      }
    };
  }, [i18n.language]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{error || t('creditNote.messages.loadFailed')}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            {t('errors.tryRefreshing')}
          </p>
          <button
            onClick={() => onRefreshCreditNotes()}
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
            <h2 className="text-xl font-semibold text-gray-900">{t('creditNote.filters.title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showFilters ? t('creditNote.filters.hide') : t('creditNote.filters.show')}
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
              {t('creditNote.filters.apply')}
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('creditNote.filters.reset')}
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
                {t('creditNote.filters.dateRange')}
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
                {t('creditNote.filters.searchTerm')}
              </label>
              <input
                type="text"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder={t('creditNote.filters.searchPlaceholder')}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('creditNote.filters.status')}
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              >
                <option value="all">{t('creditNote.filters.all')}</option>
                <option value="0">{t('creditNote.status.draft')}</option>
                <option value="1">{t('creditNote.status.ready')}</option>
                <option value="2">{t('creditNote.status.awaitingClearance')}</option>
                <option value="3">{t('creditNote.status.validated')}</option>
                <option value="4">{t('creditNote.status.rejected')}</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {t('creditNote.filters.amountRange')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="amountFrom"
                  value={filters.amountFrom}
                  onChange={handleFilterChange}
                  placeholder={t('creditNote.filters.min')}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
                <input
                  type="number"
                  name="amountTo"
                  value={filters.amountTo}
                  onChange={handleFilterChange}
                  placeholder={t('creditNote.filters.max')}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
              </div>
            </div>
          </div>
        )}
      </div>




      {!data?.creditNotes || data.creditNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mx-auto mb-6">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('creditNote.list.noCreditNotes')}</h3>
            <p className="text-gray-600 leading-relaxed">
              {Object.values(filters).some(v => v !== '' && v !== 'all') 
                ? t('creditNote.list.adjustFilters')
                : t('creditNote.list.getStarted')}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-100">
                <tr>

                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                    onClick={() => handleSort('creditNoteNumber')}
                  >
                                          <div className="flex items-center gap-2">
                        {t('creditNote.list.creditNoteNumber')}
                        {sortField === 'creditNoteNumber' && (
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
                      {t('creditNote.list.date')}
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
                    onClick={() => handleSort('customer')}
                  >
                    <div className="flex items-center gap-2">
                      {t('creditNote.list.customer')}
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
                      {t('creditNote.list.amount')}
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
                      {t('creditNote.list.status')}
                      {sortField === 'status' && (
                        <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('creditNote.list.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {data?.creditNotes?.map((creditNote) => (
                  <React.Fragment key={creditNote.id}>
                    <tr 
                      className="hover:bg-blue-50/40 cursor-pointer transition-all duration-300 group"
                      onClick={() => setSelectedCreditNote(selectedCreditNote === creditNote.id ? null : creditNote.id)}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div 
                          className={`text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center ${creditNote.createdBy ? 'cursor-help relative group/tooltip' : ''}`}
                          title={creditNote.createdBy ? t('creditNote.tooltip.createdBy', { 
                            date: creditNote.createdAt ? new Date(creditNote.createdAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : 'Unknown date',
                            name: creditNote.createdBy
                          }) : undefined}
                        >
                          <span className="text-blue-600 mr-1">#</span>
                          {creditNote.creditNoteNumber}
                          {creditNote.warnings && creditNote.warnings.length > 0 && (
                            <svg className="w-4 h-4 text-yellow-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <title>{`${creditNote.warnings.length} warning(s)`}</title>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          )}
                          {creditNote.createdBy && (
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
                          {new Date(creditNote.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div 
                          className="text-sm font-medium text-gray-900 flex items-center cursor-help"
                          title={creditNote.customer?.legalName || creditNote.customerName || 'Unknown Customer'}
                        >
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {creditNote.customer?.legalName || creditNote.customerName || 'Unknown Customer'}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {formatCurrency(creditNote.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-status-change">
                          <CreditNoteStatusBadge 
                            status={creditNote.status}
                            dgiSubmissionId={creditNote.dgiSubmissionId}
                            dgiRejectionReason={creditNote.dgiRejectionReason}
                            onShowRejectionReason={() => handleShowRejectionReason(creditNote.dgiRejectionReason || '')}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          {canEditCreditNote(creditNote) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCreditNote(creditNote);
                              }}
                              className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-all duration-200 p-1.5 rounded-lg hover:bg-blue-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-blue-200"
                              disabled={disabled}
                              title={t('common.edit')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          
                          {canDeleteCreditNoteLocal(creditNote) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(creditNote.id);
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
                    {selectedCreditNote === creditNote.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <CreditNoteDetail
                            creditNote={{
                              id: creditNote.id,
                              creditNoteNumber: creditNote.creditNoteNumber,
                              date: creditNote.date,
                              customer: {
                                id: creditNote.customer?.id || creditNote.customerId || 0,
                                type: creditNote.customer?.type || 0,
                                legalName: creditNote.customer?.legalName || creditNote.customerName || 'Unknown Customer',
                                ice: creditNote.customer?.ice,
                                identifiantFiscal: creditNote.customer?.identifiantFiscal,
                                address: creditNote.customer?.address || '',
                                email: creditNote.customer?.email,
                                phoneNumber: creditNote.customer?.phoneNumber
                              },
                              subTotal: creditNote.subTotal,
                              vat: creditNote.vat,
                              total: creditNote.total,
                              lines: creditNote.lines.map((line: any) => ({
                                id: line.id || 0,
                                description: line.description,
                                quantity: line.quantity,
                                unitPrice: line.unitPrice,
                                total: line.total,
                                creditNoteId: creditNote.id,
                                taxRate: line.taxRate
                              })),
                              status: creditNote.status,
                              createdAt: creditNote.createdAt,
                              createdBy: {
                                createdById: creditNote.createdById || '',
                                name: creditNote.createdBy,
                                email: ''
                              },
                              dgiSubmissionId: creditNote.dgiSubmissionId,
                              dgiRejectionReason: creditNote.dgiRejectionReason,
                              originalInvoiceId: creditNote.originalInvoiceId || undefined,
                              originalInvoice: creditNote.originalInvoice,
                              isVatExempt: creditNote.isVatExempt || false,
                              vatExemptionReason: creditNote.vatExemptionReason || undefined,
                              paymentMethod: creditNote.paymentMethod || 1, // Default to BankTransfer
                              paymentReference: creditNote.paymentReference || undefined
                            }}
                            onOptimisticStatusUpdate={onUpdateCreditNoteStatus}
                            onDownloadPdf={onDownloadPdf}
                            onEdit={handleEditCreditNote}
                            onDelete={handleDelete}
                            onSubmit={onSubmit}
                            disabled={disabled}
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

      {/* CreditNote Form Modal */}
      {showCreditNoteForm && (
        <CreditNoteForm
          onSubmit={handleCreditNoteFormSubmit}
          onClose={() => {
            setShowCreditNoteForm(false);
            setEditingCreditNote(undefined);
          }}
          creditNote={editingCreditNote}
          disabled={disabled}
        />
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
                  onRefreshCreditNotes(filters, sortParams, { page: newPage, pageSize });
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
                  onRefreshCreditNotes(filters, sortParams, { page: newPage, pageSize });
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
                        onRefreshCreditNotes(filters, sortParams, { page: newPage, pageSize });
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
                          onRefreshCreditNotes(filters, sortParams, { page: pageNum, pageSize });
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
                        onRefreshCreditNotes(filters, sortParams, { page: newPage, pageSize });
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

      {/* Rejection Reason Modal */}
      <ErrorModal
        isOpen={rejectionReasonModal.isOpen}
        onClose={() => setRejectionReasonModal({ isOpen: false, reason: '' })}
        title={t('creditNote.details.rejectionReason')}
        message={rejectionReasonModal.reason}
        details={[]}
      />
    </div>
  );
});

export default CreditNoteList; 