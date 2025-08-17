import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import ErrorBoundary from '../components/ErrorBoundary';
import ErrorPage from '../components/ErrorPage';
import NotificationManagement from '../domains/notifications/components/NotificationManagement';
import { useTranslation } from 'react-i18next';

interface NotificationRoutesProps {
  token: string | null;
}

const NotificationRoutes: React.FC<NotificationRoutesProps> = ({ token }) => {
  const { t } = useTranslation();
  
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
          <ErrorBoundary
            fallback={
              <ErrorPage
                inline
                title={t('errors.applicationError')}
                message={t('errors.sectionError')}
                onRetry={undefined}
              />
            }
          >
            <NotificationManagement token={token} />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default NotificationRoutes;
