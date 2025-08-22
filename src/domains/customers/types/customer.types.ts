export enum CustomerType {
  Business = 0,
  Individual = 1
}

export interface Customer {
  id: number;
  type: CustomerType;
  legalName: string;
  ice?: string;
  identifiantFiscal?: string;
  address: string;
  email?: string;
  phoneNumber?: string;
  createdAt: string;
}

export interface CreateCustomerRequest {
  type: CustomerType;
  legalName: string;
  ice?: string;
  identifiantFiscal?: string;
  address: string;
  email?: string;
  phoneNumber?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: number;
}
