import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import InvoiceManagement from "../domains/invoices/components/InvoiceManagement";
import { useTranslation } from "react-i18next";

export default function InvoicePage({ token }: { token: string | null }) {
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
        <InvoiceManagement token={token || ""} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
