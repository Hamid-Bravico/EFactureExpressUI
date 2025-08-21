import React from "react";
import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./domains/auth/components/LoginPage";
import RegisterPage from "./domains/auth/components/RegisterPage";
import EmailConfirmationPage from "./domains/auth/components/EmailConfirmationPage";
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPage from './components/ErrorPage';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';
import { tokenManager } from "./utils/tokenManager";
import CompanyProfile from "./components/CompanyProfile";
import { useAuthHandlers } from "./domains/auth/components/AuthHandlers";
import { useLanguage } from "./utils/useLanguage";
import { useTokenRefresh } from "./utils/useTokenRefresh";
import { useUserInfo } from "./utils/useUserInfo";
import DashboardPage from "./routes/DashboardRoutes";
import InvoicePage from "./routes/InvoiceRoutes";
import QuotePage from "./routes/QuoteRoutes";
import CustomerPage from "./routes/CustomerRoutes";
import CatalogPage from "./routes/CatalogRoutes";
import UserPage from "./routes/UserRoutes";
import CreditNotePage from "./routes/CreditNoteRoutes";
import SettingsPage from "./routes/SettingsRoutes";
import NotificationPage from "./routes/NotificationRoutes";
import AdminPage from "./routes/AdminRoutes";
import Layout from "./components/Layout";
import { StatsProvider } from "./domains/stats/context/StatsContext";
import CompanyRejectedPage from "./domains/auth/components/CompanyRejectedPage";
import { VerificationStatus, OnboardingState } from "./domains/auth/types/auth.types";

