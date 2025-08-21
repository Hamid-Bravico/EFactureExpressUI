export interface PendingCompany {
  id: string;
  name: string;
  ice: string;
  identifiantFiscal: string;
  taxeProfessionnelle: string;
  address: string;
  verificationStatus: number;
  verificationRejectionReason: string | null;
  hasVerificationDocument: boolean;
  isActive: boolean;
  isMainAdminUserConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  invoiceCount: number;
}

export interface VerificationAction {
  companyId: string;
  action: 'approve' | 'reject' | 'deactivate' | 'reactivate';
  reason?: string;
}

export interface ApiResponse<T> {
  succeeded: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
