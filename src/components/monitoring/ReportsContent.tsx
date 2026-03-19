import { useState, useCallback } from "react";
import { logAuditEvent, AUDIT_EVENTS } from "@/audit-logs";
import useReports, { ReportItem } from "@/hooks/useReports";
import useCustomReport from "@/hooks/custom-report/useCustomReport";
import ReportDrawer from "@/components/reports/ReportDrawer";
import ReportsContentView from "./ReportsContentView";

const ReportsContent = () => {
  const {
    loading,
    error,
    counts,
    isConnected,
    lastUpdated,
    paginatedReports,
    filteredReports,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
  } = useReports();

  const {
    generating: customGenerating,
    error: customError,
    generateCustomReport,
    paginatedReports: customPaginatedReports,
    filteredReports: customFilteredReports,
    searchQuery: customSearchQuery,
    setSearchQuery: setCustomSearchQuery,
    currentPage: customCurrentPage,
    setCurrentPage: setCustomCurrentPage,
    totalPages: customTotalPages,
    pageSize: customPageSize,
    count: customCount,
    loading: customLoading,
  } = useCustomReport();

  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleReportClick = useCallback((report: ReportItem) => {
    setSelectedReport(report);
    setIsDrawerOpen(true);
    logAuditEvent(AUDIT_EVENTS.REPORT_VIEW, {
      entity_type: "report",
      entity_id: String(report.created_at),
      meta: { type: report.report_type },
    });
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedReport(null), 300);
  }, []);

  return (
    <>
      <ReportsContentView
        loading={loading}
        error={error}
        counts={counts}
        isConnected={isConnected}
        lastUpdated={lastUpdated}
        paginatedReports={paginatedReports}
        filteredReports={filteredReports}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        customGenerating={customGenerating}
        customError={customError}
        generateCustomReport={generateCustomReport}
        customPaginatedReports={customPaginatedReports}
        customFilteredReports={customFilteredReports}
        customSearchQuery={customSearchQuery}
        setCustomSearchQuery={setCustomSearchQuery}
        customCurrentPage={customCurrentPage}
        setCustomCurrentPage={setCustomCurrentPage}
        customTotalPages={customTotalPages}
        customPageSize={customPageSize}
        customCount={customCount}
        customLoading={customLoading}
        onReportClick={handleReportClick}
      />

      <ReportDrawer
        report={selectedReport}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </>
  );
};

export default ReportsContent;
