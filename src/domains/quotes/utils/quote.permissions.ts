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

export const canDeleteQuote = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  // Same rules as modify for deletion
  return canModifyQuote(userRole, quoteStatus);
};

export const canChangeQuoteStatus = (userRole: UserRole, quoteStatus: QuoteStatus): boolean => {
  switch (userRole) {
    case 'Clerk':
      // Clerks cannot change status at all
      return false;
    
    case 'Manager':
    case 'Admin':
      // Managers and Admins can change status for Draft, Sent, and Rejected quotes
      return quoteStatus === QUOTE_STATUS.DRAFT ||
             quoteStatus === QUOTE_STATUS.SENT ||
             quoteStatus === QUOTE_STATUS.REJECTED;
    
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
    // Clerks cannot change status
    return [currentStatus];
  }

  switch (currentStatus) {
    case QUOTE_STATUS.DRAFT:
      // Draft can go to Sent
      return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT];
    
    case QUOTE_STATUS.SENT:
      // Sent can go back to Draft or stay Sent
      return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT];
    
    case QUOTE_STATUS.ACCEPTED:
      // Accepted cannot be changed manually
      return [QUOTE_STATUS.ACCEPTED];
    
    case QUOTE_STATUS.REJECTED:
      // Rejected can go back to Draft
      return [QUOTE_STATUS.DRAFT, QUOTE_STATUS.REJECTED];
    
    case QUOTE_STATUS.CONVERTED:
      // Converted is immutable
      return [QUOTE_STATUS.CONVERTED];
    
    default:
      return [currentStatus];
  }
};

export const canTransitionQuoteToStatus = (
  userRole: UserRole, 
  currentStatus: QuoteStatus, 
  targetStatus: QuoteStatus
): boolean => {
  const validTransitions = getValidQuoteStatusTransitions(userRole, currentStatus);
  return validTransitions.includes(targetStatus);
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
    canDelete: canDeleteQuote(userRole, quoteStatus),
    canChangeStatus: canChangeQuoteStatus(userRole, quoteStatus),
    canConvertToInvoice: canConvertQuoteToInvoice(userRole, quoteStatus),
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