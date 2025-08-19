import Dashboard from "./Dashboard";
import { Company } from "../../../types/common";

interface DashboardManagementProps {
  token: string | null;
  company: Company | null;
}

export default function DashboardManagement({ token, company }: DashboardManagementProps) {
  return <Dashboard company={company} />;
}
