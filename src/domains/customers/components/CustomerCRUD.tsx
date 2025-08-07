import React, { useState, useEffect, useCallback } from 'react';
import { getSecureJsonHeaders, getSecureHeaders } from '../../../config/api';
import { CUSTOMER_ENDPOINTS } from '../api/customer.endpoints';
import { Customer } from '../../../types/common';
import { ApiResponse } from '../../auth/types/auth.types';
import { decodeJWT } from '../../../utils/jwt';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface CustomerCRUDProps {
  token: string | null;
}

const CustomerCRUD = React.memo(({ token }: CustomerCRUDProps) => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
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
      const res = await fetch(CUSTOMER_ENDPOINTS.LIST, {
        headers: getSecureHeaders(token),
      });
      if (!res.ok) throw new Error(t('errors.failedToFetchCustomers'));
      
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToFetchCustomers'));
      }
      
      setCustomers(responseData.data || []);
    } catch (e: any) {
      setError(e.message || t('errors.anErrorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }, [form]);

  const validate = () => {
    const newFieldErrors: Record<string, string[]> = {};
    if (!form.name?.trim()) {
      newFieldErrors.Name = [t('customers.errors.nameRequired')];
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newFieldErrors.Email = [t('errors.invalidEmail')];
    }
    if (form.ice && !/^\d{15}$/.test(form.ice)) {
      newFieldErrors.ICE = [t('customers.errors.invalidICE')];
    }
    if (form.taxId && !/^\d{8}$/.test(form.taxId)) {
      newFieldErrors.TaxId = [t('customers.errors.invalidTaxId')];
    }
    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFieldErrors({});
    const toastId = toast.loading(editingCustomer ? t('common.updating') : t('common.creating'));

    try {
      const method = editingCustomer ? 'PUT' : 'POST';
      const url = editingCustomer
        ? CUSTOMER_ENDPOINTS.UPDATE(editingCustomer.id)
        : CUSTOMER_ENDPOINTS.CREATE;
      const res = await fetch(url, {
        method,
        headers: getSecureJsonHeaders(token),
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          if (errorData.errors) {
            setFieldErrors(errorData.errors);
            throw new Error(errorData.title || t('errors.validationFailed'));
          }
        }
        throw new Error(t('customers.messages.saveFailed'));
      }

      const contentType = res.headers.get('content-type');
      const responseData = contentType && contentType.includes('application/json') ? await res.json() : null;
      setShowForm(false);
      setEditingCustomer(null);
      setForm({});
      toast.success(editingCustomer ? t('customers.messages.updated') : t('customers.messages.created'), { id: toastId });
      
      if (editingCustomer) {
        setCustomers(prevCustomers => 
          prevCustomers.map(c => 
            c.id === editingCustomer.id 
              ? { ...c, ...form }
              : c
          )
        );
      } else if (responseData && responseData.id) {
        const newCustomer = { ...form, id: responseData.id } as Customer;
        setCustomers(prevCustomers => [newCustomer, ...prevCustomers]);
      }
    } catch (e: any) {
      toast.error(e.message || t('errors.anErrorOccurred'), { id: toastId });
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
    const toastId = toast.loading(t('common.deleting'));
    try {
      const res = await fetch(CUSTOMER_ENDPOINTS.DELETE(id), { 
        method: 'DELETE',
        headers: getSecureHeaders(token),
      });
      if (!res.ok) throw new Error(t('customers.messages.deleteFailed'));
      toast.success(t('customers.messages.deleted'), { id: toastId });
      setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== id));
    } catch (e: any) {
      toast.error(e.message || t('errors.anErrorOccurred'), { id: toastId });
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
              onClick={() => { setShowForm(true); setEditingCustomer(null); setForm({}); }}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 mr-4">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('errors.title')}</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.ice')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.taxId')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.email')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.phone')}</th>
                {canPerformActions && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('customers.headers.actions')}</th>}
              </tr>
            </thead>
          </table>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-100">
              <tbody className="bg-white divide-y divide-gray-50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/40 transition-all duration-300 group">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {c.name}
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
                      {c.taxId || '-'}
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
                onClick={() => { setShowForm(true); setEditingCustomer(null); setForm({}); }}
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
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.name')}</label>
                <input 
                  name="name" 
                  value={form.name || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.namePlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.Name?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required 
                />
                {renderFieldError('Name')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.ice')}</label>
                <input 
                  name="ice" 
                  value={form.ice || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.icePlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.ICE?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {renderFieldError('ICE')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.taxId')}</label>
                <input 
                  name="taxId" 
                  value={form.taxId || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.taxIdPlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.TaxId?.length ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {renderFieldError('TaxId')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.form.addressPlaceholder')}</label>
                <textarea 
                  name="address" 
                  value={form.address || ''} 
                  onBlur={handleBlur} 
                  onChange={handleChange} 
                  placeholder={t('customers.form.addressPlaceholder')} 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.Address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
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
                    fieldErrors.PhoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {renderFieldError('PhoneNumber')}
              </div>
              {error && <div className="text-red-600">{error}</div>}
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditingCustomer(null); setForm({}); }} 
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