import React, { useState, useCallback, useEffect } from 'react';
import { CreditNote } from '../types/creditNote.types';
import { DgiStatusResponse } from '../../../types/common';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CreditNoteStatusBadge from './CreditNoteStatusBadge';
import { secureApiClient } from '../../../config/api';
import { API_BASE_URL } from '../../../config/constants';
import { CREDITNOTE_ENDPOINTS } from '../api/creditNote.endpoints';
import { 
  getCreditNoteActionPermissions, 
  CreditNoteStatus,
  canRevertToDraft,
  canSubmitToDGI
} from '../utils/creditNote.permissions';
import { UserRole } from '../../../utils/shared.permissions';
import { tokenManager } from '../../../utils/tokenManager';
import PDFPreviewModal from './PDFPreviewModal';

interface CreditNoteDetailProps {
  creditNote: CreditNote;
  onOptimisticStatusUpdate?: (id: number, status: number, dgiSubmissionId?: string, dgiRejectionReason?: string) => void;
  onDownloadPdf: (id: number) => void;
  onEdit: (creditNote: CreditNote) => void;
  onDelete: (id: number) => void;
  onSubmit: (id: number) => void;
  disabled?: boolean;
}

const CreditNoteDetail: React.FC<CreditNoteDetailProps> = ({
  creditNote,
  onOptimisticStatusUpdate,
  onDownloadPdf,
  onEdit,
  onDelete,
  onSubmit,
  disabled = false
}) => {
  const { t, i18n } = useTranslation();
  const [refreshingStatusId, setRefreshingStatusId] = useState<number | null>(null);
  const [fetchingJsonId, setFetchingJsonId] = useState<number | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ creditNoteId: number; reason: string } | null>(null);
  const [helperAppStatus, setHelperAppStatus] = useState<'checking' | 'connected' | 'disconnected' | 'not-applicable'>('checking');
  const [pdfPreviewModal, setPdfPreviewModal] = useState<{ isOpen: boolean; pdfUrl: string; title: string }>({
    isOpen: false,
    pdfUrl: '',
    title: ''
  });

  const userRole = tokenManager.getUserRole() as UserRole || 'Clerk';

  // Format currency based on current language
  const formatCurrency = (amount: number) => {
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
    
    if (i18n.language === 'fr') {
      return formatters.fr.format(amount) + ' MAD';
    } else {
      return formatters.en.format(amount);
    }
  };

  const handleDownloadJson = useCallback(async (creditNoteId: number) => {
    setFetchingJsonId(creditNoteId);
    try {
      const token = tokenManager.getToken();
      if (!token) throw new Error('No token');
      
      const res = await secureApiClient.get(CREDITNOTE_ENDPOINTS.JSON(creditNoteId));
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Build title/body error like other operations
        let errorTitle = 'Failed to fetch JSON. Make sure Compliance Mode is enabled.';
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
      if (data.url) {
        window.open(data.url, '_blank');
        toast.success(responseData.message || 'JSON downloaded successfully', {
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
      } else {
        throw new Error('No URL provided in response');
      }
    } catch (err: any) {
      // Handle error with title and body structure
      let errorTitle = 'Failed to fetch JSON. Make sure Compliance Mode is enabled.';
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
    } finally {
      setFetchingJsonId(null);
    }
  }, [t]);

  const handleRefreshDgiStatus = useCallback(async (creditNoteId: number) => {
    setRefreshingStatusId(creditNoteId);
    const toastId = toast.loading(t('creditNote.dgiStatus.checking'));
    
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No token');
      }
      
      const res = await secureApiClient.get(CREDITNOTE_ENDPOINTS.DGI_STATUS(creditNoteId));
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Handle error with structured message
        let errorTitle = t('creditNote.dgiStatus.errorChecking');
        let errorBody = '';
        
        if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          errorBody = responseData.errors.join('\n• ');
        } else if (responseData?.message) {
          errorBody = responseData.message;
        } else {
          errorBody = t('errors.anErrorOccurred');
        }
        
        const error = new Error(errorBody);
        (error as any).title = errorTitle;
        (error as any).body = errorBody;
        throw error;
      }
      
      const data: DgiStatusResponse = responseData.data;
      
      switch (data.status) {
        case 'PendingValidation':
          toast.success(t('creditNote.dgiStatus.stillPending'), { 
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
          break;
          
        case 'Validated':
          toast.success(t('creditNote.status.validated'), { 
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
          if (onOptimisticStatusUpdate) {
            onOptimisticStatusUpdate(creditNoteId, 3);
          }
          break;
          
        case 'Rejected':
          const rejectionReason = data.errors.length > 0 
            ? data.errors.map(error => error.errorMessage).join('; ') 
            : 'No specific reason provided';
          toast.error(t('creditNote.status.rejected'), { 
            id: toastId,
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.5'
            }
          });
          setRejectionModal({ creditNoteId, reason: rejectionReason });
          if (onOptimisticStatusUpdate) {
            onOptimisticStatusUpdate(creditNoteId, 4, undefined, rejectionReason);
          }
          break;
          
        default:
          toast.error(`Unknown DGI status received: ${data.status}`, { 
            id: toastId,
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.5'
            }
          });
          break;
      }
    } catch (error: any) {
      // Handle error with title and body structure
      let errorTitle = t('creditNote.dgiStatus.errorChecking');
      let errorBody = '';
      
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else {
        errorBody = error.message || t('errors.anErrorOccurred');
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
    } finally {
      setRefreshingStatusId(null);
    }
  }, [t, onOptimisticStatusUpdate]);

  const handleSubmit = useCallback((id: number) => {
    if (window.confirm(t('creditNote.confirm.message', { 
      action: t('creditNote.actions.submit'),
      count: 1,
      plural: '',
      warning: ''
    }))) {
      onSubmit(id);
    }
  }, [onSubmit, t]);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm(t('creditNote.confirm.message', { 
      action: t('creditNote.actions.delete'),
      count: 1,
      plural: '',
      warning: t('creditNote.confirm.warning')
    }))) {
      onDelete(id);
    }
  }, [onDelete, t]);

  const handlePreviewPdf = useCallback(async (creditNoteId: number) => {
    const toastId = toast.loading(t('creditNote.previewingPDF'));
    try {
      const response = await secureApiClient.get(CREDITNOTE_ENDPOINTS.PDF_PREVIEW(creditNoteId));
      
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
        let errorTitle = t('creditNote.errors.failedToPreviewPDF');
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

      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);
      
      setPdfPreviewModal({
        isOpen: true,
        pdfUrl,
        title: t('creditNote.messages.preview.title', { creditNoteNumber: creditNote.creditNoteNumber })
      });
      
      toast.success(t('creditNote.messages.preview.success'), { 
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
      let errorTitle = t('creditNote.errors.failedToPreviewPDF');
      let errorBody = '';
      
      if (err.title && err.body) {
        errorTitle = err.title;
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
  }, [t, creditNote.creditNoteNumber]);

  const closePdfPreview = useCallback(() => {
    if (pdfPreviewModal.pdfUrl) {
      URL.revokeObjectURL(pdfPreviewModal.pdfUrl);
    }
    setPdfPreviewModal({ isOpen: false, pdfUrl: '', title: '' });
  }, [pdfPreviewModal.pdfUrl]);

  const handleStatusChange = useCallback(async (creditNoteId: number, newStatus: number) => {
    setRefreshingStatusId(creditNoteId);
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No valid token available');
      }

      let endpoint: string;
      if (newStatus === 0) {
        // Use new set-draft endpoint
        endpoint = CREDITNOTE_ENDPOINTS.SET_DRAFT(creditNoteId);
      } else {
        // Fallback to old endpoint for other status changes
        endpoint = CREDITNOTE_ENDPOINTS.UPDATE_STATUS(creditNoteId, newStatus);
      }

      const response = await secureApiClient.post(endpoint);

      const responseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!response.ok || !responseData?.succeeded) {
        // Build title/body error like other operations
        let errorTitle = t('creditNote.list.statusUpdateError');
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

      // Call optimistic update to update UI state
      if (onOptimisticStatusUpdate) {
        onOptimisticStatusUpdate(creditNoteId, newStatus);
      }
      
      toast.success(responseData.message || t('creditNote.list.statusUpdateSuccess'), {
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
      let errorTitle = t('creditNote.list.statusUpdateError');
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
    } finally {
      setRefreshingStatusId(null);
    }
  }, [onOptimisticStatusUpdate, t]);

  // Confirmation handlers for status changes
  const handleMakeReady = useCallback(() => {
    if (window.confirm(t('creditNote.confirm.makeReady', { 
      creditNoteNumber: creditNote.creditNoteNumber 
    }))) {
      handleStatusChange(creditNote.id, 1);
    }
  }, [handleStatusChange, creditNote.id, creditNote.creditNoteNumber, t]);

  const handleMakeReadyWithSignature = useCallback(async () => {
    if (!window.confirm(t('creditNote.confirm.makeReady', { 
      creditNoteNumber: creditNote.creditNoteNumber 
    }))) {
      return;
    }

    setRefreshingStatusId(creditNote.id);
    
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No valid token available');
      }

      // Step 1: Fetch data to sign from wrapped JSON response and extract only the data field
      const dataResponse = await secureApiClient.get(CREDITNOTE_ENDPOINTS.DATA_TO_SIGN(creditNote.id));
      const dataToSignResponse = await dataResponse.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!dataResponse.ok || !dataToSignResponse?.succeeded) {
        let errorTitle = t('creditNote.errors.failedToFetchDataToSign') || 'Failed to fetch data to sign';
        let errorBody = '';

        if (dataToSignResponse?.errors) {
          if (Array.isArray(dataToSignResponse.errors)) {
            errorBody = dataToSignResponse.errors.join('\n');
          } else if (typeof dataToSignResponse.errors === 'object') {
            errorBody = Object.values(dataToSignResponse.errors).flat().join('\n');
          }
        }

        if (dataToSignResponse?.message) {
          errorTitle = dataToSignResponse.message;
        } else if (dataToSignResponse?.title) {
          errorTitle = dataToSignResponse.title;
        }

        const error = new Error(errorBody || errorTitle);
        (error as any).title = errorTitle;
        (error as any).body = errorBody;
        (error as any).errors = dataToSignResponse?.errors;
        throw error;
      }

      const apiData = dataToSignResponse.data;
      let dataToSign = '';
      if (typeof apiData === 'string') {
        dataToSign = apiData;
      } else if (apiData != null) {
        try {
          dataToSign = JSON.stringify(apiData);
        } catch {
          throw new Error('No data to sign provided by server');
        }
      }
      if (!dataToSign) {
        throw new Error('No data to sign provided by server');
      }

      // Step 2: Check if Web Crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API not supported. Please install the EFacture Express Signing Helper.');
      }

      // Step 3: Get user certificate and create signature
      // Note: This is a placeholder - actual certificate selection and signing
      // will need to be implemented based on browser capabilities
      const signature = await createDigitalSignature(dataToSign);

      // Step 4: Submit signature to set-ready endpoint
      const setReadyResponse = await secureApiClient.post(CREDITNOTE_ENDPOINTS.SET_READY(creditNote.id), { signature });

      const responseData = await setReadyResponse.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!setReadyResponse.ok || !responseData?.succeeded) {
        // Build title/body error like other operations
        let errorTitle = 'Server could not verify your signature. Please refresh the page and try again.';
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

      // Success - update UI
      if (onOptimisticStatusUpdate) {
        onOptimisticStatusUpdate(creditNote.id, 1);
      }
      
      toast.success(responseData.message || t('creditNote.list.statusUpdateSuccess'), {
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
      let errorTitle = t('creditNote.list.statusUpdateError');
      let errorBody = '';
      
      if (error.title && error.body) {
        errorTitle = error.title;
        errorBody = error.body;
      } else if (error.title) {
        errorTitle = error.title;
      } else if (error.message) {
        // Handle specific error cases
        if (error.message.includes('Web Crypto API not supported')) {
          errorTitle = t('creditNote.errors.helperAppRequired');
        } else if (error.message.includes('No digital certificate found')) {
          errorTitle = t('creditNote.errors.noCertificate');
        } else if (error.message.includes('Could not create the signature')) {
          errorTitle = t('creditNote.errors.signatureCreationFailed');
        } else if (error.message.includes('Server could not verify')) {
          errorTitle = t('creditNote.errors.signatureVerificationFailed');
        } else if (typeof error.message === 'object') {
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
    } finally {
      setRefreshingStatusId(null);
    }
  }, [creditNote.id, creditNote.creditNoteNumber, onOptimisticStatusUpdate, t]);

  // Digital signature creation using Windows helper app via WebSocket
  const createDigitalSignature = async (dataToSign: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket('ws://127.0.0.1:8181');
        
        ws.onopen = () => {
          console.log('Connected to signing helper app');
          const culture = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
          const request = { DataToSign: dataToSign, Culture: culture };
          ws.send(JSON.stringify(request));
        };
        
        ws.onmessage = async (event) => {
          try {
            let payload: string;
            if (typeof event.data === 'string') {
              payload = event.data;
            } else if (event.data && typeof (event.data as any).text === 'function') {
              payload = await (event.data as Blob).text();
            } else {
              payload = String(event.data);
            }

            try {
              const response = JSON.parse(payload);
              if (response && typeof response === 'object' && 'Succeeded' in response && 'Data' in response) {
                if (response.Succeeded) {
                  const signature = String(response.Data ?? '');
                  ws.close();
                  return resolve(signature);
                }
                ws.close();
                return reject(new Error(String(response.Data ?? t('errors.anErrorOccurred'))));
              }
            } catch {}

            if (payload.toLowerCase().includes('error')) {
              ws.close();
              return reject(new Error(payload.trim()));
            }

            const signature = payload;
            ws.close();
            resolve(signature);
          } catch (e: any) {
            ws.close();
            reject(new Error(e?.message || t('errors.anErrorOccurred')));
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws.close();
          reject(new Error(t('creditNote.errors.connectionFailed')));
        };
        
        ws.onclose = (event) => {
          if (!event.wasClean) {
            reject(new Error(t('creditNote.errors.connectionClosed')));
          }
        };
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error(t('creditNote.errors.signingTimeout')));
          }
        }, 30000);
        
      } catch (error) {
        console.error('Digital signature creation error:', error);
        reject(new Error(t('creditNote.errors.signatureCreationError')));
      }
    });
  };

  // Test WebSocket connection to helper app
  const testHelperAppConnection = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      try {
        const ws = new WebSocket('ws://127.0.0.1:8181');
        
        ws.onopen = () => {
          console.log('Helper app connection test: Connected');
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          console.log('Helper app connection test: Failed to connect');
          ws.close();
          resolve(false);
        };
        
        ws.onclose = () => {
          resolve(false);
        };
        
        // Timeout after 3 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            resolve(false);
          }
        }, 3000);
        
      } catch (error) {
        console.error('Helper app connection test error:', error);
        resolve(false);
      }
    });
  }, []);

  // Check helper app connection on component mount only for draft creditNotes
  useEffect(() => {
    const checkConnection = async () => {
      setHelperAppStatus('checking');
      const isConnected = await testHelperAppConnection();
      setHelperAppStatus(isConnected ? 'connected' : 'disconnected');
    };
    
    // Only check connection for draft creditNotes
    if (creditNote.status === 0) {
      checkConnection();
    } else {
      // For non-draft creditNotes, set status to not applicable
      setHelperAppStatus('not-applicable');
    }
  }, [testHelperAppConnection, creditNote.status]);

  const handleBackToDraft = useCallback(() => {
    if (window.confirm(t('creditNote.confirm.backToDraft', { 
      creditNoteNumber: creditNote.creditNoteNumber 
    }))) {
      handleStatusChange(creditNote.id, 0);
    }
  }, [handleStatusChange, creditNote.id, creditNote.creditNoteNumber, t]);

  const permissions = getCreditNoteActionPermissions(userRole, creditNote.status as CreditNoteStatus);

  return (
    <div className="px-6 py-4 bg-gray-50">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium text-gray-900">{t('creditNote.details.title')}</h4>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
                         {/* Draft Status */}
             {creditNote.status === 0 && (
               <>
                                   {permissions.canChangeStatus && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleMakeReadyWithSignature}
                        disabled={disabled || helperAppStatus !== 'connected'}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {refreshingStatusId === creditNote.id ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            {t('creditNote.actions.signing')}
                          </div>
                        ) : (
                          t('creditNote.actions.makeReady')
                        )}
                      </button>
                      
                      {/* Helper App Status Indicator - Only for draft creditNotes */}
                      {helperAppStatus !== 'not-applicable' && (
                        <>
                          {helperAppStatus === 'checking' && (
                            <div className="flex items-center text-yellow-600" title={t('creditNote.errors.checkingHelperApp')}>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                            </div>
                          )}
                          
                          {helperAppStatus === 'disconnected' && (
                            <div className="flex items-center text-red-600" title={t('creditNote.errors.helperAppNotRunning')}>
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          
                          {helperAppStatus === 'connected' && (
                            <div className="flex items-center text-green-600" title={t('creditNote.errors.helperAppRunning')}>
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                 <button
                   onClick={() => handlePreviewPdf(creditNote.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('creditNote.actions.preview')}
                 </button>
               </>
             )}

                         {/* Ready Status */}
             {creditNote.status === 1 && (
               <>
                 {canSubmitToDGI(userRole) && (
                   <button
                     onClick={() => handleSubmit(creditNote.id)}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('creditNote.actions.submit')}
                   </button>
                 )}
                 {canRevertToDraft(userRole) && (
                   <button
                     onClick={handleBackToDraft}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('creditNote.actions.backToDraft')}
                   </button>
                 )}
                 <button
                   onClick={() => handlePreviewPdf(creditNote.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('creditNote.actions.preview')}
                 </button>
               </>
             )}

                         {/* Awaiting Clearance Status */}
             {creditNote.status === 2 && (
               <>
                 <button
                   onClick={() => handleRefreshDgiStatus(creditNote.id)}
                   disabled={disabled || refreshingStatusId === creditNote.id}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {refreshingStatusId === creditNote.id ? (
                     <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {t('creditNote.actions.checking')}
                     </div>
                   ) : (
                     t('creditNote.actions.refreshStatus')
                   )}
                 </button>
                 <button
                   onClick={() => handlePreviewPdf(creditNote.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('creditNote.actions.preview')}
                 </button>
               </>
             )}

            {/* Validated Status */}
            {creditNote.status === 3 && (
              <>
                <button
                  onClick={() => onDownloadPdf(creditNote.id)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('creditNote.actions.download')}
                </button>
                <button
                  onClick={() => handleDownloadJson(creditNote.id)}
                  disabled={disabled || fetchingJsonId === creditNote.id}
                  className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchingJsonId === creditNote.id ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      {t('creditNote.actions.downloading')}
                    </div>
                  ) : (
                    t('creditNote.actions.downloadJson')
                  )}
                </button>
              </>
            )}

                         {/* Rejected Status */}
             {creditNote.status === 4 && (
               <>
                 {canRevertToDraft(userRole) && (
                   <button
                     onClick={handleBackToDraft}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('creditNote.actions.backToDraft')}
                   </button>
                 )}
                 <button
                   onClick={() => handlePreviewPdf(creditNote.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('creditNote.actions.preview')}
                 </button>
               </>
             )}
          </div>
        </div>

        {/* Warnings Display */}
        {creditNote.warnings && creditNote.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h5 className="text-sm font-medium text-yellow-800">{t('creditNote.details.warnings')}</h5>
            </div>
            <ul className="mt-2 text-sm text-yellow-700">
              {creditNote.warnings.map((warning, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* CreditNote Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">{t('creditNote.details.creditNoteInfo')}</h5>
            <div className="space-y-1 text-gray-600">
              <div><span className="font-medium">{t('creditNote.details.creditNoteNumber')}:</span> {creditNote.creditNoteNumber}</div>
              <div><span className="font-medium">{t('creditNote.details.date')}:</span> {new Date(creditNote.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</div>
              <div><span className="font-medium">{t('creditNote.details.status')}:</span> <CreditNoteStatusBadge status={creditNote.status} /></div>
              {creditNote.dgiSubmissionId && (
                <div><span className="font-medium">{t('creditNote.details.dgiSubmissionId')}:</span> {creditNote.dgiSubmissionId}</div>
              )}
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-2">{t('creditNote.details.customerInfo')}</h5>
            <div className="space-y-1 text-gray-600">
              <div><span className="font-medium">{t('creditNote.details.customerName')}:</span> {creditNote.customer?.name || 'Unknown Customer'}</div>
              <div><span className="font-medium">{t('creditNote.details.ice')}:</span> {creditNote.customer?.ice || t('common.notAvailable')}</div>
              {creditNote.customer?.email && (
                <div><span className="font-medium">{t('creditNote.details.email')}:</span> {creditNote.customer.email}</div>
              )}
              {creditNote.customer?.phoneNumber && (
                <div><span className="font-medium">{t('creditNote.details.phone')}:</span> {creditNote.customer.phoneNumber}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('creditNote.details.description')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('creditNote.details.quantity')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('creditNote.details.unitPrice')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('creditNote.details.taxRate')}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('creditNote.details.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {creditNote.lines.map((line, index) => (
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
                    {formatCurrency(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('creditNote.details.subtotal')}:</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(creditNote.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0))}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('creditNote.details.vat')}:</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(creditNote.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * (line.taxRate || 20) / 100), 0))}
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">{t('creditNote.details.total')}:</td>
                <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(creditNote.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Creation Information */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">{t('creditNote.details.createdBy')}:</span> {creditNote.createdBy?.name || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">{t('creditNote.details.createdAt')}:</span> {new Date(creditNote.createdAt).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={pdfPreviewModal.isOpen}
        onClose={closePdfPreview}
        pdfUrl={pdfPreviewModal.pdfUrl}
        title={pdfPreviewModal.title}
      />

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
                {t('creditNote.dgiStatus.rejectionReason')}
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
};

export default CreditNoteDetail; 