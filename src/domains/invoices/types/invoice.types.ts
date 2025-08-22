export interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  invoiceId: number;
  taxRate: number;
  catalogItemId?: number | null;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
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
  amountPaid: number;
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
  warnings?: string[];
  isVatExempt: boolean;
  vatExemptionReason?: string;
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
  date: string;
  customerId: number;
  lines: NewLine[];
  isVatExempt: boolean;
  vatExemptionReason?: string;
}