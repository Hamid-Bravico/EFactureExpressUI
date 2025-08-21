import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ADMIN_ENDPOINTS } from '../api/admin.endpoints';
import { PendingCompany, VerificationAction } from '../types/admin.types';
import { getSecureHeaders, getSecureJsonHeaders } from '../../../config/api';
import { toast } from 'react-hot-toast';
import { tokenManager } from '../../../utils/tokenManager';
import { VerificationStatus } from '../../auth/types/auth.types';

interface AdminDashboardProps {
  token: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token }) => {
  const { t, i18n } = useTranslation();
  const [allCompanies, setAllCompanies] = useState<PendingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<PendingCompany | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} ${t('common.copied', 'copied to clipboard')}`);
    }).catch(() => {
      toast.error(t('common.copyFailed', 'Failed to copy'));
    });
  };

  useEffect(() => {
    fetchAllCompanies();
  }, []);

  const fetchAllCompanies = async () => {
    try {
      const validToken = await tokenManager.getValidToken();
      if (!validToken) {
        toast.error(t('auth.tokenExpired'));
        return;
      }

      const response = await fetch(ADMIN_ENDPOINTS.ALL_COMPANIES, {
        method: 'GET',
        headers: getSecureHeaders(validToken),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.succeeded && data.data) {
        setAllCompanies(data.data);
      } else {
        toast.error(data.message || t('admin.errors.fetchFailed'));
      }
    } catch (error) {
      toast.error(t('admin.errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async (action: VerificationAction) => {
    try {
      const validToken = await tokenManager.getValidToken();
      if (!validToken) {
        toast.error(t('auth.tokenExpired'));
        return;
      }

      let endpoint: string;
      let body: any = {};

      if (action.action === 'approve') {
        endpoint = ADMIN_ENDPOINTS.APPROVE_VERIFICATION(action.companyId);
      } else if (action.action === 'reject') {
        endpoint = ADMIN_ENDPOINTS.REJECT_VERIFICATION(action.companyId);
        body = { reason: action.reason };
      } else if (action.action === 'deactivate') {
        endpoint = ADMIN_ENDPOINTS.DEACTIVATE_COMPANY(action.companyId);
        body = { reason: action.reason };
      } else if (action.action === 'reactivate') {
        endpoint = ADMIN_ENDPOINTS.REACTIVATE_COMPANY(action.companyId);
      } else {
        throw new Error(`Unknown action: ${action.action}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getSecureJsonHeaders(validToken),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.succeeded) {
         toast.success(data.message || t(`admin.messages.${action.action}Success`));
         fetchAllCompanies();
         setShowRejectModal(false);
         setRejectReason('');
         setSelectedCompany(null);
       } else {
        toast.error(data.message || t(`admin.errors.${action.action}Failed`));
      }
    } catch (error) {
      console.error('Error in handleVerificationAction:', error);
      toast.error(t('admin.errors.networkError'));
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PendingVerification:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{t('admin.status.pending')}</span>;
      case VerificationStatus.NeedsCorrection:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{t('admin.status.needsCorrection')}</span>;
      case VerificationStatus.Verified:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{t('admin.status.approved')}</span>;
      default:
        return null;
    }
  };

  const handleDownloadDocument = async (companyId: string) => {
    try {
      const validToken = await tokenManager.getValidToken();
      if (!validToken) {
        toast.error(t('auth.tokenExpired'));
        return;
      }

      const response = await fetch(ADMIN_ENDPOINTS.DOWNLOAD_DOCUMENT(companyId), {
        method: 'GET',
        headers: getSecureHeaders(validToken),
        credentials: 'include',
      });

       
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `company-document-${companyId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        toast.error(data.message || t('admin.errors.downloadFailed'));
      }
    } catch (error) {
      toast.error(t('admin.errors.networkError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Stats Header */}
      <div className="bg-white shadow-lg rounded-xl p-6 border-l-4 border-purple-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin.ui.overviewTitle', 'Verification Overview')}</h2>
            <p className="text-gray-600">{t('admin.ui.overviewSubtitle', 'Manage company verification requests')}</p>
          </div>
                     <div className="flex items-center space-x-4">
             <div className="text-center">
               <div className="text-3xl font-bold text-purple-600">
                 {allCompanies.filter(company => company.verificationStatus === VerificationStatus.PendingVerification).length}
               </div>
               <div className="text-sm text-gray-500">{t('admin.status.pending', 'Pending')}</div>
             </div>
             <div className="w-px h-12 bg-gray-300"></div>
             <div className="text-center">
               <div className="text-3xl font-bold text-orange-600">
                 {allCompanies.filter(company => company.verificationStatus === VerificationStatus.NeedsCorrection).length}
               </div>
               <div className="text-sm text-gray-500">{t('admin.status.needsCorrection', 'Needs Correction')}</div>
             </div>
             <div className="w-px h-12 bg-gray-300"></div>
             <div className="text-center">
               <div className="text-3xl font-bold text-green-600">
                 {allCompanies.filter(company => company.verificationStatus === VerificationStatus.Verified).length}
               </div>
               <div className="text-sm text-gray-500">{t('admin.status.approved', 'Approved')}</div>
             </div>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
                     <h3 className="text-lg font-semibold text-gray-900">{t('admin.ui.allCompanies', 'All Companies')}</h3>
        </div>
        
        <div className="p-6">
                     {allCompanies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('admin.dashboard.noPending', 'No Pending Verifications')}
            </h3>
            <p className="text-gray-500">
              {t('admin.dashboard.noPendingDesc', 'All companies have been processed.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
                         {allCompanies.map((company) => (
              <div key={company.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {company.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 group cursor-pointer hover:bg-gray-50 rounded px-1 py-1 transition-colors"
                           onClick={() => copyToClipboard(company.name, t('admin.company.name', 'Company name'))}>
                        <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 group cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => copyToClipboard(company.ice, 'ICE')}>
                            ICE: {company.ice}
                            <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 group cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => copyToClipboard(company.identifiantFiscal, 'IF')}>
                            IF: {company.identifiantFiscal}
                            <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    {getStatusBadge(company.verificationStatus)}
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(company.createdAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t('admin.company.address', 'Address')}
                      </h4>
                      <div className="group cursor-pointer hover:bg-gray-75 rounded p-2 transition-colors"
                           onClick={() => copyToClipboard(company.address, t('admin.company.address', 'Address'))}>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {company.address}
                        </p>
                        <div className="flex justify-end">
                          <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t('admin.company.business', 'Business Info')}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between group cursor-pointer hover:bg-purple-25 rounded px-1 transition-colors"
                             onClick={() => copyToClipboard(company.taxeProfessionnelle, 'TP')}>
                          <span className="text-gray-600">TP:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-900">{company.taxeProfessionnelle}</span>
                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('admin.company.userCount', 'Users')}:</span>
                          <span className="font-medium text-purple-700">{company.userCount}</span>
                        </div>
                                                 <div className="flex justify-between">
                           <span className="text-gray-600">{t('admin.company.invoiceCount', 'Invoices')}:</span>
                           <span className="font-medium text-purple-700">{company.invoiceCount}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-gray-600">{t('admin.company.mainAdminConfirmed', 'Main Admin Confirmed')}:</span>
                           <span className={`font-medium ${company.isMainAdminUserConfirmed ? 'text-green-700' : 'text-red-700'}`}>
                             {company.isMainAdminUserConfirmed ? t('common.yes', 'Yes') : t('common.no', 'No')}
                           </span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  {company.hasVerificationDocument && (
                    <button
                      onClick={() => handleDownloadDocument(company.id)}
                      className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('admin.actions.download', 'Download Documents')}
                    </button>
                  )}
                  
                                     {company.verificationStatus !== VerificationStatus.Verified && (
                     <>
                       <button
                         onClick={() => handleVerificationAction({ companyId: company.id, action: 'approve' })}
                         className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md hover:shadow-lg transition-all duration-150"
                       >
                         <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                         </svg>
                         {t('admin.actions.approve', 'Approve')}
                       </button>
                       <button
                         onClick={() => {
                           setSelectedCompany(company);
                           setShowRejectModal(true);
                         }}
                         className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-md hover:shadow-lg transition-all duration-150"
                       >
                         <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                         {t('admin.actions.reject', 'Reject')}
                       </button>
                     </>
                   )}

                   {company.verificationStatus === VerificationStatus.Verified && !company.isActive && (
                     <button
                       onClick={() => handleVerificationAction({ companyId: company.id, action: 'reactivate' })}
                       className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transition-all duration-150"
                     >
                       <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                       {t('admin.actions.reactivate', 'Reactivate')}
                     </button>
                   )}
                  
                                     {company.isActive && (
                     <button
                       onClick={() => {
                         setSelectedCompany(company);
                         setShowRejectModal(true);
                       }}
                       className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md hover:shadow-lg transition-all duration-150"
                     >
                       <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                       {t('admin.actions.deactivate', 'Deactivate')}
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

             {/* Reject/Deactivate Modal */}
       {showRejectModal && selectedCompany && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <h3 className="text-lg font-medium text-gray-900 mb-4">
                 {selectedCompany.verificationStatus !== VerificationStatus.Verified 
                   ? t('admin.reject.title', 'Reject Verification') 
                   : t('admin.deactivate.title', 'Deactivate Company')}
               </h3>
               <p className="text-sm text-gray-600 mb-4">
                 {selectedCompany.verificationStatus !== VerificationStatus.Verified
                   ? t('admin.reject.message', 'Please provide a reason for rejecting this verification.')
                   : t('admin.deactivate.message', 'Please provide a reason for deactivating this company.')}
               </p>
               <textarea
                 value={rejectReason}
                 onChange={(e) => setRejectReason(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                 rows={4}
                 placeholder={selectedCompany.verificationStatus !== VerificationStatus.Verified
                   ? t('admin.reject.placeholder', 'Enter rejection reason...')
                   : t('admin.deactivate.placeholder', 'Enter deactivation reason...')}
               />
               <div className="flex justify-end gap-3 mt-4">
                 <button
                   onClick={() => {
                     setShowRejectModal(false);
                     setRejectReason('');
                     setSelectedCompany(null);
                   }}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   {t('common.cancel', 'Cancel')}
                 </button>
                 <button
                   onClick={() => handleVerificationAction({ 
                     companyId: selectedCompany.id, 
                     action: selectedCompany.verificationStatus !== VerificationStatus.Verified ? 'reject' : 'deactivate', 
                     reason: rejectReason 
                   })}
                   disabled={!rejectReason.trim()}
                   className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {selectedCompany.verificationStatus !== VerificationStatus.Verified 
                     ? t('admin.actions.reject', 'Reject') 
                     : t('admin.actions.deactivate', 'Deactivate')}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default AdminDashboard;
