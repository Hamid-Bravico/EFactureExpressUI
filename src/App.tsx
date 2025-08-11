import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { Company } from "./types/common";
import { Invoice, NewInvoice } from "./domains/invoices/types/invoice.types";
import Dashboard from "./domains/dashboard/components/Dashboard";
import { DashboardFilters } from "./domains/dashboard/types/dashboard.types";
import InvoiceList from "./domains/invoices/components/InvoiceList";
import ImportCSV from "./domains/invoices/components/ImportCSV";
import InvoiceForm from "./domains/invoices/components/InvoiceForm";
import QuoteManagement from "./domains/quotes/components/QuoteManagement";
import LoginPage from "./domains/auth/components/LoginPage";
import RegisterPage from "./domains/auth/components/RegisterPage";
import { ApiResponse } from "./domains/auth/types/auth.types";
import Users from "./domains/users/components/Users";
import { getSecureHeaders, getJsonHeaders, secureApiClient } from "./config/api";
import { API_BASE_URL } from "./config/constants";
import { AUTH_ENDPOINTS } from "./domains/auth/api/auth.endpoints";
import { INVOICE_ENDPOINTS } from "./domains/invoices/api/invoice.endpoints";
import { APP_CONFIG } from "./config/app";
import { Toaster, toast } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPage from './components/ErrorPage';
import ErrorModal from './components/ErrorModal';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';
import { decodeJWT } from "./utils/jwt";
import { tokenManager } from "./utils/tokenManager";
import CompanyProfile from "./components/CompanyProfile";
import CustomerCRUD from "./domains/customers/components/CustomerCRUD";
import CatalogManagement from "./domains/catalog/components/CatalogManagement";

