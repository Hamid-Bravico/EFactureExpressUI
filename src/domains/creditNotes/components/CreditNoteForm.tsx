import React, { useState, useEffect } from 'react';
import { NewCreditNote, NewLine, CreditNote, PaymentMethod, getPaymentMethodLabel } from '../types/creditNote.types';
import { Customer } from '../../customers/types/customer.types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { secureApiClient } from '../../../config/api';
import { Catalog } from '../../catalog/types/catalog.types';
import { Invoice } from '../../invoices/types/invoice.types';
import { CreditNoteLine } from '../types/creditNote.types';
import { INVOICE_ENDPOINTS } from '../../invoices/api/invoice.endpoints';
import { Combobox } from '@headlessui/react';

interface CreditNoteFormProps {
  onSubmit: (creditNote: NewCreditNote, customerName?: string) => Promise<void>;
  onClose: () => void;
  creditNote?: CreditNote;
  disabled?: boolean;
}

interface FormErrors {
  date?: string;
  customerId?: string;
  lines?: { [key: number]: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } };
  originalInvoiceId?: string;
}

interface BackendErrorResponse {
  [key: string]: string[];
}

const CreditNoteForm: React.FC<CreditNoteFormProps> = ({ onSubmit, onClose, creditNote, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(creditNote?.date || new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(creditNote?.customer?.id || null);
  const [lines, setLines] = useState<NewLine[]>(
    creditNote?.lines
      ? creditNote.lines.map((line: CreditNoteLine) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          CatalogItemId: (line as any).catalogItemId || null,
        }))
      : [{ description: '', quantity: 1, unitPrice: 0, taxRate: 20 }]
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<BackendErrorResponse>({});
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<Catalog[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSelected, setCatalogSelected] = useState<{ [id: number]: boolean }>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [originalInvoice, setOriginalInvoice] = useState<Invoice | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceDropdownOpen, setInvoiceDropdownOpen] = useState(false);
  const [isVatExempt, setIsVatExempt] = useState(false);
  const [vatExemptionReason, setVatExemptionReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BankTransfer);
  const [paymentReference, setPaymentReference] = useState('');
  
  const [query, setQuery] = useState('')

  const filteredInvoices =
    query === ''
      ? invoices
      : invoices.filter((invoice) => {
          return invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase())
        })

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
    if (creditNote) {
      const formattedDate = new Date(creditNote.date).toISOString().split('T')[0];
      setDate(formattedDate);
      setCustomerId(creditNote.customer?.id || null);
      setIsVatExempt(creditNote.isVatExempt || false);
      setVatExemptionReason(creditNote.vatExemptionReason || '');
      setPaymentMethod(creditNote.paymentMethod || PaymentMethod.BankTransfer);
      setPaymentReference(creditNote.paymentReference || '');

      setLines(creditNote.lines.map((line: CreditNoteLine) => ({
        description: line.description.trim(),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        CatalogItemId: (line as any).catalogItemId || null,
      })));
    }
  }, [creditNote]);

  // Update originalInvoice when editing
  useEffect(() => {
    if (creditNote && invoices.length > 0) {
      const inv = invoices.find(i => i.id === creditNote.originalInvoiceId);
      if (inv) {
        setOriginalInvoice(inv);
        setIsVatExempt(inv.isVatExempt || false);
        setVatExemptionReason(inv.vatExemptionReason || '');
      }
    }
  }, [creditNote, invoices]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.invoice-dropdown-container')) {
        setInvoiceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search text when original invoice is set
  useEffect(() => {
    if (originalInvoice && invoices.length > 0) {
      const selectedInvoice = invoices.find(inv => inv.id === originalInvoice.id);
      if (selectedInvoice) {
        setInvoiceSearch(`${selectedInvoice.invoiceNumber} - ${new Date(selectedInvoice.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} - ${formatCurrency(selectedInvoice.total)}`);
      }
    }
  }, [originalInvoice, invoices, i18n.language]);

  // Fetch invoices for selected customer
  useEffect(() => {
    if (customerId) {
      setInvoicesLoading(true);
      setInvoicesError(null);
      // Clear the selected invoice when customer changes
      setOriginalInvoice(null);
      secureApiClient.get(INVOICE_ENDPOINTS.BY_CUSTOMER(customerId))
        .then(async res => {
          const responseData = await res.json().catch(() => ({ succeeded: false, message: t('errors.anErrorOccurred') }));
          if (responseData?.succeeded && responseData.data?.items && Array.isArray(responseData.data.items)) {
            setInvoices(responseData.data.items);
          } else {
            throw new Error(responseData?.message || t('errors.failedToLoadInvoices'));
          }
        })
        .catch((error) => {
          setInvoices([]);
          setInvoicesError(error.message || t('errors.failedToLoadInvoices'));
        })
        .finally(() => setInvoicesLoading(false));
    } else {
      setInvoices([]);
      setInvoicesLoading(false);
      setInvoicesError(null);
      setOriginalInvoice(null);
    }
  }, [customerId, t]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!date) newErrors.date = t('creditNote.form.errors.dateRequired');
    if (!customerId) newErrors.customerId = t('creditNote.form.errors.customerNameRequired');
    if (!originalInvoice) newErrors.originalInvoiceId = t('creditNote.form.errors.originalInvoiceRequired');
    
    const lineErrors: { [key: number]: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } } = {};
    let hasValidLine = false;
    lines.forEach((line, index) => {
      const lineError: { description?: string; quantity?: string; unitPrice?: string; taxRate?: string } = {};
      if (!line.description || !line.description.trim()) lineError.description = t('creditNote.form.errors.descriptionRequired');
      if (typeof line.quantity !== 'number' || isNaN(line.quantity) || String(line.quantity).trim() === '' || line.quantity <= 0) lineError.quantity = t('creditNote.form.errors.quantityPositive');
      if (typeof line.unitPrice !== 'number' || isNaN(line.unitPrice) || String(line.unitPrice).trim() === '' || line.unitPrice <= 0) lineError.unitPrice = t('creditNote.form.errors.unitPricePositive');
      if (typeof line.taxRate !== 'number' || isNaN(line.taxRate) || String(line.taxRate).trim() === '' || line.taxRate < 0 || line.taxRate > 100) lineError.taxRate = t('creditNote.form.errors.vatRateRange');
      if (Object.keys(lineError).length > 0) lineErrors[index] = lineError; else hasValidLine = true;
    });
    if (!hasValidLine) newErrors.lines = { 0: { description: t('creditNote.form.errors.oneLineRequired') } };
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
        const thisLineErrors = { ...(prevLines[index] || {}) } as any;
        delete thisLineErrors[field as any];

        // If no more errors on this line, remove the index key entirely
        const nextLines = { ...prevLines } as any;
        if (Object.keys(thisLineErrors).length === 0) {
          delete nextLines[index];
        } else {
          nextLines[index] = thisLineErrors;
        }

        return { ...prev, lines: nextLines } as any;
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
      toast.error(t('creditNote.form.errors.cannotRemoveLastLine'));
      return;
    }
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
              description: item.Name,
              quantity: 1,
              unitPrice: item.UnitPrice,
              taxRate: item.DefaultTaxRate,
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
      (sum, ln) => sum + ln.quantity * ln.unitPrice * (ln.taxRate) / 100,
      0
    );
    return { subTotal: +sub.toFixed(2), vat: +vat.toFixed(2), total: +(sub + vat).toFixed(2) };
  };

  const getCreditNoteErrorMessage = (field: string): string | undefined => {
    const fieldMap: { [key: string]: string } = {
      'date': 'Date',
      'customerId': 'CustomerId',
      'originalInvoiceId': 'OriginalInvoiceId'
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

  const clearCreditNoteError = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      'date': 'Date',
      'customerId': 'CustomerId',
      'originalInvoiceId': 'OriginalInvoiceId'
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

    setIsSubmitting(true);
    setBackendErrors({});

    try {
      const selectedCustomer = customers.find(c => c.id === customerId);
      const newCreditNote: NewCreditNote = {
        ...(creditNote?.id && { id: creditNote.id }),
        date,
        customerId: customerId!,
        lines: lines.map(ln => ({
          CatalogItemId: (ln as any).CatalogItemId || null,
          description: ln.description.trim(),
          quantity: ln.quantity,
          unitPrice: ln.unitPrice,
          taxRate: ln.taxRate,
        })),
        OriginalInvoiceId: originalInvoice?.id!,
        isVatExempt: originalInvoice?.isVatExempt || false,
        vatExemptionReason: originalInvoice?.vatExemptionReason || '',
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
      };

      await onSubmit(newCreditNote, selectedCustomer?.legalName);
      onClose();
    } catch (error: any) {
      if (error.errors) {
        setBackendErrors(error.errors as BackendErrorResponse);
        // Don't show toast here as it will be handled by the parent component
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
              {creditNote ? t('creditNote.form.editTitle') : t('creditNote.form.createTitle')}
            </h2>
            {creditNote && (
              <p className="text-sm text-gray-600 mt-1">
                {t('creditNote.form.creditNoteNumber')}: <span className="font-medium">{creditNote.creditNoteNumber}</span>
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
              <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) {
                    setErrors(prev => ({ ...prev, date: undefined }));
                  }
                  clearCreditNoteError('date');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date || getCreditNoteErrorMessage('date') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
                required
              />
              {(errors.date || getCreditNoteErrorMessage('date')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.date || getCreditNoteErrorMessage('date')}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.customerName')}</label>
              <select
                value={customerId ?? ''}
                onChange={e => { setCustomerId(Number(e.target.value)); if (errors.customerId) setErrors(prev => ({ ...prev, customerId: undefined })); clearCreditNoteError('customerId'); }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.customerId || getCreditNoteErrorMessage('customerId') ? 'border-red-500' : 'border-gray-300'}`}
                disabled={disabled || isSubmitting}
                required
              >
                <option value="">{t('creditNote.form.selectCustomer')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.legalName}</option>
                ))}
              </select>
              {(errors.customerId || getCreditNoteErrorMessage('customerId')) && (
                <div className="text-red-500 text-xs mt-1">{errors.customerId || getCreditNoteErrorMessage('customerId')}</div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.originalInvoice')}</label>
              <Combobox value={originalInvoice} onChange={setOriginalInvoice} disabled={disabled || isSubmitting || !customerId || invoicesLoading}>
                <div className="relative">
                  <Combobox.Input
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.originalInvoiceId ? 'border-red-500' : 'border-gray-300'}`}
                    displayValue={(inv: Invoice) =>
                      inv ? `${inv.invoiceNumber} - ${new Date(inv.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} - ${formatCurrency(inv.total)}` : ''
                    }
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={invoicesLoading ? t('common.loading') : t('creditNote.form.selectOriginalInvoice')}
                    required
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Combobox.Button>
                  <Combobox.Options className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {invoicesLoading ? (
                      <div className="px-4 py-2 text-sm text-gray-500">{t('common.loading')}</div>
                    ) : invoices.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">{t('creditNote.form.noInvoicesFound')}</div>
                    ) : (
                      filteredInvoices.map(inv => (
                        <Combobox.Option
                          key={inv.id}
                          value={inv}
                          className={({ active }) =>
                            `w-full px-4 py-2 text-left cursor-pointer ${active ? 'bg-blue-100' : ''}`
                          }
                        >
                          <div className="font-medium">{inv.invoiceNumber}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(inv.date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} - {formatCurrency(inv.total)}
                          </div>
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
              {errors.originalInvoiceId && (
                <div className="text-red-500 text-xs mt-1">{errors.originalInvoiceId}</div>
              )}
              {invoicesError && (
                <div className="text-red-500 text-xs mt-1">{invoicesError}</div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">
                {t('creditNote.form.vatExempt')}
                <span className="text-xs text-gray-500 ml-2">({t('creditNote.form.inherited')})</span>
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className={`text-sm font-medium ${
                  originalInvoice?.isVatExempt ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {originalInvoice?.isVatExempt ? t('common.yes') : t('common.no')}
                </span>
                {originalInvoice?.isVatExempt && originalInvoice?.vatExemptionReason && (
                  <span className="text-xs text-gray-500 ml-2">
                    - {originalInvoice.vatExemptionReason}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Payment Information Section */}
          <div className="mt-4">
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h3 className="text-lg font-medium text-blue-800">{t('creditNote.form.paymentInfo')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    {t('creditNote.form.paymentMethod')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(Number(e.target.value) as PaymentMethod)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    disabled={disabled || isSubmitting}
                    required
                  >
                    {Object.values(PaymentMethod).filter(value => typeof value === 'number').map((method) => (
                      <option key={method} value={method}>
                        {getPaymentMethodLabel(method as PaymentMethod, t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    {t('creditNote.form.paymentReference')}
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={t('creditNote.form.paymentReferencePlaceholder')}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    disabled={disabled || isSubmitting}
                    maxLength={100}
                  />
                  <p className="text-xs text-blue-600 mt-1">{t('creditNote.form.paymentReferenceHint')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">{t('creditNote.form.linesTitle')}</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={addLine}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                  disabled={disabled || isSubmitting}
                >
                  {t('creditNote.form.addLine')}
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
                  {t('creditNote.form.addFromCatalog')}
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
                    <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.description')}</label>
                    <input
                      type="text"
                      value={ln.description}
                      onChange={e => { updateLine(idx, 'description', e.target.value); clearLineError(descKey); }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        errors.lines?.[idx]?.description || descError
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      disabled={disabled || isSubmitting || isCatalog}
                      required
                    />
                    {(errors.lines?.[idx]?.description || descError) && (
                      <div className="text-red-500 text-xs mt-1">{errors.lines?.[idx]?.description || descError}</div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.quantity')}</label>
                    <input
                      type="number"
                      value={ln.quantity}
                      onChange={e => { updateLine(idx, 'quantity', e.target.value); clearLineError(qtyKey); }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        errors.lines?.[idx]?.quantity || qtyError
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      disabled={disabled || isSubmitting}
                      min="0.01"
                      step="0.01"
                      required
                    />
                    {(errors.lines?.[idx]?.quantity || qtyError) && (
                      <div className="text-red-500 text-xs mt-1">{errors.lines?.[idx]?.quantity || qtyError}</div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.unitPrice')}</label>
                    <input
                      type="number"
                      value={ln.unitPrice}
                      onChange={e => { updateLine(idx, 'unitPrice', e.target.value); clearLineError(priceKey); }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                        errors.lines?.[idx]?.unitPrice || priceError
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                      disabled={disabled || isSubmitting}
                      step="0.01"
                      min="0.01"
                      required
                    />
                    {(errors.lines?.[idx]?.unitPrice || priceError) && (
                      <div className="text-red-500 text-xs mt-1">{errors.lines?.[idx]?.unitPrice || priceError}</div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">{t('creditNote.form.taxRate')}</label>
                        <select
                          value={ln.taxRate}
                          onChange={e => { updateLine(idx, 'taxRate', e.target.value); clearLineError(taxKey); }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                            errors.lines?.[idx]?.taxRate || taxError
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                          disabled={disabled || isSubmitting}
                          required
                        >
                          <option value={20}>20%</option>
                          <option value={14}>14%</option>
                          <option value={10}>10%</option>
                          <option value={7}>7%</option>
                          <option value={0}>0%</option>
                        </select>
                        {(errors.lines?.[idx]?.taxRate || taxError) && (
                          <div className="text-red-500 text-xs mt-1">{errors.lines?.[idx]?.taxRate || taxError}</div>
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
                    <span>{t('creditNote.form.subtotal')}:</span>
                    <span>{formatCurrency(computeTotals().subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{t('creditNote.form.vat')}:</span>
                    <span>{formatCurrency(computeTotals().vat)}</span>
                  </div>
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <span>{t('creditNote.form.total')}:</span>
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
              {isSubmitting ? t('common.saving') : (creditNote ? t('common.saveChanges') : t('creditNote.create'))}
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
            <h2 className="text-lg font-bold mb-4">{t('creditNote.form.catalogModal.title')}</h2>
            <input
              type="text"
              placeholder={t('creditNote.form.catalogModal.search')}
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              className="mb-4 px-3 py-2 border rounded w-full"
            />
            {catalogLoading ? (
              <div className="flex-1 flex items-center justify-center">{t('creditNote.form.catalogModal.loading')}</div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-4 border rounded p-2">
                {(() => {
                  const filtered = catalogItems.filter(item =>
                    (item.Name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    (item.Description || '').toLowerCase().includes(catalogSearch.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return <div className="text-center text-gray-500 py-8">{t('creditNote.form.catalogModal.noItems')}</div>;
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
              >{t('creditNote.form.catalogModal.cancel')}</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={addCatalogLines}
                type="button"
                disabled={!Object.values(catalogSelected).some(Boolean)}
              >{t('creditNote.form.catalogModal.add')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNoteForm;
