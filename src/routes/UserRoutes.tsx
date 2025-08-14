import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import Users from "../domains/users/components/Users";
import { useTranslation } from "react-i18next";

export default function UserPage({ token }: { token: string | null }) {
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
        <Users token={token || ""} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
