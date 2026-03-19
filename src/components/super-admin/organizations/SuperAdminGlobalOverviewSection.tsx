import type { Organization } from "@/hooks/super-admin/organizations";
import type {
  CategoryBreakdownRow,
  GlobalAlertItem,
  GlobalHostItem,
  GlobalInsightItem,
  GlobalMetricSummary,
  GlobalReportItem,
  GlobalTimeRange,
  GlobalVeeamDrilldownData,
  GlobalVeeamJobItem,
} from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";
import GlobalInfrastructureFilterBar from "./GlobalInfrastructureFilterBar";
import GlobalInfrastructureOverview from "./GlobalInfrastructureOverview";

interface SuperAdminGlobalOverviewSectionProps {
  organizations: Organization[];
  selectedOrgId: string | null;
  onSelectedOrgIdChange: (orgId: string | null) => void;
  timeRange: GlobalTimeRange;
  onTimeRangeChange: (timeRange: GlobalTimeRange) => void;
  customDateFrom?: Date;
  onCustomDateFromChange: (date?: Date) => void;
  customDateTo?: Date;
  onCustomDateToChange: (date?: Date) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  summary: GlobalMetricSummary;
  alerts: GlobalAlertItem[];
  hosts: GlobalHostItem[];
  reports: GlobalReportItem[];
  insights: GlobalInsightItem[];
  veeamDrilldownData: GlobalVeeamDrilldownData;
  veeamJobs: GlobalVeeamJobItem[];
  alertsBreakdown: CategoryBreakdownRow[];
  hostsBreakdown: CategoryBreakdownRow[];
  reportsBreakdown: CategoryBreakdownRow[];
  insightsBreakdown: CategoryBreakdownRow[];
  veeamBreakdown: CategoryBreakdownRow[];
  onRefreshInsights?: () => Promise<void> | void;
}

const SuperAdminGlobalOverviewSection = ({
  organizations,
  selectedOrgId,
  onSelectedOrgIdChange,
  timeRange,
  onTimeRangeChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  searchQuery,
  onSearchQueryChange,
  loading,
  error,
  isConnected,
  lastUpdated,
  summary,
  alerts,
  hosts,
  reports,
  insights,
  veeamDrilldownData,
  veeamJobs,
  alertsBreakdown,
  hostsBreakdown,
  reportsBreakdown,
  insightsBreakdown,
  veeamBreakdown,
  onRefreshInsights,
}: SuperAdminGlobalOverviewSectionProps) => {
  const selectedOrganizationClientId =
    selectedOrgId != null
      ? (organizations.find((org) => org.id === selectedOrgId)?.clientId ?? null)
      : null;

  return (
    <div className="space-y-4">
      <GlobalInfrastructureFilterBar
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        onSelectedOrgIdChange={onSelectedOrgIdChange}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        customDateFrom={customDateFrom}
        onCustomDateFromChange={onCustomDateFromChange}
        customDateTo={customDateTo}
        onCustomDateToChange={onCustomDateToChange}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
      />

      <GlobalInfrastructureOverview
        loading={loading}
        error={error}
        isConnected={isConnected}
        lastUpdated={lastUpdated}
        summary={summary}
        alerts={alerts}
        hosts={hosts}
        reports={reports}
        insights={insights}
        veeamDrilldownData={veeamDrilldownData}
        veeamJobs={veeamJobs}
        alertsBreakdown={alertsBreakdown}
        hostsBreakdown={hostsBreakdown}
        reportsBreakdown={reportsBreakdown}
        insightsBreakdown={insightsBreakdown}
        veeamBreakdown={veeamBreakdown}
        organizationSearchQuery={searchQuery}
        selectedOrganizationId={selectedOrgId}
        selectedOrganizationClientId={selectedOrganizationClientId}
        onRefreshInsights={onRefreshInsights}
      />
    </div>
  );
};

export default SuperAdminGlobalOverviewSection;
