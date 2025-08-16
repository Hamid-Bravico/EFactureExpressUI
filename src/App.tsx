import React from "react";
import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./domains/auth/components/LoginPage";
import RegisterPage from "./domains/auth/components/RegisterPage";
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
          <StatsProvider token={token}>
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
                    <DashboardPage token={token} />
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
