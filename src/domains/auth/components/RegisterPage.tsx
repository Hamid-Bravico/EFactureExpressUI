import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_CONFIG } from '../../../config/app';
import { getJsonHeaders } from '../../../config/api';
import { AUTH_ENDPOINTS } from '../api/auth.endpoints';
import { RegisterPageProps, RegisterFormData } from '../types/auth.types';
import { toast } from 'react-hot-toast';

const RegisterPage: React.FC<RegisterPageProps> = ({ onToggleLanguage, currentLanguage }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterFormData>({
    companyName: '',
    ICE: '',
    identifiantFiscal: '',
    taxeProfessionnelle: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationDocument: null
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateICE = (ice: string): string[] => {
    const errors: string[] = [];
    if (!ice) {
      errors.push(t('auth.validation.iceRequired'));
    } else if (!/^\d{15}$/.test(ice)) {
      errors.push(t('auth.validation.iceMustBe15Digits'));
    }
    return errors;
  };

  const validateAddress = (address: string): string[] => {
    const errors: string[] = [];
    if (!address) {
      errors.push(t('auth.validation.addressRequired'));
    }
    return errors;
  };

  const validateIdentifiantFiscal = (identifiantFiscal: string): string[] => {
    const errors: string[] = [];
    if (!identifiantFiscal) {
      errors.push(t('auth.validation.identifiantFiscalRequired'));
    } else if (identifiantFiscal.length !== 8) {
      errors.push(t('auth.validation.identifiantFiscalMustBe8Chars'));
    }
    return errors;
  };

  const validateTaxeProfessionnelle = (taxeProfessionnelle: string): string[] => {
    const errors: string[] = [];
    if (!taxeProfessionnelle) {
      errors.push(t('auth.validation.taxeProfessionnelleRequired'));
    } else if (taxeProfessionnelle.length > 20) {
      errors.push(t('auth.validation.taxeProfessionnelleMaxLength'));
    }
    return errors;
  };

  const validateVerificationDocument = (file: File | null): string[] => {
    const errors: string[] = [];
    if (!file) {
      errors.push(t('auth.validation.verificationDocumentRequired'));
      return errors;
    }
    
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(t('auth.validation.verificationDocumentType'));
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      errors.push(t('auth.validation.verificationDocumentSize'));
    }
    
    return errors;
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (!password) {
      errors.push(t('auth.validation.passwordRequired'));
      return errors;
    }
    
    if (password.length < 8) {
      errors.push(t('auth.validation.passwordMinLength'));
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push(t('auth.validation.passwordUppercase'));
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push(t('auth.validation.passwordLowercase'));
    }
    
    if (!/\d/.test(password)) {
      errors.push(t('auth.validation.passwordDigit'));
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push(t('auth.validation.passwordSpecial'));
    }
    
    return errors;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string[] => {
    const errors: string[] = [];
    
    if (!confirmPassword) {
      errors.push(t('auth.validation.confirmPasswordRequired'));
    } else if (password !== confirmPassword) {
      errors.push(t('auth.validation.passwordsDoNotMatch'));
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

    // Clear validation errors for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Validate specific fields
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

    if (name === 'password') {
      const passwordErrors = validatePassword(trimmedValue);
      if (passwordErrors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: passwordErrors
        }));
      }
      
      // Also validate confirm password when password changes
      if (formData.confirmPassword) {
        const confirmPasswordErrors = validateConfirmPassword(trimmedValue, formData.confirmPassword);
        if (confirmPasswordErrors.length > 0) {
          setValidationErrors(prev => ({
            ...prev,
            confirmPassword: confirmPasswordErrors
          }));
        } else {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.confirmPassword;
            return newErrors;
          });
        }
      }
    }

    if (name === 'confirmPassword') {
      const confirmPasswordErrors = validateConfirmPassword(formData.password, trimmedValue);
      if (confirmPasswordErrors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: confirmPasswordErrors
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    // Frontend validation
    const iceErrors = validateICE(formData.ICE);
    const identifiantFiscalErrors = validateIdentifiantFiscal(formData.identifiantFiscal);
    const taxeProfessionnelleErrors = validateTaxeProfessionnelle(formData.taxeProfessionnelle);
    const addressErrors = validateAddress(formData.address);
    const verificationDocumentErrors = validateVerificationDocument(formData.verificationDocument);
    const passwordErrors = validatePassword(formData.password);
    const confirmPasswordErrors = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    if (iceErrors.length > 0 || identifiantFiscalErrors.length > 0 || taxeProfessionnelleErrors.length > 0 || addressErrors.length > 0 || verificationDocumentErrors.length > 0 || passwordErrors.length > 0 || confirmPasswordErrors.length > 0) {
      setValidationErrors({
        ICE: iceErrors,
        identifiantFiscal: identifiantFiscalErrors,
        taxeProfessionnelle: taxeProfessionnelleErrors,
        address: addressErrors,
        verificationDocument: verificationDocumentErrors,
        password: passwordErrors,
        confirmPassword: confirmPasswordErrors
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('CompanyName', formData.companyName.trim());
      formDataToSend.append('ICE', formData.ICE.trim());
      formDataToSend.append('IdentifiantFiscal', formData.identifiantFiscal.trim());
      formDataToSend.append('TaxeProfessionnelle', formData.taxeProfessionnelle.trim());
      formDataToSend.append('Address', formData.address.trim());
      formDataToSend.append('Email', formData.email.trim());
      formDataToSend.append('Password', formData.password);
      
      if (formData.verificationDocument) {
        formDataToSend.append('VerificationDocument', formData.verificationDocument);
      }

      const response = await fetch(AUTH_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: formDataToSend
      });

      const responseData = await response.json();
      
      if (!responseData.succeeded) {
        const errorMessage = responseData.errors?.join('\n') || responseData.message || t('errors.registrationFailed');
        throw new Error(errorMessage, { cause: responseData.message });
      }

      // Handle successful response
      const message = responseData.message || t('auth.registrationSuccess');
      navigate(`/login?registrationSuccess=true&message=${encodeURIComponent(message)}`);

    } catch (err: any) {
      let errorMessage = err instanceof Error ? err.message : t('errors.registrationFailed');
      
      // Handle browser's "Failed to fetch" error
      if (errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError');
      }
      
      toast.error(
        <div className="space-y-1">
          <p className="font-medium">{err.cause || t('errors.registrationFailed')}</p>
          {errorMessage.split('\n').map((line, index) => (
            <p key={index} className="text-sm"> - {line}</p>
          ))}
        </div>,
        { duration: 9000 }
      );
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg relative">
        {/* Language Toggle Button */}
        <button
          onClick={onToggleLanguage}
          className="absolute top-4 right-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
        >
          {currentLanguage === 'en' ? 'FR' : 'EN'}
        </button>
        
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src={APP_CONFIG.logoH}
              alt={`${APP_CONFIG.title} Logo`}
              className="h-16 transition-transform duration-300 hover:scale-110"
            />
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start">
                                  <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                <div className="space-y-1">
                  {error.split('\n').map((line, index) => (
                    <p key={index} className={index === 0 ? "font-medium" : "text-sm"}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                {t('auth.companyName')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder={t('auth.companyNamePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ICE" className="block text-sm font-medium text-gray-700">
                {t('auth.ice')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="ICE"
                  name="ICE"
                  type="text"
                  required
                  value={formData.ICE}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    validationErrors['ICE'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder={t('auth.icePlaceholder')}
                />
                {renderFieldErrors('ICE')}
              </div>
            </div>

            <div>
              <label htmlFor="identifiantFiscal" className="block text-sm font-medium text-gray-700">
                {t('auth.identifiantFiscal')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                                                 <input
                  id="identifiantFiscal"
                  name="identifiantFiscal"
                  type="text"
                  required
                  value={formData.identifiantFiscal}
                  onChange={handleChange}
                   className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                     validationErrors['identifiantFiscal'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                   }`}
                                      placeholder={t('auth.identifiantFiscalPlaceholder')}
                 />
                 {renderFieldErrors('identifiantFiscal')}
               </div>
             </div>

            <div>
              <label htmlFor="taxeProfessionnelle" className="block text-sm font-medium text-gray-700">
                {t('auth.taxeProfessionnelle')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="taxeProfessionnelle"
                  name="taxeProfessionnelle"
                  type="text"
                  required
                  value={formData.taxeProfessionnelle}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    validationErrors['taxeProfessionnelle'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder={t('auth.taxeProfessionnellePlaceholder')}
                />
                {renderFieldErrors('taxeProfessionnelle')}
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                {t('auth.address')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    validationErrors['address'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder={t('auth.addressPlaceholder')}
                />
                {renderFieldErrors('address')}
              </div>
            </div>

            <div>
              <label htmlFor="verificationDocument" className="block text-sm font-medium text-gray-700">
                {t('auth.verificationDocument')} <span className="text-red-500">*</span>
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
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    validationErrors['verificationDocument'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('auth.verificationDocumentHelp')} (.pdf, .jpg, .jpeg, .png, max 10MB)
                </p>
                {renderFieldErrors('verificationDocument')}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    validationErrors['password'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none pointer-events-auto"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {renderFieldErrors('password')}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.confirmPassword')} <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                                 <input
                   id="confirmPassword"
                   name="confirmPassword"
                   type={showPassword ? "text" : "password"}
                   required
                   value={formData.confirmPassword}
                   onChange={handleChange}
                   className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                     validationErrors['confirmPassword'] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                   }`}
                   placeholder={t('auth.confirmPasswordPlaceholder')}
                 />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none pointer-events-auto"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                                 </div>
               </div>
               {renderFieldErrors('confirmPassword')}
             </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.registering')}
                </div>
              ) : (
                t('auth.registerButton')
              )}
            </button>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  {t('auth.signIn')}
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage; 