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
    <div className="bg-white rounded-xl shadow px-4 py-4 border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
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
  );
};

export default DashboardFilters; 