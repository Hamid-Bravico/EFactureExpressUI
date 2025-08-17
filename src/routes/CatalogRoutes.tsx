import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import CatalogManagement from "../domains/catalog/components/CatalogManagement";
import { useTranslation } from "react-i18next";

export default function CatalogPage({ token }: { token: string | null }) {
  const { t } = useTranslation();
  return (
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
        <CatalogManagement token={token || ""} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
