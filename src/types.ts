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

  // Quote types - adapted from Invoice types
  export interface QuoteLine {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    quoteId: number;
    taxRate: number;
  }
  
  export interface Quote {
    id: number;
    quoteNumber: string;
    issueDate: string;
    expiryDate: string;
    customer: { id: number; name: string };
    subTotal: number;
    vat: number;
    total: number;
    lines: QuoteLine[];
    status: string; // "Draft", "Sent", "Accepted", "Rejected", "Converted"
    createdAt: string;
    createdBy: {
      createdById: string;
      name: string;
      email: string;
    };
    vatRate?: number;
    termsAndConditions?: string;
    privateNotes?: string;
  }
  
  export interface NewQuote {
  id?: number; // Optional id for updates
  quoteNumber?: string; // Made optional since it will be auto-generated
  issueDate: string;
  expiryDate?: string; // Made optional since it's not always required
  customerId: number;
  subTotal: number;
  vat: number;
  total: number;
  status: string; // "Draft", "Sent", "Accepted", "Rejected", "Converted"
  lines: NewLine[];
  termsAndConditions?: string;
  privateNotes?: string;
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
  