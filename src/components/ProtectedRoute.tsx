import React from 'react';
import { Navigate } from 'react-router-dom';
import { decodeJWT } from '../utils/jwt';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const decoded = decodeJWT(token);
  if (!decoded) {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && decoded.role && !allowedRoles.includes(decoded.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 