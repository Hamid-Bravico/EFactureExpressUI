import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Invoice, NewInvoice } from '../types/invoice.types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import InvoiceForm from './InvoiceForm';
import InvoiceDetail from './InvoiceDetail';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import ErrorModal from '../../../components/ErrorModal';
import { 
  canDeleteInvoice,
  canModifyInvoice,
  InvoiceStatus
} from '../utils/invoice.permissions';
import { UserRole } from '../../../utils/shared.permissions';
import { tokenManager } from '../../../utils/tokenManager';
import { secureApiClient } from '../../../config/api';
import { INVOICE_ENDPOINTS } from '../api/invoice.endpoints';

interface InvoiceListResponse {
  invoices: Array<{
    id: number;
    invoiceNumber: string;
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
    amountPaid: number;
    lines: Array<{
      id?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      taxRate?: number;
      invoiceId?: number;
    }>;
    companyId?: string;
    dgiSubmissionId?: string;
    dgiRejectionReason?: string;
    warnings?: string[];
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

interface InvoiceListProps {
  data: InvoiceListResponse | null;
  loading: boolean;
  error?: string | null;
  onDelete: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onSubmit: (id: number) => void;
  onCreateInvoice: (invoice: NewInvoice) => Promise<void>;
  onUpdateInvoice: (invoice: NewInvoice, customerName?: string) => Promise<void>;
  onRefreshInvoices: (filters?: any, sort?: any, pagination?: any) => Promise<void>;
  disabled?: boolean;
  importLoading: boolean;
  onImportCSV: (file: File) => Promise<void>;

  onUpdateInvoiceStatus?: (id: number, status: number, dgiSubmissionId?: string, dgiRejectionReason?: string) => void;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  customerName: string;
  status: string;
  amountFrom: string;
  amountTo: string;
}

const InvoiceList: React.FC<InvoiceListProps> = React.memo(({
  data,
  loading,
  error,
  onDelete,
  onDownloadPdf,
  onSubmit,
  onCreateInvoice,
  onUpdateInvoice,
  onRefreshInvoices,
  disabled = false,
  importLoading,
  onImportCSV,

  onUpdateInvoiceStatus
}) => {
  const { t, i18n } = useTranslation();
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  // Use a union type for sortField - no default sorting
  const [sortField, setSortField] = useState<'date' | 'invoiceNumber' | 'customer' | 'total' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [rejectionReasonModal, setRejectionReasonModal] = useState<{
    isOpen: boolean;
    reason: string;
  }>({
    isOpen: false,
    reason: ''
  });
  const [paymentModal, setPaymentModal] = useState<{ invoiceId: number; currentAmount: number; total: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{ amount: number; invoiceId: number } | null>(null);





  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    customerName: '',
    status: 'all',
    amountFrom: '',
    amountTo: ''
  });

  const userRole = useMemo(() => 
    tokenManager.getUserRole() as UserRole || 'Clerk', 
    []
  );

  // Fetch invoices when component mounts
  useEffect(() => {
    onRefreshInvoices();
  }, [onRefreshInvoices]);





  // Update handleSort to only allow valid sortField values
  const handleSort = useCallback((field: string) => {
    const validFields = ['date', 'invoiceNumber', 'customer', 'total', 'status'] as const;
    if (!validFields.includes(field as any)) return;
    
    const newSortField = field as typeof validFields[number];
    const newSortDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(newSortField);
    setSortDirection(newSortDirection);
    
    // Trigger API call for sorting
    onRefreshInvoices(filters, { sortField: newSortField, sortDirection: newSortDirection }, { page: currentPage, pageSize });
  }, [sortField, sortDirection, filters, currentPage, pageSize, onRefreshInvoices]);

  /*/ Debounced filter application for better performance
  const debouncedApplyFilters = useCallback(
    useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (filters: Filters, sortParams: any, pagination: any) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onRefreshInvoices(filters, sortParams, pagination);
        }, 300);
      };
    }, [onRefreshInvoices]),
    [onRefreshInvoices]
  );*/

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
      customerName: '',
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
    onRefreshInvoices(filters, sortParams, { page: currentPage, pageSize });
  }, [filters, sortField, sortDirection, currentPage, pageSize, onRefreshInvoices]);

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
    onRefreshInvoices(filters, sortParams, { page: 1, pageSize: newPageSize });
  }, [filters, sortField, sortDirection, onRefreshInvoices]);



  const handleEditInvoice = useCallback(async (invoice: any) => {
    try {
      // Transform the server response format to match the Invoice type expected by InvoiceForm
      // Use the customer data directly from the server response
      if (!invoice.customer && !invoice.customerName) {
        throw new Error('Invoice customer data is missing');
      }
      
      // Transform the invoice data
      const transformedInvoice: Invoice = {
        id: invoice.id || 0,
        invoiceNumber: invoice.invoiceNumber || '',
        date: invoice.date || new Date().toISOString().split('T')[0],
        customer: { 
          id: invoice.customer?.id || 0,
          type: invoice.customer?.type || 0,
          legalName: invoice.customer?.legalName || invoice.customerName || 'Unknown Customer',
          ice: invoice.customer?.ice,
          identifiantFiscal: invoice.customer?.identifiantFiscal,
          address: invoice.customer?.address || '',
          email: invoice.customer?.email,
          phoneNumber: invoice.customer?.phoneNumber
        },
        subTotal: invoice.subTotal || 0,
        vat: invoice.vat || 0,
        total: invoice.total || 0,
        amountPaid: invoice.amountPaid || 0,
        status: invoice.status || 0,
        lines: (invoice.lines || []).map((line: any, index: number) => ({
          id: line.id || index, // Use line ID if available, otherwise use index
          description: line.description || '',
          quantity: line.quantity || 1,
          unitPrice: line.unitPrice || 0,
          total: line.total || 0,
          invoiceId: invoice.id,
          taxRate: line.taxRate || 20, // Use actual tax rate from server
          catalogItemId: line.catalogItemId || null
        })),
        createdAt: invoice.createdAt || new Date().toISOString(),
        createdBy: {
          createdById: invoice.createdById || '',
          name: invoice.createdBy || 'Unknown',
          email: ''
        },
        dgiSubmissionId: invoice.dgiSubmissionId || undefined,
        dgiRejectionReason: invoice.dgiRejectionReason || undefined
      };
      
      setEditingInvoice(transformedInvoice);
      setShowInvoiceForm(true);
    } catch (error) {
      toast.error(t('errors.failedToFetchInvoice'));
    }
  }, [t]);

  /*const handleCreateInvoice = () => {
    setEditingInvoice(undefined);
    setShowInvoiceForm(true);
  };*/

  const handleInvoiceFormSubmit = useCallback(async (invoice: NewInvoice, customerName?: string) => {
    if (editingInvoice) {
      await onUpdateInvoice(invoice, customerName);
    } else {
      await onCreateInvoice(invoice);
    }
    setShowInvoiceForm(false);
    setEditingInvoice(undefined);
  }, [editingInvoice, onUpdateInvoice, onCreateInvoice]);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm(t('invoice.confirm.delete'))) {
      onDelete(id);
    }
  }, [onDelete, t]);

  /*const handleSubmit = useCallback((id: number) => {
    if (window.confirm(t('invoice.confirm.submit'))) {
      onSubmit(id);
    }
  }, [onSubmit, t]);*/

  const handleShowRejectionReason = useCallback((reason: string) => {
    setRejectionReasonModal({
      isOpen: true,
      reason
    });
  }, []);

  // Helper functions for Edit/Delete buttons (similar to QuoteList pattern)
  const canEditInvoice = useCallback((invoice: any) => {
    return canModifyInvoice(userRole, invoice.status as InvoiceStatus);
  }, [userRole]);

  const canDeleteInvoiceLocal = useCallback((invoice: any) => {
    return canDeleteInvoice(userRole, invoice.status);
  }, [userRole]);

  const handleRecordPayment = useCallback((invoice: any) => {
    setPaymentModal({
      invoiceId: invoice.id,
      currentAmount: invoice.amountPaid || 0,
      total: invoice.total
    });
    setPaymentAmount('');
  }, []);

  const handleSubmitPayment = useCallback(() => {
    if (!paymentModal) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('invoice.payment.invalidAmount'));
      return;
    }

    const remainingAmount = paymentModal.total - paymentModal.currentAmount;
    if (amount > remainingAmount) {
      toast.error(t('invoice.payment.amountExceedsRemaining'));
      return;
    }

    // Show confirmation dialog
    setPaymentConfirmation({
      amount,
      invoiceId: paymentModal.invoiceId
    });
  }, [paymentModal, paymentAmount]);

  const handleConfirmPayment = useCallback(async () => {
    if (!paymentConfirmation) return;

    setIsRecordingPayment(true);
    try {
      const response = await secureApiClient.post(INVOICE_ENDPOINTS.RECORD_PAYMENT(paymentConfirmation.invoiceId), {
        Amount: paymentConfirmation.amount
      });

      const responseData = await response.json();
      if (!response.ok || !responseData?.succeeded) {
        throw new Error(responseData?.message || t('invoice.payment.failedToRecord'));
      }

      toast.success(responseData?.message || t('invoice.payment.paymentRecorded'));
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentConfirmation(null);
      
      // Refresh the invoice data with current pagination state
      const sortParams = sortField ? { sortField, sortDirection } : undefined;
      onRefreshInvoices(filters, sortParams, { page: currentPage, pageSize });
    } catch (error: any) {
      toast.error(error.message || t('invoice.payment.failedToRecord'));
    } finally {
      setIsRecordingPayment(false);
    }
  }, [paymentConfirmation, onRefreshInvoices]);



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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{error || t('errors.failedToLoadInvoices')}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            {t('errors.tryRefreshing')}
          </p>
          <button
            onClick={() => onRefreshInvoices()}
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
            <h2 className="text-xl font-semibold text-gray-900">{t('invoice.filters.title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showFilters ? t('invoice.filters.hide') : t('invoice.filters.show')}
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
              {t('invoice.filters.apply')}
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('invoice.filters.reset')}
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
                {t('invoice.filters.dateRange')}
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
                name="customerName"
                value={filters.customerName}
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
                {t('invoice.filters.status')}
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              >
                <option value="all">{t('invoice.filters.all')}</option>
                <option value="0">{t('invoice.status.draft')}</option>
                <option value="1">{t('invoice.status.ready')}</option>
                <option value="2">{t('invoice.status.awaitingClearance')}</option>
                <option value="3">{t('invoice.status.validated')}</option>
                <option value="4">{t('invoice.status.rejected')}</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {t('invoice.filters.amountRange')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="amountFrom"
                  value={filters.amountFrom}
                  onChange={handleFilterChange}
                  placeholder={t('invoice.filters.min')}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
                <input
                  type="number"
                  name="amountTo"
                  value={filters.amountTo}
                  onChange={handleFilterChange}
                  placeholder={t('invoice.filters.max')}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
                />
              </div>
            </div>
          </div>
        )}
      </div>



      {!data?.invoices || data.invoices.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mx-auto mb-6">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('invoice.list.noInvoices')}</h3>
            <p className="text-gray-600 leading-relaxed">
              {Object.values(filters).some(v => v !== '' && v !== 'all') 
                ? t('invoice.list.adjustFilters')
                : t('invoice.list.getStarted')}
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
                    onClick={() => handleSort('invoiceNumber')}
                  >
                                          <div className="flex items-center gap-2">
                        {t('invoice.list.invoiceNumber')}
                        {sortField === 'invoiceNumber' && (
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
                      {t('invoice.list.date')}
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
                      {t('invoice.list.customer')}
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
                      {t('invoice.list.amount')}
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
                      {t('invoice.list.status')}
                      {sortField === 'status' && (
                        <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('invoice.list.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {data?.invoices?.map((invoice) => (
                  <React.Fragment key={invoice.id}>
                    <tr 
                      className="hover:bg-blue-50/40 cursor-pointer transition-all duration-300 group"
                      onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div 
                          className={`text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center ${invoice.createdBy ? 'cursor-help relative group/tooltip' : ''}`}
                          title={invoice.createdBy ? t('invoice.tooltip.createdBy', { 
                            date: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US') : 'Unknown date',
                            name: invoice.createdBy
                          }) : undefined}
                        >
                          <span className="text-blue-600 mr-1">#</span>
                          {invoice.invoiceNumber}
                          {invoice.warnings && invoice.warnings.length > 0 && (
                            <svg className="w-4 h-4 text-yellow-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <title>{`${invoice.warnings.length} warning(s)`}</title>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          )}
                          {invoice.createdBy && (
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
                          {new Date(invoice.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div 
                          className="text-sm font-medium text-gray-900 flex items-center cursor-help"
                          title={invoice.customer?.legalName || invoice.customerName || 'Unknown Customer'}
                        >
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {invoice.customer?.legalName || invoice.customerName || 'Unknown Customer'}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                          {invoice.status === 3 ? (
                            <PaymentStatusBadge 
                              amountPaid={invoice.amountPaid || 0}
                              total={invoice.total}
                            />
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              {formatCurrency(invoice.total)}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-status-change">
                          <InvoiceStatusBadge 
                            status={invoice.status}
                            dgiSubmissionId={invoice.dgiSubmissionId}
                            dgiRejectionReason={invoice.dgiRejectionReason}
                            onShowRejectionReason={() => handleShowRejectionReason(invoice.dgiRejectionReason || '')}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          {canEditInvoice(invoice) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditInvoice(invoice);
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
                          
                          {canDeleteInvoiceLocal(invoice) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(invoice.id);
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

                          {invoice.status === 3 && (userRole === 'Admin' || userRole === 'Manager') && (invoice.amountPaid || 0) < invoice.total && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordPayment(invoice);
                              }}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50 transition-all duration-200 p-0 rounded-lg hover:bg-green-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-green-200"
                              disabled={disabled}
                              title={t('invoice.payment.recordPayment')}
                            >
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {selectedInvoice === invoice.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <InvoiceDetail
                            invoice={{
                              id: invoice.id,
                              invoiceNumber: invoice.invoiceNumber,
                              date: invoice.date,
                              customer: {
                                id: invoice.customer?.id || invoice.customerId || 0,
                                type: invoice.customer?.type || 0,
                                legalName: invoice.customer?.legalName || invoice.customerName || 'Unknown Customer',
                                ice: invoice.customer?.ice,
                                identifiantFiscal: invoice.customer?.identifiantFiscal,
                                address: invoice.customer?.address || '',
                                email: invoice.customer?.email,
                                phoneNumber: invoice.customer?.phoneNumber
                              },
                              subTotal: invoice.subTotal,
                              vat: invoice.vat,
                              total: invoice.total,
                              amountPaid: invoice.amountPaid,
                              lines: invoice.lines.map((line: any) => ({
                                id: line.id || 0,
                                description: line.description,
                                quantity: line.quantity,
                                unitPrice: line.unitPrice,
                                total: line.total,
                                invoiceId: invoice.id,
                                taxRate: line.taxRate || 20
                              })),
                              status: invoice.status,
                              createdAt: invoice.createdAt,
                              createdBy: {
                                createdById: invoice.createdById || '',
                                name: invoice.createdBy,
                                email: ''
                              },
                              dgiSubmissionId: invoice.dgiSubmissionId,
                              dgiRejectionReason: invoice.dgiRejectionReason
                            }}
                            onOptimisticStatusUpdate={onUpdateInvoiceStatus}
                            onDownloadPdf={onDownloadPdf}
                            onEdit={handleEditInvoice}
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

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceForm
          onSubmit={handleInvoiceFormSubmit}
          onClose={() => {
            setShowInvoiceForm(false);
            setEditingInvoice(undefined);
          }}
          invoice={editingInvoice}
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
                  onRefreshInvoices(filters, sortParams, { page: newPage, pageSize });
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
                  onRefreshInvoices(filters, sortParams, { page: newPage, pageSize });
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
                        onRefreshInvoices(filters, sortParams, { page: newPage, pageSize });
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
                          onRefreshInvoices(filters, sortParams, { page: pageNum, pageSize });
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
                        onRefreshInvoices(filters, sortParams, { page: newPage, pageSize });
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

      {/* Payment Confirmation Modal */}
      {paymentConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mr-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('invoice.payment.confirmTitle')}
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t('invoice.payment.confirmMessage', { amount: formatCurrency(paymentConfirmation.amount) })}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      {t('invoice.payment.confirmWarning')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPaymentConfirmation(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={isRecordingPayment}
                className="px-4 py-2.5 text-sm font-medium text-white bg-yellow-600 border border-yellow-600 rounded-lg shadow-sm hover:bg-yellow-700 hover:border-yellow-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRecordingPayment ? t('invoice.payment.recording') : t('invoice.payment.recordPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mr-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('invoice.payment.recordPayment')}
              </h3>
            </div>
            <div className="mb-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{t('invoice.payment.totalAmount')}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(paymentModal.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">{t('invoice.payment.currentAmountPaid')}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(paymentModal.currentAmount)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium text-sm">{t('invoice.payment.remainingAmount')}</span>
                    <span className="font-bold text-lg text-blue-600">{formatCurrency(paymentModal.total - paymentModal.currentAmount)}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invoice.payment.paymentAmount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentModal.total}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 border-gray-300"
                  placeholder={t('invoice.payment.enterPaymentAmount')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('invoice.payment.maximum')}: {formatCurrency(paymentModal.total)}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setPaymentModal(null);
                  setPaymentAmount('');
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={isRecordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:border-green-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRecordingPayment ? t('invoice.payment.recording') : t('invoice.payment.recordPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      <ErrorModal
        isOpen={rejectionReasonModal.isOpen}
        onClose={() => setRejectionReasonModal({ isOpen: false, reason: '' })}
        title={t('invoice.details.rejectionReason')}
        message={rejectionReasonModal.reason}
        details={[]}
      />
    </div>
  );
});

export default InvoiceList; 