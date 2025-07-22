import React, { useState, useEffect } from 'react';
import { NewInvoice, NewLine, Invoice, Customer } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';

interface InvoiceFormProps {
  onSubmit: (invoice: NewInvoice) => Promise<void>;
  onClose: () => void;
  invoice?: Invoice;
  disabled?: boolean;
}

interface FormErrors {
  invoiceNumber?: string;
  date?: string;
  customerId?: string;
  status?: string;
  lines?: { [key: number]: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } };
}

interface BackendErrorResponse {
  [key: string]: string[];
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onClose, invoice, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || "");
  const [date, setDate] = useState(invoice?.date || new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(invoice?.customer?.id || null);
  const [status, setStatus] = useState(invoice?.status || 0);
  const [lines, setLines] = useState<NewLine[]>(
    invoice?.lines
      ? invoice.lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
        }))
      : [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<BackendErrorResponse>({});
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetch(API_ENDPOINTS.CUSTOMERS.LIST, {
      headers: { Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' },
    })
      .then(res => res.json())
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      const formattedDate = new Date(invoice.date).toISOString().split('T')[0];
      setDate(formattedDate);
      setCustomerId(invoice.customer?.id || null);
      setLines(invoice.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
      })));
      setStatus(invoice.status);
    }
  }, [invoice]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!invoiceNumber.trim()) newErrors.invoiceNumber = t('invoice.form.errors.invoiceNumberRequired');
    if (!date) newErrors.date = t('invoice.form.errors.dateRequired');
    if (!customerId) newErrors.customerId = t('invoice.form.errors.customerNameRequired');
    if (status !== 0 && status !== 1) newErrors.status = t('invoice.form.errors.invalidStatus');
    const lineErrors: { [key: number]: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } } = {};
    let hasValidLine = false;
    lines.forEach((line, index) => {
      const lineError: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } = {};
      if (!line.description || !line.description.trim()) lineError.description = t('invoice.form.errors.descriptionRequired');
      if (typeof line.quantity !== 'number' || isNaN(line.quantity) || String(line.quantity).trim() === '' || line.quantity <= 0) lineError.quantity = t('invoice.form.errors.quantityPositive');
      if (typeof line.unitPrice !== 'number' || isNaN(line.unitPrice) || String(line.unitPrice).trim() === '' || line.unitPrice < 0) lineError.unitPrice = t('invoice.form.errors.unitPricePositive');
      if (typeof line.taxRate !== 'number' || isNaN(line.taxRate) || String(line.taxRate).trim() === '' || line.taxRate < 0 || line.taxRate > 100) lineError.taxRate = t('invoice.form.errors.taxRateRange');
      if (Object.keys(lineError).length > 0) lineErrors[index] = lineError; else hasValidLine = true;
    });
    if (!hasValidLine) newErrors.lines = { 0: { description: t('invoice.form.errors.oneLineRequired') } };
    else if (Object.keys(lineErrors).length > 0) newErrors.lines = lineErrors;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateLine = (index: number, field: keyof NewLine | 'taxRate', value: string) => {
    // 1) Update the line values as before
    setLines(prev =>
      prev.map((ln, i) =>
        i === index
          ? { ...ln, [field]: field === "description" ? value : Number(value) }
          : ln
      )
    );
  
    // 2) If there was a client-side error for this line, clear it safely
    if (errors.lines?.[index]) {
      setErrors(prev => {
        const prevLines = prev.lines || {};
        const thisLineErrors = prevLines[index] || {};
        const updatedLineErrors = { ...thisLineErrors, [field]: undefined };
        const updatedLinesMap = { ...prevLines, [index]: updatedLineErrors };
  
        return {
          ...prev,
          lines: updatedLinesMap
        };
      });
    }
  };
  

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 20 },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error(t('invoice.form.errors.cannotRemoveLastLine'));
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const computeTotals = () => {
    const sub = lines.reduce(
      (sum, ln) => sum + ln.quantity * ln.unitPrice,
      0
    );
    const vat = lines.reduce(
      (sum, ln) => sum + ln.quantity * ln.unitPrice * (ln.taxRate ?? 20) / 100,
      0
    );
    return { subTotal: +sub.toFixed(2), vat: +vat.toFixed(2), total: +(sub + vat).toFixed(2) };
  };

  const getInvoiceErrorMessage = (field: string): string | undefined => {
    const fieldMap: { [key: string]: string } = {
      'invoiceNumber': 'InvoiceNumber',
      'date': 'Date',
      'customerId': 'CustomerId',
      'status': 'Status'
    };
    
    const backendKey = fieldMap[field];
    if (backendKey && backendErrors[backendKey]) {
      return backendErrors[backendKey][0];
    }
    return undefined;
  };

  const getLineErrorMessage = (key: string): string | undefined => {
    const arr = backendErrors[key];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0];
    }
    return undefined;
  };

  const clearInvoiceError = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      'invoiceNumber': 'InvoiceNumber',
      'date': 'Date',
      'customerId': 'CustomerId',
      'status': 'Status'
    };
    
    const backendKey = fieldMap[field];
    if (backendKey) {
      setBackendErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[backendKey];
        return newErrors;
      });
    }
  };

  const clearLineError = (field: string) => {
    setBackendErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isSubmitting) return;

    if (!validateForm()) {
      toast.error(t('invoice.form.errors.fixErrors'));
      return;
    }

    setIsSubmitting(true);
    setBackendErrors({});

    try {
      const { subTotal, vat, total } = computeTotals();

      const newInvoice: NewInvoice = {
        ...(invoice?.id && { id: invoice.id }),
        invoiceNumber,
        date,
        customerId: customerId!,
        subTotal,
        vat,
        total,
        status,
        lines: lines.map(ln => ({ description: ln.description, quantity: ln.quantity, unitPrice: ln.unitPrice, taxRate: ln.taxRate })),
      };

      await onSubmit(newInvoice);
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      if (error.errors) {
        setBackendErrors(error.errors as BackendErrorResponse);
        toast.error(t('invoice.form.errors.submissionError'));
      } else if (error.title) {
        toast.error(error.title);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(t('invoice.form.errors.saveFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const locale = i18n.language === 'fr' ? 'fr-MA' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MAD' }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {invoice ? t('invoice.form.editTitle') : t('invoice.form.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            disabled={isSubmitting}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.invoiceNumber')}</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  if (errors.invoiceNumber) {
                    setErrors(prev => ({ ...prev, invoiceNumber: undefined }));
                  }
                  clearInvoiceError('invoiceNumber');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.invoiceNumber || getInvoiceErrorMessage('invoiceNumber') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
                required
              />
              {(errors.invoiceNumber || getInvoiceErrorMessage('invoiceNumber')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.invoiceNumber || getInvoiceErrorMessage('invoiceNumber')}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) {
                    setErrors(prev => ({ ...prev, date: undefined }));
                  }
                  clearInvoiceError('date');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date || getInvoiceErrorMessage('date') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
                required
              />
              {(errors.date || getInvoiceErrorMessage('date')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.date || getInvoiceErrorMessage('date')}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.customerName')}</label>
              <select
                value={customerId ?? ''}
                onChange={e => { setCustomerId(Number(e.target.value)); if (errors.customerId) setErrors(prev => ({ ...prev, customerId: undefined })); clearInvoiceError('customerId'); }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerId || getInvoiceErrorMessage('customerId') ? 'border-red-500' : 'border-gray-300'}`}
                disabled={disabled || isSubmitting}
                required
              >
                <option value="">{t('invoice.form.selectCustomer')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {(errors.customerId || getInvoiceErrorMessage('customerId')) && (
                <div className="text-red-500 text-xs mt-1">{errors.customerId || getInvoiceErrorMessage('customerId')}</div>
              )}
            </div>
            {userRole !== 'Clerk' && (
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-3">{t('invoice.form.status')}</label>
                <div className="flex space-x-4">
                  <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    status === 0
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  } ${(disabled || isSubmitting || invoice?.status === 2) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value={0}
                      checked={status === 0}
                      onChange={(e) => {
                        setStatus(Number(e.target.value));
                        if (errors.status) {
                          setErrors(prev => ({ ...prev, status: undefined }));
                        }
                      }}
                      disabled={disabled || isSubmitting || invoice?.status === 2}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      status === 0 ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {status === 0 && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{t('invoice.status.draft')}</div>
                      <div className="text-xs text-gray-500">{t('invoice.status.draftDescription')}</div>
                    </div>
                  </label>

                  <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    status === 1
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  } ${(disabled || isSubmitting || invoice?.status === 2) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="status"
                      value={1}
                      checked={status === 1}
                      onChange={(e) => {
                        setStatus(Number(e.target.value));
                        if (errors.status) {
                          setErrors(prev => ({ ...prev, status: undefined }));
                        }
                      }}
                      disabled={disabled || isSubmitting || invoice?.status === 2}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      status === 1 ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {status === 1 && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{t('invoice.status.ready')}</div>
                      <div className="text-xs text-gray-500">{t('invoice.status.readyDescription')}</div>
                    </div>
                  </label>

                  {invoice?.status === 2 && (
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      status === 2
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    } ${(disabled || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input
                        type="radio"
                        name="status"
                        value={2}
                        checked={status === 2}
                        onChange={(e) => {
                          setStatus(Number(e.target.value));
                          if (errors.status) {
                            setErrors(prev => ({ ...prev, status: undefined }));
                          }
                        }}
                        disabled={disabled || isSubmitting}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        status === 2 ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {status === 2 && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{t('invoice.status.submitted')}</div>
                        <div className="text-xs text-gray-500">{t('invoice.status.submittedDescription')}</div>
                      </div>
                    </label>
                  )}
                </div>
                {errors.status && (
                  <div className="text-red-500 text-xs mt-1">
                    {errors.status}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">{t('invoice.form.linesTitle')}</h3>
              <button
                type="button"
                onClick={addLine}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={disabled || isSubmitting}
              >
                {t('invoice.form.addLine')}
              </button>
            </div>

            {lines.map((ln, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 mb-4 items-end">
                {(() => {
                  const descKey = `Lines[${idx}].Description`;
                  const qtyKey = `Lines[${idx}].Quantity`;
                  const priceKey = `Lines[${idx}].UnitPrice`;
                  const taxRateKey = `Lines[${idx}].TaxRate`;

                  const descError = getLineErrorMessage(descKey);
                  const qtyError = getLineErrorMessage(qtyKey);
                  const priceError = getLineErrorMessage(priceKey);
                  const taxRateError = getLineErrorMessage(taxRateKey);

                  return (
                    <>
                      <div className="col-span-6">
                        <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.description')}</label>
                        <input
                          type="text"
                          value={ln.description}
                          onChange={(e) => {
                            updateLine(idx, 'description', e.target.value);
                            clearLineError(descKey);
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            errors.lines?.[idx]?.description || descError ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={disabled || isSubmitting}
                          required
                        />
                        {descError && (
                          <div className="text-red-500 text-xs mt-1 transition-opacity duration-200">{descError}</div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.quantity')}</label>
                        <input
                          type="number"
                          value={ln.quantity}
                          onChange={(e) => {
                            updateLine(idx, 'quantity', e.target.value);
                            clearLineError(qtyKey);
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            errors.lines?.[idx]?.quantity || qtyError ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={disabled || isSubmitting}
                          min="1"
                          required
                        />
                        {qtyError && (
                          <div className="text-red-500 text-xs mt-1 transition-opacity duration-200">{qtyError}</div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.unitPrice')}</label>
                        <input
                          type="number"
                          value={ln.unitPrice}
                          onChange={(e) => {
                            updateLine(idx, 'unitPrice', e.target.value);
                            clearLineError(priceKey);
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.unitPrice || priceError ? 'border-red-500' : 'border-gray-300'}`}
                          disabled={disabled || isSubmitting}
                          step="0.01"
                          min="0"
                          required
                        />
                        {priceError && (
                          <div className="text-red-500 text-xs mt-1 transition-opacity duration-200">{priceError}</div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">{t('invoice.form.taxRate')}</label>
                        <input
                          type="number"
                          value={ln.taxRate ?? 20}
                          onChange={e => { updateLine(idx, 'taxRate', e.target.value); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.taxRate ? 'border-red-500' : 'border-gray-300'}`}
                          disabled={disabled || isSubmitting}
                          min="0"
                          max="100"
                          step="0.1"
                          required
                        />
                        {errors.lines?.[idx]?.taxRate && (
                          <div className="text-red-500 text-xs mt-1 transition-opacity duration-200">{errors.lines[idx]?.taxRate}</div>
                        )}
                      </div>

                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          disabled={disabled || isSubmitting || lines.length === 1}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}

            {/* Totals */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end space-y-2">
                <div className="w-64">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('invoice.form.subtotal')}:</span>
                    <span>{formatCurrency(computeTotals().subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('invoice.form.vat', { rate: 20 })}:</span>
                    <span>{formatCurrency(computeTotals().vat)}</span>
                  </div>
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <span>{t('invoice.form.total')}:</span>
                    <span>{formatCurrency(computeTotals().total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (disabled || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={disabled || isSubmitting}
            >
              {isSubmitting ? t('common.saving') : (invoice ? t('common.saveChanges') : t('common.createInvoice'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;
