import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import CreditNoteManagement from "../domains/creditNotes/components/CreditNoteManagement";
import { useTranslation } from "react-i18next";
import { Route } from "react-router-dom";

export default function CreditNoteRoutes({ token }: { token: string | null }) {
  const { t } = useTranslation();
  return (
    <Route
      path="/credit-notes"
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
            <CreditNoteManagement />
          </ErrorBoundary>
        </ProtectedRoute>
      }
    />
  );
}
