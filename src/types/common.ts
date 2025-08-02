export interface PdfUrlResponse {
  url: string;
}

export interface Company {
  id: number;
  name: string;
  ICE: string;
  identifiantFiscal?: string;
  address: string;
  createdAt: string;
}



export interface Customer {
  id: number;
  name: string;
  ice?: string;
  taxId?: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
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