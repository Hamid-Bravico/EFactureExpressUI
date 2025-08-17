import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import SettingsManagement from "../domains/settings/components/SettingsManagement";
import { useTranslation } from "react-i18next";

export default function SettingsPage({ token }: { token: string | null }) {
  const { t } = useTranslation();
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
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
        <SettingsManagement token={token} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}


