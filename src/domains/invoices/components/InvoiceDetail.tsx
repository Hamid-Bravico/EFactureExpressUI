import React, { useState, useCallback } from 'react';
import { Invoice } from '../types/invoice.types';
import { DgiStatusResponse } from '../../../types/common';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { getSecureHeaders } from '../../../config/api';
import { INVOICE_ENDPOINTS } from '../api/invoice.endpoints';
import { 
  getInvoiceActionPermissions, 
  InvoiceStatus
} from '../utils/invoice.permissions';
import { UserRole } from '../../../utils/shared.permissions';
import { tokenManager } from '../../../utils/tokenManager';

interface InvoiceDetailProps {
  invoice: Invoice;
  onOptimisticStatusUpdate?: (id: number, status: number, dgiSubmissionId?: string, dgiRejectionReason?: string) => void;
  onDownloadPdf: (id: number) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: number) => void;
  onSubmit: (id: number) => void;
  disabled?: boolean;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
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
  const [rejectionModal, setRejectionModal] = useState<{ invoiceId: number; reason: string } | null>(null);

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

  const handleDownloadJson = useCallback(async (invoiceId: number) => {
    setFetchingJsonId(invoiceId);
    try {
      const token = tokenManager.getToken();
      if (!token) throw new Error('No token');
      const res = await fetch(INVOICE_ENDPOINTS.JSON(invoiceId), {
        headers: getSecureHeaders(token),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No URL');
      }
    } catch(err) {
      toast.error('Failed to fetch JSON. Make sure Compliance Mode is enabled.');
    } finally {
      setFetchingJsonId(null);
    }
  }, []);

  const handleRefreshDgiStatus = useCallback(async (invoiceId: number) => {
    setRefreshingStatusId(invoiceId);
    const toastId = toast.loading(t('invoice.dgiStatus.checking'));
    
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No token');
      }
      
      const res = await fetch(INVOICE_ENDPOINTS.DGI_STATUS(invoiceId), {
        headers: getSecureHeaders(token),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch DGI status: ${res.status}`);
      }
      
      const data: DgiStatusResponse = await res.json();
      
      switch (data.status) {
        case 'PendingValidation':
          toast.success(t('invoice.dgiStatus.stillPending'), { id: toastId });
          break;
          
        case 'Validated':
          toast.success(t('invoice.status.validated'), { id: toastId });
          if (onOptimisticStatusUpdate) {
            onOptimisticStatusUpdate(invoiceId, 3);
          }
          break;
          
        case 'Rejected':
          toast.error(t('invoice.status.rejected'), { id: toastId });
          const rejectionReason = data.errors.length > 0 
            ? data.errors.map(error => error.errorMessage).join('; ') 
            : 'No specific reason provided';
          setRejectionModal({ invoiceId, reason: rejectionReason });
          if (onOptimisticStatusUpdate) {
            onOptimisticStatusUpdate(invoiceId, 4, undefined, rejectionReason);
          }
          break;
          
        default:
          toast.error(`Unknown DGI status received: ${data.status}`, { id: toastId });
          break;
      }
    } catch (error) {
      toast.error(t('invoice.dgiStatus.errorChecking'), { id: toastId });
    } finally {
      setRefreshingStatusId(null);
    }
  }, [t, onOptimisticStatusUpdate]);

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

  const handleStatusChange = useCallback(async (invoiceId: number, newStatus: number) => {
    setRefreshingStatusId(invoiceId);
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No valid token available');
      }

      let endpoint: string;
      if (newStatus === 0) {
        // Use new set-draft endpoint
        endpoint = INVOICE_ENDPOINTS.SET_DRAFT(invoiceId);
      } else {
        // Fallback to old endpoint for other status changes
        endpoint = INVOICE_ENDPOINTS.UPDATE_STATUS(invoiceId, newStatus);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getSecureHeaders(token)
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || t('invoice.list.statusUpdateError'));
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      }

      // Call optimistic update to update UI state
      if (onOptimisticStatusUpdate) {
        onOptimisticStatusUpdate(invoiceId, newStatus);
      }
      
      toast.success(t('invoice.list.statusUpdateSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('invoice.list.statusUpdateError'));
    } finally {
      setRefreshingStatusId(null);
    }
  }, [onOptimisticStatusUpdate, t]);

  // Confirmation handlers for status changes
  const handleMakeReady = useCallback(() => {
    if (window.confirm(t('invoice.confirm.makeReady', { 
      invoiceNumber: invoice.invoiceNumber 
    }))) {
      handleStatusChange(invoice.id, 1);
    }
  }, [handleStatusChange, invoice.id, invoice.invoiceNumber, t]);

  const handleMakeReadyWithSignature = useCallback(async () => {
    if (!window.confirm(t('invoice.confirm.makeReady', { 
      invoiceNumber: invoice.invoiceNumber 
    }))) {
      return;
    }

    setRefreshingStatusId(invoice.id);
    
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No valid token available');
      }

      // Step 1: Fetch data to sign
      const dataResponse = await fetch(INVOICE_ENDPOINTS.DATA_TO_SIGN(invoice.id), {
        headers: getSecureHeaders(token)
      });

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch data to sign: ${dataResponse.status}`);
      }

      const dataToSign = await dataResponse.text();

      // Step 2: Check if Web Crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API not supported. Please install the EFacture Express Signing Helper.');
      }

      // Step 3: Get user certificate and create signature
      // Note: This is a placeholder - actual certificate selection and signing
      // will need to be implemented based on browser capabilities
      const signature = await createDigitalSignature(dataToSign);

      // Step 4: Submit signature to set-ready endpoint
      const setReadyResponse = await fetch(INVOICE_ENDPOINTS.SET_READY(invoice.id), {
        method: 'POST',
        headers: {
          ...getSecureHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signature })
      });

      if (!setReadyResponse.ok) {
        const errorText = await setReadyResponse.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Server could not verify your signature. Please refresh the page and try again.');
        } catch (parseError) {
          throw new Error(`Server error: ${setReadyResponse.status} - ${errorText}`);
        }
      }

      // Success - update UI
      if (onOptimisticStatusUpdate) {
        onOptimisticStatusUpdate(invoice.id, 1);
      }
      
      toast.success(t('invoice.list.statusUpdateSuccess'));
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes('Web Crypto API not supported')) {
        errorMessage = t('invoice.errors.helperAppRequired');
      } else if (error.message.includes('No digital certificate found')) {
        errorMessage = t('invoice.errors.noCertificate');
      } else if (error.message.includes('Could not create the signature')) {
        errorMessage = t('invoice.errors.signatureCreationFailed');
      } else if (error.message.includes('Server could not verify')) {
        errorMessage = t('invoice.errors.signatureVerificationFailed');
      }
      
      toast.error(errorMessage);
    } finally {
      setRefreshingStatusId(null);
    }
  }, [invoice.id, invoice.invoiceNumber, onOptimisticStatusUpdate, t]);

  // Digital signature creation using Windows helper app via WebSocket
  const createDigitalSignature = async (dataToSign: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket('ws://127.0.0.1:8181');
        
        ws.onopen = () => {
          console.log('Connected to signing helper app');
          ws.send(dataToSign);
        };
        
        ws.onmessage = (event) => {
          const signature = event.data;
          console.log('Digital signature received from helper app',signature);
          ws.close();
          resolve(signature);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws.close();
          reject(new Error('Failed to connect to signing helper app. Please ensure the EFacture Express Signing Helper is running.'));
        };
        
        ws.onclose = (event) => {
          if (!event.wasClean) {
            reject(new Error('Connection to signing helper app was closed unexpectedly. Please ensure the helper app is running and try again.'));
          }
        };
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error('Signing operation timed out. Please try again.'));
          }
        }, 30000);
        
      } catch (error) {
        console.error('Digital signature creation error:', error);
        reject(new Error('Could not create the signature. Please ensure the EFacture Express Signing Helper is running.'));
      }
    });
  };

  const handleBackToDraft = useCallback(() => {
    if (window.confirm(t('invoice.confirm.backToDraft', { 
      invoiceNumber: invoice.invoiceNumber 
    }))) {
      handleStatusChange(invoice.id, 0);
    }
  }, [handleStatusChange, invoice.id, invoice.invoiceNumber, t]);

  const permissions = getInvoiceActionPermissions(userRole, invoice.status as InvoiceStatus);

  return (
    <div className="px-6 py-4 bg-gray-50">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium text-gray-900">{t('invoice.details.title')}</h4>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
                         {/* Draft Status */}
             {invoice.status === 0 && (
               <>
                                   {permissions.canChangeStatus && (
                    <button
                      onClick={handleMakeReadyWithSignature}
                      disabled={disabled}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {refreshingStatusId === invoice.id ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          {t('invoice.actions.signing')}
                        </div>
                      ) : (
                        t('invoice.actions.makeReady')
                      )}
                    </button>
                  )}
                 <button
                   onClick={() => onDownloadPdf(invoice.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('invoice.actions.download')}
                 </button>
                 <button
                   onClick={() => handleDownloadJson(invoice.id)}
                   disabled={disabled || fetchingJsonId === invoice.id}
                   className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {fetchingJsonId === invoice.id ? (
                     <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {t('invoice.actions.downloading')}
                     </div>
                   ) : (
                     t('invoice.actions.downloadJson')
                   )}
                 </button>
               </>
             )}

                         {/* Ready Status */}
             {invoice.status === 1 && (
               <>
                 {permissions.canSubmit && (
                   <button
                     onClick={() => handleSubmit(invoice.id)}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('invoice.actions.submit')}
                   </button>
                 )}
                 {permissions.canChangeStatus && (
                   <button
                     onClick={handleBackToDraft}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('invoice.actions.backToDraft')}
                   </button>
                 )}
                 <button
                   onClick={() => onDownloadPdf(invoice.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('invoice.actions.download')}
                 </button>
                 <button
                   onClick={() => handleDownloadJson(invoice.id)}
                   disabled={disabled || fetchingJsonId === invoice.id}
                   className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {fetchingJsonId === invoice.id ? (
                     <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {t('invoice.actions.downloading')}
                     </div>
                   ) : (
                     t('invoice.actions.downloadJson')
                   )}
                 </button>
               </>
             )}

                         {/* Awaiting Clearance Status */}
             {invoice.status === 2 && (
               <>
                 <button
                   onClick={() => handleRefreshDgiStatus(invoice.id)}
                   disabled={disabled || refreshingStatusId === invoice.id}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {refreshingStatusId === invoice.id ? (
                     <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {t('invoice.actions.checking')}
                     </div>
                   ) : (
                     t('invoice.actions.refreshStatus')
                   )}
                 </button>
                 <button
                   onClick={() => onDownloadPdf(invoice.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('invoice.actions.download')}
                 </button>
                 <button
                   onClick={() => handleDownloadJson(invoice.id)}
                   disabled={disabled || fetchingJsonId === invoice.id}
                   className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {fetchingJsonId === invoice.id ? (
                     <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {t('invoice.actions.downloading')}
                     </div>
                   ) : (
                     t('invoice.actions.downloadJson')
                   )}
                 </button>
               </>
             )}

            {/* Validated Status */}
            {invoice.status === 3 && (
              <>
                <button
                  onClick={() => onDownloadPdf(invoice.id)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('invoice.actions.download')}
                </button>
                <button
                  onClick={() => handleDownloadJson(invoice.id)}
                  disabled={disabled || fetchingJsonId === invoice.id}
                  className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchingJsonId === invoice.id ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      {t('invoice.actions.downloading')}
                    </div>
                  ) : (
                    t('invoice.actions.downloadJson')
                  )}
                </button>
              </>
            )}

                         {/* Rejected Status */}
             {invoice.status === 4 && (
               <>
                 {permissions.canChangeStatus && (
                   <button
                     onClick={handleBackToDraft}
                     disabled={disabled}
                     className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {t('invoice.actions.backToDraft')}
                   </button>
                 )}
                 <button
                   onClick={() => onDownloadPdf(invoice.id)}
                   disabled={disabled}
                   className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {t('invoice.actions.download')}
                 </button>
                 <button
                   onClick={() => handleDownloadJson(invoice.id)}
                   disabled={disabled || fetchingJsonId === invoice.id}
                   className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {fetchingJsonId === invoice.id ? (
                     <div className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                       </svg>
                       {t('invoice.actions.downloading')}
                     </div>
                   ) : (
                     t('invoice.actions.downloadJson')
                   )}
                 </button>
               </>
             )}
          </div>
        </div>

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
              <div><span className="font-medium">{t('invoice.details.status')}:</span> <InvoiceStatusBadge status={invoice.status} /></div>
              {invoice.dgiSubmissionId && (
                <div><span className="font-medium">{t('invoice.details.dgiSubmissionId')}:</span> {invoice.dgiSubmissionId}</div>
              )}
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-2">{t('invoice.details.customerInfo')}</h5>
            <div className="space-y-1 text-gray-600">
              <div><span className="font-medium">{t('invoice.details.customerName')}:</span> {invoice.customer?.name || 'Unknown Customer'}</div>
              <div><span className="font-medium">{t('invoice.details.ice')}:</span> {invoice.customer?.ice || t('common.notAvailable')}</div>
              {invoice.customer?.email && (
                <div><span className="font-medium">{t('invoice.details.email')}:</span> {invoice.customer.email}</div>
              )}
              {invoice.customer?.phoneNumber && (
                <div><span className="font-medium">{t('invoice.details.phone')}:</span> {invoice.customer.phoneNumber}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto mb-4">
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
                    {formatCurrency(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('invoice.details.subtotal')}:</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(invoice.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0))}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-600 text-right">{t('invoice.details.vat')}:</td>
                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(invoice.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice * (line.taxRate || 20) / 100), 0))}
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">{t('invoice.details.total')}:</td>
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
              <span className="font-medium">{t('invoice.details.createdBy')}:</span> {invoice.createdBy?.name || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">{t('invoice.details.createdAt')}:</span> {new Date(invoice.createdAt).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
            </div>
          </div>
        </div>
      </div>

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
};

export default InvoiceDetail; 