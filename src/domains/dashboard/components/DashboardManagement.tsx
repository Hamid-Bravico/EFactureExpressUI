import React from "react";
import Dashboard from "./Dashboard";

interface DashboardManagementProps {
  token: string | null;
}

export default function DashboardManagement({ token }: DashboardManagementProps) {
  // The new Dashboard component is self-contained and handles its own data fetching
  // We just need to render it here
  return <Dashboard />;
}
