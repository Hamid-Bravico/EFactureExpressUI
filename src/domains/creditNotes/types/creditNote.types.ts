export enum PaymentMethod {
  BankTransfer = 1,
  Check = 2,
  BillOfExchange = 3,
  BankCard = 4,
  Cash = 5,
  SetOff = 6
}

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
  originalInvoice?: {
    id: number;
    invoiceNumber: string;
  };
  isVatExempt: boolean;
  vatExemptionReason?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
}

export function getPaymentMethodLabel(method: PaymentMethod, t: (key: string) => string): string {
  switch (method) {
    case PaymentMethod.BankTransfer:
      return t('creditNote.paymentMethod.bankTransfer');
    case PaymentMethod.Check:
      return t('creditNote.paymentMethod.check');
    case PaymentMethod.BillOfExchange:
      return t('creditNote.paymentMethod.billOfExchange');
    case PaymentMethod.BankCard:
      return t('creditNote.paymentMethod.bankCard');
    case PaymentMethod.Cash:
      return t('creditNote.paymentMethod.cash');
    case PaymentMethod.SetOff:
      return t('creditNote.paymentMethod.setOff');
    default:
      return t('creditNote.paymentMethod.unknown');
  }
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
  isVatExempt: boolean;
  vatExemptionReason?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
}