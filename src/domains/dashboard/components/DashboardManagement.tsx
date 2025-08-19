import Dashboard from "./Dashboard";
import { Company } from "../../../types/common";
import { useUserInfo } from "../../../utils/useUserInfo";
import { UserRole } from "../../../utils/shared.permissions";

interface DashboardManagementProps {
  token: string | null;
  company: Company | null;
}

export default function DashboardManagement({ token, company }: DashboardManagementProps) {
  const { userRole } = useUserInfo(token);
  
  return <Dashboard company={company} userRole={userRole as UserRole} />;
}
