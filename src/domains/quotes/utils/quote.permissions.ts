// Quote-specific permission utilities
import { UserRole } from '../../../utils/shared.permissions';

export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted';

// Quote status constants
export const QUOTE_STATUS = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted'
} as const;

// Update operation permissions for PUT /api/quotes/{id}
export const canUpdateQuote = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  switch (userRole) {
    case 'Admin':
      // Admin: Can update any quote in any status (serves as a system override)
      return true;
    
    case 'Manager':
      // Manager: Can update any quote if its status is Draft or Sent
      return quoteStatus === QUOTE_STATUS.DRAFT || quoteStatus === QUOTE_STATUS.SENT;
    
    case 'Clerk':
      // Clerk: Can update if the status is Draft or Sent
      return quoteStatus === QUOTE_STATUS.DRAFT || quoteStatus === QUOTE_STATUS.SENT;
    
    default:
      return false;
  }
};

// Delete operation permissions for DELETE /api/quotes/{id}
export const canDeleteQuote = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  switch (userRole) {
    case 'Admin':
      // Admin: Can delete any quote in any status (serves as a system override)
      return true;
    
    case 'Manager':
      // Manager: Can delete any quote only if its status is Draft
      return quoteStatus === QUOTE_STATUS.DRAFT;
    
    case 'Clerk':
      // Clerk: Can delete quotes only if its status is Draft
      return quoteStatus === QUOTE_STATUS.DRAFT;
    
    default:
      return false;
  }
};

// Quote-specific permission functions
export const canModifyQuote = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  switch (userRole) {
    case 'Clerk':
      // Clerks can only modify Draft quotes
      return quoteStatus === QUOTE_STATUS.DRAFT;
    
    case 'Manager':
    case 'Admin':
      // Managers and Admins can modify Draft, Sent, and Rejected quotes
      return quoteStatus === QUOTE_STATUS.DRAFT ||
             quoteStatus === QUOTE_STATUS.SENT ||
             quoteStatus === QUOTE_STATUS.REJECTED;
    
    default:
      return false;
  }
};

export const canChangeQuoteStatus = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  switch (userRole) {
    case 'Clerk':
      // Clerks can perform basic workflow actions on Draft, Sent, and Rejected quotes
      return quoteStatus === QUOTE_STATUS.DRAFT ||
             quoteStatus === QUOTE_STATUS.SENT ||
             quoteStatus === QUOTE_STATUS.REJECTED;
    
    case 'Manager':
    case 'Admin':
      // Managers and Admins can perform any status transition on any quote
      return true;
    
    default:
      return false;
  }
};

export const canConvertQuoteToInvoice = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  // Only Managers and Admins can convert, and only Accepted quotes
  return (userRole === 'Manager' || userRole === 'Admin') && 
         quoteStatus === QUOTE_STATUS.ACCEPTED;
};

export const getValidQuoteStatusTransitions = (userRole: UserRole, currentStatus: QuoteStatus): QuoteStatus[] => {
  if (userRole === 'Clerk') {
    // Clerks can perform basic workflow actions: Draft ↔ Sent and Sent → Rejected
    switch (currentStatus) {
      case QUOTE_STATUS.DRAFT:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT];
      
      case QUOTE_STATUS.SENT:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.REJECTED];
      
      case QUOTE_STATUS.REJECTED:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.REJECTED];
      
      case QUOTE_STATUS.ACCEPTED:
      case QUOTE_STATUS.CONVERTED:
        // Clerks cannot change Accepted or Converted quotes
        return [currentStatus];
      
      default:
        return [currentStatus];
    }
  }

  // Admin and Manager can perform any status transition
  if (userRole === 'Admin' || userRole === 'Manager') {
    switch (currentStatus) {
      case QUOTE_STATUS.DRAFT:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.ACCEPTED, QUOTE_STATUS.REJECTED];
      
      case QUOTE_STATUS.SENT:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.ACCEPTED, QUOTE_STATUS.REJECTED];
      
      case QUOTE_STATUS.ACCEPTED:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.ACCEPTED, QUOTE_STATUS.REJECTED, QUOTE_STATUS.CONVERTED];
      
      case QUOTE_STATUS.REJECTED:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.ACCEPTED, QUOTE_STATUS.REJECTED];
      
      case QUOTE_STATUS.CONVERTED:
        return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.ACCEPTED, QUOTE_STATUS.REJECTED, QUOTE_STATUS.CONVERTED];
      
      default:
        return [currentStatus];
    }
  }

  return [currentStatus];
};

export const canTransitionQuoteToStatus = (
  userRole: UserRole, 
  currentStatus: QuoteStatus, 
  targetStatus: QuoteStatus
): boolean => {
  const validTransitions = getValidQuoteStatusTransitions(userRole, currentStatus);
  return validTransitions.includes(targetStatus);
};

// Check if user can perform business-critical status changes
export const canPerformBusinessStatusChange = (userRole: UserRole, targetStatus: QuoteStatus): boolean => {
  // Only Admin and Manager can perform business-critical status changes
  if (userRole !== 'Admin' && userRole !== 'Manager') {
    return false;
  }
  
  // Business-critical statuses that require higher permissions
  const businessCriticalStatuses: QuoteStatus[] = [QUOTE_STATUS.ACCEPTED, QUOTE_STATUS.REJECTED, QUOTE_STATUS.CONVERTED];
  return businessCriticalStatuses.includes(targetStatus);
};

export const canSelectQuoteForBulkOperation = (
  userRole: UserRole, 
  quoteStatus: QuoteStatus, 
  operation: 'delete' | 'submit'
): boolean => {
  if (operation === 'delete') {
    return canDeleteQuote(userRole, quoteStatus);
  }
  
  if (operation === 'submit') {
    return canModifyQuote(userRole, quoteStatus);
  }
  
  return false;
};

export const getQuoteActionPermissions = (userRole: UserRole, quoteStatus: QuoteStatus) => {
  return {
    canEdit: canModifyQuote(userRole, quoteStatus),
    canUpdate: canUpdateQuote(userRole, quoteStatus),
    canDelete: canDeleteQuote(userRole, quoteStatus),
    canChangeStatus: canChangeQuoteStatus(userRole, quoteStatus),
    canConvertToInvoice: canConvertQuoteToInvoice(userRole, quoteStatus),
    canPerformBusinessStatusChange: canPerformBusinessStatusChange(userRole, quoteStatus),
    validStatusTransitions: getValidQuoteStatusTransitions(userRole, quoteStatus)
  };
};

export const getQuoteStatusDisplayInfo = (status: QuoteStatus) => {
  switch (status) {
    case QUOTE_STATUS.DRAFT:
      return { key: 'draft', color: 'gray', mutable: true };
    case QUOTE_STATUS.SENT:
      return { key: 'sent', color: 'yellow', mutable: true };
    case QUOTE_STATUS.ACCEPTED:
      return { key: 'accepted', color: 'green', mutable: false };
    case QUOTE_STATUS.REJECTED:
      return { key: 'rejected', color: 'red', mutable: true };
    case QUOTE_STATUS.CONVERTED:
      return { key: 'converted', color: 'purple', mutable: false };
    default:
      return { key: 'unknown', color: 'gray', mutable: false };
  }
};