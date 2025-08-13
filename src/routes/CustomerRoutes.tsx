import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import CustomerCRUD from "../domains/customers/components/CustomerCRUD";
import { useTranslation } from "react-i18next";
import { Route } from "react-router-dom";

export default function CustomerRoutes({ token }: { token: string | null }) {
  const { t } = useTranslation();
  return (
    <Route
      path="/customers"
      element={
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
      }
    />
  );
}
