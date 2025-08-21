import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NotificationList from './NotificationList';
import NotificationFilters from './NotificationFilters';
import { notificationService } from '../api/notification.service';
import { 
  NotificationDto, 
  NotificationsPaginatedResponse, 
  NotificationFilters as FilterType 
} from '../types/notification.types';

interface NotificationManagementProps {
  token: string | null;
}

const NotificationManagement: React.FC<NotificationManagementProps> = ({ token }) => {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    unreadCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0
  });
  const [filters, setFilters] = useState<FilterType>({
    includeRead: false, // Default to unread only
    page: 1,
    pageSize: 20
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (newFilters?: FilterType) => {
    setLoading(true);
    setError(null);
    
    try {
      const filtersToUse = newFilters || filters;
      const response: NotificationsPaginatedResponse = await notificationService.fetchNotifications(filtersToUse);
      setNotifications(response.items);
      setPagination(response.pagination);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : t('errors.failedToFetch');
      
      // Handle network error
      if (errorMessage === 'NETWORK_ERROR' || errorMessage === 'Failed to fetch') {
        errorMessage = t('errors.networkError');
      }
      
      setError(errorMessage);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token, filters]);

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const handleNotificationUpdate = (updatedNotification: NotificationDto) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === updatedNotification.id ? updatedNotification : notification
      )
    );
    // Update unread count
    if (updatedNotification.isRead) {
      setPagination(prev => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
    setPagination(prev => ({ ...prev, unreadCount: 0 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('auth.loginRequired') || 'Please log in to view notifications'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('notifications.title') || 'Notifications'}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('notifications.subtitle') || 'Stay updated with your latest notifications'}
        </p>
      </div>

      <NotificationFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        t={t}
      />

      {/* Error state handling */}
      {error && (
        <div className="text-center py-16">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto mb-6">
              <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{error}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              {t('errors.tryRefreshing')}
            </p>
            <button
              onClick={() => fetchNotifications()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('common.retry')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <NotificationList
            notifications={notifications}
            onNotificationUpdate={handleNotificationUpdate}
            onMarkAllRead={handleMarkAllRead}
            t={t}
            i18n={i18n}
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t('common.pagination.showing') || 'Showing'}{' '}
                <span className="font-medium">
                  {((pagination.page - 1) * pagination.pageSize) + 1}
                </span>{' '}
                {t('common.pagination.to') || 'to'}{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}
                </span>{' '}
                {t('common.pagination.of') || 'of'}{' '}
                <span className="font-medium">{pagination.totalItems}</span>{' '}
                {t('notifications.pagination.results') || 'notifications'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  {t('common.previous') || 'Previous'}
                </button>

                <span className="px-3 py-2 text-sm font-medium text-gray-900">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.next') || 'Next'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationManagement;
