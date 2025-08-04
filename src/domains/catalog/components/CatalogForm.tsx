import React, { useState, useEffect } from 'react';
import { NewCatalog, Catalog } from '../types/catalog.types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { 
  CATALOG_TYPE
} from '../utils/catalog.permissions';

interface CatalogFormProps {
  onSubmit: (catalog: NewCatalog, customerName?: string) => Promise<void>;
  onClose: () => void;
  catalog?: Catalog;
  disabled?: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  quantity?: string;
  unitPrice?: string; 
  defaultTaxRate?: string;
  CodeArticle?: string;
  type?: string;
}

interface BackendErrorResponse {
  [key: string]: string[];
}

const CatalogForm: React.FC<CatalogFormProps> = ({ onSubmit, onClose, catalog, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [CodeArticle, setCodeArticle] = useState(catalog?.CodeArticle || "");
  const [name, setName] = useState(catalog?.Name || "");
  const [description, setDescription] = useState(catalog?.Description || "");
  const [unitPrice, setUnitPrice] = useState(catalog?.UnitPrice || 0);
  const [defaultTaxRate, setTaxRate] = useState(catalog?.DefaultTaxRate || 0);
  const [type, setType] = useState(catalog?.Type ?? CATALOG_TYPE.PRODUCT);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<BackendErrorResponse>({});

  useEffect(() => {
    if (catalog) {
      setCodeArticle(catalog.CodeArticle || "");
      setType(catalog.Type);
      setName(catalog.Name || "");
      setDescription(catalog.Description || "");
      setUnitPrice(catalog.UnitPrice || 0);
      setTaxRate(catalog.DefaultTaxRate || 0);
    }
  }, [catalog]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Trim values and check for empty strings
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    
    if (!trimmedName) {
      newErrors.name = t('catalog.form.errors.nameRequired');
    }
    
    if (trimmedDescription && trimmedDescription.length < 3) {
      newErrors.description = t('catalog.form.errors.descriptionTooShort');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCatalogErrorMessage = (field: string): string | undefined => {
    const fieldMap: { [key: string]: string } = {
      'name': 'Name',
      'unitPrice': 'UnitPrice',
      'CodeArticle': 'CodeArticle'
    };
    
    const backendKey = fieldMap[field];
    if (backendKey && backendErrors[backendKey]) {
      return backendErrors[backendKey][0];
    }
    return undefined;
  };

  const clearCatalogError = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      'name': 'Name',
      'unitPrice': 'UnitPrice',
      'CodeArticle': 'CodeArticle'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isSubmitting) return;

    if (!validateForm()) {
      toast.error(t('catalog.form.errors.fixErrors'));
      return;
    }

    setIsSubmitting(true);
    setBackendErrors({});

    try {

      const newCatalog: NewCatalog = {
        ...(catalog?.id && { id: catalog.id }),
        Name: name.trim(),
        CodeArticle: CodeArticle.trim(),
        Description: description.trim(),
        UnitPrice: unitPrice,
        DefaultTaxRate: defaultTaxRate,
        Type: type
      };

      await onSubmit(newCatalog);
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
        toast.error(t('catalog.messages.saveFailed'));
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
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {catalog ? t('catalog.form.editTitle') : t('catalog.form.createTitle')}
            </h2>
            {catalog && (
              <p className="text-sm text-gray-600 mt-1">
                {t('catalog.form.CodeArticle')}: <span className="font-medium">{catalog.CodeArticle}</span>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('catalog.form.CodeArticle')}</label>
              <input
                type="text"
                value={CodeArticle}
                onChange={(e) => {
                  setCodeArticle(e.target.value);
                  if (errors.CodeArticle) {
                    setErrors(prev => ({ ...prev, CodeArticle: undefined }));
                  }
                  clearCatalogError('CodeArticle');
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.CodeArticle || getCatalogErrorMessage('CodeArticle') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
              />
              {(errors.CodeArticle || getCatalogErrorMessage('CodeArticle')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.CodeArticle || getCatalogErrorMessage('CodeArticle')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('catalog.form.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }
                  clearCatalogError('name');
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    setErrors(prev => ({ ...prev, name: t('catalog.form.errors.nameRequired') }));
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name || getCatalogErrorMessage('name') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
                required
              />
              {(errors.name || getCatalogErrorMessage('name')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.name || getCatalogErrorMessage('name')}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">{t('catalog.form.unitPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setUnitPrice(Math.max(0, value));
                    if (errors.unitPrice) {
                      setErrors(prev => ({ ...prev, unitPrice: undefined }));
                    }
                    clearCatalogError('unitPrice');
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.unitPrice || getCatalogErrorMessage('unitPrice') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={disabled || isSubmitting}
                  required
                />
                {(errors.unitPrice || getCatalogErrorMessage('unitPrice')) && (
                  <div className="text-red-500 text-xs mt-1">
                    {errors.unitPrice || getCatalogErrorMessage('unitPrice')}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">{t('catalog.form.defaultTaxRate')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={defaultTaxRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setTaxRate(Math.max(0, Math.min(100, value)));
                    if (errors.defaultTaxRate) {
                      setErrors(prev => ({ ...prev, defaultTaxRate: undefined }));
                    }
                    clearCatalogError('defaultTaxRate');
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.defaultTaxRate || getCatalogErrorMessage('defaultTaxRate') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={disabled || isSubmitting}
                />
                {(errors.defaultTaxRate || getCatalogErrorMessage('defaultTaxRate')) && (
                  <div className="text-red-500 text-xs mt-1">
                    {errors.defaultTaxRate || getCatalogErrorMessage('defaultTaxRate')}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('catalog.form.description')}</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }
                  clearCatalogError('description');
                }}
                onBlur={(e) => {
                  const trimmedValue = e.target.value.trim();
                  if (trimmedValue && trimmedValue.length < 3) {
                    setErrors(prev => ({ ...prev, description: t('catalog.form.errors.descriptionTooShort') }));
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description || getCatalogErrorMessage('description') ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={disabled || isSubmitting}
                rows={3}
              />
              {(errors.description || getCatalogErrorMessage('description')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.description || getCatalogErrorMessage('description')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('catalog.form.type')}</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setType(CATALOG_TYPE.PRODUCT);
                    if (errors.type) {
                      setErrors(prev => ({ ...prev, type: undefined }));
                    }
                    clearCatalogError('type');
                  }}
                  disabled={disabled || isSubmitting}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    type === CATALOG_TYPE.PRODUCT
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  } ${(disabled || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {t('catalog.form.typeProduct')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType(CATALOG_TYPE.SERVICE);
                    if (errors.type) {
                      setErrors(prev => ({ ...prev, type: undefined }));
                    }
                    clearCatalogError('type');
                  }}
                  disabled={disabled || isSubmitting}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    type === CATALOG_TYPE.SERVICE
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  } ${(disabled || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {t('catalog.form.typeService')}
                </button>
              </div>
              {(errors.type || getCatalogErrorMessage('type')) && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.type || getCatalogErrorMessage('type')}
                </div>
              )}
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
              {isSubmitting ? t('common.saving') : (catalog ? t('common.saveChanges') : t('catalog.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatalogForm; 