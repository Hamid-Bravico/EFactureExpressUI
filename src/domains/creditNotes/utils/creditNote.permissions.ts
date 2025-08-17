// CreditNote-specific permission utilities
import { UserRole } from '../../../utils/shared.permissions';

export type CreditNoteStatus = 0 | 1 | 2 | 3 | 4; // Draft, Ready, AwaitingClearance, Validated, Rejected

// CreditNote status constants
export const CREDITNOTE_STATUS = {
  DRAFT: 0,
  READY: 1,
  AWAITING_CLEARANCE: 2,
  VALIDATED: 3,
  REJECTED: 4
} as const;

export const canAccessCreditNotes = (userRole: UserRole): boolean => ['Admin', 'Manager'].includes(userRole);
export const canCreateCreditNote = (userRole: UserRole): boolean => ['Admin', 'Manager'].includes(userRole);
export const canModifyCreditNote = (userRole: UserRole, creditNoteStatus: CreditNoteStatus): boolean => ['Admin', 'Manager'].includes(userRole) && creditNoteStatus === CREDITNOTE_STATUS.DRAFT;
export const canDeleteCreditNote = (userRole: UserRole, creditNoteStatus: CreditNoteStatus): boolean => userRole === 'Admin' && creditNoteStatus === CREDITNOTE_STATUS.DRAFT;
export const canGetDataToSign = (userRole: UserRole): boolean => ['Admin', 'Manager'].includes(userRole);
export const canSetAsReady = (userRole: UserRole): boolean => ['Admin', 'Manager'].includes(userRole);
export const canRevertToDraft = (userRole: UserRole): boolean => userRole === 'Admin';
export const canSubmitToDGI = (userRole: UserRole): boolean => userRole === 'Admin';
export const canCheckDGIStatus = (userRole: UserRole): boolean => ['Admin', 'Manager'].includes(userRole);
export const canImportCSV = (userRole: UserRole): boolean => userRole === 'Admin';

export const canChangeCreditNoteStatus = (userRole: UserRole, creditNoteStatus: CreditNoteStatus): boolean => {
  switch (userRole) {
    case 'Clerk':
      // Clerks cannot change status at all
      return false;
    
    case 'Manager':
    case 'Admin':
      // Managers and Admins can change status for Draft, Ready, and Rejected creditNotes
      return creditNoteStatus === CREDITNOTE_STATUS.DRAFT ||
             creditNoteStatus === CREDITNOTE_STATUS.READY ||
             creditNoteStatus === CREDITNOTE_STATUS.REJECTED;
    
    default:
      return false;
  }
};

export const canSubmitCreditNote = (userRole: UserRole, creditNoteStatus: CreditNoteStatus): boolean => {
  // Only Managers and Admins can submit, and only Ready creditNotes
  return (userRole === 'Manager' || userRole === 'Admin') && 
         creditNoteStatus === CREDITNOTE_STATUS.READY;
};

export const canPerformDGIStatusCheck = (userRole: UserRole, creditNoteStatus: CreditNoteStatus): boolean => {
  // Only Managers and Admins can check DGI status for AwaitingClearance creditNotes
  return (userRole === 'Manager' || userRole === 'Admin') && 
         creditNoteStatus === CREDITNOTE_STATUS.AWAITING_CLEARANCE;
};

export const canAccessRejectionReason = (userRole: UserRole, creditNoteStatus: CreditNoteStatus): boolean => {
  // All roles can view rejection reason for rejected creditNotes
  return creditNoteStatus === CREDITNOTE_STATUS.REJECTED;
};

// Status transition validation
export const getValidStatusTransitions = (userRole: UserRole, currentStatus: CreditNoteStatus): CreditNoteStatus[] => {
  if (userRole === 'Clerk') {
    // Clerks cannot change status
    return [currentStatus];
  }

  switch (currentStatus) {
    case CREDITNOTE_STATUS.DRAFT:
      // Draft can go to Ready
      return [CREDITNOTE_STATUS.DRAFT, CREDITNOTE_STATUS.READY];
    
    case CREDITNOTE_STATUS.READY:
      // Ready can go back to Draft or stay Ready
      return [CREDITNOTE_STATUS.DRAFT, CREDITNOTE_STATUS.READY];
    
    case CREDITNOTE_STATUS.AWAITING_CLEARANCE:
      // AwaitingClearance cannot be changed manually (only by DGI response)
      return [CREDITNOTE_STATUS.AWAITING_CLEARANCE];
    
    case CREDITNOTE_STATUS.VALIDATED:
      // Validated is immutable
      return [CREDITNOTE_STATUS.VALIDATED];
    
    case CREDITNOTE_STATUS.REJECTED:
      // Rejected can go back to Draft
      return [CREDITNOTE_STATUS.DRAFT, CREDITNOTE_STATUS.REJECTED];
    
    default:
      return [currentStatus];
  }
};

export const canTransitionToStatus = (
  userRole: UserRole, 
  currentStatus: CreditNoteStatus, 
  targetStatus: CreditNoteStatus
): boolean => {
  const validTransitions = getValidStatusTransitions(userRole, currentStatus);
  return validTransitions.includes(targetStatus);
};

// Bulk operations
export const canSelectForBulkOperation = (
  userRole: UserRole, 
  creditNoteStatus: CreditNoteStatus, 
  operation: 'delete' | 'submit'
): boolean => {
  if (operation === 'delete') {
    return canDeleteCreditNote(userRole, creditNoteStatus);
  }
  
  if (operation === 'submit') {
    return canSubmitCreditNote(userRole, creditNoteStatus);
  }
  
  return false;
};

// UI helper functions
export const getCreditNoteActionPermissions = (userRole: UserRole, creditNoteStatus: CreditNoteStatus) => {
  return {
    canEdit: canModifyCreditNote(userRole, creditNoteStatus),
    canDelete: canDeleteCreditNote(userRole, creditNoteStatus),
    canSubmit: canSubmitCreditNote(userRole, creditNoteStatus),
    canChangeStatus: canChangeCreditNoteStatus(userRole, creditNoteStatus),
    canCheckDGIStatus: canPerformDGIStatusCheck(userRole, creditNoteStatus),
    canViewRejectionReason: canAccessRejectionReason(userRole, creditNoteStatus),
    validStatusTransitions: getValidStatusTransitions(userRole, creditNoteStatus)
  };
};

// Status display helpers
export const getStatusDisplayInfo = (status: CreditNoteStatus) => {
  switch (status) {
    case CREDITNOTE_STATUS.DRAFT:
      return { key: 'draft', color: 'gray', mutable: true };
    case CREDITNOTE_STATUS.READY:
      return { key: 'ready', color: 'blue', mutable: true };
    case CREDITNOTE_STATUS.AWAITING_CLEARANCE:
      return { key: 'awaitingClearance', color: 'yellow', mutable: false };
    case CREDITNOTE_STATUS.VALIDATED:
      return { key: 'validated', color: 'green', mutable: false };
    case CREDITNOTE_STATUS.REJECTED:
      return { key: 'rejected', color: 'red', mutable: true };
    default:
      return { key: 'unknown', color: 'gray', mutable: false };
  }
};