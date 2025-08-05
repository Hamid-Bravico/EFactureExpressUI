import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardFilters as DashboardFiltersType } from '../types/dashboard.types';

interface DashboardFiltersProps {
  filters: DashboardFiltersType;
  onFiltersChange: (filters: DashboardFiltersType) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({ filters, onFiltersChange }) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState<DashboardFiltersType>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof DashboardFiltersType, value: string | number | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = { dateFrom: undefined, dateTo: undefined, status: undefined };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status !== undefined;

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium text-gray-900">{t('dashboard.filters.title')}</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t('dashboard.filters.active')}
            </span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters Content */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end pt-4">
            {/* Date From */}
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.filters.dateFrom')}
              </label>
              <input
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.filters.dateTo')}
              </label>
              <input
                type="date"
                value={localFilters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard.filters.status')}
              </label>
              <select
                value={localFilters.status !== undefined ? localFilters.status : ''}
                onChange={(e) => handleFilterChange('status', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('dashboard.filters.allStatuses')}</option>
                <option value={0}>{t('invoice.status.draft')}</option>
                <option value={1}>{t('invoice.status.ready')}</option>
                <option value={2}>{t('invoice.status.awaitingClearance')}</option>
                <option value={3}>{t('invoice.status.validated')}</option>
                <option value={4}>{t('invoice.status.rejected')}</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                {t('dashboard.filters.apply')}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  {t('dashboard.filters.clear')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters; 