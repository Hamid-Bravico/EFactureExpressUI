import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { NotificationDto } from '../types/notification.types';
import { getSeverityConfig, getTypeIcon, formatNotificationTime, getSeverityLabel } from '../utils/notification.utils';
import { notificationService } from '../api/notification.service';
import { format, differenceInSeconds, differenceInMinutes, differenceInHours, isYesterday, isThisWeek } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface NotificationListProps {
  notifications: NotificationDto[];
  onNotificationUpdate: (updatedNotification: NotificationDto) => void;
  onMarkAllRead: () => void;
  t: any;
  i18n: any;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationUpdate,
  onMarkAllRead,
  t,
  i18n
}) => {
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = differenceInSeconds(now, date);
    const minutes = differenceInMinutes(now, date);
    const hours = differenceInHours(now, date);
    const lang = i18n.language === 'fr' ? 'fr' : 'en';
    
    if (seconds < 30) return t('notifications.time.justNow') || (lang === 'fr' ? "À l'instant" : 'Just now');
    if (minutes < 60) return t('notifications.time.minutesAgo', { count: minutes }) || (lang === 'fr' ? `il y a ${minutes} minute${minutes > 1 ? 's' : ''}` : `${minutes} min${minutes > 1 ? 's' : ''} ago`);
    if (hours < 24) return t('notifications.time.hoursAgo', { count: hours }) || (lang === 'fr' ? `il y a ${hours} heure${hours > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''} ago`);
    if (isYesterday(date)) return t('notifications.time.yesterday') || (lang === 'fr' ? 'Hier' : 'Yesterday');
    if (isThisWeek(date, { weekStartsOn: 1, locale: lang === 'fr' ? fr : enUS })) return t('notifications.time.thisWeek') || (lang === 'fr' ? 'Cette semaine' : 'This week');
    return format(date, 'P', { locale: lang === 'fr' ? fr : enUS });
  };

  const handleMarkAsRead = async (notification: NotificationDto) => {
    if (notification.isRead) return;
    
    setMarkingReadId(notification.id);
    try {
      await notificationService.markAsRead(notification.id);
      onNotificationUpdate({ ...notification, isRead: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationService.markAllAsRead();
      onMarkAllRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">
          {t('notifications.empty') || 'No notifications'}
        </div>
        <p className="text-gray-500 text-sm">
          {t('notifications.emptyDescription') || 'You\'re all caught up!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('notifications.title') || 'Notifications'}
        </h2>
        <button
          onClick={handleMarkAllAsRead}
          disabled={markingAllRead || !notifications.some(n => !n.isRead)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {markingAllRead ? t('common.loading') || 'Loading...' : t('notifications.markAllAsRead') || 'Mark all as read'}
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const severityConfig = getSeverityConfig(notification.severity);
          const TypeIcon = getTypeIcon(notification.type);
          const Icon = TypeIcon || severityConfig.icon;

          return (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-colors ${
                notification.isRead 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-blue-200 shadow-sm'
              }`}
            >
              <div className="flex gap-3 items-start">
                <div className={`p-2 rounded-lg ${severityConfig.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 break-words">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <p 
                          className="text-xs text-gray-400"
                          title={`${formatNotificationTime(notification.createdAt, i18n.language === 'fr' ? 'fr-FR' : 'en-US')} - ${notification.createdBy || 'Unknown'}`}
                        >
                          {timeAgo(notification.createdAt)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${severityConfig.badgeColor}`}>
                          {getSeverityLabel(notification.severity, t)}
                        </span>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAsRead(notification)}
                          disabled={markingReadId === notification.id}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
                          title={t('notifications.markAsRead') || 'Mark as read'}
                        >
                          {markingReadId === notification.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationList;
