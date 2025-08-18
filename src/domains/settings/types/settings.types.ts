export type SettingKey =
  | 'invoice.prefix'
  | 'quote.prefix'
  | 'creditnote.prefix'
  | 'document.number.reset'
  | 'finance.default.tax.rate'
  | 'finance.currency.symbol'
  | 'finance.decimal.places'
  | 'display.items.per.page'
  | 'finance.manager.approval.limit'
  | 'pdf.payment.terms'
  | 'rules.allow.future.dates'
  | 'rules.quote.validity.days';

export interface SettingsMap {
  [key: string]: string | number | boolean | null;
}

export interface SettingUpdatePayload {
  key: SettingKey | string;
  value: string | number | boolean | null;
}

export interface SettingResponse {
  key: string;
  value: string;
  updatedAt: string;
}

export interface UpdateSettingsResponse {
  updatedCount: number;
  settings: SettingResponse[];
}

export interface GetSettingsResponse {
  settings: Array<{
    key: string;
    value: string;
    updatedAt?: string;
  }>;
}


