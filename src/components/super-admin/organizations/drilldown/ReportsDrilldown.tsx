import { useCallback, useMemo, useState } from "react";
import { ReportItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import type { ReportItem as DashboardReportItem } from "@/hooks/useReports";
import ReportDrawer from "@/components/reports/ReportDrawer";
import { logAuditEvent, AUDIT_EVENTS } from "@/audit-logs";
import ReportsContentView from "@/components/monitoring/ReportsContentView";
import useSuperAdminReports from "@/hooks/super-admin/shared-ui/useSuperAdminReports";

interface ReportsDrilldownProps {
  orgName: string;
  reports: ReportItem[];
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
}

const ReportsDrilldown = ({
  orgName,
  reports,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
}: ReportsDrilldownProps) => {
  const [selectedReport, setSelectedReport] = useState<DashboardReportItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const reportLookup = useMemo(() => {
    const map = new Map<string, ReportItem>();
    reports.forEach((item) => {
      const key = `${item.report_type}_${item.created_at.toISOString()}`;
      map.set(key, item);
    });
    return map;
  }, [reports]);

  const viewModel = useSuperAdminReports({
    reports,
    loading,
    error,
    isConnected,
    lastUpdated,
    selectedOrganizationId,
    selectedOrganizationClientId,
  });

  const handleReportClick = useCallback(
    (report: DashboardReportItem) => {
      const key = `${report.report_type}_${report.created_at}`;
      const sourceReport = reportLookup.get(key);
      logAuditEvent(AUDIT_EVENTS.REPORT_VIEW, {
        entity_type: "report",
        entity_id: String(sourceReport?.id ?? report.created_at),
        meta: { type: report.report_type, context: "super_admin_organizations", scope: orgName },
      });
      setSelectedReport(report);
      setIsDrawerOpen(true);
    },
    [reportLookup, orgName]
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedReport(null), 300);
  }, []);

  return (
    <>
      <ReportsContentView
        loading={viewModel.loading}
        error={viewModel.error}
        counts={viewModel.counts}
        isConnected={viewModel.isConnected}
        lastUpdated={viewModel.lastUpdated}
        paginatedReports={viewModel.paginatedReports}
        filteredReports={viewModel.filteredReports}
        searchQuery={viewModel.searchQuery}
        setSearchQuery={viewModel.setSearchQuery}
        selectedType={viewModel.selectedType}
        setSelectedType={viewModel.setSelectedType}
        currentPage={viewModel.currentPage}
        setCurrentPage={viewModel.setCurrentPage}
        totalPages={viewModel.totalPages}
        pageSize={viewModel.pageSize}
        customGenerating={viewModel.customGenerating}
        customError={viewModel.customError}
        generateCustomReport={viewModel.generateCustomReport}
        customPaginatedReports={viewModel.customPaginatedReports}
        customFilteredReports={viewModel.customFilteredReports}
        customSearchQuery={viewModel.customSearchQuery}
        setCustomSearchQuery={viewModel.setCustomSearchQuery}
        customCurrentPage={viewModel.customCurrentPage}
        setCustomCurrentPage={viewModel.setCustomCurrentPage}
        customTotalPages={viewModel.customTotalPages}
        customPageSize={viewModel.customPageSize}
        customCount={viewModel.customCount}
        customLoading={viewModel.customLoading}
        onReportClick={handleReportClick}
      />

      <ReportDrawer report={selectedReport} isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
    </>
  );
};

export default ReportsDrilldown;
