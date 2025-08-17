import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import CreditNoteManagement from "../domains/creditNotes/components/CreditNoteManagement";
import { useTranslation } from "react-i18next";

export default function CreditNotePage({ token }: { token: string | null }) {
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
        <CreditNoteManagement />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
