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
import Layout from "./components/Layout";
import { StatsProvider } from "./domains/stats/context/StatsContext";
import CompanyRejectedPage from "./domains/auth/components/CompanyRejectedPage";
import { VerificationStatus } from "./domains/auth/types/auth.types";

function App() {
  const { t, i18n } = useTranslation();
  // Use the new auth hook
  const { token, setToken, company, setCompany, handleLogin, handleLogout } = useAuthHandlers();
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
          // Company verification logic
          company && company.verificationStatus === VerificationStatus.PendingVerification ? (
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
          ) : company && company.verificationStatus === VerificationStatus.NeedsCorrection ? (
            <CompanyRejectedPage 
              onToggleLanguage={toggleLanguage}
              currentLanguage={i18n.language}
              onLogout={handleLogout}
              token={token}
              companyData={company}
              onCompanyStatusUpdate={setCompany}
            />
          ) : company && company.verificationStatus === VerificationStatus.Verified ? (
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
                <Route
                  path="/"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <DashboardPage token={token} company={company} />
                    </main>
                  }
                />
                <Route
                  path="/invoices"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <InvoicePage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/quotes"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <QuotePage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <CustomerPage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/catalog"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <CatalogPage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <UserPage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/credit-notes"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <CreditNotePage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <SettingsPage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/notifications/*"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <NotificationPage token={token} />
                    </main>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                      <ProtectedRoute>
                        <CompanyProfile 
                          company={company} 
                          token={token} 
                          onUpdate={(updatedCompany) => {
                            if (company) {
                              const updatedCompanyData = { ...company, ...updatedCompany };
                              setCompany(updatedCompanyData);
                              tokenManager.updateCompanyData(updatedCompany);
                            }
                          }}
                        />
                      </ProtectedRoute>
                    </main>
                  }
                />
                <Route 
                  path="*" 
                  element={<Navigate to="/" replace />}
                />
              </Routes>
              </Layout>
            </StatsProvider>
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
