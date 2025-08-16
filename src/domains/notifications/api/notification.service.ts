import { secureApiClient } from '../../../config/api';
import { ApiResponse } from '../../auth/types/auth.types';
import { NOTIFICATION_ENDPOINTS } from './notification.endpoints';
import { 
  NotificationDto, 
  NotificationsPaginatedResponse, 
  NotificationCountsResponse, 
  NotificationFilters 
} from '../types/notification.types';

export const notificationService = {
  async fetchNotifications(filters: NotificationFilters = {}): Promise<NotificationsPaginatedResponse> {
    const params = new URLSearchParams();
    //params.append('includeRead', "true");
    params.append('page', "1");
    params.append('pageSize', "1000");
    if (filters.includeRead !== undefined) params.append('includeRead', filters.includeRead.toString());
    if (filters.type !== undefined) params.append('type', filters.type.toString());
    if (filters.severity !== undefined) params.append('severity', filters.severity.toString());
    
    const response = await secureApiClient.get(NOTIFICATION_ENDPOINTS.LIST(params.toString()));
    const responseData: ApiResponse<NotificationsPaginatedResponse> = await response.json();
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch notifications';
      throw new Error(errorMessage);
    }
    
    return responseData.data!;
  },

  async fetchCounts(): Promise<NotificationCountsResponse> {
    const response = await secureApiClient.get(NOTIFICATION_ENDPOINTS.COUNTS);
    const responseData: ApiResponse<NotificationCountsResponse> = await response.json();
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch notification counts';
      throw new Error(errorMessage);
    }
    
    return responseData.data!;
  },

  async markAsRead(id: number): Promise<void> {
    const response = await secureApiClient.post(NOTIFICATION_ENDPOINTS.MARK_READ(id));
    const responseData: ApiResponse<void> = await response.json();
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to mark notification as read';
      throw new Error(errorMessage);
    }
  },

  async markAllAsRead(): Promise<void> {
    const response = await secureApiClient.post(NOTIFICATION_ENDPOINTS.MARK_ALL_READ);
    const responseData: ApiResponse<void> = await response.json();
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to mark all notifications as read';
      throw new Error(errorMessage);
    }
  }
};
