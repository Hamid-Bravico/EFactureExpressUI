import { NotificationSeverity, NotificationType } from '../types/notification.types';
import { Bell, AlertTriangle, DollarSign, User, CheckCircle, XCircle } from 'lucide-react';

export const getSeverityConfig = (severity: NotificationSeverity) => {
  switch (severity) {
    case NotificationSeverity.Success:
      return {
        icon: CheckCircle,
        color: 'text-green-600 bg-green-50',
        badgeColor: 'bg-green-100 text-green-800'
      };
    case NotificationSeverity.Warning:
      return {
        icon: AlertTriangle,
        color: 'text-orange-600 bg-orange-50',
        badgeColor: 'bg-orange-100 text-orange-800'
      };
    case NotificationSeverity.Error:
      return {
        icon: XCircle,
        color: 'text-red-600 bg-red-50',
        badgeColor: 'bg-red-100 text-red-800'
      };
    case NotificationSeverity.Info:
    default:
      return {
        icon: Bell,
        color: 'text-blue-600 bg-blue-50',
        badgeColor: 'bg-blue-100 text-blue-800'
      };
  }
};

export const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.InvoiceCreated:
      return DollarSign;
    case NotificationType.CustomerCreated:
      return User;
    default:
      return Bell;
  }
};

export const getSeverityLabel = (severity: NotificationSeverity, t: any) => {
  switch (severity) {
    case NotificationSeverity.Success:
      return t('common.success') || 'Success';
    case NotificationSeverity.Warning:
      return t('common.warning') || 'Warning';
    case NotificationSeverity.Error:
      return t('common.error') || 'Error';
    case NotificationSeverity.Info:
    default:
      return t('common.info') || 'Info';
  }
};

export const formatNotificationTime = (dateString: string, locale: string = 'fr-FR') => {
  return new Date(dateString).toLocaleString(locale);
};
