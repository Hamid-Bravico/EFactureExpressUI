import React, { useState } from 'react';
import { Company } from '../types';
import { useTranslation } from 'react-i18next';

interface CompanyProfileProps {
  company: Company | null;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ company }) => {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center bg-white rounded-lg shadow-md">
        <p className="text-lg text-gray-500">{t('errors.noCompanyData')}</p>
      </div>
    );
  }

  const handleCopy = () => {
    if (company?.taxId) {
      navigator.clipboard.writeText(company.taxId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const profileItems = [
    {
      label: t('common.companyName'),
      value: company.name,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: t('common.taxId'),
      value: (
        <div className="flex items-center">
          <span className="font-semibold text-gray-900">{company.taxId}</span>
          <button
            onClick={handleCopy}
            className={`ml-4 px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
              copied
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
    company.identifiantFiscal ? {
      label: t('common.identifiantFiscal'),
      value: company.identifiantFiscal,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2 4a1 1 0 112 0 1 1 0 01-2 0zm-1 4a1 1 0 100 2h2a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h2a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      ),
    } : null,
    {
      label: t('common.address'),
      value: company.address ? (
        company.address
      ) : (
        <span className="text-gray-500 italic">{t('common.noAddress')}</span>
      ),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: t('common.memberSince'),
      value: new Date(company.createdAt).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
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
                <div className="text-lg font-semibold text-gray-900 mt-1">{nonNullItem.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyProfile; 