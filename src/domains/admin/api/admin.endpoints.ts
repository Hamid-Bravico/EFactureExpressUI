import { API_BASE_URL } from '../../../config/constants';

export const ADMIN_ENDPOINTS = {
  ALL_COMPANIES: `${API_BASE_URL}/admin/companies`,
  APPROVE_VERIFICATION: (id: string) => `${API_BASE_URL}/admin/companies/${id}/verification/approve`,
  REJECT_VERIFICATION: (id: string) => `${API_BASE_URL}/admin/companies/${id}/verification/reject`,
  DEACTIVATE_COMPANY: (id: string) => `${API_BASE_URL}/admin/companies/${id}/deactivate`,
  REACTIVATE_COMPANY: (id: string) => `${API_BASE_URL}/admin/companies/${id}/reactivate`,
  DOWNLOAD_DOCUMENT: (id: string) => `${API_BASE_URL}/admin/companies/${id}/verification/document`,
};