function App() {
  const { t, i18n } = useTranslation();
  // ─── AUTH STATE ───────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = tokenManager.getToken();
    // Do not clear expired token here; allow the refresh flow to handle it
    return storedToken || null;
  });

  const [company, setCompany] = useState<Company | null>(() => {
    const storedCompany = tokenManager.getCompanyData();
    return storedCompany;
  });

  // ─── LISTING STATE ─────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceListData, setInvoiceListData] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({});
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
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

  // ─── LANGUAGE STATE ───────────────────────────────────────────────────────
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    i18n.changeLanguage(language);
  }, [language, i18n]);

  // Handle token refresh events
  useEffect(() => {
    const handleTokenRefresh = (event: CustomEvent) => {
      const newToken = event.detail?.token;
      if (newToken) {
        setToken(newToken);
        toast.success(t('auth.tokenRefreshed'));
      }
    };

    const handleTokenRefreshFailed = () => {
      setToken(null);
      setCompany(null);
      toast.error(t('auth.tokenRefreshFailed'));
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    window.addEventListener('tokenRefreshFailed', handleTokenRefreshFailed);

    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
      window.removeEventListener('tokenRefreshFailed', handleTokenRefreshFailed);
    };
  }, [t]);

  // ─── ACCOUNT DROPDOWN ──────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const decoded = useMemo(() => token ? decodeJWT(token) : null, [token]);
  const userEmail = useMemo(() => decoded?.email || '', [decoded]);
  const userRole = useMemo(() => decoded?.role || tokenManager.getUserRole(), [decoded]);

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

  /*const silentlyRemoveInvoiceFromList = useCallback((id: number) => {
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
  }, []);*/

  // ─── FETCH DASHBOARD STATS ─────────────────────────────────────────────────
  const fetchDashboardStats = useCallback(async (filters?: DashboardFilters) => {
    setDashboardLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters) {
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
        if (filters.status !== undefined) queryParams.append('status', filters.status.toString());
      }
      
      const url = `${API_BASE_URL}/dashboard/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await secureApiClient.get(url);
      
      const responseData: ApiResponse<any> = await response.json().catch(() => ({ succeeded: false, message: 'Failed to parse response' }));
      if (!response.ok || !responseData?.succeeded) {
        const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch dashboard stats';
        throw new Error(errorMessage);
      }
      setDashboardStats(responseData.data || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ─── HANDLE DASHBOARD FILTERS ─────────────────────────────────────────────
  const handleDashboardFiltersChange = useCallback((filters: DashboardFilters) => {
    setDashboardFilters(filters);
    fetchDashboardStats(filters);
  }, [fetchDashboardStats]);

  // ─── FETCH LIST ────────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async (filters?: any, sort?: any, pagination?: any) => {
    setLoading(true);
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
        const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch invoices';
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
      toast.error(err instanceof Error ? err.message : 'An error occurred');
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
      fetchDashboardStats();
    }
  }, [token, fetchInvoices, fetchDashboardStats]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: "POST",
        headers: getJsonHeaders(), // Using regular headers for login (no CSRF required)
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const responseData = await response.json();
      
      if (!responseData.succeeded) {
        const errorMessage = responseData.errors?.join(', ') || responseData.message || t('errors.invalidCredentials');
        throw new Error(errorMessage);
      }

      if (!responseData.data) {
        throw new Error(t('errors.invalidResponse'));
      }

      const data = responseData.data;
      
      if (!data.token) {
        throw new Error(t('errors.invalidResponse'));
      }

      // Extract user info from JWT token
      const decoded = decodeJWT(data.token);
      if (!decoded) {
        throw new Error(t('errors.invalidResponse'));
      }
      if (!decoded.role) {
        throw new Error(t('errors.invalidRole'));
      }
      if (!decoded.userId) {
        throw new Error(t('errors.invalidUserId'));
      }

      // Store access token; refresh token is handled by HttpOnly cookie
      tokenManager.setToken(data.token);
      tokenManager.setUserData(decoded.role, decoded.userId, data.companyDetails);
      if (data.companyDetails) {
        setCompany(data.companyDetails);
      }
      setToken(data.token);
    } catch (error) {
      // Handle network errors (like when backend is not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(t('errors.failedToFetch'));
      }
      throw error;
    }
  }, [t]);

  const handleLogout = useCallback(async () => {
    try {
      // Call backend logout endpoint to clear CSRF cookie
      await fetch(AUTH_ENDPOINTS.LOGOUT, {
        method: 'POST',
        headers: getSecureHeaders(token),
        credentials: 'include',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout request failed:', error);
      }
      // Clear frontend auth data
      tokenManager.clearAuthData();
      setToken(null);
      setCompany(null);
    }
  }, [token]);

  const handleCreateInvoice = useCallback(async (newInvoice: NewInvoice, customerName?: string) => {
    try {
      // Create temporary invoice for optimistic update
      const tempInvoice: Invoice = {
        id: Date.now(), // Temporary ID
        invoiceNumber: 'TEMP-' + Date.now(),
        date: newInvoice.date,
        customer: { id: newInvoice.customerId, name: customerName || 'Unknown Customer' },
        subTotal: 0, // Will be calculated by backend
        vat: 0, // Will be calculated by backend
        total: 0, // Will be calculated by backend
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
          name: userEmail.split('@')[0] || 'User',
          email: userEmail
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
  }, [userEmail, t, optimisticallyAddInvoice, optimisticallyRemoveInvoice, silentlyAddInvoiceToList]);

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
          name: customerName || originalInvoice.customer.name 
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
    
    // Store original invoice for rollback
    const originalInvoice = invoices.find(inv => inv.id === id);
    if (!originalInvoice) {
      toast.error(t('errors.invoiceNotFound'), { id: toastId });
      return;
    }

    try {
      // Optimistically update status to "Awaiting Clearance"
      optimisticallyUpdateInvoiceStatus(id, 2);

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
        
        // Revert optimistic update
        optimisticallyUpdateInvoice(originalInvoice);
        
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
    
    // Store original invoices for rollback
    const originalInvoices = invoices.filter(inv => ids.includes(inv.id));
    
    try {
      // Optimistically update all invoices to "Awaiting Clearance"
      ids.forEach(id => optimisticallyUpdateInvoiceStatus(id, 2));

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
      // Revert all optimistic updates
      originalInvoices.forEach(invoice => optimisticallyUpdateInvoice(invoice));
      
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

  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    setLanguage(newLang);
  }, [i18n.language]);

  // ─── RENDER NAVBAR ─────────────────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const renderNavbar = () => {
    const isAdmin = userRole === 'Admin';
    const isManager = userRole === 'Manager';
    const canAccessUsers = isAdmin || isManager;

    return (
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-white/90 via-blue-50/80 to-white/90 backdrop-blur border-b border-gray-200 shadow-sm rounded-b-2xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img
                  src={token ? APP_CONFIG.logo : APP_CONFIG.logoH}
                  alt={`${APP_CONFIG.title} Logo`}
                  className="h-8 w-auto"
                />
              </div>
              {token && (
                <>
                  <button
                    className="sm:hidden ml-2 p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => setMobileMenuOpen((open) => !open)}
                    aria-label="Toggle navigation menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className={`hidden sm:flex sm:ml-8 sm:space-x-2 transition-all duration-200`}>
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                        ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                        after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                        hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                      }
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {t('common.dashboard')}
                    </NavLink>
                    <NavLink
                      to="/invoices"
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                        ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                        after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                        hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                      }
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('common.invoices')}
                    </NavLink>
                    <NavLink
                      to="/quotes"
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                        ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                        after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                        hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                      }
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      {t('common.quotes')}
                    </NavLink>
                    <NavLink
                      to="/customers"
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                        ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                        after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                        hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                      }
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('common.customers')}
                    </NavLink>
                    {(isAdmin || isManager) && (
                      <NavLink
                        to="/catalog"
                        className={({ isActive }) =>
                          `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                          ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                          after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                          hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                        }
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {t('common.catalog')}
                      </NavLink>
                    )}
                    {canAccessUsers && (
                      <NavLink
                        to="/users"
                        className={({ isActive }) =>
                          `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                          ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                          after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                          hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                        }
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {t('common.users')}
                      </NavLink>
                    )}
                  </div>
                  {/* Mobile menu */}
                  {mobileMenuOpen && (
                    <div className="absolute left-0 top-16 w-full bg-white/95 shadow-lg rounded-b-2xl border-t border-gray-200 flex flex-col space-y-1 py-2 px-2 sm:hidden animate-fade-in z-50 transition-all duration-300">
                      <NavLink
                        to="/"
                        className={({ isActive }) =>
                          `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                            isActive
                              ? "bg-blue-50 text-blue-700 shadow-sm"
                              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                          }`
                        }
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {t('common.dashboard')}
                      </NavLink>
                      <NavLink
                        to="/invoices"
                        className={({ isActive }) =>
                          `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                            isActive
                              ? "bg-blue-50 text-blue-700 shadow-sm"
                              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                          }`
                        }
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('common.invoices')}
                      </NavLink>
                      <NavLink
                        to="/quotes"
                        className={({ isActive }) =>
                          `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                            isActive
                              ? "bg-blue-50 text-blue-700 shadow-sm"
                              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                          }`
                        }
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {t('common.quotes')}
                      </NavLink>
                      <NavLink
                        to="/customers"
                        className={({ isActive }) =>
                          `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                            isActive
                              ? "bg-blue-50 text-blue-700 shadow-sm"
                              : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                          }`
                        }
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {t('common.customers')}
                      </NavLink>
                      {(isAdmin || isManager) && (
                        <NavLink
                          to="/catalog"
                          className={({ isActive }) =>
                            `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                              isActive
                                ? "bg-blue-50 text-blue-700 shadow-sm"
                                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            }`
                          }
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          {t('common.catalog')}
                        </NavLink>
                      )}
                      {canAccessUsers && (
                        <NavLink
                          to="/users"
                          className={({ isActive }) =>
                            `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                              isActive
                                ? "bg-blue-50 text-blue-700 shadow-sm"
                                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            }`
                          }
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {t('common.users')}
                        </NavLink>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={toggleLanguage}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
              >
                {i18n.language === 'en' ? 'FR' : 'EN'}
              </button>
              {token && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((open) => !open)}
                    className="flex items-center space-x-2 sm:space-x-3 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="max-w-[110px] sm:max-w-[150px] truncate">{userEmail}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-150 ${dropdownOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 py-1 animate-fadeIn">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-medium text-gray-900 truncate">{userEmail}</div>
                        <div className="text-sm text-gray-500 mt-0.5 flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            userRole === 'Admin' ? 'bg-indigo-400' :
                            userRole === 'Manager' ? 'bg-amber-400' :
                            'bg-green-400'
                          }`}></span>
                          <span className="capitalize">{userRole}</span>
                        </div>
                      </div>
                      {company && (
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="font-medium text-gray-900 truncate flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                            </svg>
                            {company.name}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate">{(company.ICE || company.ice) ? `ICE: ${company.ICE || company.ice}` : 'ICE:'}</span>
                          </div>
                        </div>
                      )}
                      <NavLink
                        to="/profile"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors duration-150"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{t('common.profile')}</span>
                      </NavLink>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors duration-150 border-t border-gray-200 mt-2 pt-2"
                      >
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                        </svg>
                        <span className="font-medium">{t('auth.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary
      fallback={
        <ErrorPage
          title={t('errors.applicationError')}
          message={t('errors.somethingWentWrong')}
          onRetry={() => window.location.reload()}
        />
      }
    >
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <Toaster position="top-right" />
          {renderNavbar()}

          {!token ? (
            <Routes>
              <Route
                path="/login"
                element={
                  <LoginPage
                    onLogin={handleLogin}
                    onToggleLanguage={toggleLanguage}
                    currentLanguage={i18n.language}
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <RegisterPage
                    onToggleLanguage={toggleLanguage}
                    currentLanguage={i18n.language}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary
                        fallback={
                                                  <ErrorPage
                          inline
                          title={t('errors.applicationError')}
                          message={t('errors.sectionError')}
                          onRetry={() => fetchDashboardStats(dashboardFilters)}
                        />
                        }
                      >
                        <Dashboard
                          stats={dashboardStats}
                          loading={dashboardLoading}
                          filters={dashboardFilters}
                          onRefresh={() => fetchDashboardStats(dashboardFilters)}
                          onFiltersChange={handleDashboardFiltersChange}
                        />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invoices"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary
                        fallback={
                          <ErrorPage
                            inline
                            title={t('errors.applicationError')}
                            message={t('errors.sectionError')}
                          />
                        }
                      >
                        <div>
                          <div className="mb-6 flex items-center justify-between">
                            <ImportCSV onImport={handleImportCSV} loading={importLoading} />
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
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quotes"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary
                        fallback={
                          <ErrorPage
                            inline
                            title={t('errors.applicationError')}
                            message={t('errors.sectionError')}
                          />
                        }
                      >
                        <QuoteManagement token={token} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                      <ErrorBoundary
                        fallback={
                          <ErrorPage
                            inline
                            title={t('errors.applicationError')}
                            message={t('errors.sectionError')}
                          />
                        }
                      >
                        <Users token={token} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <CompanyProfile 
                        company={company} 
                        token={token} 
                        onUpdate={(updatedCompany) => {
                          if (company) {
                            const updatedCompanyData = { ...company, ...updatedCompany };
                            setCompany(updatedCompanyData);
                            // Update the stored company data
                            tokenManager.updateCompanyData(updatedCompany);
                          }
                        }}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary
                        fallback={
                          <ErrorPage
                            inline
                            title={t('errors.applicationError')}
                            message={t('errors.sectionError')}
                          />
                        }
                      >
                        <CustomerCRUD token={token} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/catalog"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary
                        fallback={
                          <ErrorPage
                            inline
                            title={t('errors.applicationError')}
                            message={t('errors.sectionError')}
                          />
                        }
                      >
                        <CatalogManagement token={token} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          )}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
