import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { CreditNote, NewCreditNote } from '../types/creditNote.types';
import CreditNoteList from './CreditNoteList';
import CreditNoteForm from './CreditNoteForm';
import ImportCreditNoteCSV from './ImportCSV';
import ErrorModal from '../../../components/ErrorModal';
import { CREDITNOTE_ENDPOINTS } from '../api/creditNote.endpoints';
import { secureApiClient } from '../../../config/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { ApiResponse } from '../../auth/types/auth.types';
import { decodeJWT } from '../../../utils/jwt';
import { tokenManager } from '../../../utils/tokenManager';
import { canImportCSV } from '../utils/creditNote.permissions';
import { useStatsContext } from '../../stats/context/StatsContext';

const CreditNoteManagement = () => {
  const { t } = useTranslation();
  const { incrementSidebarCount } = useStatsContext();

  const [token] = useState<string | null>(() => {
    const storedToken = tokenManager.getToken();
    return storedToken || null;
  });

  
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

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [creditNoteListData, setCreditNoteListData] = useState<any>(null);
  const [creditNoteLoading, setCreditNoteLoading] = useState(true);
  const [creditNoteImportLoading] = useState(false);
  const [showCreditNoteForm, setShowCreditNoteForm] = useState(false);
  const [, setImportLoading] = useState(false);

  const decoded = useMemo(() => token ? decodeJWT(token) : null, [token]);
  const userEmail = useMemo(() => decoded?.email || '', [decoded]);

  const lastCreditNoteFiltersRef = useRef<any | undefined>(undefined);
  const lastCreditNoteSortRef = useRef<any | undefined>(undefined);

  // ─── OPTIMISTIC UPDATES ───────────────────────────────────────────────────
  const optimisticallyUpdateCreditNote = useCallback((updatedCreditNote: CreditNote) => {
    try {
      setCreditNotes(prev => prev.map(inv => inv.id === updatedCreditNote.id ? updatedCreditNote : inv));
    } catch (error) {
      // Error updating creditNote optimistically
    }
  }, []);

  const optimisticallyRemoveCreditNote = useCallback((id: number) => {
    try {
      setCreditNotes(prev => prev.filter(inv => inv.id !== id));
    } catch (error) {
      // Error removing creditNote optimistically
    }
  }, []);

  const optimisticallyAddCreditNote = useCallback((newCreditNote: CreditNote) => {
    try {
      setCreditNotes(prev => [newCreditNote, ...prev]);
    } catch (error) {
      // Error adding creditNote optimistically
    }
  }, []);

  const optimisticallyUpdateCreditNoteStatus = useCallback((id: number, newStatus: number, dgiSubmissionId?: string, dgiRejectionReason?: string) => {
    try {
      // Update the creditNotes state
      setCreditNotes(prev => prev.map(inv => 
        inv.id === id 
          ? { 
              ...inv, 
              status: newStatus, 
              dgiSubmissionId: dgiSubmissionId || inv.dgiSubmissionId,
              dgiRejectionReason: dgiRejectionReason || inv.dgiRejectionReason
            }
          : inv
      ));
      
      // Also update the creditNoteListData state
      setCreditNoteListData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          creditNotes: prev.creditNotes.map((inv: any) => 
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
      // Error updating creditNote status optimistically
    }
  }, []);

  // Silent update functions that preserve sorting/filtering
  const silentlyUpdateCreditNoteInList = useCallback((updatedCreditNote: any) => {
    setCreditNoteListData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        creditNotes: prev.creditNotes.map((inv: any) => 
          inv.id === updatedCreditNote.id ? updatedCreditNote : inv
        )
      };
    });
  }, []);

  const silentlyAddCreditNoteToList = useCallback((newCreditNote: any) => {
    setCreditNoteListData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        creditNotes: [newCreditNote, ...prev.creditNotes],
        pagination: {
          ...prev.pagination,
          totalItems: prev.pagination.totalItems + 1,
          totalPages: Math.ceil((prev.pagination.totalItems + 1) / prev.pagination.pageSize)
        }
      };
    });
  }, []);

  // ─── FETCH LIST ────────────────────────────────────────────────────────────
  const fetchCreditNotes = useCallback(async (filters?: any, sort?: any, pagination?: any) => {
    setCreditNoteLoading(true);
    try {
      // Persist last used filters and sort for later silent refreshes
      lastCreditNoteFiltersRef.current = filters;
      lastCreditNoteSortRef.current = sort;

      const queryParams = new URLSearchParams();
      
      // Add filters
      if (filters) {
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
        if (filters.searchTerm) queryParams.append('q', filters.searchTerm);
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
      
      const url = `${CREDITNOTE_ENDPOINTS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await secureApiClient.get(url);

      const responseData: ApiResponse<any> = await response.json().catch(() => ({ succeeded: false, message: 'Failed to parse response' }));
      if (!response.ok || !responseData?.succeeded) {
        const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch creditNotes';
        throw new Error(errorMessage);
      }

      const apiData = responseData.data || {};
      const transformed = {
        creditNotes: Array.isArray(apiData.items) ? apiData.items : (apiData.creditNotes || []),
        pagination: apiData.pagination || {
          totalItems: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0
        },
        filters: apiData.filters || { statuses: [], customers: [] }
      };
      setCreditNoteListData(transformed);
      // Keep the old creditNotes state for backward compatibility
      setCreditNotes(transformed.creditNotes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreditNoteLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);


  const handleCreateCreditNote = useCallback(async (newCreditNote: NewCreditNote, customerName?: string) => {
    try {
      // Create temporary creditNote for optimistic update
      const tempCreditNote: CreditNote = {
        id: Date.now(), // Temporary ID
        creditNoteNumber: 'TEMP-' + Date.now(),
        date: newCreditNote.date,
        customer: { id: newCreditNote.customerId, name: customerName || 'Unknown Customer' },
        subTotal: 0, // Will be calculated by backend
        vat: 0, // Will be calculated by backend
        total: 0, // Will be calculated by backend
        status: 0, // Default draft status
        lines: newCreditNote.lines.map(line => ({
          id: Date.now() + Math.random(), // Temporary ID
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          creditNoteId: Date.now(), // Temporary creditNote ID
          taxRate: line.taxRate
        })),
        createdAt: new Date().toISOString(),
        createdBy: {
          createdById: '',
          name: userEmail.split('@')[0] || 'User',
          email: userEmail
        }
      };

      // Optimistically add the creditNote
      optimisticallyAddCreditNote(tempCreditNote);

      const res = await secureApiClient.post(CREDITNOTE_ENDPOINTS.CREATE, newCreditNote);
      
      let responseData;
      try {
        responseData = await res.json();
      } catch (parseError) {
        responseData = { succeeded: false, message: t('errors.anErrorOccurred') };
      }
      
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        optimisticallyRemoveCreditNote(tempCreditNote.id);

        // Handle different error response formats
        let errorTitle = t('creditNote.form.errors.submissionFailed');
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
      toast.success(responseData.message || t('creditNote.messages.created'), {
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
      
      // Replace temporary creditNote with real data
      optimisticallyRemoveCreditNote(tempCreditNote.id);
      optimisticallyAddCreditNote(data);
      silentlyAddCreditNoteToList(data);
      
      // Update sidebar count
      incrementSidebarCount('creditNotesCount', 1);
    } catch (error: any) {
      // Handle error with title and body structure
      let errorTitle = t('creditNote.form.errors.submissionFailed');
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
  }, [userEmail, t, optimisticallyAddCreditNote, optimisticallyRemoveCreditNote, silentlyAddCreditNoteToList]);

  const handleUpdateCreditNote = useCallback(async (creditNote: NewCreditNote, customerName?: string) => {
    if (!creditNote.id) {
      toast.error(t('errors.failedToUpdateCreditNote'));
      return;
    }

    try {
      // Store original creditNote for rollback
      const originalCreditNote = creditNotes.find(inv => inv.id === creditNote.id);
      if (!originalCreditNote) throw new Error('CreditNote not found');

      // Optimistically update the creditNote
      const updatedCreditNote: CreditNote = {
        ...originalCreditNote,
        date: creditNote.date,
        customer: { 
          id: creditNote.customerId, 
          name: customerName || originalCreditNote.customer.name 
        },
        lines: creditNote.lines.map(line => ({
          id: Date.now() + Math.random(), // Temporary ID for new lines
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          creditNoteId: creditNote.id!, // Use the creditNote ID
          taxRate: line.taxRate
        }))
      };
      
      // Apply optimistic update
      optimisticallyUpdateCreditNote(updatedCreditNote);

      const res = await secureApiClient.put(CREDITNOTE_ENDPOINTS.UPDATE(creditNote.id), creditNote);
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        optimisticallyUpdateCreditNote(originalCreditNote);

        // Build title/body error like create/delete
        let errorTitle = t('creditNote.form.errors.submissionFailed');
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
        optimisticallyUpdateCreditNote(responseData.data);
        silentlyUpdateCreditNoteInList(responseData.data);
      }

      toast.success(responseData.message || t('creditNote.messages.updated'), {
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
      let errorTitle = t('creditNote.form.errors.submissionFailed');
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
  }, [creditNotes, t, optimisticallyUpdateCreditNote, silentlyUpdateCreditNoteInList]);

  const handleDeleteCreditNote = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.processing'));
    
    // Store original data for rollback
    const originalData = creditNoteListData;
    const originalCreditNote = creditNotes.find(inv => inv.id === id);
    if (!originalCreditNote) {
      toast.error(t('errors.creditNoteNotFound'), { id: toastId });
      return;
    }

    // Check if this deletion will make the page incomplete
    const willPageBeIncomplete = creditNoteListData && 
      creditNoteListData.creditNotes.length === creditNoteListData.pagination.pageSize && 
      creditNoteListData.pagination.page < creditNoteListData.pagination.totalPages;

    try {
      // Optimistically remove the creditNote from both states
      optimisticallyRemoveCreditNote(id);
      
      // Optimistically update the server-side data
      if (creditNoteListData) {
        setCreditNoteListData((prev: any) => {
          if (!prev) return prev;
          const updatedCreditNotes = prev.creditNotes.filter((inv: any) => inv.id !== id);
          
          return {
            ...prev,
            creditNotes: updatedCreditNotes,
            pagination: {
              ...prev.pagination,
              totalItems: prev.pagination.totalItems - 1,
              totalPages: Math.ceil((prev.pagination.totalItems - 1) / prev.pagination.pageSize)
            }
          };
        });
      }

      const res = await secureApiClient.delete(CREDITNOTE_ENDPOINTS.DELETE(id));

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic updates
        optimisticallyAddCreditNote(originalCreditNote);
        setCreditNoteListData(originalData);

        // Build title/body error like create/update
        let errorTitle = t('creditNote.form.errors.submissionFailed');
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
        const currentPage = creditNoteListData!.pagination.page;
        const currentPageSize = creditNoteListData!.pagination.pageSize;
        await fetchCreditNotes(lastCreditNoteFiltersRef.current, lastCreditNoteSortRef.current, { page: currentPage, pageSize: currentPageSize });
      }
      
      // Update sidebar count
      incrementSidebarCount('creditNotesCount', -1);
      
      toast.success(responseData.message || t('creditNote.messages.deleted'), {
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
      let errorTitle = t('creditNote.form.errors.submissionFailed');
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
  }, [creditNotes, creditNoteListData, t, optimisticallyRemoveCreditNote, optimisticallyAddCreditNote, fetchCreditNotes]);

  const handleDownloadPdf = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.downloadingPDF'));
    try {
      const response = await secureApiClient.get(CREDITNOTE_ENDPOINTS.PDF(id));

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
      toast.success(responseData.message || t('creditNote.messages.pdfReady'), { 
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

  const handleSubmitCreditNote = useCallback(async (id: number) => {
    const toastId = toast.loading(t('common.submittingCreditNote'));
    
    // Store original creditNote for rollback
    const originalCreditNote = creditNotes.find(inv => inv.id === id);
    if (!originalCreditNote) {
      toast.error(t('errors.creditNoteNotFound'), { id: toastId });
      return;
    }

    try {
      const response = await secureApiClient.post(CREDITNOTE_ENDPOINTS.SUBMIT(id));

      const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!response.ok || !responseData?.succeeded) {
        // Handle error with structured message
        let errorTitle = t('errors.failedToSubmitCreditNote');
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
      
      // Update status to "Awaiting Clearance" only after successful submission
      if (responseData.data && responseData.data.dgiSubmissionId) {
        optimisticallyUpdateCreditNoteStatus(id, 2, responseData.data.dgiSubmissionId);
      } else {
        // If no DGI submission ID, still update the status to "Awaiting Clearance"
        optimisticallyUpdateCreditNoteStatus(id, 2);
      }
      
      toast.success(responseData.message || t('creditNote.messages.submitted'), { 
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
      //let errorTitle = t('errors.failedToSubmitCreditNote');
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
  }, [creditNotes, t, optimisticallyUpdateCreditNoteStatus, optimisticallyUpdateCreditNote]);

  
  const handleImportCreditNoteCSV = useCallback(async (file: File) => {
    setImportLoading(true);
    const toastId = toast.loading(t('common.file.importingCSV'));
    let successShown = false;
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await secureApiClient.post(CREDITNOTE_ENDPOINTS.IMPORT, formData, true, true);

      if (response.status === 401) {
        toast.error(t('common.unauthorized'), { id: toastId });
        return;
      }

      if (response.status === 500) {
        toast.error(t('errors.unexpectedError'), { id: toastId });
        return;
      }

      const data = await response.json();

      console.log('response', data);
      
      if (response.ok && data.succeeded) {
        // Success response (200 OK)
        const imported = data.data?.importedCount || data.data?.imported || data.data?.count || 0;
        const total = data.data?.total || data.data?.count || imported;
        const successMessage = data.message || t('creditNote.import.success', { imported, total });
        
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
        
        const currentPage = creditNoteListData?.pagination?.page || 1;
        const currentPageSize = creditNoteListData?.pagination?.pageSize || 20;
        await fetchCreditNotes(undefined, undefined, { page: currentPage, pageSize: currentPageSize });
        
        // Update sidebar count for imported credit notes
        if (data.data?.importedCount) {
          incrementSidebarCount('creditNotesCount', data.data.importedCount);
        }
      } else {
        // Validation error response (400/409) - Show in modal
        const errorMessage = data.message || t('creditNote.import.error.general');
        const details = data.errors && Array.isArray(data.errors) ? data.errors : 
                      (data.details && Array.isArray(data.details) ? data.details : []);
        
        // Dismiss the loading toast before showing the modal
        toast.dismiss(toastId);
        console.log('details', details);
        setErrorModal({
          isOpen: true,
          title: t('creditNote.import.error.title'),
          message: errorMessage,
          details: details
        });
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : t('creditNote.import.error.general');
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
  }, [t, fetchCreditNotes, creditNoteListData]);


  /*const handleImportCreditNoteCSV = useCallback(async (file: File) => {
    setCreditNoteImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await secureApiClient.post(CREDITNOTE_ENDPOINTS.IMPORT, formData);
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        throw new Error(responseData?.message || t('creditNote.form.errors.importFailed'));
      }
      toast.success(t('creditNote.form.importSuccess'));
      fetchCreditNotes();
    } catch (err: any) {
      toast.error(err.message || t('creditNote.form.errors.importFailed'));
    } finally {
      setCreditNoteImportLoading(false);
    }
  }, [t, fetchCreditNotes]);*/

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        {canImportCSV(decoded?.role || 'Clerk') && (
          <ImportCreditNoteCSV onImport={handleImportCreditNoteCSV} loading={creditNoteImportLoading} />
        )}
        <button
          onClick={() => setShowCreditNoteForm(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
            creditNoteImportLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('creditNote.create')}
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <CreditNoteList
          data={creditNoteListData}
          loading={creditNoteLoading}
          onDelete={handleDeleteCreditNote}
          onDownloadPdf={handleDownloadPdf}
          onSubmit={handleSubmitCreditNote}
          onCreateCreditNote={handleCreateCreditNote}
          onUpdateCreditNote={handleUpdateCreditNote}
          onRefreshCreditNotes={fetchCreditNotes}
          disabled={creditNoteImportLoading}
          importLoading={creditNoteImportLoading}
          onImportCSV={handleImportCreditNoteCSV}
          onUpdateCreditNoteStatus={optimisticallyUpdateCreditNoteStatus}
        />
      </div>
      {showCreditNoteForm && (
        <CreditNoteForm
          onSubmit={handleCreateCreditNote}
          onClose={() => setShowCreditNoteForm(false)}
          disabled={creditNoteImportLoading}
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
};

export default CreditNoteManagement;
