import React, { useState, useEffect } from 'react';
import { NewQuote, NewLine, Quote } from '../types/quote.types';
import { Customer } from '../../../types/common';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getSecureHeaders } from '../../../config/api';
import { 
  QUOTE_STATUS
} from '../utils/quote.permissions';
import { tokenManager } from '../../../utils/tokenManager';

interface QuoteFormProps {
  onSubmit: (quote: NewQuote, customerName?: string) => Promise<void>;
  onClose: () => void;
  quote?: Quote;
  disabled?: boolean;
}

interface FormErrors {
  issueDate?: string;
  expiryDate?: string;
  customerId?: string;
  lines?: { [key: number]: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } };
}

interface BackendErrorResponse {
  [key: string]: string[];
}

const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit, onClose, quote, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [issueDate, setIssueDate] = useState(quote?.issueDate || new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(quote?.expiryDate || "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(quote?.customer?.id || null);
  const [status, setStatus] = useState(quote ? quote.status : QUOTE_STATUS.DRAFT);
  const [termsAndConditions, setTermsAndConditions] = useState(quote?.termsAndConditions || "");
  const [privateNotes, setPrivateNotes] = useState(quote?.privateNotes || "");
  const [lines, setLines] = useState<NewLine[]>(
    quote?.lines
      ? quote.lines.map(line => ({
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

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || '/api'}/customers`, {
      headers: getSecureHeaders(tokenManager.getToken()),
    })
    .then(res => res.json())
    .then(setCustomers)
    .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (quote) {
      const formattedIssueDate = new Date(quote.issueDate).toISOString().split('T')[0];
      const formattedExpiryDate = quote.expiryDate ? new Date(quote.expiryDate).toISOString().split('T')[0] : "";
      setIssueDate(formattedIssueDate);
      setExpiryDate(formattedExpiryDate);
      setCustomerId(quote.customer?.id || null);
      setLines(quote.lines.map(line => ({
        description: line.description.trim(),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
      })));
      setStatus(quote.status);
      setTermsAndConditions(quote.termsAndConditions || "");
      setPrivateNotes(quote.privateNotes || "");
    }
  }, [quote]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!issueDate) newErrors.issueDate = t('quote.form.errors.dateRequired');
    if (!customerId) newErrors.customerId = t('quote.form.errors.customerNameRequired');
    
    // Validate expiry date is after issue date
    if (expiryDate && issueDate && new Date(expiryDate) <= new Date(issueDate)) {
      newErrors.expiryDate = t('quote.form.errors.expiryDateAfterIssueDate');
    }
    
    const lineErrors: { [key: number]: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } } = {};
    let hasValidLine = false;
    lines.forEach((line, index) => {
      const lineError: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } = {};
      if (!line.description || !line.description.trim()) lineError.description = t('quote.form.errors.descriptionRequired');
      if (typeof line.quantity !== 'number' || isNaN(line.quantity) || String(line.quantity).trim() === '' || line.quantity <= 0) lineError.quantity = t('quote.form.errors.quantityPositive');
      if (typeof line.unitPrice !== 'number' || isNaN(line.unitPrice) || String(line.unitPrice).trim() === '' || line.unitPrice < 0) lineError.unitPrice = t('quote.form.errors.unitPricePositive');
      if (typeof line.taxRate !== 'number' || isNaN(line.taxRate) || String(line.taxRate).trim() === '' || line.taxRate < 0 || line.taxRate > 100) lineError.taxRate = t('quote.form.errors.vatRateRange');
      if (Object.keys(lineError).length > 0) lineErrors[index] = lineError; else hasValidLine = true;
    });
    if (!hasValidLine) newErrors.lines = { 0: { description: t('quote.form.errors.oneLineRequired') } };
    else if (Object.keys(lineErrors).length > 0) newErrors.lines = lineErrors;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateLine = (index: number, field: keyof NewLine | 'taxRate', value: string) => {
    setLines(prev =>
      prev.map((ln, i) =>
        i === index
          ? { ...ln, [field]: field === "description" ? value.trim() : Number(value) }
          : ln
      )
    );
  
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
      toast.error(t('quote.form.errors.cannotRemoveLastLine'));
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

  const getQuoteErrorMessage = (field: string): string | undefined => {
    const fieldMap: { [key: string]: string } = {
      'quoteNumber': 'QuoteNumber',
      'issueDate': 'IssueDate',
      'expiryDate': 'ExpiryDate',
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

  const clearQuoteError = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      'quoteNumber': 'QuoteNumber',
      'issueDate': 'IssueDate',
      'expiryDate': 'ExpiryDate',
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
      toast.error(t('quote.form.errors.fixErrors'));
      return;
    }

    setIsSubmitting(true);
    setBackendErrors({});

    try {
      const { subTotal, vat, total } = computeTotals();

      const selectedCustomer = customers.find(c => c.id === customerId);
      const newQuote: NewQuote = {
        ...(quote?.id && { id: quote.id }),
        issueDate,
        ...(expiryDate && { expiryDate }),
        customerId: customerId!,
        subTotal,
        vat,
        total,
        status,
        lines: lines.map(ln => ({ 
          description: ln.description.trim(), 
          quantity: ln.quantity, 
          unitPrice: ln.unitPrice, 
          taxRate: ln.taxRate 
        })),
        termsAndConditions: termsAndConditions.trim(),
        privateNotes: privateNotes.trim(),
      };

      await onSubmit(newQuote, selectedCustomer?.name);
      onClose();
    } catch (error: any) {
      if (error.errors) {
        setBackendErrors(error.errors as BackendErrorResponse);
        // Don't show toast here as it will be handled by the parent component
      } else if (error.title) {
        toast.error(error.title);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(t('quote.messages.saveFailed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (i18n.language === 'fr') {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + ' MAD';
    } else {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {quote ? t('quote.form.editTitle') : t('quote.form.createTitle')}
            </h2>
            {quote && (
              <p className="text-sm text-gray-600 mt-1">
                {t('quote.form.quoteNumber')}: <span className="font-medium">{quote.quoteNumber}</span>
              </p>
            )}
          </div>
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
              <label className="block text-sm text-gray-600 mb-1">{t('quote.form.date')}</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  if (errors.issueDate) {
                    setErrors(prev => ({ ...prev, issueDate: undefined }));
                  }
                  clearQuoteError('issueDate');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.issueDate || getQuoteErrorMessage('issueDate') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
                required
              />
              {(errors.issueDate || getQuoteErrorMessage('issueDate')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.issueDate || getQuoteErrorMessage('issueDate')}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('quote.form.expiryDate')}</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  if (errors.expiryDate) {
                    setErrors(prev => ({ ...prev, expiryDate: undefined }));
                  }
                  clearQuoteError('expiryDate');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.expiryDate || getQuoteErrorMessage('expiryDate') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
              />
              {(errors.expiryDate || getQuoteErrorMessage('expiryDate')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.expiryDate || getQuoteErrorMessage('expiryDate')}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('quote.form.customerName')}</label>
              <select
                value={customerId ?? ''}
                onChange={e => { setCustomerId(Number(e.target.value)); if (errors.customerId) setErrors(prev => ({ ...prev, customerId: undefined })); clearQuoteError('customerId'); }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerId || getQuoteErrorMessage('customerId') ? 'border-red-500' : 'border-gray-300'}`}
                disabled={disabled || isSubmitting}
                required
              >
                <option value="">{t('quote.form.selectCustomer')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {(errors.customerId || getQuoteErrorMessage('customerId')) && (
                <div className="text-red-500 text-xs mt-1">{errors.customerId || getQuoteErrorMessage('customerId')}</div>
              )}
            </div>

          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">{t('quote.form.linesTitle')}</h3>
              <button
                type="button"
                onClick={addLine}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={disabled || isSubmitting}
              >
                {t('quote.form.addLine')}
              </button>
            </div>

            {lines.map((ln, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 mb-4 items-end">
                {(() => {
                                     const descKey = `Lines[${idx}].Description`;
                   const qtyKey = `Lines[${idx}].Quantity`;
                   const priceKey = `Lines[${idx}].UnitPrice`;
                   const taxKey = `Lines[${idx}].TaxRate`;

                   const descError = getLineErrorMessage(descKey);
                   const qtyError = getLineErrorMessage(qtyKey);
                   const priceError = getLineErrorMessage(priceKey);
                   const taxError = getLineErrorMessage(taxKey);

                  return (
                    <>
                      <div className="col-span-6">
                        <label className="block text-sm text-gray-600 mb-1">{t('quote.form.description')}</label>
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
                        <label className="block text-sm text-gray-600 mb-1">{t('quote.form.quantity')}</label>
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
                          min="0.01"
                          step="0.01"
                          required
                        />
                        {qtyError && (
                          <div className="text-red-500 text-xs mt-1 transition-opacity duration-200">{qtyError}</div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">{t('quote.form.unitPrice')}</label>
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
                         <div className="flex items-end gap-2">
                           <div className="flex-1">
                             <label className="block text-sm text-gray-600 mb-1">{t('quote.form.taxRate')}</label>
                             <input
                               type="number"
                               value={ln.taxRate ?? 20}
                               onChange={e => { 
                                 updateLine(idx, 'taxRate', e.target.value); 
                                 clearLineError(`Lines[${idx}].TaxRate`);
                               }}
                               className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.taxRate || taxError ? 'border-red-500' : 'border-gray-300'}`}
                               disabled={disabled || isSubmitting}
                               min="0"
                               max="100"
                               step="0.1"
                               required
                             />
                             {(errors.lines?.[idx]?.taxRate || taxError) && (
                               <div className="text-red-500 text-xs mt-1 transition-opacity duration-200">{errors.lines?.[idx]?.taxRate || taxError}</div>
                             )}
                           </div>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            disabled={disabled || isSubmitting || lines.length === 1}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}

            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end space-y-2">
                <div className="w-64">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('quote.form.subtotal')}:</span>
                    <span>{formatCurrency(computeTotals().subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('quote.form.vat', { rate: 20 })}:</span>
                    <span>{formatCurrency(computeTotals().vat)}</span>
                  </div>
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <span>{t('quote.form.total')}:</span>
                    <span>{formatCurrency(computeTotals().total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions and Private Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Terms & Conditions Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-4">{t('quote.form.termsAndConditions')}</h3>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-32"
                placeholder={t('quote.form.termsAndConditionsPlaceholder')}
                disabled={disabled || isSubmitting}
              />
            </div>

            {/* Private Notes Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-4">{t('quote.form.privateNotes')}</h3>
              <textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-32"
                placeholder={t('quote.form.privateNotesPlaceholder')}
                disabled={disabled || isSubmitting}
              />
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
              {isSubmitting ? t('common.saving') : (quote ? t('common.saveChanges') : t('quote.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteForm; 