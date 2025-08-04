import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Catalog, NewCatalog } from '../types/catalog.types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CatalogForm from './CatalogForm';
import { 
  canSelectCatalogForBulkOperation
} from '../utils/catalog.permissions';
import { tokenManager } from '../../../utils/tokenManager';
import { decodeJWT } from '../../../utils/jwt';

export interface CatalogListResponse {
  items: Array<{
    id: number;
    codeArticle: string;
    name: string;
    description: string;
    unitPrice: number;
    defaultTaxRate: number;
    type: number;
  }>;
  pagination: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface CatalogListProps {
  data: CatalogListResponse | null;
  loading: boolean;
  onDelete: (id: number) => void;
  onSubmit: (id: number) => void;
  onCreateCatalog: (catalog: NewCatalog) => Promise<void>;
  onUpdateCatalog: (catalog: NewCatalog) => Promise<void>;
  onRefreshCatalogs: (filters?: any, sort?: any, pagination?: any) => Promise<void>;
  disabled?: boolean;
  token: string | null;
}

interface Filters {
  q: string; // SearchTerm for Name and CodeArticle
  type: string; // Type filter
}

const CatalogList: React.FC<CatalogListProps> = React.memo(({
  data,
  loading,
  onDelete,
  onCreateCatalog,
  onUpdateCatalog,
  token,
  onRefreshCatalogs,
  disabled = false
}) => {
  const { t, i18n } = useTranslation();
  const [selectedCatalogs, setSelectedCatalogs] = useState<Set<number>>(new Set());
  const [selectedCatalog, setSelectedCatalog] = useState<number | null>(null);
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ type: 'submit' | 'delete'; count: number } | null>(null);

  // Filter and sort state
  const [filters, setFilters] = useState<Filters>({
    q: '',
    type: 'all'
  });
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const userRole = useMemo(() => {
    const token = tokenManager.getToken();
    if (!token) return 'Clerk';
    
    try {
      const decodedJWT = decodeJWT(token);
      return decodedJWT?.role || 'Clerk';
    } catch (error) {
      return 'Clerk';
    }
  }, []);

  // Memoized computed values for better performance
  const selectableCatalogs = useMemo(() => {
    if (!data?.items) return [];
    return data.items;
  }, [data?.items, userRole]);

  const allSelectable = useMemo(() => {
    if (!data?.items || selectableCatalogs.length === 0) return false;
    return selectedCatalogs.size === selectableCatalogs.length && selectableCatalogs.length > 0;
  }, [data?.items, selectedCatalogs.size, selectableCatalogs.length]);

  // Keyboard navigation support
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Close dropdowns on Escape
      if (event.key === 'Escape') {
        setShowConfirmDialog(null);
      }
      
      // Select all with Ctrl+A
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        if (data?.items && selectableCatalogs.length > 0) {
          setSelectedCatalogs(new Set(selectableCatalogs.map(catalog => catalog.id)));
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [data?.items, selectableCatalogs]);



  // Update handleSort to only allow valid sortField values
  const handleSort = useCallback((field: string) => {
    const validFields = ['name', 'type', 'unitPrice', 'defaultTaxRate', 'CodeArticle', 'description', 'status'] as const;
    if (!validFields.includes(field as any)) return;
    
    const newSortField = field as typeof validFields[number];
    const newSortDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(newSortField);
    setSortDirection(newSortDirection);
    
    // Trigger API call for sorting
    onRefreshCatalogs(filters, { sortField: newSortField, sortDirection: newSortDirection }, { page: currentPage, pageSize });
  }, [sortField, sortDirection, filters, currentPage, pageSize, onRefreshCatalogs]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!data?.items) return;
    
    if (e.target.checked) {
      setSelectedCatalogs(new Set(selectableCatalogs.map(catalog => catalog.id)));
    } else {
      setSelectedCatalogs(new Set());
    }
  }, [data?.items, selectableCatalogs]);

  const handleSelectCatalog = useCallback((id: number) => {
    setSelectedCatalogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [userRole]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    // Reset to first page when filters change
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      q: '',
      type: 'all'
    });
    setCurrentPage(1);
  }, []);

  // Apply filters and trigger API call
  const applyFiltersAndSort = useCallback(() => {
    const sortParams = sortField ? { sortField, sortDirection } : undefined;
    onRefreshCatalogs(filters, sortParams, { page: currentPage, pageSize });
  }, [filters, sortField, sortDirection, currentPage, pageSize, onRefreshCatalogs]);

  // Sync local state with server response
  useEffect(() => {
    if (data?.pagination) {
      setCurrentPage(data.pagination.page);
      setPageSize(data.pagination.pageSize);
    }
  }, [data?.pagination]);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm(t('catalog.confirm.message', { 
      action: t('common.delete'),
      count: 1,
      plural: '',
      warning: t('catalog.confirm.warning')
    }))) {
      onDelete(id);
    }
  }, [onDelete, t]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    
    // Trigger API call for page size change
    const sortParams = sortField ? { sortField, sortDirection } : undefined;
    onRefreshCatalogs(filters, sortParams, { page: 1, pageSize: newPageSize });
  }, [filters, sortField, sortDirection, onRefreshCatalogs]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'MAD',
    }).format(amount);
  }, [i18n.language]);

  const isCatalogExpired = useCallback((expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }, []);

  const canEditCatalog = useCallback((catalog: any) => {
    // Admin and Manager can edit all catalogs, Clerk cannot edit
    const canEdit = userRole === 'Admin' || userRole === 'Manager';
    return canEdit;
  }, [userRole]);

  const canDeleteCatalog = useCallback((catalog: any) => {
    // Admin and Manager can delete catalogs
    const canDelete = userRole === 'Admin' || userRole === 'Manager';
    return canDelete;
  }, [userRole]);

  const handleEditCatalog = useCallback((quoteData: any) => {
    // Map the catalog data to match the Catalog interface
    const catalog: Catalog = {
      id: quoteData.id,
      CodeArticle: quoteData.codeArticle || '',
      Name: quoteData.name,
      Description: quoteData.description || '',
      UnitPrice: quoteData.unitPrice,
      DefaultTaxRate: quoteData.defaultTaxRate,
      Type: quoteData.type
    };
    setEditingCatalog(catalog);
    setShowCatalogForm(true);
  }, []);

  const handleCatalogFormSubmit = useCallback(async (quoteData: NewCatalog) => {
    try {
      if (editingCatalog) {
        await onUpdateCatalog(quoteData);
      } else {
        await onCreateCatalog(quoteData);
      }
      setShowCatalogForm(false);
    } catch (error: any) {
      toast.error(error.message || t('catalog.form.errors.submissionFailed'));
      throw error;
    }
  }, [editingCatalog, onUpdateCatalog, onCreateCatalog, t]);

  const handleCatalogFormClose = useCallback(() => {
    setShowCatalogForm(false);
    setEditingCatalog(undefined);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('catalog.messages.fetchFailed')}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            {t('errors.tryRefreshing')}
          </p>
          <button
            onClick={() => onRefreshCatalogs()}
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
            <h2 className="text-xl font-semibold text-gray-900">{t('catalog.filters.title')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showFilters ? t('catalog.filters.hide') : t('catalog.filters.show')}
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
              {t('catalog.filters.apply')}
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('catalog.filters.reset')}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t('catalog.filters.name')}
              </label>
              <input
                type="text"
                name="q"
                value={filters.q}
                onChange={handleFilterChange}
                placeholder={t('catalog.filters.searchName')}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('catalog.filters.type')}
              </label>
              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-150"
              >
                <option value="all">{t('catalog.filters.all')}</option>
                <option value="0">{t('catalog.form.typeProduct')}</option>
                <option value="1">{t('catalog.form.typeService')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

        {/* Catalogs Table */}
       {!data?.items || data.items.length === 0 ? (
         <div className="text-center py-16">
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
             <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mx-auto mb-6">
               <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('catalog.list.noItems')}</h3>
             <p className="text-gray-600 leading-relaxed">
               {Object.values(filters).some(v => v !== '' && v !== 'all') 
                 ? t('catalog.list.adjustFilters')
                 : t('catalog.list.getStarted')}
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
                     onClick={() => handleSort('CodeArticle')}
                   >
                     <div className="flex items-center gap-2">
                       {t('catalog.list.CodeArticle')}
                       {sortField === 'CodeArticle' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('name')}
                   >
                     <div className="flex items-center gap-2">
                       {t('catalog.list.name')}
                       {sortField === 'name' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('description')}
                   >
                     <div className="flex items-center gap-2">
                       {t('catalog.list.description')}
                       {sortField === 'description' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('unitPrice')}
                   >
                     <div className="flex items-center justify-end gap-2">
                       {t('catalog.list.unitPrice')}
                       {sortField === 'unitPrice' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('defaultTaxRate')}
                   >
                     <div className="flex items-center gap-2">
                       {t('catalog.list.defaultTaxRate')}
                       {sortField === 'defaultTaxRate' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th 
                     scope="col" 
                     className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-800 transition-colors duration-150"
                     onClick={() => handleSort('type')}
                   >
                     <div className="flex items-center gap-2">
                       {t('catalog.list.type')}
                       {sortField === 'type' && (
                         <svg className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       )}
                     </div>
                   </th>
                   <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                     {t('catalog.list.actions')}
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-50">
                 {data?.items?.map((catalog) => (
                   <React.Fragment key={catalog.id}>
                     <tr 
                       className="hover:bg-blue-50/40 cursor-pointer transition-all duration-300 group"
                       onClick={() => setSelectedCatalog(selectedCatalog === catalog.id ? null : catalog.id)}
                     >
                       <td className="px-4 py-2 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-r"></div>
                         <input
                           type="checkbox"
                           className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 hover:scale-110"
                           checked={selectedCatalogs.has(catalog.id)}
                           onChange={() => handleSelectCatalog(catalog.id)}
                           disabled={disabled}
                         />
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                         <div 
                           className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center"
                         >
                           <span className="text-blue-600 mr-1">#</span>
                           {catalog.codeArticle || '-'}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                         <div className="text-sm text-gray-700 flex items-center">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                           </svg>
                           {catalog.name}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap">
                         <div className="text-sm text-gray-700 flex items-center">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                           </svg>
                           {catalog.description || '-'}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap text-right">
                         <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                           </svg>
                           {formatCurrency(catalog.unitPrice)}
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap text-right">
                         <div className="text-sm font-semibold text-gray-900 flex items-center justify-end">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                           </svg>
                           {catalog.defaultTaxRate}%
                         </div>
                       </td>
                       <td className="px-4 py-2 whitespace-nowrap text-left">
                         <div className="text-sm font-semibold text-gray-900 flex items-center">
                           <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                           </svg>
                           {catalog.type === 0 ? t('catalog.form.typeProduct') : t('catalog.form.typeService')}
                         </div>
                       </td>
                                              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end gap-1.5 relative">
                           {canEditCatalog(catalog) && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleEditCatalog(catalog);
                               }}
                               className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-all duration-200 p-1.5 rounded-lg hover:bg-blue-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-blue-200"
                               disabled={disabled}
                               title={t('common.edit')}
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                               </svg>
                             </button>
                           )}
                           
                           {canDeleteCatalog(catalog) && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDelete(catalog.id);
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
                         </div>
                       </td>
                     </tr>
                   </React.Fragment>
                 ))}
               </tbody>
             </table>
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
                  onRefreshCatalogs(filters, sortParams, { page: newPage, pageSize });
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
                  onRefreshCatalogs(filters, sortParams, { page: newPage, pageSize });
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
                  {t('common.pagination.showing')}{' '}
                  <span className="font-medium">{((data.pagination.page - 1) * data.pagination.pageSize) + 1}</span> {t('common.pagination.to')}{' '}
                  <span className="font-medium">{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalItems)}</span> {t('common.pagination.of')}{' '}
                  <span className="font-medium">{data.pagination.totalItems}</span> {t('common.pagination.results')}
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
                        onRefreshCatalogs(filters, sortParams, { page: newPage, pageSize });
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
                          onRefreshCatalogs(filters, sortParams, { page: pageNum, pageSize });
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
                        onRefreshCatalogs(filters, sortParams, { page: newPage, pageSize });
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
                {t('catalog.confirm.title', { action: showConfirmDialog.type === 'submit' ? t('common.submit') : t('common.delete') })}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                {t('catalog.confirm.message', { 
                    action: showConfirmDialog.type === 'submit' ? t('common.submit') : t('common.delete'),
                    count: showConfirmDialog.count,
                    plural: showConfirmDialog.count !== 1 ? 's' : '',
                    warning: showConfirmDialog.type === 'delete' ? t('catalog.confirm.warning') : ''
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
                onClick={() => {
                  if (showConfirmDialog?.type === 'delete') {
                    onDelete(selectedCatalogs.size);
                  } else {
                    //onSubmit(selectedCatalogs.size);
                  }
                  setShowConfirmDialog(null);
                }}
                className={`px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 ${
                  showConfirmDialog.type === 'submit'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {showConfirmDialog.type === 'submit' ? t('common.submit') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Form Modal */}
      {showCatalogForm && (
        <CatalogForm
          onSubmit={handleCatalogFormSubmit}
          onClose={handleCatalogFormClose}
          catalog={editingCatalog}
          disabled={disabled}
        />
      )}
    </div>
  );
});

export default CatalogList; 