function App() {
  const { t, i18n } = useTranslation();
  // Use the new auth hook
  const { token, setToken, company, setCompany, onboardingState, setOnboardingState, nextAction, setNextAction, handleLogin, handleLogout } = useAuthHandlers();
  // Use the new language hook
  const { toggleLanguage } = useLanguage();
  const { userEmail, userRole } = useUserInfo(token);

  useTokenRefresh(setToken, setCompany, t);

  // Track if initial data has been loaded to prevent infinite loops
  const initialLoadRef = useRef(false);
  
  useEffect(() => {
    if (token && !initialLoadRef.current) {
      initialLoadRef.current = true;
    }
  }, [token]);

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary
      fallback={
        <ErrorPage
          title={t('errors.applicationError')}
          message={t('errors.somethingWentWrong')}
          onRetry={() => window.location.reload()}
        />
      }
    >
      <BrowserRouter>
        <Toaster position="top-right" />
        {token ? (
          // Onboarding state logic
          onboardingState === OnboardingState.EmailUnverified ? (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
              <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg relative">
                {/* Language Toggle Button */}
                <button
                  onClick={toggleLanguage}
                  className="absolute top-4 right-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
                >
                  {i18n.language === 'en' ? 'FR' : 'EN'}
                </button>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="bg-yellow-100 p-4 rounded-full">
                      <svg className="h-12 w-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {t('auth.emailUnverified.title', 'Email Verification Required')}
                  </h2>
                  
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    {t('auth.emailUnverified.message', 'Please check your email and click the verification link to activate your account.')}
                  </p>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('auth.emailUnverified.whatToDo', 'What to do next?')}
                    </h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• {t('auth.emailUnverified.step1', 'Check your email inbox')}</li>
                      <li>• {t('auth.emailUnverified.step2', 'Click the verification link')}</li>
                      <li>• {t('auth.emailUnverified.step3', 'Return here to continue')}</li>
                    </ul>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('auth.emailUnverified.refresh', 'I\'ve verified my email')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      {t('auth.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : onboardingState === OnboardingState.CompanyPendingVerification ? (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
              <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg relative">
                {/* Language Toggle Button */}
                <button
                  onClick={toggleLanguage}
                  className="absolute top-4 right-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
                >
                  {i18n.language === 'en' ? 'FR' : 'EN'}
                </button>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="bg-blue-100 p-4 rounded-full">
                      <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {t('auth.pendingVerification.title', 'Your application is under review')}
                  </h2>
                  
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    {t('auth.pendingVerification.message', 'We are still verifying the authenticity of your company data and uploaded documents. This process typically takes 24-48 hours.')}
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('auth.pendingVerification.whatHappens', 'What happens next?')}
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• {t('auth.pendingVerification.step1', 'Our team reviews your documents')}</li>
                      <li>• {t('auth.pendingVerification.step2', 'We verify company information')}</li>
                      <li>• {t('auth.pendingVerification.step3', 'You\'ll receive an email notification')}</li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      {t('auth.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : onboardingState === OnboardingState.CompanyRejected ? (
            <CompanyRejectedPage 
              onToggleLanguage={toggleLanguage}
              currentLanguage={i18n.language}
              onLogout={handleLogout}
              token={token}
              companyData={company || undefined}
              onCompanyStatusUpdate={setCompany}
            />
          ) : onboardingState === OnboardingState.Inactive ? (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center px-4">
              <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg relative">
                {/* Language Toggle Button */}
                <button
                  onClick={toggleLanguage}
                  className="absolute top-4 right-4 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
                >
                  {i18n.language === 'en' ? 'FR' : 'EN'}
                </button>

                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="bg-red-100 p-4 rounded-full">
                      <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {t('auth.inactive.title', 'Account Inactive')}
                  </h2>
                  
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    {t('auth.inactive.message', 'Your account has been deactivated. Please contact support for assistance.')}
                  </p>

                  {nextAction && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                      <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('auth.inactive.reason', 'Reason')}
                      </h3>
                      <p className="text-sm text-red-700">{nextAction}</p>
                    </div>
                  )}

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent(t('auth.inactive.emailSubject', 'Account Reactivation Request'));
                        const body = encodeURIComponent(
                          t('auth.inactive.emailBody', 'Hello,\n\nI need assistance with reactivating my account.\n\nCompany Name: {{companyName}}\nCompany ID: {{companyId}}\n\nPlease provide support.\n\nBest regards,')
                            .replace('{{companyName}}', company?.name || 'N/A')
                            .replace('{{companyId}}', String(company?.id || 'N/A'))
                        );
                        window.open(`mailto:contact@bravico.ma?subject=${subject}&body=${body}`, '_blank');
                      }}
                      className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('auth.inactive.contactSupport', 'Contact Support')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      {t('auth.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : onboardingState === OnboardingState.FullyVerified ? (
            userRole === 'SystemAdmin' ? (
              <AdminPage 
                token={token} 
                userEmail={userEmail || ""}
                handleLogout={handleLogout}
                toggleLanguage={toggleLanguage}
                currentLanguage={i18n.language}
              />
            ) : (
              <StatsProvider token={token} userRole={userRole || ""}>
                <Layout
                  token={token}
                  userRole={userRole || ""}
                  userEmail={userEmail || ""}
                  company={company}
                  i18n={i18n}
                  t={t}
                  handleLogout={handleLogout}
                  toggleLanguage={toggleLanguage}
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage token={token} company={company} />} />
                    <Route path="/invoices" element={<InvoicePage token={token} />} />
                    <Route path="/quotes" element={<QuotePage token={token} />} />
                    <Route path="/customers" element={<CustomerPage token={token} />} />
                    <Route path="/catalog" element={<CatalogPage token={token} />} />
                    <Route path="/users" element={<UserPage token={token} />} />
                    <Route path="/credit-notes" element={<CreditNotePage token={token} />} />
                    <Route path="/settings" element={<SettingsPage token={token} />} />
                    <Route path="/notifications" element={<NotificationPage token={token} />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </StatsProvider>
            )
          ) : null
        ) : (
          <Routes>
            <Route
              path="/login"
              element={
                <LoginPage
                  onLogin={handleLogin}
                  onToggleLanguage={toggleLanguage}
                  currentLanguage={i18n.language}
                />
              }
            />
            <Route
              path="/register"
              element={
                <RegisterPage
                  onToggleLanguage={toggleLanguage}
                  currentLanguage={i18n.language}
                />
              }
            />
            <Route
              path="/auth/email-confirmed"
              element={
                <EmailConfirmationPage />
              }
            />
            <Route 
              path="*" 
              element={<Navigate to="/login" replace />}
            />
          </Routes>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
