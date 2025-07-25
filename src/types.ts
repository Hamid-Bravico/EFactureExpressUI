export interface InvoiceLine {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    invoiceId: number;
    taxRate: number;
  }
  
  export interface Invoice {
    id: number;
    invoiceNumber: string;
    date: string;
    customer: { id: number; name: string };
    subTotal: number;
    vat: number;
    total: number;
    lines: InvoiceLine[];
    status: number; // 0 = Draft, 1 = Ready, 2 = AwaitingClearance, 3 = Validated, 4 = Rejected
    createdAt: string;
    createdBy: {
      createdById: string;
      name: string;
      email: string;
    };
    vatRate?: number;
    dgiSubmissionId?: string;
    dgiRejectionReason?: string;
  }
  
  // For creating, we don't send `id` or `invoiceId`
  export interface NewLine {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }
  
  export interface NewInvoice {
    id?: number; // Optional id for updates
    invoiceNumber: string;
    date: string;
    customerId: number;
    subTotal: number;
    vat: number;
    total: number;
    status: number; // 0 = Draft, 1 = Ready, 2 = AwaitingClearance, 3 = Validated, 4 = Rejected
    lines: NewLine[];
  }

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
  