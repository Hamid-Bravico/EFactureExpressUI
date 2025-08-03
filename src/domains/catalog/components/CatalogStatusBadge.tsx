import React from 'react';
import { useTranslation } from 'react-i18next';

interface CatalogTypeBadgeProps {
  status: string; // "Product", "Service"
  className?: string;
  onShowRejectionReason?: () => void;
}

const CatalogTypeBadge: React.FC<CatalogTypeBadgeProps> = ({ 
  status, 
  className = ''
}) => {
  const { t } = useTranslation();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Product':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          ),
          text: t('catalog.type.product')
        };
      case 'Service':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          ),
          text: t('catalog.type.service')
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: null,
          text: status || t('catalog.type.product')
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}>
      {config.icon}
      {config.text}
    </div>
  );
};

export default CatalogTypeBadge;