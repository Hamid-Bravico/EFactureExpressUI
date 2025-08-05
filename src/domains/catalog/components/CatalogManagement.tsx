import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSecureJsonHeaders, getSecureHeaders } from '../../../config/api';
import { CATALOG_ENDPOINTS } from '../api/catalog.endpoints';
import { NewCatalog } from '../types/catalog.types';
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
  const [error, setError] = useState('');
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
    setError('');
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
      const res = await fetch(url, {
        headers: getSecureHeaders(token),
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch catalogs');
      }
      
      const data = await res.json();
      setCatalogs(data);
    } catch (e: any) {
      setError(e.message || 'Error fetching catalogs');
      toast.error(e.message || t('catalog.messages.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [token]);

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

      const res = await fetch(CATALOG_ENDPOINTS?.CREATE || '/api/catalog', {
        method: 'POST',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(catalog),
      });
      if (!res.ok) {
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

        const errorData = await res.json();
        const error = new Error(errorData.message || t('catalog.form.errors.submissionFailed'));
        (error as any).errors = errorData.errors;
        throw error;
      }

      const data = await res.json();
      toast.success(t('catalog.messages.created'));
      
      // Replace temporary catalog with real data
      if (catalogs) {
        setCatalogs(prev => ({
          ...prev!,
          items: prev!.items.map(q => q.id === tempCatalog.id ? data : q)
        }));
      }
    } catch (error: any) {
      toast.error(error.message || t('catalog.form.errors.submissionFailed'));
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

      const res = await fetch(CATALOG_ENDPOINTS?.UPDATE?.(catalog.id!) || `/api/catalog/${catalog.id}`, {
        method: 'PUT',
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(catalog),
      });

      if (!res.ok) {
        // Revert optimistic update
        if (catalogs) {
          setCatalogs(prev => ({
            ...prev!,
            items: prev!.items.map(q => 
              q.id === catalog.id! ? originalCatalog : q
            )
          }));
        }

        const errorData = await res.json();
        const error = new Error(errorData.message || t('catalog.form.errors.submissionFailed'));
        (error as any).errors = errorData.errors;
        throw error;
      }

      // Check if response has content before trying to parse
      const responseText = await res.text();
      if (responseText.trim()) {
        try {
          const serverUpdatedCatalog = JSON.parse(responseText);
          // Update with server response to ensure consistency
          if (catalogs) {
            setCatalogs(prev => ({
              ...prev!,
              items: prev!.items.map(q => 
                q.id === catalog.id! ? { ...serverUpdatedCatalog } : q
              )
            }));
          }
        } catch (parseError) {
          // If response is not valid JSON, keep the optimistic update
        }
      }

      toast.success(t('catalog.messages.updated'));
    } catch (error: any) {
      toast.error(error.message || t('catalog.form.errors.submissionFailed'));
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
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getSecureHeaders(token),
      });

      if (!res.ok) {
        // Revert optimistic update
        setCatalogs(originalData);
        //const errorText = await res.text();
        throw new Error(t('catalog.messages.deleteFailed'));
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
          const response = await fetch(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getSecureHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setCatalogs(refreshedData);
          }
        } catch (error) {
          console.warn('Failed to refresh page data after deletion:', error);
        }
      } else if (remainingItems === 0 && currentPage > 1) {
        // If we deleted the last item on a page that's not the first page, go to previous page
        const newPage = currentPage - 1;
        const queryParams = new URLSearchParams();
        queryParams.append('page', newPage.toString());
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await fetch(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getSecureHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setCatalogs(refreshedData);
          }
        } catch (error) {
          console.warn('Failed to navigate to previous page after deletion:', error);
        }
      } else if (willPageBeIncomplete) {
        // If the page will be incomplete, refresh the current page data
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage.toString());
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await fetch(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getSecureHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setCatalogs(refreshedData);
          }
        } catch (error) {
          console.warn('Failed to refresh page data after deletion:', error);
        }
      }

      toast.success(t('catalog.messages.deleted', { count: 1 }), { id: toastId });
    } catch (error: any) {
      console.error('Delete catalog error:', error);
      toast.error(error.message || t('catalog.messages.deleteFailed'), { id: toastId });
    }
  }, [token, t, catalogs]);

  const handleBulkDelete = useCallback(async (ids: number[]) => {
    const toastId = toast.loading(t('catalog.bulk.deleting', { count: ids.length }));
    
    // Store original data for rollback
    const originalData = catalogs;
    
    // Check if this bulk deletion will make the page incomplete
    const willPageBeIncomplete = catalogs && 
      catalogs.items.length === catalogs.pagination.pageSize && 
      ids.length > 0 && 
      catalogs.pagination.page < catalogs.pagination.totalPages;
    
    try {
      // Optimistically remove all catalogs
      if (catalogs) {
        setCatalogs(prev => ({
          ...prev!,
          items: prev!.items.filter(q => !ids.includes(q.id)),
          pagination: {
            ...prev!.pagination,
            totalItems: prev!.pagination.totalItems - ids.length,
            totalPages: Math.ceil((prev!.pagination.totalItems - ids.length) / prev!.pagination.pageSize)
          }
        }));
      }

      // Perform all delete operations
      await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(CATALOG_ENDPOINTS?.DELETE?.(id) || `/api/catalog/${id}`, {
            method: 'DELETE',
            headers: getSecureHeaders(token),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: t('catalog.messages.deleteFailed') }));
            throw new Error(errorData.message || t('catalog.messages.deleteFailed'));
          }
        })
      );
      
      // Handle pagination after bulk deletion
      const remainingItems = catalogs!.items.length - ids.length;
      const currentPage = catalogs!.pagination.page;
      const pageSize = catalogs!.pagination.pageSize;
      const totalItems = catalogs!.pagination.totalItems - ids.length;
      const totalPages = Math.ceil(totalItems / pageSize);

      // If we're on the first page and it becomes empty, stay on page 1
      if (remainingItems === 0 && currentPage === 1) {
        // Page is empty but we're on page 1, just refresh to get updated data
        const queryParams = new URLSearchParams();
        queryParams.append('page', '1');
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await fetch(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getSecureHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setCatalogs(refreshedData);
          }
        } catch (error) {
          console.warn('Failed to refresh page data after bulk deletion:', error);
        }
      } else if (remainingItems === 0 && currentPage > 1) {
        // If we deleted all items on a page that's not the first page, go to previous page
        const newPage = currentPage - 1;
        const queryParams = new URLSearchParams();
        queryParams.append('page', newPage.toString());
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await fetch(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getSecureHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setCatalogs(refreshedData);
          }
        } catch (error) {
          console.warn('Failed to navigate to previous page after bulk deletion:', error);
        }
      } else if (willPageBeIncomplete) {
        // If the page will be incomplete, refresh the current page data
        const queryParams = new URLSearchParams();
        queryParams.append('page', currentPage.toString());
        queryParams.append('size', pageSize.toString());
        
        try {
          const response = await fetch(`${CATALOG_ENDPOINTS.LIST}?${queryParams.toString()}`, {
            headers: getSecureHeaders(token),
          });
          
          if (response.ok) {
            const refreshedData = await response.json();
            setCatalogs(refreshedData);
          }
        } catch (error) {
          console.warn('Failed to refresh page data after bulk deletion:', error);
        }
      }
      
      toast.success(t('catalog.bulk.deleted', { count: ids.length }), { id: toastId });
    } catch (err) {
      // Revert all optimistic updates
      setCatalogs(originalData);
      
      const errorMessage = err instanceof Error ? err.message : t('catalog.messages.bulkDeleteError');
      toast.error(errorMessage, { id: toastId });
    }
  }, [token, t, catalogs]);

  const handleImportCSV = useCallback(async (file: File) => {
    setImportLoading(true);
    const toastId = toast.loading(t('common.file.importingCSV'));
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(CATALOG_ENDPOINTS.IMPORT_CSV, {
        method: 'POST',
        headers: getSecureHeaders(token),
        body: formData,
      });

      if (response.status === 401) {
        toast.error(t('common.unauthorized'), { id: toastId });
        return;
      }

      if (response.status === 500) {
        toast.error(t('errors.unexpectedError'), { id: toastId });
        return;
      }

      const data = await response.json();

      
      if (response.ok) {
        // Success response (200 OK)
        const count = data.data?.count || 0;
        toast.success(data.message || t('quote.messages.imported', { count }), { id: toastId });
        
        const currentPage = catalogs?.pagination?.page || 1;
        const currentPageSize = catalogs?.pagination?.pageSize || 10;
        await fetchCatalogs(undefined, undefined, { page: currentPage, pageSize: currentPageSize });
      } else {
        // Validation error response (400/409) - Show in modal
        const errorMessage = data.message || t('catalog.import.error.general');
        const details = data.details && Array.isArray(data.details) ? data.details : [];
        
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
      console.error('Import CSV error:', err);
      const errorMessage = err instanceof Error ? err.message : t('catalog.import.error.general');
      toast.dismiss(toastId);

      setErrorModal({
        isOpen: true,
        title: t('common.error'),
        message: errorMessage,
        details: []
      });
    } finally {
      setImportLoading(false);
    }
  }, [token, t, fetchCatalogs]);

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">{t('common.error')}</h3>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => fetchCatalogs(undefined, undefined, { page: 1, pageSize: 10 })}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

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
          onDelete={handleDeleteCatalog}
          onBulkDelete={handleBulkDelete}
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