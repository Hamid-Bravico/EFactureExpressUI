import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Invoice, NewInvoice, DgiStatusResponse } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import InvoiceForm from './InvoiceForm';
import StatusBadge from './StatusBadge';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { 
  getInvoiceActionPermissions, 
  canSelectForBulkOperation,
  UserRole,
  InvoiceStatus
} from '../utils/permissions';

interface InvoiceListResponse {
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    date: string;
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
  onDelete: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onSubmit: (id: number) => void;
  onCreateInvoice: (invoice: NewInvoice) => Promise<void>;
  onUpdateInvoice: (invoice: NewInvoice, customerName?: string) => Promise<void>;
  onRefreshInvoices: (filters?: any, sort?: any, pagination?: any) => Promise<void>;
  disabled?: boolean;
  importLoading: boolean;
  onImportCSV: (file: File) => Promise<void>;
  onBulkDelete?: (ids: number[]) => Promise<void>;
  onBulkSubmit?: (ids: number[]) => Promise<void>;
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
  onDelete,
  onDownloadPdf,
  onSubmit,
  onCreateInvoice,
  onUpdateInvoice,
  onRefreshInvoices,
  disabled = false,
  importLoading,
  onImportCSV,
  onBulkDelete,
  onBulkSubmit,
  onUpdateInvoiceStatus
}) => {
  const { t, i18n } = useTranslation();
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  // Use a union type for sortField - no default sorting
  const [sortField, setSortField] = useState<'date' | 'invoiceNumber' | 'customer' | 'total' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [, setShowBulkActions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    type: 'submit' | 'delete';
    count: number;
  } | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [fetchingJsonId, setFetchingJsonId] = useState<number | null>(null);
  const [downloadDropdownOpenId, setDownloadDropdownOpenId] = useState<number | null>(null);
  const downloadDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [refreshingStatusId, setRefreshingStatusId] = useState<number | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ invoiceId: number; reason: string } | null>(null);

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



  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    customerName: '',
    status: 'all',
    amountFrom: '',
    amountTo: ''
  });

  const userRole = useMemo(() => 
    localStorage.getItem("userRole") as UserRole || 'Clerk', 
    []
  );

  // Memoized computed values for better performance
  const selectableInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    return data.invoices.filter(invoice => 
      canSelectForBulkOperation(userRole, invoice.status as InvoiceStatus, 'delete') ||
      canSelectForBulkOperation(userRole, invoice.status as InvoiceStatus, 'submit')
    );
  }, [data?.invoices, userRole]);

  const allSelectable = useMemo(() => {
    return data?.invoices ? selectedInvoices.size === selectableInvoices.length : false;
  }, [data?.invoices, selectedInvoices.size, selectableInvoices.length]);

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
        if (data?.invoices && selectableInvoices.length > 0) {
          setSelectedInvoices(new Set(selectableInvoices.map(inv => inv.id)));
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [data?.invoices, selectableInvoices]);

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

  // Debounced filter application for better performance
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
  );

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

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!data?.invoices) return;
    
    if (e.target.checked) {
      setSelectedInvoices(new Set(selectableInvoices.map(inv => inv.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  }, [data?.invoices, selectableInvoices]);

  const handleSelectInvoice = useCallback((id: number, status: number) => {
    const invoiceStatus = status as InvoiceStatus;
    
    // Check if invoice can be selected for any bulk operation
    const canSelectForDelete = canSelectForBulkOperation(userRole, invoiceStatus, 'delete');
    const canSelectForSubmit = canSelectForBulkOperation(userRole, invoiceStatus, 'submit');
    
    if (canSelectForDelete || canSelectForSubmit) {
      setSelectedInvoices(prev => {
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

  const handleBulkSubmit = useCallback(async () => {
    if (!data?.invoices) return;
    // Only allow bulk submit for invoices that can be submitted based on permissions
    const submitIds = Array.from(selectedInvoices).filter(id => {
      const inv = data.invoices.find(i => i.id === id);
      return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'submit');
    });
    if (submitIds.length === 0) return;
    setShowConfirmDialog({
      type: 'submit',
      count: submitIds.length
    });
  }, [selectedInvoices, data?.invoices, userRole]);

  const handleBulkDelete = useCallback(async () => {
    if (!data?.invoices) return;
    // Allow bulk delete for invoices that can be deleted based on permissions
    const deleteIds = Array.from(selectedInvoices).filter(id => {
      const inv = data.invoices.find(i => i.id === id);
      return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'delete');
    });
    if (deleteIds.length === 0) return;
    setShowConfirmDialog({
      type: 'delete',
      count: deleteIds.length
    });
  }, [selectedInvoices, data?.invoices, userRole]);

  const confirmBulkAction = useCallback(async () => {
    if (!showConfirmDialog || !data?.invoices) return;

    setShowConfirmDialog(null);

    try {
      if (showConfirmDialog.type === 'submit') {
        // Only submit invoices that can be submitted based on permissions
        const submitIds = Array.from(selectedInvoices).filter(id => {
          const inv = data.invoices.find(i => i.id === id);
          return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'submit');
        });
        
        if (onBulkSubmit && submitIds.length > 0) {
          await onBulkSubmit(submitIds);
        }
      } else {
        // Delete invoices that can be deleted based on permissions
        const deleteIds = Array.from(selectedInvoices).filter(id => {
          const inv = data.invoices.find(i => i.id === id);
          return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'delete');
        });
        
        if (onBulkDelete && deleteIds.length > 0) {
          await onBulkDelete(deleteIds);
        }
      }
      setSelectedInvoices(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toast.error(
        t('errors.bulkActionFailed', { 
          action: showConfirmDialog.type === 'submit' ? t('invoice.actions.submit') : t('invoice.actions.delete'),
          error: error instanceof Error ? error.message : t('errors.unknown')
        })
      );
    }
  }, [showConfirmDialog, selectedInvoices, data?.invoices, onBulkSubmit, onBulkDelete, userRole, t]);

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
          name: invoice.customer?.name || invoice.customerName || 'Unknown Customer'
        },
        subTotal: invoice.subTotal || 0,
        vat: invoice.vat || 0,
        total: invoice.total || 0,
        status: invoice.status || 0,
        lines: (invoice.lines || []).map((line: any, index: number) => ({
          id: line.id || index, // Use line ID if available, otherwise use index
          description: line.description || '',
          quantity: line.quantity || 1,
          unitPrice: line.unitPrice || 0,
          total: line.total || 0,
          invoiceId: invoice.id,
          taxRate: line.taxRate || 20 // Use actual tax rate from server
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
      console.error('Error preparing invoice for editing:', error);
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
    if (window.confirm(t('invoice.confirm.message', { 
      action: t('invoice.actions.delete'),
      count: 1,
      plural: '',
      warning: t('invoice.confirm.warning')
    }))) {
      onDelete(id);
    }
  }, [onDelete, t]);

  const handleSubmit = useCallback((id: number) => {
    if (window.confirm(t('invoice.confirm.message', { 
      action: t('invoice.actions.submit'),
      count: 1,
      plural: '',
      warning: ''
    }))) {
      onSubmit(id);
    }
  }, [onSubmit, t]);

  const handleDownloadJson = useCallback(async (invoiceId: number) => {
    setFetchingJsonId(invoiceId);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await fetch(API_ENDPOINTS.INVOICES.JSON(invoiceId), {
        headers: getAuthHeaders(token),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No URL');
      }
    } catch(err) {
      console.error(err);
      toast.error('Failed to fetch JSON. Make sure Compliance Mode is enabled.');
    } finally {
      setFetchingJsonId(null);
    }
  }, []);

  const handleRefreshDgiStatus = useCallback(async (invoiceId: number) => {
    setRefreshingStatusId(invoiceId);
    const toastId = toast.loading(t('invoice.dgiStatus.checking'));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token');
      }
      
      const res = await fetch(API_ENDPOINTS.INVOICES.DGI_STATUS(invoiceId), {
        headers: getAuthHeaders(token),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch DGI status: ${res.status}`);
      }
      
      const data: DgiStatusResponse = await res.json();
      console.log('DGI Status Response:', data);
      
      switch (data.status) {
        case 'PendingValidation':
          toast.success(t('invoice.dgiStatus.stillPending'), { id: toastId });
          break;
          
        case 'Validated':
          toast.success(t('invoice.status.validated'), { id: toastId });
          // Optimistically update the invoice status
          if (onUpdateInvoiceStatus) {
            onUpdateInvoiceStatus(invoiceId, 3);
          }
          break;
          
        case 'Rejected':
          toast.error(t('invoice.status.rejected'), { id: toastId });
          const rejectionReason = data.errors.length > 0 
            ? data.errors.map(error => error.errorMessage).join('; ') 
            : 'No specific reason provided';
          setRejectionModal({ invoiceId, reason: rejectionReason });
          // Optimistically update the invoice status
          if (onUpdateInvoiceStatus) {
            onUpdateInvoiceStatus(invoiceId, 4, undefined, rejectionReason);
          }
          break;
          
        default:
          toast.error(`Unknown DGI status received: ${data.status}`, { id: toastId });
          break;
      }
    } catch (error) {
      console.error('DGI status check error:', error);
      toast.error(t('invoice.dgiStatus.errorChecking'), { id: toastId });
    } finally {
      // Always clear the loading state
      setRefreshingStatusId(null);
    }
  }, [t, onUpdateInvoiceStatus]);



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
  if (!data && !loading) {
    return (
      <div className="text-center py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-6">
            <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('errors.failedToLoadInvoices')}</h3>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t('invoice.filters.customerName')}
              </label>
              <input
                type="text"
                name="customerName"
                value={filters.customerName}
                onChange={handleFilterChange}
                placeholder={t('invoice.filters.searchCustomer')}
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

            {/* Floating Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
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
                  {t('invoice.bulk.selected', { count: selectedInvoices.size })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(userRole === 'Admin' || userRole === 'Manager') && (
                  <button
                    onClick={handleBulkSubmit}
                    disabled={disabled}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-150 shadow-sm hover:shadow-md transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {t('invoice.bulk.submit')}
                  </button>
                )}
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
                  {t('invoice.bulk.delete')}
                </button>
                <button
                  onClick={() => setSelectedInvoices(new Set())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  title={t('invoice.bulk.clearSelection')}
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
                      <td className="px-4 py-2 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-r"></div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 hover:scale-110"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id, invoice.status)}
                          disabled={
                            !canSelectForBulkOperation(userRole, invoice.status as InvoiceStatus, 'delete') &&
                            !canSelectForBulkOperation(userRole, invoice.status as InvoiceStatus, 'submit')
                          }
                        />
                      </td>
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
                          title={invoice.customer?.name || invoice.customerName || 'Unknown Customer'}
                        >
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {invoice.customer?.name || invoice.customerName || 'Unknown Customer'}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {formatCurrency(invoice.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="animate-status-change">
                          <StatusBadge 
                            status={invoice.status}
                            dgiSubmissionId={invoice.dgiSubmissionId}
                            onShowRejectionReason={invoice.status === 4 ? () => {
                              // Use the DgiRejectionReason from the invoice if available
                              const reason = invoice.dgiRejectionReason || 'Rejection reason not available. Please refresh status to get the latest details.';
                              setRejectionModal({ invoiceId: invoice.id, reason });
                            } : undefined}
                            
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5 relative">
                          {invoice.status === 2 ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRefreshDgiStatus(invoice.id);
                                }}
                                disabled={refreshingStatusId === invoice.id}
                                className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-all duration-200 p-1.5 rounded-lg hover:bg-blue-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-blue-200"
                                title={t('invoice.actions.refreshStatus')}
                              >
                                {refreshingStatusId === invoice.id ? (
                                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                              </button>
                              {/* Vertical separator before download dropdown */}
                              <span className="mx-1 h-6 border-l border-gray-200 align-middle inline-block"></span>
                              <div
                                className="relative inline-block"
                                ref={el => { downloadDropdownRefs.current[invoice.id] = el; }}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDownloadDropdownOpenId(downloadDropdownOpenId === invoice.id ? null : invoice.id);
                                  }}
                                  className="text-gray-600 hover:text-gray-900 p-1"
                                  title={t('invoice.actions.download')}
                                >
                                  {/* Standard download icon: arrow down into tray */}
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
                                  </svg>
                                </button>
                                {downloadDropdownOpenId === invoice.id && (
                                  <div className="fixed z-50 w-48 bg-white border border-gray-200 rounded shadow-lg" style={{
                                    top: (downloadDropdownRefs.current[invoice.id]?.getBoundingClientRect()?.bottom || 0) + 8,
                                    left: (downloadDropdownRefs.current[invoice.id]?.getBoundingClientRect()?.right || 0) - 192
                                  }}>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setDownloadDropdownOpenId(null);
                                        onDownloadPdf(invoice.id);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      title={t('invoice.actions.download')}
                                    >
                                      {/* PDF icon */}
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <rect x="4" y="3" width="16" height="18" rx="2" fill="#fff" stroke="currentColor" strokeWidth="2"/>
                                        <text x="7" y="17" fontSize="7" fontWeight="bold" fill="#e53e3e">PDF</text>
                                      </svg>
                                      {t('invoice.actions.download')}
                                    </button>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setDownloadDropdownOpenId(null);
                                        handleDownloadJson(invoice.id);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      title={t('invoice.actions.downloadJson')}
                                      disabled={fetchingJsonId === invoice.id}
                                    >
                                      {/* JSON icon */}
                                      {fetchingJsonId === invoice.id ? (
                                        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                          <rect x="4" y="3" width="16" height="18" rx="2" fill="#fff" stroke="currentColor" strokeWidth="2"/>
                                          <text x="7" y="17" fontSize="7" fontWeight="bold" fill="#3182ce">&#123;&#125;</text>
                                        </svg>
                                      )}
                                      {t('invoice.actions.downloadJson')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              {(() => {
                                const permissions = getInvoiceActionPermissions(userRole, invoice.status as InvoiceStatus);
                                return (
                                  <>
                                    {permissions.canEdit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditInvoice(invoice);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 p-1.5 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-blue-200 group/action"
                                        title={t('invoice.actions.edit')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    )}
                                    {permissions.canSubmit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubmit(invoice.id);
                                        }}
                                        className="text-green-600 hover:text-green-700 p-1.5 rounded-lg transition-all duration-200 hover:bg-green-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-green-200"
                                        title={t('invoice.actions.submit')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                      </button>
                                    )}
                                    {permissions.canDelete && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(invoice.id);
                                        }}
                                        className="text-red-600 hover:text-red-700 p-1.5 rounded-lg transition-all duration-200 hover:bg-red-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-red-200"
                                        title={t('invoice.actions.delete')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                              
                              {/* Vertical separator before download dropdown */}
                              <span className="mx-1 h-6 border-l border-gray-200 align-middle inline-block"></span>
                              <div
                                className="relative inline-block"
                                ref={el => { downloadDropdownRefs.current[invoice.id] = el; }}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDownloadDropdownOpenId(downloadDropdownOpenId === invoice.id ? null : invoice.id);
                                  }}
                                  className="text-gray-600 hover:text-gray-900 p-1"
                                  title={t('invoice.actions.download')}
                                >
                                  {/* Standard download icon: arrow down into tray */}
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
                                  </svg>
                                </button>
                                {downloadDropdownOpenId === invoice.id && (
                                  <div className="fixed z-50 w-48 bg-white border border-gray-200 rounded shadow-lg" style={{
                                    top: (downloadDropdownRefs.current[invoice.id]?.getBoundingClientRect()?.bottom || 0) + 8,
                                    left: (downloadDropdownRefs.current[invoice.id]?.getBoundingClientRect()?.right || 0) - 192
                                  }}>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setDownloadDropdownOpenId(null);
                                        onDownloadPdf(invoice.id);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      title={t('invoice.actions.download')}
                                    >
                                      {/* PDF icon */}
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <rect x="4" y="3" width="16" height="18" rx="2" fill="#fff" stroke="currentColor" strokeWidth="2"/>
                                        <text x="7" y="17" fontSize="7" fontWeight="bold" fill="#e53e3e">PDF</text>
                                      </svg>
                                      {t('invoice.actions.download')}
                                    </button>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setDownloadDropdownOpenId(null);
                                        handleDownloadJson(invoice.id);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      title={t('invoice.actions.downloadJson')}
                                      disabled={fetchingJsonId === invoice.id}
                                    >
                                      {/* JSON icon */}
                                      {fetchingJsonId === invoice.id ? (
                                        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                          <rect x="4" y="3" width="16" height="18" rx="2" fill="#fff" stroke="currentColor" strokeWidth="2"/>
                                          <text x="7" y="17" fontSize="7" fontWeight="bold" fill="#3182ce">&#123;&#125;</text>
                                        </svg>
                                      )}
                                      {t('invoice.actions.downloadJson')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {selectedInvoice === invoice.id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">{t('invoice.details.title')}</h4>
                            
                            {/* Warnings Display */}
                            {invoice.warnings && invoice.warnings.length > 0 && (
                              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center">
                                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <h5 className="text-sm font-medium text-yellow-800">{t('invoice.details.warnings')}</h5>
                                </div>
                                <ul className="mt-2 text-sm text-yellow-700">
                                  {invoice.warnings.map((warning, index) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      <span>{warning}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Invoice Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                              <div>
                                <h5 className="font-medium text-gray-900 mb-2">{t('invoice.details.invoiceInfo')}</h5>
                                <div className="space-y-1 text-gray-600">
                                  <div><span className="font-medium">{t('invoice.details.invoiceNumber')}:</span> {invoice.invoiceNumber}</div>
                                  <div><span className="font-medium">{t('invoice.details.date')}:</span> {new Date(invoice.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</div>
                                  <div><span className="font-medium">{t('invoice.details.status')}:</span> <StatusBadge status={invoice.status} /></div>
                                  {invoice.dgiSubmissionId && (
                                    <div><span className="font-medium">{t('invoice.details.dgiSubmissionId')}:</span> {invoice.dgiSubmissionId}</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 mb-2">{t('invoice.details.customerInfo')}</h5>
                                <div className="space-y-1 text-gray-600">
                                  <div><span className="font-medium">{t('invoice.details.customerName')}:</span> {invoice.customer?.name || invoice.customerName}</div>
                                  {invoice.customer?.ice && (
                                    <div><span className="font-medium">{t('invoice.details.ice')}:</span> {invoice.customer.ice}</div>
                                  )}
                                  {invoice.customer?.email && (
                                    <div><span className="font-medium">{t('invoice.details.email')}:</span> {invoice.customer.email}</div>
                                  )}
                                  {invoice.customer?.phoneNumber && (
                                    <div><span className="font-medium">{t('invoice.details.phone')}:</span> {invoice.customer.phoneNumber}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('invoice.details.description')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('invoice.details.quantity')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('invoice.details.unitPrice')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('invoice.details.taxRate')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('invoice.details.total')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {invoice.lines.map((line, index) => (
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
                                        {formatCurrency(line.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-gray-200">
                                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('invoice.details.subtotal')}:</td>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                      {formatCurrency(invoice.subTotal)}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={3} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('invoice.details.vat')}:</td>
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                      {formatCurrency(invoice.vat)}
                                    </td>
                                  </tr>
                                  <tr className="border-t border-gray-200">
                                    <td colSpan={3} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">{t('invoice.details.total')}:</td>
                                    <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                                      {formatCurrency(invoice.total)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                            
                            {/* Creation Information */}
                            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{t('invoice.details.createdBy')}:</span> {invoice.createdBy}
                                </div>
                                <div>
                                  <span className="font-medium">{t('invoice.details.createdAt')}:</span> {new Date(invoice.createdAt).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                                </div>
                              </div>
                            </div>
                          </div>
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

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-4 ${
                showConfirmDialog.type === 'submit' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {showConfirmDialog.type === 'submit' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {t('invoice.confirm.title', { action: showConfirmDialog.type === 'submit' ? t('invoice.actions.submit') : t('invoice.actions.delete') })}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {t('invoice.confirm.message', { 
                action: showConfirmDialog.type === 'submit' ? t('invoice.actions.submit') : t('invoice.actions.delete'),
                count: showConfirmDialog.count,
                plural: showConfirmDialog.count !== 1 ? 's' : '',
                warning: showConfirmDialog.type === 'delete' ? t('invoice.confirm.warning') : ''
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
                className={`px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 ${
                  showConfirmDialog.type === 'submit'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {showConfirmDialog.type === 'submit' ? t('invoice.actions.submit') : t('invoice.actions.delete')}
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
                {t('invoice.dgiStatus.rejectionReason')}
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
                  {t('common.showing')} <span className="font-medium">{((data.pagination.page - 1) * data.pagination.pageSize) + 1}</span> {t('common.to')} <span className="font-medium">{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalItems)}</span> {t('common.of')} <span className="font-medium">{data.pagination.totalItems}</span> {t('common.results')}
                </p>
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">{t('common.show')}:</label>
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
                <span className="text-sm text-gray-700">{t('common.perPage')}</span>
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
    </div>
  );
});

export default InvoiceList; 