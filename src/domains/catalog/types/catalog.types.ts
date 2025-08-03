// Quote types
export interface Catalog {
  id: number;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  defaultTaxRate: number;
}

export interface NewCatalog {
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
}