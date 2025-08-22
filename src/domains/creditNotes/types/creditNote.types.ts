export interface CreditNoteLine {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  creditNoteId: number;
  taxRate: number;
  catalogItemId?: number | null;
}

export interface CreditNote {
  id: number;
  creditNoteNumber: string;
  date: string;
  customer: { 
    id: number; 
    type: number;
    legalName: string;
    ice?: string;
    identifiantFiscal?: string;
    address: string;
    email?: string;
    phoneNumber?: string;
  };
  subTotal: number;
  vat: number;
  total: number;
  lines: CreditNoteLine[];
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
  warnings?: string[];
  originalInvoiceId?: number;
}

// For creating, we don't send `id` or `creditNoteId`
export interface NewLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface NewCreditNote {
  id?: number; // Optional id for updates
  date: string;
  customerId: number;
  lines: NewLine[];
  OriginalInvoiceId: number;
}