import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import DashboardManagement from "../domains/dashboard/components/DashboardManagement";
import { useTranslation } from "react-i18next";

export default function DashboardPage({ token }: { token: string | null }) {
  const { t } = useTranslation();
  return (
    <ProtectedRoute>
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
        <DashboardManagement token={token} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
