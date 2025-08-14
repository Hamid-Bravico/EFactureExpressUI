import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import QuoteManagement from "../domains/quotes/components/QuoteManagement";
import { useTranslation } from "react-i18next";

export default function QuotePage({ token }: { token: string | null }) {
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
        <QuoteManagement token={token || ""} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
