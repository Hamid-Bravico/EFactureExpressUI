import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

interface LayoutProps {
  children: React.ReactNode;
  token: string | null;
  userRole: string;
  userEmail: string;
  company: any;
  i18n: any;
  t: any;
  handleLogout: () => void;
  toggleLanguage: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  token,
  userRole,
  userEmail,
  company,
  i18n,
  t,
  handleLogout,
  toggleLanguage
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null && !isMobile) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, [isMobile]);

  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {token && (
        <>
          <Sidebar 
            userRole={userRole}
            t={t}
            isCollapsed={sidebarCollapsed}
            setIsCollapsed={handleSidebarToggle}
          />
          <StatusBar
            token={token}
            userRole={userRole}
            userEmail={userEmail}
            company={company}
            i18n={i18n}
            t={t}
            handleLogout={handleLogout}
            toggleLanguage={toggleLanguage}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
          />
        </>
      )}
      
      <main 
        className={`
          transition-all duration-300 pt-6
          ${token ? (isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-20' : 'ml-64')) : ''}
        `}
      >
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
