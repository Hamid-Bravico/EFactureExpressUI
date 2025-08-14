import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import CustomerCRUD from "../domains/customers/components/CustomerCRUD";
import { useTranslation } from "react-i18next";

export default function CustomerPage({ token }: { token: string | null }) {
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
        <CustomerCRUD token={token || ""} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
