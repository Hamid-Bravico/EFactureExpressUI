import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { Customer } from '../types';
import { decodeJWT } from '../utils/jwt';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface CustomerCRUDProps {
  token: string | null;
}

const CustomerCRUD = ({ token }: CustomerCRUDProps) => {
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

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.CUSTOMERS.LIST, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error('Failed to fetch customers');
      setCustomers(await res.json());
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const newFieldErrors: Record<string, string[]> = {};
    if (!form.name?.trim()) {
      newFieldErrors.Name = [t('errors.nameIsRequired')];
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newFieldErrors.Email = [t('errors.invalidEmail')];
    }
    if (form.ice && !/^\d{15}$/.test(form.ice)) {
      newFieldErrors.ICE = [t('errors.invalidICE')];
    }
    if (form.taxId && !/^\d{8}$/.test(form.taxId)) {
      newFieldErrors.TaxId = [t('errors.invalidTaxId')];
    }
    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedForm = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    );
    setForm(trimmedForm);

    if (!validate()) {
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading(editingCustomer ? t('customers.form.save') : t('customers.addCustomer'));
    try {
      const method = editingCustomer ? 'PUT' : 'POST';
      const url = editingCustomer
        ? API_ENDPOINTS.CUSTOMERS.UPDATE(editingCustomer.id)
        : API_ENDPOINTS.CUSTOMERS.CREATE;
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.errors) {
          setFieldErrors(errorData.errors);
          throw new Error(errorData.title || t('errors.validationFailed'));
        }
        throw new Error(t('errors.failedToSaveCustomer'));
      }

      setShowForm(false);
      setEditingCustomer(null);
      setForm({});
      toast.success(editingCustomer ? t('success.customerUpdated') : t('success.customerCreated'), { id: toastId });
      fetchCustomers();
    } catch (e: any) {
      toast.error(e.message || t('errors.anErrorOccurred'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value.trim() });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm(customer);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('confirmations.deleteCustomer'))) return;
    const toastId = toast.loading(t('common.deleting'));
    try {
      const res = await fetch(API_ENDPOINTS.CUSTOMERS.DELETE(id), { 
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error(t('errors.failedToDeleteCustomer'));
      toast.success(t('success.customerDeleted'), { id: toastId });
      fetchCustomers();
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{t('customers.title')}</h1>
        {canCreate && (
        <button
          onClick={() => { setShowForm(true); setEditingCustomer(null); setForm({}); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >{t('customers.addCustomer')}</button>
        )}
      </div>
      {loading ? (
        <div>{t('common.loading')}</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customers.headers.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customers.headers.ice')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customers.headers.taxId')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customers.headers.email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customers.headers.phone')}</th>
                {canPerformActions && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('customers.headers.actions')}</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{c.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.ice}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.taxId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.phoneNumber}</td>
                  {canPerformActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center space-x-2">
                      {canUpdate && (
                        <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
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
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.name')}</label>
                <input name="name" value={form.name || ''} onBlur={handleBlur} onChange={e => { setForm({ ...form, name: e.target.value }); if (fieldErrors.Name) setFieldErrors({ ...fieldErrors, Name: [] }); }} placeholder={t('customers.form.namePlaceholder')} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.Name?.length ? 'border-red-500' : 'border-gray-300'}`} required />
                {renderFieldError('Name')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.ice')}</label>
                <input name="ice" value={form.ice || ''} onBlur={handleBlur} onChange={e => { setForm({ ...form, ice: e.target.value }); if (fieldErrors.ICE) setFieldErrors({ ...fieldErrors, ICE: [] }); }} placeholder={t('customers.form.icePlaceholder')} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.ICE?.length ? 'border-red-500' : 'border-gray-300'}`} />
                {renderFieldError('ICE')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.taxId')}</label>
                <input name="taxId" value={form.taxId || ''} onBlur={handleBlur} onChange={e => { setForm({ ...form, taxId: e.target.value }); if (fieldErrors.TaxId) setFieldErrors({ ...fieldErrors, TaxId: [] }); }} placeholder={t('customers.form.taxIdPlaceholder')} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.TaxId?.length ? 'border-red-500' : 'border-gray-300'}`} />
                {renderFieldError('TaxId')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.form.addressPlaceholder')}</label>
                <textarea name="address" value={form.address || ''} onBlur={handleBlur} onChange={handleChange} placeholder={t('customers.form.addressPlaceholder')} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.Address ? 'border-red-500' : 'border-gray-300'}`} />
                {renderFieldError('Address')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.email')}</label>
                <input name="email" value={form.email || ''} onBlur={handleBlur} onChange={e => { setForm({ ...form, email: e.target.value }); if (fieldErrors.Email) setFieldErrors({ ...fieldErrors, Email: [] }); }} placeholder={t('customers.form.emailPlaceholder')} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.Email?.length ? 'border-red-500' : 'border-gray-300'}`} />
                {renderFieldError('Email')}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('customers.headers.phone')}</label>
                <input name="phoneNumber" value={form.phoneNumber || ''} onBlur={handleBlur} onChange={handleChange} placeholder={t('customers.form.phonePlaceholder')} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.PhoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                {renderFieldError('PhoneNumber')}
              </div>
              {error && <div className="text-red-600">{error}</div>}
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingCustomer(null); setForm({}); }} className="px-4 py-2 bg-gray-300 rounded" disabled={isSubmitting}>{t('customers.form.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isSubmitting}>{t('customers.form.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCRUD; 