import React, { useState } from 'react';
import { Company } from '../types/common';
import { useTranslation } from 'react-i18next';
import { COMPANY_ENDPOINTS } from '../domains/auth/api/company.endpoints';
import { secureApiClient } from '../config/api';
import { toast } from 'react-hot-toast';
import { ApiResponse } from '../domains/auth/types/auth.types';
import { decodeJWT } from '../utils/jwt';

interface CompanyProfileProps {
  company: Company | null;
  token?: string | null;
  onUpdate?: (updatedCompany: Partial<Company>) => void;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ company, token, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    name: '',
    identifiantFiscal: '',
    address: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const decodedToken = token ? decodeJWT(token) : null;
  const userRole = decodedToken?.role;
  const canEdit = userRole === 'Admin';

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center bg-white rounded-lg shadow-md">
        <p className="text-lg text-gray-500">{t('errors.noCompanyData')}</p>
      </div>
    );
  }

  const handleCopy = () => {
    const iceValue = company?.ICE || company?.ice;
    if (iceValue) {
      navigator.clipboard.writeText(iceValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = (field: string) => {
    setEditingField(field);
    setEditValues({
      name: company.name || '',
      identifiantFiscal: company.identifiantFiscal || company.identifiantfiscal || '',
      address: company.address || ''
    });
  };

  const validateField = (field: string, value: string): boolean => {
    const trimmedValue = value.trim();
    
    if (field === 'name') {
      if (!trimmedValue) {
        toast.error(t('errors.companyNameRequired'));
        return false;
      }
      if (trimmedValue.length > 120) {
        toast.error(t('errors.companyNameTooLong'));
        return false;
      }
    } else if (field === 'identifiantFiscal') {
      if (trimmedValue && trimmedValue.length > 8) {
        toast.error(t('errors.identifiantFiscalTooLong'));
        return false;
      }
    } else if (field === 'address') {
      if (trimmedValue && trimmedValue.length > 255) {
        toast.error(t('errors.addressTooLong'));
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async (field: string) => {
    const trimmedValue = editValues[field as keyof typeof editValues].trim();
    
    if (!validateField(field, trimmedValue)) {
      return;
    }

    setIsUpdating(true);
    
    try {
      const updateData: any = {};
      
      if (field === 'name') {
        updateData.name = trimmedValue;
      } else if (field === 'identifiantFiscal') {
        updateData.identifiantFiscal = trimmedValue || null;
      } else if (field === 'address') {
        updateData.address = trimmedValue || null;
      }

      const response = await secureApiClient.put(COMPANY_ENDPOINTS.UPDATE, updateData, true, true);
      
      const responseData: ApiResponse<Company> = await response.json().catch(() => ({ 
        succeeded: false, 
        message: t('errors.anErrorOccurred') 
      }));

      console.log(responseData);

      if (!response.ok || !responseData?.succeeded) {
        const errorMessage = responseData?.errors?.join(', ') || responseData?.message || t('errors.updateCompanyFailed');
        throw new Error(errorMessage);
      }
      
      if (onUpdate) {
        const updatePayload: Partial<Company> = {};
        
        if (field === 'name') {
          updatePayload.name = trimmedValue;
        } else if (field === 'identifiantFiscal') {
          updatePayload.identifiantFiscal = trimmedValue || undefined;
        } else if (field === 'address') {
          updatePayload.address = trimmedValue || undefined;
        }
        
        if (responseData.data) {
          Object.assign(updatePayload, responseData.data);
        }
        
        onUpdate(updatePayload);
      }
      
      toast.success(responseData.message || t('common.updateSuccess'));
      setEditingField(null);
    } catch (error: any) {
      toast.error(error.message || t('errors.updateCompanyFailed'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderEditableField = (field: string, currentValue: string, label: string) => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={editValues[field as keyof typeof editValues]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            onClick={() => handleSave(field)}
            disabled={isUpdating}
            className={`px-3 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={t('common.save')}
          >
            {isUpdating ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className={`px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={t('common.cancel')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">
          {currentValue || <span className="text-gray-500 italic">{t(`auth.no${label}`)}</span>}
        </span>
        {canEdit && (
          <button
            onClick={() => handleEdit(field)}
            className="ml-4 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors duration-200"
          >
            {t('common.edit')}
          </button>
        )}
      </div>
    );
  };

  const profileItems = [
    {
      label: t('auth.companyName'),
      value: renderEditableField('name', company.name, 'CompanyName'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: t('auth.ice'),
      value: (
        <div className="flex items-center">
          {(company.ICE || company.ice) ? (
            <span className="font-semibold text-gray-900">{company.ICE || company.ice}</span>
          ) : (
            <span className="text-gray-500 italic">{t('auth.noICE')}</span>
          )}
          <button
            onClick={handleCopy}
            disabled={!(company.ICE || company.ice)}
            className={`ml-4 px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
              !(company.ICE || company.ice)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : copied
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {copied ? t('common.copied') : t('common.copy')}
          </button>
        </div>
      ),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: t('auth.identifiantFiscal'),
      value: renderEditableField('identifiantFiscal', company.identifiantFiscal || company.identifiantfiscal || '', 'IdentifiantFiscal'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 4a1 1 0 112 0 1 1 0 01-2 0zm-1 4a1 1 0 100 2h2a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h2a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: t('auth.address'),
      value: renderEditableField('address', company.address || '', 'Address'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: t('auth.memberSince'),
      value: (() => {
        if (!company.createdAt) {
          return <span className="text-gray-500 italic">{t('common.unknownDate')}</span>;
        }
        
        try {
          const date = new Date(company.createdAt);
          if (isNaN(date.getTime())) {
            return <span className="text-gray-500 italic">{t('common.unknownDate')}</span>;
          }
          
          return date.toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } catch (error) {
          return <span className="text-gray-500 italic">{t('common.unknownDate')}</span>;
        }
      })(),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white shadow-lg rounded-2xl p-8 max-w-3xl mx-auto animate-fadeIn">
      <div className="flex items-center mb-8">
        <div className="p-3 bg-blue-100 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 ml-4">{t('common.companyProfile')}</h2>
      </div>
      
      <div className="space-y-6">
        {profileItems.filter(Boolean).map((item, index) => {
          const nonNullItem = item!;
          return (
            <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
              <div className="flex-shrink-0 mr-4">{nonNullItem.icon}</div>
              <div className="w-full">
                <p className="text-sm font-medium text-gray-500">{nonNullItem.label}</p>
                <div className="text-lg mt-1">{nonNullItem.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyProfile; 