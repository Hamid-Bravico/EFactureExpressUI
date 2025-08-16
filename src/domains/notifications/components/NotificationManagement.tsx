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
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={() => fetchNotifications()}
            className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            {t('common.retry') || 'Try again'}
          </button>
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
