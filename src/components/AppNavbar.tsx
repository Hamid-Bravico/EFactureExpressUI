import { NavLink } from "react-router-dom";
import { APP_CONFIG } from "../config/app";

function AppNavbar({
  token,
  userRole,
  userEmail,
  company,
  i18n,
  t,
  handleLogout,
  toggleLanguage,
  dropdownOpen,
  setDropdownOpen,
  dropdownRef,
  mobileMenuOpen,
  setMobileMenuOpen
}: {
  token: string | null;
  userRole: string;
  userEmail: string;
  company: any;
  i18n: any;
  t: any;
  handleLogout: () => void;
  toggleLanguage: () => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const isAdmin = userRole === 'Admin';
  const isManager = userRole === 'Manager';
  const canAccessUsers = isAdmin || isManager;

  return (
    <nav className="sticky top-0 z-40 bg-gradient-to-r from-white/90 via-blue-50/80 to-white/90 backdrop-blur border-b border-gray-200 shadow-sm rounded-b-2xl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <img
                src={token ? APP_CONFIG.logo : APP_CONFIG.logoH}
                alt={`${APP_CONFIG.title} Logo`}
                className="h-8 w-auto"
              />
            </div>
            {/* Always render navigation links */}
            <>
              <button
                className="sm:hidden ml-2 p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className={`hidden sm:flex sm:ml-8 sm:space-x-2 transition-all duration-200`}>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                    ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                    after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                    hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                  }
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {t('common.dashboard')}
                </NavLink>
                <NavLink
                  to="/invoices"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                    ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                    after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                    hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                  }
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('common.invoices')}
                </NavLink>
                <NavLink
                  to="/quotes"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                    ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                    after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                    hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                  }
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {t('common.quotes')}
                </NavLink>
                <NavLink
                  to="/customers"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                    ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                    after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                    hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                  }
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {t('common.customers')}
                </NavLink>
                {(isAdmin || isManager) && (
                  <NavLink
                    to="/catalog"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                      ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                      after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                      hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                    }
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {t('common.catalog')}
                  </NavLink>
                )}
                {canAccessUsers && (
                  <NavLink
                    to="/users"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                      ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                      after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                      hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                    }
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {t('common.users')}
                  </NavLink>
                )}
                <NavLink
                  to="/credit-notes"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 relative
                    ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}
                    after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500 after:scale-x-0 after:transition-transform after:duration-200
                    hover:after:scale-x-100 focus:after:scale-x-100 ${isActive ? 'after:scale-x-100' : ''}`
                  }
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 8h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  </svg>
                  {t('common.creditNotes')}
                </NavLink>
              </div>
              {/* Mobile menu */}
              {mobileMenuOpen && (
                <div className="absolute left-0 top-16 w-full bg-white/95 shadow-lg rounded-b-2xl border-t border-gray-200 flex flex-col space-y-1 py-2 px-2 sm:hidden animate-fade-in z-50 transition-all duration-300">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {t('common.dashboard')}
                  </NavLink>
                  <NavLink
                    to="/invoices"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('common.invoices')}
                  </NavLink>
                  <NavLink
                    to="/quotes"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    {t('common.quotes')}
                  </NavLink>
                  <NavLink
                    to="/customers"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t('common.customers')}
                  </NavLink>
                  {(isAdmin || isManager) && (
                    <NavLink
                      to="/catalog"
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                          isActive
                            ? "bg-blue-50 text-blue-700 shadow-sm"
                            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        }`
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {t('common.catalog')}
                    </NavLink>
                  )}
                  {canAccessUsers && (
                    <NavLink
                      to="/users"
                      className={({ isActive }) =>
                        `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                          isActive
                            ? "bg-blue-50 text-blue-700 shadow-sm"
                            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        }`
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {t('common.users')}
                    </NavLink>
                  )}
                  <NavLink
                    to="/credit-notes"
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 8h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                    {t('common.creditNotes')}
                  </NavLink>
                </div>
              )}
            </>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
            >
              {i18n.language === 'en' ? 'FR' : 'EN'}
            </button>
            {token && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 sm:space-x-3 px-3 py-2 text-sm font-medium text-gray-700 bg-white/80 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transform hover:scale-105"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="max-w-[110px] sm:max-w-[150px] truncate">{userEmail}</span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform duration-150 ${dropdownOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 py-1 animate-fadeIn">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-medium text-gray-900 truncate">{userEmail}</div>
                      <div className="text-sm text-gray-500 mt-0.5 flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${userRole === 'Admin' ? 'bg-indigo-400' : userRole === 'Manager' ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                        <span className="capitalize">{userRole}</span>
                      </div>
                    </div>
                    {company && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-medium text-gray-900 truncate flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm5 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h2a1 1 0 100-2H8zm2 3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                          </svg>
                          {company.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{(company.ICE || company.ice) ? `ICE: ${company.ICE || company.ice}` : 'ICE:'}</span>
                        </div>
                      </div>
                    )}
                    <NavLink
                      to="/profile"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors duration-150"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{t('common.profile')}</span>
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors duration-150 border-t border-gray-200 mt-2 pt-2"
                    >
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                      </svg>
                      <span className="font-medium">{t('auth.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
