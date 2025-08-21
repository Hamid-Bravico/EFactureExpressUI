import React from 'react';
import AdminDashboard from '../domains/admin/components/AdminDashboard';
import AdminLayout from '../domains/admin/components/AdminLayout';

interface AdminRoutesProps {
  token: string;
  userEmail: string;
  handleLogout: () => void;
  toggleLanguage: () => void;
  currentLanguage: string;
}

const AdminRoutes: React.FC<AdminRoutesProps> = ({ 
  token, 
  userEmail, 
  handleLogout, 
  toggleLanguage, 
  currentLanguage 
}) => {
  return (
    <AdminLayout
      userEmail={userEmail}
      handleLogout={handleLogout}
      toggleLanguage={toggleLanguage}
      currentLanguage={currentLanguage}
    >
      <AdminDashboard token={token} />
    </AdminLayout>
  );
};

export default AdminRoutes;
