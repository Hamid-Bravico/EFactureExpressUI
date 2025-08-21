import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { COMPANY_ENDPOINTS } from '../api/company.endpoints';
import { getSecureHeaders } from '../../../config/api';
import { tokenManager } from '../../../utils/tokenManager';

interface CompanyRejectedPageProps {
  onToggleLanguage: () => void;
  currentLanguage: string;
  onLogout: () => void;
  token: string;
  companyData?: {
    id: string | number;
    name: string;
    ice?: string;
    address: string;
    identifiantFiscal?: string;
    taxeProfessionnelle?: string;
    verificationRejectionReason?: string | null;
  };
  onCompanyStatusUpdate?: (updatedCompany: any) => void;
}

interface UpdateFormData {
  companyName: string;
  ICE: string;
  identifiantFiscal: string;
  taxeProfessionnelle: string;
  address: string;
  verificationDocument: File | null;
}

const CompanyRejectedPage: React.FC<CompanyRejectedPageProps> = ({ 
  onToggleLanguage, 
  currentLanguage, 
  onLogout,
  token,
  companyData,
  onCompanyStatusUpdate
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UpdateFormData>({
    companyName: companyData?.name || '',
    ICE: companyData?.ice || '',
    identifiantFiscal: companyData?.identifiantFiscal || '',
    taxeProfessionnelle: companyData?.taxeProfessionnelle || '',
    address: companyData?.address || '',
    verificationDocument: null
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const validateICE = (ice: string): string[] => {
    const errors: string[] = [];
    if (!ice) {
      errors.push(t('auth.validation.iceRequired', 'ICE is required'));
    } else if (!/^\d{15}$/.test(ice)) {
      errors.push(t('auth.validation.iceMustBe15Digits', 'ICE must be exactly 15 digits'));
    }
    return errors;
  };

  const validateAddress = (address: string): string[] => {
    const errors: string[] = [];
    if (!address) {
      errors.push(t('auth.validation.addressRequired', 'Address is required'));
    }
    return errors;
  };

  const validateIdentifiantFiscal = (identifiantFiscal: string): string[] => {
    const errors: string[] = [];
    if (!identifiantFiscal) {
      errors.push(t('auth.validation.identifiantFiscalRequired', 'Identifiant Fiscal is required'));
    } else if (identifiantFiscal.length !== 8) {
      errors.push(t('auth.validation.identifiantFiscalMustBe8Chars', 'Identifiant Fiscal must be exactly 8 characters'));
    }
    return errors;
  };

  const validateTaxeProfessionnelle = (taxeProfessionnelle: string): string[] => {
    const errors: string[] = [];
    if (!taxeProfessionnelle) {
      errors.push(t('auth.validation.taxeProfessionnelleRequired', 'Taxe Professionnelle is required'));
    } else if (taxeProfessionnelle.length > 20) {
      errors.push(t('auth.validation.taxeProfessionnelleMaxLength', 'Taxe Professionnelle must be less than 20 characters'));
    }
    return errors;
  };

  const validateVerificationDocument = (file: File | null): string[] => {
    const errors: string[] = [];
    if (!file) {
      errors.push(t('auth.validation.verificationDocumentRequired', 'Verification document is required'));
      return errors;
    }
    
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(t('auth.validation.verificationDocumentType', 'Only PDF, JPG, JPEG, and PNG files are allowed'));
    }
    
    if (file.size > 10 * 1024 * 1024) {
      errors.push(t('auth.validation.verificationDocumentSize', 'File size must be less than 10MB'));
    }
    
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const trimmedValue = value.trim();
    
    setFormData(prev => ({
      ...prev,
      [name]: trimmedValue
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === 'ICE') {
      const iceErrors = validateICE(trimmedValue);
      if (iceErrors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: iceErrors
        }));
      }
    }

    if (name === 'identifiantFiscal') {
      const identifiantFiscalErrors = validateIdentifiantFiscal(trimmedValue);
      if (identifiantFiscalErrors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: identifiantFiscalErrors
        }));
      }
    }

    if (name === 'taxeProfessionnelle') {
      const taxeProfessionnelleErrors = validateTaxeProfessionnelle(trimmedValue);
      if (taxeProfessionnelleErrors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: taxeProfessionnelleErrors
        }));
      }
    }

    if (name === 'address') {
      const addressErrors = validateAddress(trimmedValue);
      if (addressErrors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: addressErrors
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const iceErrors = validateICE(formData.ICE);
    const identifiantFiscalErrors = validateIdentifiantFiscal(formData.identifiantFiscal);
    const taxeProfessionnelleErrors = validateTaxeProfessionnelle(formData.taxeProfessionnelle);
    const addressErrors = validateAddress(formData.address);
    const verificationDocumentErrors = validateVerificationDocument(formData.verificationDocument);
    
    if (iceErrors.length > 0 || identifiantFiscalErrors.length > 0 || taxeProfessionnelleErrors.length > 0 || addressErrors.length > 0 || verificationDocumentErrors.length > 0) {
      setValidationErrors({
        ICE: iceErrors,
        identifiantFiscal: identifiantFiscalErrors,
        taxeProfessionnelle: taxeProfessionnelleErrors,
        address: addressErrors,
        verificationDocument: verificationDocumentErrors
      });
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('CompanyName', formData.companyName.trim());
      formDataToSend.append('ICE', formData.ICE.trim());
      formDataToSend.append('IdentifiantFiscal', formData.identifiantFiscal.trim());
      formDataToSend.append('TaxeProfessionnelle', formData.taxeProfessionnelle.trim());
      formDataToSend.append('Address', formData.address.trim());
      
      if (formData.verificationDocument) {
        formDataToSend.append('VerificationDocument', formData.verificationDocument);
      }

      const response = await fetch(COMPANY_ENDPOINTS.RESUBMIT_VERIFICATION, {
        method: 'PUT',
        headers: getSecureHeaders(token),
        credentials: 'include',
        body: formDataToSend
      });

      const responseData = await response.json();
      
      if (!responseData.succeeded) {
        const errorMessage = responseData.errors?.join('\n') || responseData.message || t('errors.updateFailed', 'Failed to update company information');
        throw new Error(errorMessage);
      }

      // Update company data with the returned data from API
      if (responseData.data && onCompanyStatusUpdate) {
        // Update local storage with the new company data
        tokenManager.updateCompanyData(responseData.data);
        // Update parent component state
        onCompanyStatusUpdate(responseData.data);
      }

      // Show both toast and in-page success message
      toast(
        <div className="flex flex-col space-y-2 min-w-80">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                  {t('auth.companyRejected.updateSuccess')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => toast.dismiss()} 
              className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title={t('common.close', 'Close')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>,
        { 
          duration: Infinity,
          id: 'company-update-success',
          style: {
            minWidth: '320px',
            maxWidth: '480px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534'
          }
        }
      );
      setShowSuccessMessage(true);
      
    } catch (err: any) {
      let errorMessage = err instanceof Error ? err.message : t('errors.updateFailed', 'Failed to update company information');
      
      if (errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError', 'Network error. Please try again.');
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderFieldErrors = (fieldName: string) => {
    const errors = validationErrors[fieldName];
    if (!errors || errors.length === 0) return null;
    
    return (
      <div className="mt-1 text-sm text-red-600">
        {errors.map((error, index) => (
          <div key={index} className="flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg relative">
        {/* Language Toggle Button */}
        <button
          onClick={onToggleLanguage}
          className="absolute top-4 right-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transform hover:scale-105"
        >
          {currentLanguage === 'en' ? 'FR' : 'EN'}
        </button>

        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-4 rounded-full">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('auth.companyRejected.title', 'Company Verification Rejected')}
          </h2>
          
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            {t('auth.companyRejected.message', 'Your company verification was not successful. Please review the feedback below, update your information if needed, and resubmit your documents.')}
          </p>

          {/* Rejection Reason Display */}
          {companyData?.verificationRejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                {t('auth.companyRejected.rejectionReason', 'Rejection Reason')}
              </h3>
              <p className="text-sm text-red-700">
                {companyData.verificationRejectionReason}
              </p>
            </div>
          )}

          {/* Success Message Display */}
          {showSuccessMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-800 mb-1">
                      {t('auth.companyRejected.submissionSuccess', 'Documents Resubmitted Successfully')}
                    </h3>
                    <p className="text-sm text-green-700">
                      {t('auth.companyRejected.submissionMessage', 'Your company information has been updated and documents resubmitted. Your application is now under review again.')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-600 hover:text-green-800 transition-colors duration-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                {t('auth.companyName', 'Company Name')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200"
                  placeholder={t('auth.companyNamePlaceholder', 'Enter company name')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ICE" className="block text-sm font-medium text-gray-700">
                {t('auth.ice', 'ICE')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="ICE"
                  name="ICE"
                  type="text"
                  required
                  value={formData.ICE}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                    validationErrors['ICE'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-red-500'
                  }`}
                  placeholder={t('auth.icePlaceholder', '15 digits')}
                />
                {renderFieldErrors('ICE')}
              </div>
            </div>

            <div>
              <label htmlFor="identifiantFiscal" className="block text-sm font-medium text-gray-700">
                {t('auth.identifiantFiscal', 'Identifiant Fiscal')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="identifiantFiscal"
                  name="identifiantFiscal"
                  type="text"
                  required
                  value={formData.identifiantFiscal}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                    validationErrors['identifiantFiscal'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-red-500'
                  }`}
                  placeholder={t('auth.identifiantFiscalPlaceholder', '8 characters')}
                />
                {renderFieldErrors('identifiantFiscal')}
              </div>
            </div>

            <div>
              <label htmlFor="taxeProfessionnelle" className="block text-sm font-medium text-gray-700">
                {t('auth.taxeProfessionnelle', 'Taxe Professionnelle')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="taxeProfessionnelle"
                  name="taxeProfessionnelle"
                  type="text"
                  required
                  value={formData.taxeProfessionnelle}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                    validationErrors['taxeProfessionnelle'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-red-500'
                  }`}
                  placeholder={t('auth.taxeProfessionnellePlaceholder', 'Taxe professionnelle')}
                />
                {renderFieldErrors('taxeProfessionnelle')}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              {t('auth.address', 'Address')} <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                  validationErrors['address'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-red-500'
                }`}
                placeholder={t('auth.addressPlaceholder', 'Enter company address')}
              />
              {renderFieldErrors('address')}
            </div>
          </div>

          <div>
            <label htmlFor="verificationDocument" className="block text-sm font-medium text-gray-700">
              {t('auth.verificationDocument', 'Verification Document')} <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="verificationDocument"
                name="verificationDocument"
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFormData(prev => ({
                    ...prev,
                    verificationDocument: file
                  }));
                }}
                className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                  validationErrors['verificationDocument'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-red-500'
                }`}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('auth.verificationDocumentHelp', 'Accepted formats: PDF, JPG, JPEG, PNG (max 10MB)')}
              </p>
              {renderFieldErrors('verificationDocument')}
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 px-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.resubmitting', 'Resubmitting...')}
                </div>
              ) : (
                <>
                  <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                  {t('auth.companyRejected.resubmitButton', 'Resubmit Documents')}
                </>
              )}
            </button>

            <button 
              type="button"
              onClick={() => {
                const subject = encodeURIComponent(t('auth.companyRejected.emailSubject', 'Company Verification Support Request'));
                const body = encodeURIComponent(
                  t('auth.companyRejected.emailBody', 'Hello,\n\nI need assistance with my company verification process.\n\nCompany Name: {{companyName}}\nCompany ID: {{companyId}}\n\nPlease provide support.\n\nBest regards,')
                    .replace('{{companyName}}', companyData?.name || 'N/A')
                    .replace('{{companyId}}', String(companyData?.id || 'N/A'))
                );
                window.open(`mailto:contact@bravico.ma?subject=${subject}&body=${body}`, '_blank');
              }}
              className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 hover:bg-gray-50 rounded-lg"
            >
              {t('auth.companyRejected.contactSupport', 'Contact Support')}
            </button>

            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {t('auth.logout', 'Logout')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyRejectedPage;
