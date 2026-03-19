import type { InsightItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import type { GlobalInsightItem } from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";
import useSuperAdminInsights from "@/hooks/super-admin/shared-ui/useSuperAdminInsights";
import InsightsContentView from "@/components/monitoring/InsightsContentView";

interface SuperAdminInsightsViewProps {
  insights: Array<InsightItem | GlobalInsightItem>;
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
  onRefresh?: () => Promise<void> | void;
}

const SuperAdminInsightsView = ({
  insights,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
  onRefresh,
}: SuperAdminInsightsViewProps) => {
  const viewModel = useSuperAdminInsights({
    insights,
    loading,
    error,
    isConnected,
    lastUpdated,
    selectedOrganizationId,
    selectedOrganizationClientId,
    onRefresh,
  });

  return (
    <InsightsContentView
      paginatedInsights={viewModel.paginatedInsights}
      loading={viewModel.loading}
      error={viewModel.error}
      isConnected={viewModel.isConnected}
      lastUpdated={viewModel.lastUpdated}
      currentPage={viewModel.currentPage}
      totalPages={viewModel.totalPages}
      totalCount={viewModel.totalCount}
      setCurrentPage={viewModel.setCurrentPage}
      startIndex={viewModel.startIndex}
      endIndex={viewModel.endIndex}
      timeFilter={viewModel.timeFilter}
      setTimeFilter={viewModel.setTimeFilter}
      customDateFrom={viewModel.customDateFrom}
      setCustomDateFrom={viewModel.setCustomDateFrom}
      customDateTo={viewModel.customDateTo}
      setCustomDateTo={viewModel.setCustomDateTo}
      highPriorityCount={viewModel.highPriorityCount}
      last24hCount={viewModel.last24hCount}
      mostAffectedHost={viewModel.mostAffectedHost}
      refresh={viewModel.refresh}
      isInsightRead={viewModel.isInsightRead}
      onMarkInsightRead={viewModel.markInsightRead}
    />
  );
};

export default SuperAdminInsightsView;
