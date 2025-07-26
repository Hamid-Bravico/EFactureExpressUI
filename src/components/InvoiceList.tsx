import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Invoice, NewInvoice, DgiStatusResponse } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import InvoiceForm from './InvoiceForm';
import StatusBadge from './StatusBadge';
import { API_ENDPOINTS } from '../config/api';
import { 
  getInvoiceActionPermissions, 
  canSelectForBulkOperation,
  UserRole,
  InvoiceStatus
} from '../utils/permissions';

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  onDelete: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onSubmit: (id: number) => void;
  onCreateInvoice: (invoice: NewInvoice) => Promise<void>;
  onUpdateInvoice: (invoice: NewInvoice) => Promise<void>;
  onRefreshInvoices: () => Promise<void>;
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
  invoices,
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
  // Use a union type for sortField
  const [sortField, setSortField] = useState<'date' | 'invoiceNumber' | 'customer' | 'total' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
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

  const userRole = localStorage.getItem("userRole") as UserRole || 'Clerk';

  // Update handleSort to only allow valid sortField values
  const handleSort = useCallback((field: string) => {
    const validFields = ['date', 'invoiceNumber', 'customer', 'total', 'status'] as const;
    if (!validFields.includes(field as any)) return;
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as typeof validFields[number]);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
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
  }, []);

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Apply filters
    if (filters.dateFrom) {
      filtered = filtered.filter(invoice => new Date(invoice.date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(invoice => new Date(invoice.date) <= new Date(filters.dateTo));
    }
    if (filters.customerName) {
      filtered = filtered.filter(invoice => 
        invoice.customer?.name?.toLowerCase().includes(filters.customerName.toLowerCase()) || false
      );
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status.toString() === filters.status);
    }
    if (filters.amountFrom) {
      filtered = filtered.filter(invoice => invoice.total >= Number(filters.amountFrom));
    }
    if (filters.amountTo) {
      filtered = filtered.filter(invoice => invoice.total <= Number(filters.amountTo));
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      switch (sortField) {
        case 'customer':
          aValue = a.customer?.name || 'Unknown Customer';
          bValue = b.customer?.name || 'Unknown Customer';
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortDirection === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [invoices, filters, sortField, sortDirection]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const selectableInvoices = filteredAndSortedInvoices.filter(invoice => 
        canSelectForBulkOperation(userRole, invoice.status as InvoiceStatus, 'delete') ||
        canSelectForBulkOperation(userRole, invoice.status as InvoiceStatus, 'submit')
      );
      setSelectedInvoices(new Set(selectableInvoices.map(inv => inv.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  }, [filteredAndSortedInvoices, userRole]);

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
    // Only allow bulk submit for invoices that can be submitted based on permissions
    const submitIds = Array.from(selectedInvoices).filter(id => {
      const inv = filteredAndSortedInvoices.find(i => i.id === id);
      return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'submit');
    });
    if (submitIds.length === 0) return;
    setShowConfirmDialog({
      type: 'submit',
      count: submitIds.length
    });
  }, [selectedInvoices, filteredAndSortedInvoices, userRole]);

  const handleBulkDelete = useCallback(async () => {
    // Allow bulk delete for invoices that can be deleted based on permissions
    const deleteIds = Array.from(selectedInvoices).filter(id => {
      const inv = filteredAndSortedInvoices.find(i => i.id === id);
      return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'delete');
    });
    if (deleteIds.length === 0) return;
    setShowConfirmDialog({
      type: 'delete',
      count: deleteIds.length
    });
  }, [selectedInvoices, filteredAndSortedInvoices, userRole]);

  const confirmBulkAction = useCallback(async () => {
    if (!showConfirmDialog) return;

    setShowConfirmDialog(null);

    try {
      if (showConfirmDialog.type === 'submit') {
        // Only submit invoices that can be submitted based on permissions
        const submitIds = Array.from(selectedInvoices).filter(id => {
          const inv = filteredAndSortedInvoices.find(i => i.id === id);
          return inv && canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'submit');
        });
        
        if (onBulkSubmit && submitIds.length > 0) {
          await onBulkSubmit(submitIds);
        }
      } else {
        // Delete invoices that can be deleted based on permissions
        const deleteIds = Array.from(selectedInvoices).filter(id => {
          const inv = filteredAndSortedInvoices.find(i => i.id === id);
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
  }, [showConfirmDialog, selectedInvoices, filteredAndSortedInvoices, onBulkSubmit, onBulkDelete, userRole, t]);

  const handleEditInvoice = useCallback((invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  }, []);

  /*const handleCreateInvoice = () => {
    setEditingInvoice(undefined);
    setShowInvoiceForm(true);
  };*/

  const handleInvoiceFormSubmit = useCallback(async (invoice: NewInvoice) => {
    if (editingInvoice) {
      await onUpdateInvoice(invoice);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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



  // Format currency based on current language
  const formatCurrency = (amount: number) => {
    if (i18n.language === 'fr') {
      // French format: 1 234,56 MAD
      return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + ' MAD';
    } else {
      // English format: MAD 1,234.56
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

      {filteredAndSortedInvoices.length === 0 ? (
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
                      checked={selectedInvoices.size === filteredAndSortedInvoices.filter(inv => 
                        canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'delete') ||
                        canSelectForBulkOperation(userRole, inv.status as InvoiceStatus, 'submit')
                      ).length}
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
                {filteredAndSortedInvoices.map((invoice) => (
                  <React.Fragment key={invoice.id}>
                    <tr 
                      className="hover:bg-blue-50/40 cursor-pointer transition-all duration-300 group animate-slide-in"
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
                            name: invoice.createdBy?.name || 'Unknown User',
                            email: invoice.createdBy?.email || 'No email available'
                          }) : undefined}
                        >
                          <span className="text-blue-600 mr-1">#</span>
                          {invoice.invoiceNumber}
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
                          title={invoice.customer?.name || 'Unknown Customer'}
                        >
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {invoice.customer?.name || 'Unknown Customer'}
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
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('invoice.details.description')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('invoice.details.quantity')}</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('invoice.details.unitPrice')}</th>
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
    </div>
  );
});

export default InvoiceList; 