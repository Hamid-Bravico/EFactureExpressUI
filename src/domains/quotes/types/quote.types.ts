// Quote types
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
  expiryDate?: string;
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

// For creating, we don't send `id` or `quoteId`
export interface NewLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
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