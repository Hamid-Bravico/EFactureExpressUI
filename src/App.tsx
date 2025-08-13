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
import DashboardRoutes from "./routes/DashboardRoutes";
import InvoiceRoutes from "./routes/InvoiceRoutes";
import QuoteRoutes from "./routes/QuoteRoutes";
import CustomerRoutes from "./routes/CustomerRoutes";
import CatalogRoutes from "./routes/CatalogRoutes";
import UserRoutes from "./routes/UserRoutes";
import CreditNoteRoutes from "./routes/CreditNoteRoutes";
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

          {!token ? (
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
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : (
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <Routes>
                {DashboardRoutes({ token })}
                {InvoiceRoutes({ token })}
                {QuoteRoutes({ token })}
                {CustomerRoutes({ token })}
                {CatalogRoutes({ token })}
                {UserRoutes({ token })}
                {CreditNoteRoutes({ token })}
                <Route
                  path="/profile"
                  element={
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
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          )}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
