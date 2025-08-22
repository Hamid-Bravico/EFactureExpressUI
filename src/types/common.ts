export interface PdfUrlResponse {
  url: string;
}

export interface Company {
  id: number | string;
  name: string;
  ice?: string;
  identifiantFiscal?: string;
  taxeProfessionnelle?: string;
  address: string;
  createdAt: string;
  verificationStatus?: number;
  verificationRejectionReason?: string | null;
}





export interface DgiStatusResponse {
  submissionId: string;
  status: 'PendingValidation' | 'Validated' | 'Rejected';
  errors: {
    errorCode: string;
    errorMessage: string;
  }[];
  isSuccessful: boolean;
}

export interface Pagination {
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
