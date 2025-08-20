import { API_BASE_URL } from '../../../config/constants';

export const CREDITNOTE_ENDPOINTS = {
  LIST: `${API_BASE_URL}/creditNotes`,
  CREATE: `${API_BASE_URL}/creditNotes`,
  UPDATE: (id: number) => `${API_BASE_URL}/creditNotes/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/creditNotes/${id}`,
  PDF: (id: number) => `${API_BASE_URL}/creditNotes/${id}/pdf-url`,
  PDF_PREVIEW: (id: number) => `${API_BASE_URL}/creditNotes/${id}/pdf-preview`,
  JSON: (id: number) => `${API_BASE_URL}/creditNotes/${id}/json-url`,
  IMPORT: `${API_BASE_URL}/creditNotes/import-csv`,
  SUBMIT: (id: number) => `${API_BASE_URL}/creditNotes/${id}/dgi-submit`,
  DGI_STATUS: (id: number) => `${API_BASE_URL}/creditNotes/${id}/dgi-status`,
  UPDATE_STATUS: (id: number, newStatus: number) => `${API_BASE_URL}/creditNotes/${id}/status/${newStatus}`,
  SET_DRAFT: (id: number) => `${API_BASE_URL}/creditNotes/${id}/set-draft`,
  SET_READY: (id: number) => `${API_BASE_URL}/creditNotes/${id}/set-ready`,
  DATA_TO_SIGN: (id: number) => `${API_BASE_URL}/creditNotes/${id}/data-to-sign`,
};