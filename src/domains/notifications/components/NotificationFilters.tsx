import React from 'react';
import { X } from 'lucide-react';
import { NotificationSeverity, NotificationType, NotificationFilters } from '../types/notification.types';
import { getSeverityLabel } from '../utils/notification.utils';

interface NotificationFiltersProps {
  filters: NotificationFilters;
  onFiltersChange: (filters: NotificationFilters) => void;
  t: any;
}

const NotificationFiltersComponent: React.FC<NotificationFiltersProps> = ({
  filters,
  onFiltersChange,
  t
}) => {

  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1 // Reset to first page when filters change
    });
  };

  const hasActiveFilters = filters.includeRead === true || 
                          filters.severity !== undefined;

  const clearFilters = () => {
    onFiltersChange({
      page: filters.page,
      pageSize: filters.pageSize
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {t('notifications.filters.title') || 'Filters'}
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t('notifications.filters.active') || 'Active'}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} />
            {t('common.clear') || 'Clear'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Show Read/Unread Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('notifications.filters.status') || 'Status'}
            </label>
            <select
              value={filters.includeRead === undefined ? 'unread' : filters.includeRead ? 'all' : 'unread'}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('includeRead', 
                  value === 'all' ? true : false
                );
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="unread">{t('notifications.filters.unreadOnly') || 'Unread only'}</option>
              <option value="all">{t('notifications.filters.all') || 'All notifications'}</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('notifications.filters.severity') || 'Severity'}
            </label>
            <select
              value={filters.severity ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('severity', value === '' ? undefined : parseInt(value));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('notifications.filters.allSeverities') || 'All severities'}</option>
              <option value={NotificationSeverity.Info}>{getSeverityLabel(NotificationSeverity.Info, t)}</option>
              <option value={NotificationSeverity.Success}>{getSeverityLabel(NotificationSeverity.Success, t)}</option>
              <option value={NotificationSeverity.Warning}>{getSeverityLabel(NotificationSeverity.Warning, t)}</option>
              <option value={NotificationSeverity.Error}>{getSeverityLabel(NotificationSeverity.Error, t)}</option>
            </select>
          </div>


        </div>
      </div>
  );
};

export default NotificationFiltersComponent;
