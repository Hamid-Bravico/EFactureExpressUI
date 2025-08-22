import React, { useState, useEffect, useCallback, useRef } from 'react';
import { secureApiClient } from '../../../config/api';
import { CATALOG_ENDPOINTS } from '../api/catalog.endpoints';
import { NewCatalog } from '../types/catalog.types';
import { ApiResponse } from '../../auth/types/auth.types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import CatalogList, { CatalogListResponse } from './CatalogList';
import ErrorModal from '../../../components/ErrorModal';
import CatalogImportCSV from './CatalogImportCSV';

import CatalogForm from './CatalogForm';

interface CatalogManagementProps {
  token: string | null;
}

const CatalogManagement = React.memo(({ token }: CatalogManagementProps) => {
  const { t } = useTranslation();
  const [catalogs, setCatalogs] = useState<CatalogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
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

  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const initialLoadRef = useRef(false);

  const fetchCatalogs = useCallback(async (filters?: any, sort?: any, pagination?: any) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '' && value !== 'all') {
            params.append(key, value as string);
          }
        });
      }
      
      if (sort) {
        params.append('sort', sort.sortField);
        params.append('dir', sort.sortDirection);
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('size', pagination.pageSize.toString());
      }

      const url = `${CATALOG_ENDPOINTS?.LIST || '/api/catalog'}?${params.toString()}`;
      const res = await secureApiClient.get(url);
      
      if (!res.ok) {
        throw new Error(t('catalog.messages.fetchFailed'));
      }
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('catalog.messages.fetchFailed'));
      }
      
      setCatalogs(responseData.data);
    } catch (e: any) {
      let errorMessage = (e && e.message) ? e.message : t('errors.anErrorOccurred');
      if (errorMessage === 'NETWORK_ERROR' || errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError');
      }
      setError(errorMessage);
      // No toast on initial/background fetch – show error in UI card
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchCatalogs(undefined, undefined, { page: 1, pageSize: 10 });
    }
  }, [fetchCatalogs]);

  const handleCreateCatalog = useCallback(async (catalog: NewCatalog) => {
    try {
      // Create temporary catalog for optimistic update
      const tempCatalog = {
        id: Date.now(), // Temporary ID
        name: catalog.Name,
        description: catalog.Description,
        unitPrice: catalog.UnitPrice,
        defaultTaxRate: catalog.DefaultTaxRate,
        type: catalog.Type,
        codeArticle: catalog.CodeArticle
      };

      // Optimistically add the catalog
      if (catalogs) {
        setCatalogs(prev => ({
          ...prev!,
          items: [tempCatalog, ...prev!.items],
          pagination: {
            ...prev!.pagination,
            totalItems: prev!.pagination.totalItems + 1,
            totalPages: Math.ceil((prev!.pagination.totalItems + 1) / prev!.pagination.pageSize)
          }
        }));
      }

      const res = await secureApiClient.post(CATALOG_ENDPOINTS?.CREATE || '/api/catalog', catalog);
      
      let responseData;
      try {
        responseData = await res.json();
      } catch (parseError) {
        responseData = { succeeded: false, message: t('errors.anErrorOccurred') };
      }
      
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        if (catalogs) {
          setCatalogs(prev => ({
            ...prev!,
            items: prev!.items.filter(q => q.id !== tempCatalog.id),
            pagination: {
              ...prev!.pagination,
              totalItems: prev!.pagination.totalItems - 1,
              totalPages: Math.ceil((prev!.pagination.totalItems - 1) / prev!.pagination.pageSize)
            }
          }));
        }

        // Handle different error response formats
        let errorTitle = t('catalog.form.errors.submissionFailed');
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
      toast.success(responseData.message || t('catalog.messages.created'), {
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
      
      // Replace temporary catalog with real data
      if (catalogs) {
        setCatalogs(prev => ({
          ...prev!,
          items: prev!.items.map(q => q.id === tempCatalog.id ? data : q)
        }));
      }
    } catch (error: any) {
      if (error?.message === 'NETWORK_ERROR') {
        toast.error(t('errors.networkError'));
        throw error;
      }
      // Handle error with title and body structure
      let errorTitle = t('catalog.form.errors.submissionFailed');
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
  }, [token, t, catalogs]);

  const handleUpdateCatalog = useCallback(async (catalog: NewCatalog) => {
    if (!catalog.id) {
      toast.error(t('catalog.messages.submissionFailed'));
      return;
    }

    try {
      // Store original catalog for rollback
      const originalCatalog = catalogs?.items.find(q => q.id === catalog.id);
      if (!originalCatalog) throw new Error('Catalog not found');

      // Optimistically update the catalog
      const updatedCatalog = {
        ...originalCatalog,
        name: catalog.Name,
        description: catalog.Description,
        unitPrice: catalog.UnitPrice,
        defaultTaxRate: catalog.DefaultTaxRate,
        type: catalog.Type,
        codeArticle: catalog.CodeArticle
      };

      // Apply optimistic update
      if (catalogs) {
        setCatalogs(prev => ({
          ...prev!,
          items: prev!.items.map(q => 
            q.id === catalog.id! ? updatedCatalog : q
          )
        }));
      }

      const res = await secureApiClient.put(CATALOG_ENDPOINTS?.UPDATE?.(catalog.id!) || `/api/catalog/${catalog.id}`, catalog);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        if (catalogs) {
          setCatalogs(prev => ({
            ...prev!,
            items: prev!.items.map(q => 
              q.id === catalog.id! ? originalCatalog : q
            )
          }));
        }

        // Build title/body error like create/delete
        let errorTitle = t('catalog.form.errors.submissionFailed');
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
      if (catalogs && responseData.data) {
        setCatalogs(prev => ({
          ...prev!,
          items: prev!.items.map(q => 
            q.id === catalog.id! ? responseData.data : q
          )
        }));
      }

      toast.success(responseData.message || t('catalog.messages.updated'), {
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
      if (error?.message === 'NETWORK_ERROR') {
        toast.error(t('errors.networkError'));
        throw error;
      }
      // Align update error styling with create/delete
      let errorTitle = t('catalog.form.errors.submissionFailed');
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
  }, [token, t, catalogs]);

  const handleDeleteCatalog = useCallback(async (id: number) => {
    const toastId = toast.loading(t('catalog.deleting'));
    
    // Store original data for rollback
    const originalData = catalogs;
    const originalCatalog = catalogs?.items.find(q => q.id === id);
    if (!originalCatalog) {
      toast.error(t('catalog.messages.deleteFailed'), { id: toastId });
      return;
    }

    // Check if this deletion will make the page incomplete
    const willPageBeIncomplete = catalogs && 
      catalogs.items.length === catalogs.pagination.pageSize && 
      catalogs.pagination.page < catalogs.pagination.totalPages;

    try {      
      // Optimistically remove the catalog
      if (catalogs) {
        setCatalogs(prev => ({
          ...prev!,
          items: prev!.items.filter(q => q.id !== id),
          pagination: {
            ...prev!.pagination,
            totalItems: prev!.pagination.totalItems - 1,
            totalPages: Math.ceil((prev!.pagination.totalItems - 1) / prev!.pagination.pageSize)
          }
        }));
      }

      const url = CATALOG_ENDPOINTS?.DELETE?.(id) || `/api/catalog/${id}`;
      const res = await secureApiClient.delete(url);

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        // Revert optimistic update
        setCatalogs(originalData);
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('catalog.messages.deleteFailed'));
      }

      // Handle pagination after deletion
      const remainingItems = catalogs!.items.length - 1;
      const currentPage = catalogs!.pagination.page;
      const pageSize = catalogs!.pagination.pageSize;
      const totalItems = catalogs!.pagination.totalItems - 1;
      const totalPages = Math.ceil(totalItems / pageSize);

      // If we're on the first page and it becomes empty, stay on page 1
      if (remainingItems === 0 && currentPage === 1) {
        // Page is empty but we're on page 1, just refresh to get updated data
        const queryParams = new URLSearchParams();
        queryParams.append('page', '1');
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await secureApiClient.get(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`);
          
          if (response.ok) {
            const refreshedResponseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
            if (refreshedResponseData?.succeeded) {
              setCatalogs(refreshedResponseData.data);
            }
          }
        } catch (error) {
          // Silent fail - user experience continues
        }
      } else if (remainingItems === 0 && currentPage > 1) {
        // If we deleted the last item on a page that's not the first page, go to previous page
        const newPage = currentPage - 1;
        const queryParams = new URLSearchParams();
        queryParams.append('page', newPage.toString());
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await secureApiClient.get(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`);
          
          if (response.ok) {
            const refreshedResponseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
            if (refreshedResponseData?.succeeded) {
              setCatalogs(refreshedResponseData.data);
            }
          }
        } catch (error) {
          // Silent fail - user experience continues
        }
      } else if (willPageBeIncomplete) {
        // If the page will be incomplete, refresh the current page data
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage.toString());
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await secureApiClient.get(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`);
          
          if (response.ok) {
            const refreshedResponseData = await response.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
            if (refreshedResponseData?.succeeded) {
              setCatalogs(refreshedResponseData.data);
            }
          }
        } catch (error) {
          // Silent fail - user experience continues
        }
      }

      toast.success(responseData.message || t('catalog.messages.deleted', { count: 1 }), { 
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
    } catch (error: any) {
      if (error?.message === 'NETWORK_ERROR') {
        toast.error(t('errors.networkError'), { id: toastId });
        return;
      }
      // Handle error with title and body structure
      let errorTitle = t('catalog.messages.deleteFailed');
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
  }, [token, t, catalogs]);

  const handleImportCSV = useCallback(async (file: File) => {
    setImportLoading(true);
    const toastId = toast.loading(t('common.file.importingCSV'));
    let successShown = false;
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await secureApiClient.post(CATALOG_ENDPOINTS.IMPORT_CSV, formData, true, true);

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
        const successMessage = data.message || t('catalog.import.success', { imported, total });
        
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
        
        const currentPage = catalogs?.pagination?.page || 1;
        const currentPageSize = catalogs?.pagination?.pageSize || 10;
        await fetchCatalogs(undefined, undefined, { page: currentPage, pageSize: currentPageSize });
      } else {
        // Validation error response (400/409) - Show in modal
        const errorMessage = data.message || t('catalog.import.error.general');
        const details = data.errors && Array.isArray(data.errors) ? data.errors : 
                      (data.details && Array.isArray(data.details) ? data.details : []);
        
        // Dismiss the loading toast before showing the modal
        toast.dismiss(toastId);
        
        setErrorModal({
          isOpen: true,
          title: t('catalog.import.error.title'),
          message: errorMessage,
          details: details
        });
      }
    } catch (err: any) {
      let errorMessage = err instanceof Error ? err.message : t('catalog.import.error.general');
      if (errorMessage === 'NETWORK_ERROR') {
        errorMessage = t('errors.networkError');
      }
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
  }, [token, t, fetchCatalogs]);

  // Error is now displayed via CatalogList's error card

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <CatalogImportCSV onImport={handleImportCSV} loading={importLoading} />
        <button
          onClick={() => setShowCatalogForm(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
            importLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('catalog.create')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <CatalogList
          data={catalogs}
          loading={loading}
          error={error}
          onDelete={handleDeleteCatalog}
          onCreateCatalog={handleCreateCatalog}
          onUpdateCatalog={handleUpdateCatalog}
          onRefreshCatalogs={fetchCatalogs}
          token={token}
          onSubmit={() => {}}
        />
      </div>

      {showCatalogForm && (
        <CatalogForm
          onSubmit={handleCreateCatalog}
          onClose={() => setShowCatalogForm(false)}

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
});

export default CatalogManagement; 