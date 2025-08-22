import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";
import ErrorPage from "../components/ErrorPage";
import CompanyProfile from "../components/CompanyProfile";
import { useTranslation } from "react-i18next";
import { Company } from "../types/common";

export default function ProfilePage({ token, company }: { token: string | null; company: Company | null }) {
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
        <CompanyProfile 
          company={company} 
          token={token || ""} 
        />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
