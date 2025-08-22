import React, { useState, useEffect, useCallback } from 'react';
import { secureApiClient } from '../../../config/api';
import { CUSTOMER_ENDPOINTS } from '../api/customer.endpoints';
import { Customer, CustomerType } from '../types/customer.types';
import { decodeJWT } from '../../../utils/jwt';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useStatsContext } from '../../stats/context/StatsContext';

interface CustomerCRUDProps {
  token: string | null;
}

const CustomerCRUD = React.memo(({ token }: CustomerCRUDProps) => {
  const { t } = useTranslation();
  const { incrementSidebarCount, refreshSidebarCountsSilently } = useStatsContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({ type: CustomerType.Business });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const decodedToken = token ? decodeJWT(token) : null;
  const userRole = decodedToken?.role;

  const canCreate = userRole === 'Admin' || userRole === 'Manager';
  const canUpdate = userRole === 'Admin' || userRole === 'Manager';
  const canDelete = userRole === 'Admin';
  const canPerformActions = canUpdate || canDelete;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await secureApiClient.get(CUSTOMER_ENDPOINTS.LIST);
      
      // Handle network errors and API unavailability
      if (!res.ok) {
        if (res.status === 0 || res.status >= 500) {
          throw new Error(t('errors.networkError'));
        }
        if (res.status === 401) {
          throw new Error(t('errors.unauthorized'));
        }
        throw new Error(t('errors.failedToFetchCustomers'));
      }
      
      const responseData = await res.json().catch(() => ({ 
        succeeded: false, 
        message: t('errors.invalidResponse') 
      }));
      
      if (!responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToFetchCustomers'));
      }
      
      const apiData = responseData.data;
      const items = Array.isArray(apiData?.items)
        ? apiData.items
        : (Array.isArray(apiData) ? apiData : []);
      setCustomers(items);
    } catch (e: any) {
      let errorMessage = e.message || t('errors.anErrorOccurred');
      
      // Handle browser's "Failed to fetch" error
      if (e.message === 'Failed to fetch' || e.message === 'NETWORK_ERROR') {
        errorMessage = t('errors.networkError');
      }
      
      setError(errorMessage);
      // Don't show toast on initial load - only show error in the UI
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.name === 'type' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  }, [form]);

  const validate = () => {
    const newFieldErrors: Record<string, string[]> = {};
    
    // CustomerType: required
    if (form.type === undefined || form.type === null) {
      newFieldErrors.Type = [t('customers.errors.typeRequired')];
    }
    
    // LegalName: required
    if (!form.legalName?.trim()) {
      newFieldErrors.LegalName = [t('customers.errors.legalNameRequired')];
    }
    
    // Address: required
    if (!form.address?.trim()) {
      newFieldErrors.Address = [t('customers.errors.addressRequired')];
    }
    
    // ICE: Required if BUSINESS, optional if INDIVIDUAL
    if (form.type === CustomerType.Business && !form.ice?.trim()) {
      newFieldErrors.ICE = [t('customers.errors.iceRequiredForBusiness')];
    } else if (form.ice && !/^\d{15}$/.test(form.ice)) {
      newFieldErrors.ICE = [t('customers.errors.invalidICE')];
    }
    
    // IdentifiantFiscal: Required if BUSINESS, optional if INDIVIDUAL
    if (form.type === CustomerType.Business && !form.identifiantFiscal?.trim()) {
      newFieldErrors.IdentifiantFiscal = [t('customers.errors.identifiantFiscalRequiredForBusiness')];
    } else if (form.identifiantFiscal && !/^\d{8}$/.test(form.identifiantFiscal)) {
      newFieldErrors.IdentifiantFiscal = [t('customers.errors.invalidIdentifiantFiscal')];
    }
    
    // Email validation (optional field)
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newFieldErrors.Email = [t('errors.invalidEmail')];
    }
    
    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Frontend validation first
    setFieldErrors({});
    if (!validate()) return;

    setIsSubmitting(true);
    const toastId = toast.loading(editingCustomer ? t('common.updating') : t('common.creating'));

    try {
      // Trim all string fields before sending
      const sanitizedForm: Record<string, any> = {};
      Object.entries(form).forEach(([key, value]) => {
        sanitizedForm[key] = typeof value === 'string' ? value.trim() : value;
      });

      const method = editingCustomer ? 'PUT' : 'POST';
      const url = editingCustomer
        ? CUSTOMER_ENDPOINTS.UPDATE(editingCustomer.id)
        : CUSTOMER_ENDPOINTS.CREATE;
      
      let res: Response;
      try {
        res = await (method === 'PUT'
          ? secureApiClient.put(url, sanitizedForm)
          : secureApiClient.post(url, sanitizedForm)
        );
      } catch (networkError: any) {
        const errorMessage = networkError.message === 'NETWORK_ERROR' ? t('errors.networkError') : networkError.message;
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
            lineHeight: '1.5'
          }
        });
        return;
      }

      let responseData: any = null;
      try {
        responseData = await res.json();
      } catch {
        responseData = { succeeded: false, message: t('errors.invalidResponse') };
      }

      if (!res.ok || !responseData?.succeeded) {
        // Handle network/server errors
        if (res.status === 0 || res.status >= 500) {
          toast.error(t('errors.networkError'), {
            id: toastId,
            duration: 5000,
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.5'
            }
          });
          return;
        }

        // Backend validation errors: object keyed by fields or array
        if (responseData?.errors) {
          if (!Array.isArray(responseData.errors) && typeof responseData.errors === 'object') {
            setFieldErrors(responseData.errors as Record<string, string[]>);
          }
        }

        const title = responseData?.message || responseData?.title || t('errors.validationFailed');
        const detailsArray = Array.isArray(responseData?.errors)
          ? responseData.errors
          : (responseData?.details && Array.isArray(responseData.details) ? responseData.details : []);
        const body = detailsArray.length > 0 ? `\n\n${detailsArray.map((d: string) => `• ${d}`).join('\n')}` : '';
        toast.error(`${title}${body}`, {
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
        return;
      }

      // Success
      const successMessage = responseData?.message || (editingCustomer ? t('customers.messages.updated') : t('customers.messages.created'));
      toast.success(successMessage, {
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

      setShowForm(false);
      setEditingCustomer(null);
      setForm({ type: CustomerType.Business });

      if (editingCustomer) {
        const updated = responseData?.data as Customer | undefined;
        setCustomers(prevCustomers => 
          prevCustomers.map(c => 
            c.id === editingCustomer.id 
              ? (updated ? updated : { ...c, ...sanitizedForm as Partial<Customer> })
              : c
          )
        );
      } else {
        const created = responseData?.data as Customer | undefined;
        if (created && created.id) {
          setCustomers(prevCustomers => [created, ...prevCustomers]);
          // Sidebar: increment customers count optimistically and reconcile silently
          incrementSidebarCount('customersCount', 1);
          refreshSidebarCountsSilently();
        }
      }
    } catch (e: any) {
      toast.error(e?.message || t('errors.anErrorOccurred'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, editingCustomer, form, token, t]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value.trim() });
  }, [form]);

  const handleEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setForm(customer);
    setShowForm(true);
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('customers.confirm.delete'))) return;
    const toastId = toast.loading(t('common.processing'));
    try {
      let res: Response;
      try {
        res = await secureApiClient.delete(CUSTOMER_ENDPOINTS.DELETE(id));
      } catch (networkError: any) {
        const errorMessage = networkError.message === 'NETWORK_ERROR' ? t('errors.networkError') : networkError.message;
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
            lineHeight: '1.5'
          }
        });
        return;
      }

      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.invalidResponse') }));
      
      if (!res.ok || !responseData?.succeeded) {
        // Handle network/server errors
        if (res.status === 0 || res.status >= 500) {
          toast.error(t('errors.networkError'), {
            id: toastId,
            duration: 5000,
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.5'
            }
          });
          return;
        }

        let title = responseData?.message || responseData?.title || t('customers.messages.deleteFailed');
        const details = Array.isArray(responseData?.errors)
          ? responseData.errors
          : (responseData?.details && Array.isArray(responseData.details) ? responseData.details : []);
        const body = details.length > 0 ? `\n\n${details.map((d: string) => `• ${d}`).join('\n')}` : '';
        toast.error(`${title}${body}`, {
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
        return;
      }

      toast.success(responseData?.message || t('customers.messages.deleted'), {
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
      setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== id));
      // Sidebar: decrement customers count optimistically and reconcile silently
      incrementSidebarCount('customersCount', -1);
      refreshSidebarCountsSilently();
    } catch (e: any) {
      let errorMessage = e.message || t('errors.anErrorOccurred');
      
      // Handle network error
      if (e.message === 'NETWORK_ERROR') {
        errorMessage = t('errors.networkError');
      }
      
      toast.error(errorMessage, { id: toastId });
    }
  };

  const renderFieldError = (fieldName: string) => {
    const errors = fieldErrors[fieldName];
    if (!errors || errors.length === 0) return null;
    
    return (
      <div className="mt-1 text-sm text-red-600">
        {errors.map((error, index) => (
          <div key={index}>{error}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{t('customers.title')}</h1>
          </div>
          {canCreate && (
            <button
                              onClick={() => { setShowForm(true); setEditingCustomer(null); setForm({ type: CustomerType.Business }); }}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('customers.addCustomer')}
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-6">
              <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('errors.failedToFetchCustomers')}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              {t('errors.tryRefreshing')}
            </p>
            <button
              onClick={fetchCustomers}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('common.retry')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.type')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.legalName')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.ice')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.identifiantFiscal')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.address')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.email')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.phone')}</th>
                {canPerformActions && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.actions')}</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-blue-50/40 transition-all duration-300 group">
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      c.type === CustomerType.Business 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {c.type === CustomerType.Business ? t('customers.types.business') : t('customers.types.individual')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {c.legalName}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-700 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {c.ice || '-'}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-700 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {c.identifiantFiscal || '-'}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm text-gray-700 flex items-start">
                    <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate max-w-xs" title={c.address}>
                      {c.address.length > 20 ? `${c.address.substring(0, 20)}...` : c.address}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-700 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {c.email || '-'}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-700 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {c.phoneNumber || '-'}
                  </div>
                </td>
                {canPerformActions && (
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1.5">
                      {canUpdate && (
                        <button 
                          onClick={() => handleEdit(c)} 
                          className="text-blue-600 hover:text-blue-700 p-1.5 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-blue-200"
                          title={t('customers.actions.edit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="text-red-600 hover:text-red-700 p-1.5 rounded-lg transition-all duration-200 hover:bg-red-50 hover:scale-110 hover:shadow-sm border border-transparent hover:border-red-200"
                          title={t('customers.actions.delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}

      {customers.length === 0 && !loading && !error && (
        <div className="text-center py-16">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mx-auto mb-6">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('customers.list.noCustomers')}</h3>
            <p className="text-gray-600 leading-relaxed">
              {t('customers.list.getStarted')}
            </p>
            {canCreate && (
              <button
                onClick={() => { setShowForm(true); setEditingCustomer(null); setForm({ type: CustomerType.Business }); }}
                className="mt-6 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('customers.addCustomer')}
              </button>
            )}
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 mr-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('customers.headers.type')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: CustomerType.Business })}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      form.type === CustomerType.Business
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium">{t('customers.types.business')}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: CustomerType.Individual })}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      form.type === CustomerType.Individual
                        ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">{t('customers.types.individual')}</span>
                    </div>
                  </button>
                </div>
                <input 
                  type="hidden" 
                  name="type" 
                  value={form.type ?? CustomerType.Business} 
                  required 
                />
                {fieldErrors.Type && (
                  <div className="text-red-500 text-xs mt-1">{fieldErrors.Type.join(', ')}</div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('customers.headers.legalName')} <span className="text-red-500">*</span>
                </label>
                <input 
                  name="legalName" 
                  value={form.legalName || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.legalNamePlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.LegalName?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required 
                />
                {renderFieldError('LegalName')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('customers.headers.ice')} {form.type === CustomerType.Business && <span className="text-red-500">*</span>}
                </label>
                <input 
                  name="ice" 
                  value={form.ice || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.icePlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.ICE?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required={form.type === CustomerType.Business}
                />
                {renderFieldError('ICE')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('customers.headers.identifiantFiscal')} {form.type === CustomerType.Business && <span className="text-red-500">*</span>}
                </label>
                <input 
                  name="identifiantFiscal" 
                  value={form.identifiantFiscal || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.identifiantFiscalPlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.IdentifiantFiscal?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required={form.type === CustomerType.Business}
                />
                {renderFieldError('IdentifiantFiscal')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('customers.headers.address')} <span className="text-red-500">*</span>
                </label>
                <textarea 
                  name="address" 
                  value={form.address || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.addressPlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.Address?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
                  required
                />
                {renderFieldError('Address')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.email')}</label>
                <input 
                  name="email" 
                  value={form.email || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.emailPlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.Email?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {renderFieldError('Email')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.phone')}</label>
                <input 
                  name="phoneNumber" 
                  value={form.phoneNumber || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.phonePlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.PhoneNumber?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {renderFieldError('PhoneNumber')}
              </div>
              {error && <div className="text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditingCustomer(null); setForm({ type: CustomerType.Business }); }} 
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  {t('customers.form.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      {t('common.saving')}
                    </div>
                  ) : (
                    t('customers.form.save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default CustomerCRUD; 