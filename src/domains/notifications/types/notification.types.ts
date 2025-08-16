export interface NotificationDto {
  id: number;
  type: number;
  severity: number;
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  linkUrl: string | null;
  createdBy: string;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationsPaginatedResponse {
  items: NotificationDto[];
  pagination: {
    totalItems: number;
    unreadCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface NotificationCountsResponse {
  unreadCount: number;
  totalCount: number;
}

export enum NotificationSeverity {
  Info = 0,
  Success = 1,
  Warning = 2,
  Error = 3
}

export enum NotificationType {
  InvoiceCreated = 0,
  CustomerCreated = 26,
  // Add more types as needed
}

export interface NotificationFilters {
  includeRead?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  page?: number;
  pageSize?: number;
}
