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
import AppNavbar from "./components/AppNavbar";

function App() {
  const { t, i18n } = useTranslation();
  // Use the new auth hook
  const { token, setToken, company, setCompany, handleLogin, handleLogout } = useAuthHandlers();
  // Use the new language hook
  const { toggleLanguage } = useLanguage();
  const { userEmail, userRole } = useUserInfo(token);

  useTokenRefresh(setToken, setCompany, t);

  // ─── ACCOUNT DROPDOWN ──────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Track if initial data has been loaded to prevent infinite loops
  const initialLoadRef = useRef(false);
  
  useEffect(() => {
    if (token && !initialLoadRef.current) {
      initialLoadRef.current = true;
    }
  }, [token]);

  // ─── RENDER NAVBAR ─────────────────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="min-h-screen bg-gray-100">
          <Toaster position="top-right" />
          
          {token && (
            <AppNavbar
              token={token}
              userRole={userRole || ""}
              userEmail={userEmail || ""}
              company={company}
              i18n={i18n}
              t={t}
              handleLogout={handleLogout}
              toggleLanguage={toggleLanguage}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              dropdownRef={dropdownRef}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          )}
          
          <Routes>
            <Route
              path="/login"
              element={
                !token ? (
                  <LoginPage
                    onLogin={handleLogin}
                    onToggleLanguage={toggleLanguage}
                    currentLanguage={i18n.language}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/register"
              element={
                !token ? (
                  <RegisterPage
                    onToggleLanguage={toggleLanguage}
                    currentLanguage={i18n.language}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <DashboardPage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/invoices"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <InvoicePage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/quotes"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <QuotePage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/customers"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <CustomerPage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/catalog"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <CatalogPage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/users"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <UserPage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/credit-notes"
              element={
                token ? (
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <CreditNotePage token={token} />
                  </main>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/profile"
              element={
                token ? (
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
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route 
              path="*" 
              element={
                token ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
