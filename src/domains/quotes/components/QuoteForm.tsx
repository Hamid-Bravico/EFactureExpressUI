import React, { useState, useEffect } from 'react';
import { NewQuote, NewLine, Quote } from '../types/quote.types';
import { Customer } from '../../../types/common';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { secureApiClient } from '../../../config/api';
import { 
  QUOTE_STATUS
} from '../utils/quote.permissions';
import { Catalog } from '../../catalog/types/catalog.types';

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
      : [{ description: '', quantity: 1, unitPrice: 0.01, taxRate: 20 }]
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<BackendErrorResponse>({});
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<Catalog[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSelected, setCatalogSelected] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    secureApiClient.get(`${process.env.REACT_APP_API_URL || '/api'}/customers`)
    .then(async res => {
      const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
      if (!res.ok || !responseData?.succeeded) {
        throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('errors.failedToFetchCustomers'));
      }
      return responseData.data || [];
    })
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
      const processedLines = quote.lines.map(line => ({
        description: line.description.trim(),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        CatalogItemId: (line as any).catalogItemId || null,
      }));
      setLines(processedLines);
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
    let hasNonEmptyDescription = false;
    
    lines.forEach((line, index) => {
      const lineError: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } = {};
      
      // Description validation - required and not empty
      if (!line.description || !line.description.trim()) {
        lineError.description = t('quote.form.errors.descriptionRequired');
      } else {
        hasNonEmptyDescription = true;
      }
      
      // Quantity validation - must be a positive number
      if (typeof line.quantity !== 'number' || isNaN(line.quantity) || line.quantity <= 0) {
        lineError.quantity = t('quote.form.errors.quantityPositive');
      }
      
      // Unit price validation - must be a positive number greater than 0
      if (typeof line.unitPrice !== 'number' || isNaN(line.unitPrice) || line.unitPrice <= 0) {
        lineError.unitPrice = t('quote.form.errors.unitPricePositive');
      }
      
      // Tax rate validation - must be a number between 0 and 100
      if (typeof line.taxRate !== 'number' || isNaN(line.taxRate) || line.taxRate < 0 || line.taxRate > 100) {
        lineError.taxRate = t('quote.form.errors.vatRateRange');
      }
      
      if (Object.keys(lineError).length > 0) {
        lineErrors[index] = lineError;
      } else {
        hasValidLine = true;
      }
    });
    
    // Ensure at least one line has a non-empty description
    if (!hasNonEmptyDescription) {
      newErrors.lines = { 0: { description: t('quote.form.errors.descriptionRequired') } };
    } else if (!hasValidLine) {
      newErrors.lines = { 0: { description: t('quote.form.errors.oneLineRequired') } };
    } else if (Object.keys(lineErrors).length > 0) {
      newErrors.lines = lineErrors;
    }
    
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
  
    // Clear field-specific errors when user starts typing
    if (errors.lines?.[index]) {
      setErrors(prev => {
        const prevLines = prev.lines || {};
        const thisLineErrors = prevLines[index] || {};
        const updatedLineErrors = { ...thisLineErrors, [field]: undefined };
        
        // Only keep the line if it still has other errors
        if (Object.values(updatedLineErrors).some(error => error !== undefined)) {
          const updatedLinesMap = { ...prevLines, [index]: updatedLineErrors };
          return { ...prev, lines: updatedLinesMap };
        } else {
          // Remove the entire line if no errors remain
          const { [index]: removed, ...remainingLines } = prevLines;
          return { ...prev, lines: remainingLines };
        }
      });
    }
    
    // Clear backend errors for this field
    const fieldMap: { [key: string]: string } = {
      'description': `Lines[${index}].Description`,
      'quantity': `Lines[${index}].Quantity`,
      'unitPrice': `Lines[${index}].UnitPrice`,
      'taxRate': `Lines[${index}].TaxRate`
    };
    
    const backendKey = fieldMap[field];
    if (backendKey) {
      clearLineError(backendKey);
    }
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0.01, taxRate: 20 },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error(t('quote.form.errors.cannotRemoveLastLine'));
      return;
    }
    
    // Clear errors for the line being removed
    if (errors.lines?.[index]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.lines) {
          const { [index]: removed, ...remainingLines } = newErrors.lines;
          newErrors.lines = remainingLines;
        }
        return newErrors;
      });
    }
    
    // Clear backend errors for the removed line
    const lineKeys = [
      `Lines[${index}].Description`,
      `Lines[${index}].Quantity`,
      `Lines[${index}].UnitPrice`,
      `Lines[${index}].TaxRate`
    ];
    
    lineKeys.forEach(key => clearLineError(key));
    
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const openCatalogModal = () => {
    setCatalogModalOpen(true);
    setCatalogLoading(true);
    secureApiClient.get(`${process.env.REACT_APP_API_URL || '/api'}/catalog?size=1000&page=1`)
      .then(async res => {
        const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
        if (!res.ok || !responseData?.succeeded) {
          throw new Error(responseData?.errors?.join(', ') || responseData?.message || t('catalog.messages.fetchFailed'));
        }
        return responseData.data;
      })
      .then((data: any) => {
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (Array.isArray(data?.data)) {
          items = data.data;
        } else if (Array.isArray(data?.items)) {
          items = data.items;
        }
        setCatalogItems(
          items.map(item => ({
            id: item.id,
            CodeArticle: item.codeArticle,
            Name: item.name,
            Description: item.description,
            UnitPrice: item.unitPrice,
            DefaultTaxRate: item.defaultTaxRate,
            Type: item.type,
          }))
        );
        setCatalogLoading(false);
      })
      .catch(() => {
        setCatalogItems([]);
        setCatalogLoading(false);
      });
    setCatalogSearch('');
    setCatalogSelected({});
  };

  const closeCatalogModal = () => {
    setCatalogModalOpen(false);
  };

  const addCatalogLines = () => {
    const selectedIds = Object.keys(catalogSelected).filter(id => catalogSelected[Number(id)]);
    if (!selectedIds.length) return;
    setLines(prev => [
      ...prev,
      ...selectedIds.map(id => {
        const item = catalogItems.find(c => c.id === Number(id));
        return item
          ? {
              description: item.Name || '',
              quantity: 1,
              unitPrice: item.UnitPrice && item.UnitPrice > 0 ? item.UnitPrice : 0.01,
              taxRate: item.DefaultTaxRate && item.DefaultTaxRate >= 0 && item.DefaultTaxRate <= 100 ? item.DefaultTaxRate : 20,
              CatalogItemId: item.id,
            }
          : null;
      }).filter(Boolean) as any,
    ]);
    setCatalogModalOpen(false);
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
      // Don't show generic toast - field-level errors are already displayed
      return;
    }

    // Additional validation: ensure all lines have valid data
    const validLines = lines.filter(line => 
      line.description && 
      line.description.trim() && 
      line.quantity > 0 && 
      line.unitPrice > 0 && 
      line.taxRate >= 0 && 
      line.taxRate <= 100
    );

    if (validLines.length === 0) {
      setErrors(prev => ({
        ...prev,
        lines: { 0: { description: t('quote.form.errors.oneLineRequired') } }
      }));
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
        lines: validLines.map(ln => ({
          CatalogItemId: (ln as any).CatalogItemId || null,
          description: ln.description.trim(),
          quantity: ln.quantity,
          unitPrice: ln.unitPrice,
          taxRate: ln.taxRate,
        })),
        termsAndConditions: termsAndConditions.trim(),
        privateNotes: privateNotes.trim(),
      };

      await onSubmit(newQuote, selectedCustomer?.name);
      onClose();
    } catch (error: any) {
      if (error.errors) {
        setBackendErrors(error.errors as BackendErrorResponse);
      }
      // Don't show toasts here as they will be handled by the parent component
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={addLine}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                  disabled={disabled || isSubmitting}
                >
                  {t('quote.form.addLine')}
                </button>
                <button
                  type="button"
                  onClick={openCatalogModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm flex items-center gap-2"
                  disabled={disabled || isSubmitting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t('quote.form.addFromCatalog')}
                </button>
              </div>
            </div>

            {lines.map((ln, idx) => {
              const isCatalog = (ln as any).CatalogItemId;
              const descKey = `Lines[${idx}].Description`;
              const qtyKey = `Lines[${idx}].Quantity`;
              const priceKey = `Lines[${idx}].UnitPrice`;
              const taxKey = `Lines[${idx}].TaxRate`;

              const descError = getLineErrorMessage(descKey);
              const qtyError = getLineErrorMessage(qtyKey);
              const priceError = getLineErrorMessage(priceKey);
              const taxError = getLineErrorMessage(taxKey);

              return (
                <div key={idx} className="grid grid-cols-12 gap-4 mb-4 items-end">
                  <div className="col-span-5">
                    <label className="block text-sm text-gray-600 mb-1">{t('quote.form.description')}</label>
                    <input
                      type="text"
                      value={ln.description}
                      onChange={e => { updateLine(idx, 'description', e.target.value); clearLineError(descKey); }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.description || descError ? 'border-red-500' : 'border-gray-300'}`}
                      disabled={disabled || isSubmitting || isCatalog}
                      required
                    />
                    {descError && (
                      <div className="text-red-500 text-xs mt-1">{descError}</div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">{t('quote.form.quantity')}</label>
                    <input
                      type="number"
                      value={ln.quantity}
                      onChange={e => { updateLine(idx, 'quantity', e.target.value); clearLineError(qtyKey); }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.quantity || qtyError ? 'border-red-500' : 'border-gray-300'}`}
                      disabled={disabled || isSubmitting}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    {qtyError && (
                      <div className="text-red-500 text-xs mt-1">{qtyError}</div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">{t('quote.form.unitPrice')}</label>
                    <input
                      type="number"
                      value={ln.unitPrice}
                      onChange={e => { updateLine(idx, 'unitPrice', e.target.value); clearLineError(priceKey); }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.unitPrice || priceError ? 'border-red-500' : 'border-gray-300'}`}
                      disabled={disabled || isSubmitting}
                      step="0.01"
                      min="0.01"
                      required
                    />
                    {priceError && (
                      <div className="text-red-500 text-xs mt-1">{priceError}</div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">{t('quote.form.taxRate')}</label>
                        <select
                          value={ln.taxRate ?? 20}
                          onChange={e => { updateLine(idx, 'taxRate', e.target.value); clearLineError(taxKey); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${errors.lines?.[idx]?.taxRate || taxError ? 'border-red-500' : 'border-gray-300'}`}
                          disabled={disabled || isSubmitting}
                          required
                        >
                          <option value={20}>20%</option>
                          <option value={14}>14%</option>
                          <option value={10}>10%</option>
                          <option value={7}>7%</option>
                          <option value={0}>0%</option>
                        </select>
                        {taxError && (
                          <div className="text-red-500 text-xs mt-1">{taxError}</div>
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
                </div>
              );
            })}

            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex justify-end space-y-2">
                <div className="w-64">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('quote.form.subtotal')}:</span>
                    <span>{formatCurrency(computeTotals().subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('quote.form.vat')}:</span>
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
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[80vh] flex flex-col">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={closeCatalogModal}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4">{t('quote.form.catalogModal.title')}</h2>
            <input
              type="text"
              placeholder={t('quote.form.catalogModal.search')}
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              className="mb-4 px-3 py-2 border rounded w-full"
            />
            {catalogLoading ? (
              <div className="flex-1 flex items-center justify-center">{t('quote.form.catalogModal.loading')}</div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-4 border rounded p-2">
                {(() => {
                  const filtered = catalogItems.filter(item =>
                    (item.Name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    (item.Description || '').toLowerCase().includes(catalogSearch.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return <div className="text-center text-gray-500 py-8">{t('quote.form.catalogModal.noItems')}</div>;
                  }
                  return filtered.map(item => (
                    <label key={item.id} className="flex items-center gap-3 py-2 border-b last:border-b-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!catalogSelected[item.id]}
                        onChange={e => setCatalogSelected(sel => ({ ...sel, [item.id]: e.target.checked }))}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.Name}</div>
                        {item.CodeArticle && (
                          <div className="text-xs text-gray-400 truncate">{item.CodeArticle}</div>
                        )}
                        {item.Description && (
                          <div className="text-xs text-gray-500 truncate">{item.Description}</div>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        {typeof item.UnitPrice === 'number' && !isNaN(item.UnitPrice)
                          ? formatCurrency(item.UnitPrice)
                          : '-'}
                      </div>
                    </label>
                  ));
                })()}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={closeCatalogModal}
                type="button"
              >{t('quote.form.catalogModal.cancel')}</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={addCatalogLines}
                type="button"
                disabled={!Object.values(catalogSelected).some(Boolean)}
              >{t('quote.form.catalogModal.add')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteForm; 