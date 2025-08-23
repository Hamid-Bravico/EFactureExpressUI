import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ImportCSVProps {
  onImport: (file: File) => void;
  loading?: boolean;
}

const ImportCSV: React.FC<ImportCSVProps> = ({ onImport, loading = false }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');

    if (!file) {
      return;
    }

    if (file.type !== 'text/csv') {
      setError(t('errors.invalidFileType'));
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    onImport(file);
    // Reset the file input after attempting to import
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
          disabled={loading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('creditNote.import.uploading')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
                              {t('common.file.importCSV')}
            </>
          )}
        </button>
      </div>
      
      {/* Help Icon */}
      <div className="relative">
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          className="inline-flex items-center justify-center w-6 h-6 text-sm font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          title={t('creditNote.import.help.title')}
        >
          ?
        </button>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute z-50 w-80 p-4 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg -left-2 transform -translate-x-1/2">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-200"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white" style={{ marginTop: '1px' }}></div>
            
            <h3 className="font-semibold text-gray-900 mb-3">{t('creditNote.import.help.title')}</h3>
            
            <p className="text-gray-600 mb-4 text-sm">{t('creditNote.import.help.description')}</p>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">{t('creditNote.import.help.requiredHeaders')}</h4>
                <ul className="space-y-1 text-gray-600">
                  {(t('creditNote.import.help.requiredFields', { returnObjects: true }) as string[]).map((field: string, index: number) => {
                    const [columnName, description] = field.split(' - ');
                    return (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-red-500">•</span>
                        <span className="text-xs">
                          <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border">{columnName}</span>
                          <span className="text-gray-500"> - {description}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-800 mb-2">{t('creditNote.import.help.optionalHeaders')}</h4>
                <ul className="space-y-1 text-gray-600">
                  {(t('creditNote.import.help.optionalFields', { returnObjects: true }) as string[]).map((field: string, index: number) => {
                    const [columnName, description] = field.split(' - ');
                    return (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-blue-500">•</span>
                        <span className="text-xs">
                          <span className="font-mono font-semibold text-green-600 bg-green-50 px-1 py-0.5 rounded border">{columnName}</span>
                          <span className="text-gray-500"> - {description}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 mb-2">{t('creditNote.import.help.businessLogic')}</h4>
                <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                  {t('creditNote.import.help.businessLogicNote')}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-800 mb-2">{t('creditNote.import.help.paymentMethods')}</h4>
                <ul className="space-y-1 text-gray-600">
                  {(t('creditNote.import.help.paymentMethodValues', { returnObjects: true }) as string[]).map((method: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 text-purple-500">•</span>
                      <span className="text-xs font-mono">{method}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default ImportCSV; 