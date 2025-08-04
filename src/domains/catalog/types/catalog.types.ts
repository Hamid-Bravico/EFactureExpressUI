// Catalog types
export interface Catalog {
  id: number;
  CodeArticle: string;
  Name: string;
  Description: string;
  UnitPrice: number;
  DefaultTaxRate: number;
  Type: number;
}

export interface NewCatalog {
  id?: number;
  CodeArticle: string;
  Name: string;
  Description: string;
  UnitPrice: number;
  DefaultTaxRate: number;
  Type: number;
}