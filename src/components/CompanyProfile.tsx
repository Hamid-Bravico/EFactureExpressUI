import React, { useState } from 'react';
import { Company } from '../types/common';
import { useTranslation } from 'react-i18next';

interface CompanyProfileProps {
  company: Company | null;
  token?: string | null;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ company, token }) => {
  const { t, i18n } = useTranslation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          </div>
          <p className="text-lg text-gray-500 mt-4">{t('errors.noCompanyData')}</p>
        </div>
      </div>
    );
  }

  const handleCopy = (field: string, value: string | number) => {
    const stringValue = String(value);
    if (stringValue && stringValue !== t('common.noId', 'No ID') && stringValue !== t('auth.noCompanyName') && 
        stringValue !== t('auth.noICE') && stringValue !== t('auth.noIdentifiantFiscal') && 
        stringValue !== t('auth.noTaxeProfessionnelle', 'No Taxe Professionnelle') && 
        stringValue !== t('auth.noAddress')) {
      navigator.clipboard.writeText(stringValue);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(t('common.supportSubject', 'Company Profile Update Request'));
    const body = encodeURIComponent(
      t('common.supportBody', 'Hello,\n\nI would like to request an update to my company profile information.\n\nCompany Name: {{companyName}}\nCompany ID: {{companyId}}\n\nPlease provide the specific information you would like to update.\n\nBest regards,')
        .replace('{{companyName}}', company.name || 'N/A')
        .replace('{{companyId}}', String(company.id || 'N/A'))
    );
    window.open(`mailto:contact@bravico.ma?subject=${subject}&body=${body}`, '_blank');
  };

  const profileItems = [
    {
      field: 'id',
      label: t('common.companyId', 'Company ID'),
      value: company.id || t('common.noId', 'No ID'),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
          </svg>
        </div>
      ),
      gradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      hoverGradient: 'hover:from-blue-100 hover:to-blue-200',
      hasCopy: true,
      fullWidth: false
    },
    {
      field: 'name',
      label: t('auth.companyName'),
      value: company.name || t('auth.noCompanyName'),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
        </div>
      ),
      gradient: 'from-emerald-50 to-emerald-100',
      borderColor: 'border-emerald-200',
      hoverGradient: 'hover:from-emerald-100 hover:to-emerald-200',
      hasCopy: true,
      fullWidth: false
    },
    {
      field: 'ice',
      label: t('auth.ice'),
      value: company.ice || t('auth.noICE'),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        </div>
      ),
      gradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      hoverGradient: 'hover:from-purple-100 hover:to-purple-200',
      hasCopy: true,
      fullWidth: false
    },
    {
      field: 'identifiantFiscal',
      label: t('auth.identifiantFiscal'),
      value: company.identifiantFiscal || t('auth.noIdentifiantFiscal'),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 4a1 1 0 112 0 1 1 0 01-2 0zm-1 4a1 1 0 100 2h2a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h2a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        </div>
      ),
      gradient: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      hoverGradient: 'hover:from-orange-100 hover:to-orange-200',
      hasCopy: true,
      fullWidth: false
    },
    {
      field: 'taxeProfessionnelle',
      label: t('auth.taxeProfessionnelle', 'Taxe Professionnelle'),
      value: company.taxeProfessionnelle || t('auth.noTaxeProfessionnelle', 'No Taxe Professionnelle'),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
          </svg>
        </div>
      ),
      gradient: 'from-teal-50 to-teal-100',
      borderColor: 'border-teal-200',
      hoverGradient: 'hover:from-teal-100 hover:to-teal-200',
      hasCopy: true,
      fullWidth: false
    },
    {
      field: 'address',
      label: t('auth.address'),
      value: company.address || t('auth.noAddress'),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        </div>
      ),
      gradient: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      hoverGradient: 'hover:from-indigo-100 hover:to-indigo-200',
      hasCopy: true,
      fullWidth: true
    },
    {
      field: 'createdAt',
      label: t('auth.memberSince'),
      value: (() => {
        if (!company.createdAt) {
          return t('common.unknownDate');
        }
        
        try {
          const date = new Date(company.createdAt);
          if (isNaN(date.getTime())) {
            return t('common.unknownDate');
          }
          
          return date.toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } catch (error) {
          return t('common.unknownDate');
        }
      })(),
      icon: (
        <div className="p-2.5 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        </div>
      ),
      gradient: 'from-pink-50 to-pink-100',
      borderColor: 'border-pink-200',
      hoverGradient: 'hover:from-pink-100 hover:to-pink-200',
      hasCopy: false,
      fullWidth: false
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl shadow-lg mb-6 transform hover:scale-105 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
          </svg>
        </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {t('common.companyProfile')}
          </h1>
          <p className="text-slate-600 text-base">
            {t('common.companyProfileSubtitle', 'Complete company information and details')}
          </p>
      </div>
      
        {/* Profile Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {profileItems.map((item, index) => (
            <div
              key={index}
              className={`
                group relative overflow-hidden bg-white rounded-xl shadow-sm border ${item.borderColor} 
                transform transition-all duration-300 hover:shadow-md ${item.hoverGradient}
                ${item.fullWidth ? 'md:col-span-2' : ''}
              `}
            >
              <div className="p-5">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 transform group-hover:rotate-6 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-medium text-slate-900 truncate">
                        {item.value}
                      </p>
                      {item.hasCopy && (
                        <button
                          onClick={() => handleCopy(item.field, item.value)}
                          disabled={!item.value || item.value === t('common.noId', 'No ID') || 
                                   item.value === t('auth.noCompanyName') || item.value === t('auth.noICE') || 
                                   item.value === t('auth.noIdentifiantFiscal') || 
                                   item.value === t('auth.noTaxeProfessionnelle', 'No Taxe Professionnelle') || 
                                   item.value === t('auth.noAddress')}
                          className={`
                            ml-2 p-1.5 rounded-md transition-all duration-200 
                            transform hover:scale-110 active:scale-95
                            ${!item.value || item.value === t('common.noId', 'No ID') || 
                              item.value === t('auth.noCompanyName') || item.value === t('auth.noICE') || 
                              item.value === t('auth.noIdentifiantFiscal') || 
                              item.value === t('auth.noTaxeProfessionnelle', 'No Taxe Professionnelle') || 
                              item.value === t('auth.noAddress')
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : copiedField === item.field
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                            }
                          `}
                          title={copiedField === item.field ? t('common.copied') : t('common.copy')}
                        >
                          {copiedField === item.field ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Subtle gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}></div>
            </div>
          ))}
        </div>

        {/* Footer Section */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center space-x-2 text-slate-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t('common.profileInfo', 'Company information is read-only.')}</span>
            <button
              onClick={handleContactSupport}
              className="text-blue-600 hover:text-blue-800 underline transition-colors duration-200"
            >
              {t('common.contactSupport', 'Contact support')}
            </button>
            <span>{t('common.forUpdates', 'for updates.')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile; 