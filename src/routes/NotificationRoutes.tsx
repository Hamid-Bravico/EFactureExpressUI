import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NotificationManagement from '../domains/notifications/components/NotificationManagement';

interface NotificationRoutesProps {
  token: string | null;
}

const NotificationRoutes: React.FC<NotificationRoutesProps> = ({ token }) => {
  return (
    <Routes>
      <Route path="/" element={<NotificationManagement token={token} />} />
    </Routes>
  );
};

export default NotificationRoutes;
