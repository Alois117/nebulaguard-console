import { useUserDashboard } from "@/hooks/dashboard/useUserDashboard";
import DashboardContentView from "./DashboardContentView";

interface DashboardContentProps {
  /** Base path for navigation links (e.g. "/dashboard" or "/admin/monitoring") */
  basePath?: string;
}

const DashboardContent = ({ basePath = "/dashboard" }: DashboardContentProps) => {
  const { summary, chartData, criticalIssues, loading, error, isConnected, lastUpdated } =
    useUserDashboard();

  return (
    <DashboardContentView
      basePath={basePath}
      summary={summary}
      chartData={chartData}
      criticalIssues={criticalIssues}
      loading={loading}
      error={error}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
    />
  );
};

export default DashboardContent;
