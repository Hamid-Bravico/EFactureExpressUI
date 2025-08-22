import { useEffect, useState, useRef, useCallback } from "react";
import { Invoice, NewInvoice } from "../types/invoice.types";
import { ApiResponse } from "../../auth/types/auth.types";
import { INVOICE_ENDPOINTS } from "../api/invoice.endpoints";
import { secureApiClient } from "../../../config/api";
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import InvoiceList from "./InvoiceList";
import ImportCSV from "./ImportCSV";
import InvoiceForm from "./InvoiceForm";
import ErrorModal from "../../../components/ErrorModal";
import { useStatsContext } from '../../stats/context/StatsContext';
import { canImportCSV } from '../utils/invoice.permissions';
import { UserRole } from '../../../utils/shared.permissions';
import { tokenManager } from '../../../utils/tokenManager';

interface InvoiceManagementProps {
  token: string;
}

function InvoiceManagement({ token }: InvoiceManagementProps) {
  const { t } = useTranslation();
  const { 
    incrementSidebarCount, 
    refreshSidebarCountsSilently,
    refreshRevenueIfInPeriod,
    refreshOverdueSilently
  } = useStatsContext();
  
  const userRole = tokenManager.getUserRole() as UserRole || 'Clerk';
  
  // ─── LISTING STATE ─────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceListData, setInvoiceListData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
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
  
  // Track last used invoice list query to preserve filters/sort on silent refreshes
  const lastInvoiceFiltersRef = useRef<any | undefined>(undefined);
  const lastInvoiceSortRef = useRef<any | undefined>(undefined);

  // ─── OPTIMISTIC UPDATES ───────────────────────────────────────────────────
  const optimisticallyUpdateInvoice = useCallback((updatedInvoice: Invoice) => {
    try {
      setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    } catch (error) {
      // Error updating invoice optimistically
    }
  }, []);

  const optimisticallyRemoveInvoice = useCallback((id: number) => {
    try {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (error) {
      // Error removing invoice optimistically
    }
  }, []);

  const optimisticallyAddInvoice = useCallback((newInvoice: Invoice) => {
    try {
      setInvoices(prev => [newInvoice, ...prev]);
    } catch (error) {
      // Error adding invoice optimistically
    }
  }, []);

  const optimisticallyUpdateInvoiceStatus = useCallback((id: number, newStatus: number, dgiSubmissionId?: string, dgiRejectionReason?: string) => {
    try {
      // Update the invoices state
      setInvoices(prev => prev.map(inv => 
        inv.id === id 
          ? { 
              ...inv, 
              status: newStatus, 
              dgiSubmissionId: dgiSubmissionId || inv.dgiSubmissionId,
              dgiRejectionReason: dgiRejectionReason || inv.dgiRejectionReason
            }
          : inv
      ));
      
      // Also update the invoiceListData state
      setInvoiceListData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          invoices: prev.invoices.map((inv: any) => 
            inv.id === id 
              ? { 
                  ...inv, 
                  status: newStatus, 
                  dgiSubmissionId: dgiSubmissionId || inv.dgiSubmissionId,
                  dgiRejectionReason: dgiRejectionReason || inv.dgiRejectionReason
                }
              : inv
          )
        };
      });
    } catch (error) {
      // Error updating invoice status optimistically
    }
  }, []);

  // Silent update functions that preserve sorting/filtering
  const silentlyUpdateInvoiceInList = useCallback((updatedInvoice: any) => {
    setInvoiceListData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        invoices: prev.invoices.map((inv: any) => 
          inv.id === updatedInvoice.id ? updatedInvoice : inv
        )
      };
    });
  }, []);

  const silentlyAddInvoiceToList = useCallback((newInvoice: any) => {
    setInvoiceListData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        invoices: [newInvoice, ...prev.invoices],
        pagination: {
          ...prev.pagination,
          totalItems: prev.pagination.totalItems + 1,
          totalPages: Math.ceil((prev.pagination.totalItems + 1) / prev.pagination.pageSize)
        }
      };
    });
  }, []);

  // ─── FETCH LIST ────────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async (filters?: any, sort?: any, pagination?: any) => {
    setLoading(true);
    setError(null);
    try {
      // Persist last used filters and sort for later silent refreshes
      lastInvoiceFiltersRef.current = filters;
      lastInvoiceSortRef.current = sort;

      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters) {
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
        if (filters.customerName) queryParams.append('q', filters.customerName);
        if (filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.amountFrom) queryParams.append('amountFrom', filters.amountFrom);
        if (filters.amountTo) queryParams.append('amountTo', filters.amountTo);
      }
      
      // Add sorting
      if (sort) {
        queryParams.append('sortField', sort.sortField);
        queryParams.append('sortDirection', sort.sortDirection);
      }
      
      // Add pagination
      if (pagination) {
        queryParams.append('page', pagination.page.toString());
        queryParams.append('pageSize', pagination.pageSize.toString());
      }
      
      const url = `${INVOICE_ENDPOINTS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await secureApiClient.get(url);

      const responseData: ApiResponse<any> = await response.json().catch(() => ({ succeeded: false, message: 'Failed to parse response' }));
      if (!response.ok || !responseData?.succeeded) {
        const errorMessage = responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToFetch');
        throw new Error(errorMessage);
      }

      const apiData = responseData.data || {};
      const transformed = {
        invoices: Array.isArray(apiData.items) ? apiData.items : (apiData.invoices || []),
        pagination: apiData.pagination || {
          totalItems: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0
        },
        filters: apiData.filters || { statuses: [], customers: [] }
      };
      setInvoiceListData(transformed);
      // Keep the old invoices state for backward compatibility
      setInvoices(transformed.invoices);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Handle network error
      if (errorMessage === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track if initial data has been loaded to prevent infinite loops
  const initialLoadRef = useRef(false);
  
  useEffect(() => {
    if (token && !initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchInvoices();
    }
  }, [token, fetchInvoices]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const handleCreateInvoice = useCallback(async (newInvoice: NewInvoice, customerName?: string) => {
    try {
      // Create temporary invoice for optimistic update
      const tempInvoice: Invoice = {
        id: Date.now(), // Temporary ID
        invoiceNumber: 'TEMP-' + Date.now(),
        date: newInvoice.date,
        customer: { 
          id: newInvoice.customerId, 
          type: 0,
          legalName: customerName || 'Unknown Customer',
          address: '',
          ice: undefined,
          identifiantFiscal: undefined,
          email: undefined,
          phoneNumber: undefined
        },
        subTotal: 0, // Will be calculated by backend
        vat: 0, // Will be calculated by backend
        total: 0, // Will be calculated by backend
        amountPaid: 0,
        status: 0, // Default draft status
        lines: newInvoice.lines.map(line => ({
          id: Date.now() + Math.random(), // Temporary ID
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          invoiceId: Date.now(), // Temporary invoice ID
          taxRate: line.taxRate
        })),
        createdAt: new Date().toISOString(),
        createdBy: {
          createdById: '',
          name: 'User',
          email: 'user@example.com'
        }
      };

      // Optimistically add the invoice
      optimisticallyAddInvoice(tempInvoice);

      const res = await secureApiClient.post(INVOICE_ENDPOINTS.CREATE, newInvoice);
      
      let responseData;
      try {
        responseData = await res.json();
      } catch (parseError) {
        responseData = { succeeded: false, message: t('errors.anErrorOccurred') };
      }
      
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        optimisticallyRemoveInvoice(tempInvoice.id);

        // Handle different error response formats
        let errorTitle = t('invoice.form.errors.submissionFailed');
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
        } else if (res.status === 400) {
          errorTitle = 'Bad Request - Please check your input data';
        }

        const error = new Error(errorBody || errorTitle);
        (error as any).title = errorTitle;
        (error as any).body = errorBody;
        (error as any).errors = responseData?.errors;
        throw error;
      }

      const data = responseData.data;
      toast.success(responseData.message || t('invoice.messages.created'), {
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
      
      // Replace temporary invoice with real data
      optimisticallyRemoveInvoice(tempInvoice.id);
      optimisticallyAddInvoice(data);
      silentlyAddInvoiceToList(data);

      // Sidebar: increment invoices count optimistically, then reconcile silently
      incrementSidebarCount('invoicesCount', 1);
      refreshSidebarCountsSilently();

      // Navbar revenue: refresh only if invoice date within selected period
      await refreshRevenueIfInPeriod(data.date);

      // Overdue may change depending on status/date; refresh silently
      refreshOverdueSilently();
    } catch (error: any) {
      // Handle error with title and body structure
      let errorTitle = t('invoice.form.errors.submissionFailed');
      let errorBody = '';
      
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (error.title) {
        errorTitle = error.title;
      } else if (error.message) {
        if (typeof error.message === 'object') {
          if (error.message.value) {
            errorTitle = error.message.value;
          } else if (error.message.message) {
            errorTitle = error.message.message;
          } else {
            errorTitle = JSON.stringify(error.message);
          }
        } else if (typeof error.message === 'string') {
          errorTitle = error.message;
        }
      }
      
      // Create a more polished error message
      const errorMessage = errorBody 
        ? `${errorTitle}\n\n${errorBody.split('\n').map(line => `• ${line}`).join('\n')}`
        : errorTitle;
      
      toast.error(errorMessage, {
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
  }, [t, optimisticallyAddInvoice, optimisticallyRemoveInvoice, silentlyAddInvoiceToList]);

  const handleUpdateInvoice = useCallback(async (invoice: NewInvoice, customerName?: string) => {
    if (!invoice.id) {
      toast.error(t('errors.failedToUpdateInvoice'));
      return;
    }

    try {
      // Store original invoice for rollback
      const originalInvoice = invoices.find(inv => inv.id === invoice.id);
      if (!originalInvoice) throw new Error('Invoice not found');

      // Optimistically update the invoice
      const updatedInvoice: Invoice = {
        ...originalInvoice,
        date: invoice.date,
        customer: { 
          id: invoice.customerId, 
          type: originalInvoice.customer.type,
          legalName: customerName || originalInvoice.customer.legalName,
          ice: originalInvoice.customer.ice,
          identifiantFiscal: originalInvoice.customer.identifiantFiscal,
          address: originalInvoice.customer.address,
          email: originalInvoice.customer.email,
          phoneNumber: originalInvoice.customer.phoneNumber
        },
        lines: invoice.lines.map(line => ({
          id: Date.now() + Math.random(), // Temporary ID for new lines
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          invoiceId: invoice.id!, // Use the invoice ID
          taxRate: line.taxRate
        }))
      };
      
      // Apply optimistic update
      optimisticallyUpdateInvoice(updatedInvoice);

      const res = await secureApiClient.put(INVOICE_ENDPOINTS.UPDATE(invoice.id), invoice);
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        optimisticallyUpdateInvoice(originalInvoice);

        // Build title/body error like create/delete
        let errorTitle = t('invoice.form.errors.submissionFailed');
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
      if (responseData.data) {
        optimisticallyUpdateInvoice(responseData.data);
        silentlyUpdateInvoiceInList(responseData.data);
      }

      toast.success(responseData.message || t('invoice.messages.updated'), {
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
      // Align update error styling with create/delete
      let errorTitle = t('invoice.form.errors.submissionFailed');
      let errorBody = '';
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (typeof error.message === 'string') {
        errorTitle = error.message;
      }
      const errorMessage = errorBody 
        ? `${errorTitle}\n\n${errorBody.split('\n').map((l: string) => `• ${l}`).join('\n')}`
        : errorTitle;
      toast.error(errorMessage, {
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
  }, [invoices, t, optimisticallyUpdateInvoice, silentlyUpdateInvoiceInList]);

  const handleDeleteInvoice = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.processing'));
    
    // Store original data for rollback
    const originalData = invoiceListData;
    const originalInvoice = invoices.find(inv => inv.id === id);
    if (!originalInvoice) {
      toast.error(t('errors.invoiceNotFound'), { id: toastId });
      return;
    }

    // Check if this deletion will make the page incomplete
    const willPageBeIncomplete = invoiceListData && 
      invoiceListData.invoices.length === invoiceListData.pagination.pageSize && 
      invoiceListData.pagination.page < invoiceListData.pagination.totalPages;

    try {
      // Optimistically remove the invoice from both states
      optimisticallyRemoveInvoice(id);
      
      // Optimistically update the server-side data
      if (invoiceListData) {
        setInvoiceListData((prev: any) => {
          if (!prev) return prev;
          const updatedInvoices = prev.invoices.filter((inv: any) => inv.id !== id);
          
          return {
            ...prev,
            invoices: updatedInvoices,
            pagination: {
              ...prev.pagination,
              totalItems: prev.pagination.totalItems - 1,
              totalPages: Math.ceil((prev.pagination.totalItems - 1) / prev.pagination.pageSize)
            }
          };
        });
      }

      const res = await secureApiClient.delete(INVOICE_ENDPOINTS.DELETE(id));

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic updates
        optimisticallyAddInvoice(originalInvoice);
        setInvoiceListData(originalData);

        // Build title/body error like create/update
        let errorTitle = t('invoice.form.errors.submissionFailed');
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
      
      // If the page will be incomplete, refresh the current page data
      if (willPageBeIncomplete) {
        // Silently refresh the current page to get the missing items, preserving filters/sort
        const currentPage = invoiceListData!.pagination.page;
        const currentPageSize = invoiceListData!.pagination.pageSize;
        await fetchInvoices(lastInvoiceFiltersRef.current, lastInvoiceSortRef.current, { page: currentPage, pageSize: currentPageSize });
      }
      
      toast.success(responseData.message || t('invoice.messages.deleted'), {
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

      // Sidebar: decrement invoices count optimistically, then reconcile silently
      incrementSidebarCount('invoicesCount', -1);
      refreshSidebarCountsSilently();

      // Navbar revenue: if deleted invoice was within selected period, refresh
      if (originalInvoice?.date) {
        await refreshRevenueIfInPeriod(originalInvoice.date);
      }

      // Overdue may change as well
      refreshOverdueSilently();
    } catch (error: any) {
      // Handle error with title and body structure
      let errorTitle = t('invoice.form.errors.submissionFailed');
      let errorBody = '';
      
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (error.title) {
        errorTitle = error.title;
      } else if (error.message) {
        if (typeof error.message === 'object') {
          if (error.message.value) {
            errorTitle = error.message.value;
          } else if (error.message.message) {
            errorTitle = error.message.message;
          } else {
            errorTitle = JSON.stringify(error.message);
          }
        } else if (typeof error.message === 'string') {
          errorTitle = error.message;
        }
      }
      
      // Create a more polished error message
      const errorMessage = errorBody 
        ? `${errorTitle}\n\n${errorBody.split('\n').map(line => `• ${line}`).join('\n')}`
        : errorTitle;
      
      toast.error(errorMessage, {
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
  }, [invoices, invoiceListData, t, optimisticallyRemoveInvoice, optimisticallyAddInvoice, fetchInvoices]);

  const handleDownloadPdf = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.downloadingPDF'));
    try {
      const response = await secureApiClient.get(INVOICE_ENDPOINTS.PDF(id));

      const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!response.ok || !responseData?.succeeded) {
        // Build title/body error like other operations
        let errorTitle = t('errors.failedToDownloadPDF');
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
      window.open(data.url, '_blank');
      toast.success(responseData.message || t('invoice.messages.pdfReady'), { 
        id: toastId,
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
    } catch (err: any) {
      // Handle error with title and body structure
      let errorTitle = t('errors.failedToDownloadPDF');
      let errorBody = '';
      
      if (err.title && err.body) {
        errorTitle = err.title;
        errorBody = err.body;
      } else if (err.title) {
        errorTitle = err.title;
      } else if (err.message) {
        if (typeof err.message === 'object') {
          if (err.message.value) {
            errorTitle = err.message.value;
          } else if (err.message.message) {
            errorTitle = err.message.message;
          } else {
            errorTitle = JSON.stringify(err.message);
          }
        } else if (typeof err.message === 'string') {
          errorTitle = err.message;
        }
      }
      
      // Create a more polished error message
      const errorMessage = errorBody 
        ? `${errorTitle}\n\n${errorBody.split('\n').map(line => `• ${line}`).join('\n')}`
        : errorTitle;
      
      toast.error(errorMessage, { 
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
  }, [t]);

  const handleSubmitInvoice = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.submittingInvoice'));
    
    // Check if invoice exists
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) {
      toast.error(t('errors.invoiceNotFound'), { id: toastId });
      return;
    }

    try {
      const response = await secureApiClient.post(INVOICE_ENDPOINTS.SUBMIT(id));


      const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!response.ok || !responseData?.succeeded) {
        // Handle error with structured message
        let errorTitle = t('errors.failedToSubmitInvoice');
        let errorBody = '';
        
        if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          errorBody = '• ' + responseData.errors.join('\n• ');
        } else if (responseData?.message) {
          errorBody = responseData.message;
        } else if (responseData?.title) {
          errorTitle = responseData.title;
          errorBody = responseData.message || t('errors.anErrorOccurred');
        } else {
          errorBody = t('errors.anErrorOccurred');
        }
        
        const error = new Error(errorBody);
        (error as any).title = errorTitle;
        (error as any).body = errorBody;
        (error as any).errors = responseData?.errors;
        throw error;
      }
      
      // Update with server response to get the DGI submission ID
      if (responseData.data && responseData.data.dgiSubmissionId) {
        optimisticallyUpdateInvoiceStatus(id, 2, responseData.data.dgiSubmissionId);
      }
      
      toast.success(responseData.message || t('invoice.messages.submitted'), { 
        id: toastId,
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
    } catch (err: any) {
      // Handle error with title and body structure
      //let errorTitle = t('errors.failedToSubmitInvoice');
      let errorBody = '';
      
      if (err.title && err.body) {
        //errorTitle = err.title;
        errorBody = err.body;
      } else {
        errorBody = err.message || t('errors.anErrorOccurred');
      }
      
      toast.error(errorBody, { 
        id: toastId,
        style: {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }
      });
    }
  }, [invoices, t, optimisticallyUpdateInvoiceStatus, optimisticallyUpdateInvoice]);

  const handleImportCSV = useCallback(async (file: File) => {
    setImportLoading(true);
    const toastId = toast.loading(t('common.file.importingCSV'));
    let successShown = false;
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await secureApiClient.post(INVOICE_ENDPOINTS.IMPORT, formData, true, true);


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
        // Success response (200 OK)
        const imported = data.data?.importedCount || data.data?.imported || data.data?.count || 0;
        const total = data.data?.total || data.data?.count || imported;
        const successMessage = data.message || t('invoice.import.success', { imported, total });
        
        // Dismiss loading toast and show success
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
        
        const currentPage = invoiceListData?.pagination?.page || 1;
        const currentPageSize = invoiceListData?.pagination?.pageSize || 20;
        await fetchInvoices(undefined, undefined, { page: currentPage, pageSize: currentPageSize });
      } else {
        // Validation error response (400/409) - Show in modal
        const errorMessage = data.message || t('invoice.import.error.general');
        const details = data.errors && Array.isArray(data.errors) ? data.errors : 
                      (data.details && Array.isArray(data.details) ? data.details : []);
        
        // Dismiss the loading toast before showing the modal
        toast.dismiss(toastId);
        
        setErrorModal({
          isOpen: true,
          title: t('invoice.import.error.title'),
          message: errorMessage,
          details: details
        });
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : t('invoice.import.error.general');
      toast.dismiss(toastId);

      setErrorModal({
        isOpen: true,
        title: t('common.error'),
        message: errorMessage,
        details: []
      });
    } finally {
      setImportLoading(false);
      // Only dismiss loading toast if success wasn't shown
      if (!successShown) {
        toast.dismiss(toastId);
      }
    }
  }, [t, fetchInvoices, invoiceListData]);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    const toastId = toast.loading(t('invoice.bulk.deleting', { count: ids.length }));
    
    // Store original data for rollback
    const originalData = invoiceListData;
    const originalInvoices = invoices.filter(inv => ids.includes(inv.id));
    
    // Check if this bulk deletion will make the page incomplete
    const willPageBeIncomplete = invoiceListData && 
      invoiceListData.invoices.length === invoiceListData.pagination.pageSize && 
      ids.length > 0 && 
      invoiceListData.pagination.page < invoiceListData.pagination.totalPages;
    
    try {
      // Optimistically remove all invoices from both states
      ids.forEach(id => optimisticallyRemoveInvoice(id));
      
      // Optimistically update the server-side data
      if (invoiceListData) {
        setInvoiceListData((prev: any) => {
          if (!prev) return prev;
          const updatedInvoices = prev.invoices.filter((inv: any) => !ids.includes(inv.id));
          return {
            ...prev,
            invoices: updatedInvoices,
            pagination: {
              ...prev.pagination,
              totalItems: prev.pagination.totalItems - ids.length,
              totalPages: Math.ceil((prev.pagination.totalItems - ids.length) / prev.pagination.pageSize)
            }
          };
        });
      }

      // Perform all delete operations
      await Promise.all(
        ids.map(async (id) => {
          const response = await secureApiClient.delete(INVOICE_ENDPOINTS.DELETE(id));

          const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
          if (!response.ok || !responseData?.succeeded) {
            throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToDeleteInvoice'));
          }
        })
      );
      
      // If the page will be incomplete, refresh the current page data
      if (willPageBeIncomplete) {
        // Silently refresh the current page to get the missing items, preserving filters/sort
        const currentPage = invoiceListData!.pagination.page;
        const currentPageSize = invoiceListData!.pagination.pageSize;
        await fetchInvoices(lastInvoiceFiltersRef.current, lastInvoiceSortRef.current, { page: currentPage, pageSize: currentPageSize });
      }
      
      toast.success(t('invoice.messages.bulkDeleted', { count: ids.length }), { 
        id: toastId,
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
    } catch (err: any) {
      // Revert all optimistic updates
      originalInvoices.forEach(invoice => optimisticallyAddInvoice(invoice));
      setInvoiceListData(originalData);
      
      // Handle error with title and body structure
      let errorTitle = t('errors.failedToDeleteInvoice');
      let errorBody = '';
      
      if (err.title && err.body) {
        errorTitle = err.title;
        errorBody = err.body;
      } else if (err.title) {
        errorTitle = err.title;
      } else if (err.message) {
        if (typeof err.message === 'object') {
          if (err.message.value) {
            errorTitle = err.message.value;
          } else if (err.message.message) {
            errorTitle = err.message.message;
          } else {
            errorTitle = JSON.stringify(err.message);
          }
        } else if (typeof err.message === 'string') {
          errorTitle = err.message;
        }
      }
      
      // Create a more polished error message
      const errorMessage = errorBody 
        ? `${errorTitle}\n\n${errorBody.split('\n').map(line => `• ${line}`).join('\n')}`
        : errorTitle;
      
      toast.error(errorMessage, { 
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
  }, [invoices, invoiceListData, t, optimisticallyRemoveInvoice, optimisticallyAddInvoice, fetchInvoices]);

  const handleBulkSubmit = useCallback(async (ids: number[]) => {
    const toastId = toast.loading(t('invoice.bulk.submitting', { count: ids.length }));
    
    try {

      // Perform all submit operations
      const results = await Promise.all(
        ids.map(async (id) => {
          const response = await secureApiClient.post(INVOICE_ENDPOINTS.SUBMIT(id));

          const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
          if (!response.ok || !responseData?.succeeded) {
            throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToSubmitInvoice'));
          }

          return responseData.data || {};
        })
      );
      
      // Update with server responses to get DGI submission IDs
      results.forEach((result, index) => {
        if (result.dgiSubmissionId) {
          optimisticallyUpdateInvoiceStatus(ids[index], 2, result.dgiSubmissionId);
        }
      });
      
      toast.success(t('invoice.messages.bulkSubmitted', { count: ids.length }), { 
        id: toastId,
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
    } catch (err: any) {
      // Handle error with title and body structure
      let errorTitle = t('errors.failedToSubmitInvoice');
      let errorBody = '';
      
      if (err.title && err.body) {
        errorTitle = err.title;
        errorBody = err.body;
      } else if (err.title) {
        errorTitle = err.title;
      } else if (err.message) {
        if (typeof err.message === 'object') {
          if (err.message.value) {
            errorTitle = err.message.value;
          } else if (err.message.message) {
            errorTitle = err.message.message;
          } else {
            errorTitle = JSON.stringify(err.message);
          }
        } else if (typeof err.message === 'string') {
          errorTitle = err.message;
        }
      }
      
      // Create a more polished error message
      const errorMessage = errorBody 
        ? `${errorTitle}\n\n${errorBody.split('\n').map(line => `• ${line}`).join('\n')}`
        : errorTitle;
      
      toast.error(errorMessage, { 
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
  }, [invoices, t, optimisticallyUpdateInvoiceStatus, optimisticallyUpdateInvoice]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        {canImportCSV(userRole) && (
          <ImportCSV onImport={handleImportCSV} loading={importLoading} />
        )}
        <button
          onClick={() => setShowInvoiceForm(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
            importLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('invoice.create')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <InvoiceList
          data={invoiceListData}
          loading={loading}
          error={error}
          onDelete={handleDeleteInvoice}
          onDownloadPdf={handleDownloadPdf}
          onSubmit={handleSubmitInvoice}
          onCreateInvoice={handleCreateInvoice}
          onUpdateInvoice={handleUpdateInvoice}
          onRefreshInvoices={fetchInvoices}
          disabled={importLoading}
          importLoading={importLoading}
          onImportCSV={handleImportCSV}
          onBulkDelete={handleBulkDelete}
          onBulkSubmit={handleBulkSubmit}
          onUpdateInvoiceStatus={optimisticallyUpdateInvoiceStatus}
        />
      </div>

      {showInvoiceForm && (
        <InvoiceForm
          onSubmit={handleCreateInvoice}
          onClose={() => setShowInvoiceForm(false)}
          disabled={importLoading}
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
}

export default InvoiceManagement;
