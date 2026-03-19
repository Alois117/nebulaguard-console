import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReportItem, ReportCounts } from "@/hooks/useReports";
import ReportSummaryCards from "@/components/reports/ReportSummaryCards";
import ReportsList from "@/components/reports/ReportsList";
import ReportsPagination from "@/components/reports/ReportsPagination";
import ReportsConnectionStatus from "@/components/reports/ReportsConnectionStatus";
import CustomReportGenerator from "@/components/custom-report/CustomReportGenerator";

export type ReportsTab = "all" | "daily" | "weekly" | "monthly" | "custom";

interface ReportsContentViewProps {
  loading: boolean;
  error: string | null;
  counts: ReportCounts;
  isConnected: boolean;
  lastUpdated: Date | null;
  paginatedReports: ReportItem[];
  filteredReports: ReportItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: ReportsTab;
  setSelectedType: (type: ReportsTab) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  customGenerating: boolean;
  customError: string | null;
  generateCustomReport: (from: Date, to: Date) => Promise<void>;
  customPaginatedReports: ReportItem[];
  customFilteredReports: ReportItem[];
  customSearchQuery: string;
  setCustomSearchQuery: (query: string) => void;
  customCurrentPage: number;
  setCustomCurrentPage: (page: number) => void;
  customTotalPages: number;
  customPageSize: number;
  customCount: number;
  customLoading: boolean;
  onReportClick: (report: ReportItem) => void;
}

const ReportsContentView = ({
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
  customGenerating,
  customError,
  generateCustomReport,
  customPaginatedReports,
  customFilteredReports,
  customSearchQuery,
  setCustomSearchQuery,
  customCurrentPage,
  setCustomCurrentPage,
  customTotalPages,
  customPageSize,
  customCount,
  customLoading,
  onReportClick,
}: ReportsContentViewProps) => {
  const isCustomTab = selectedType === "custom";

  return (
    <div className="space-y-4 sm:space-y-6 3xl:space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Generated insights and analytics</p>
          </div>
        </div>
        <ReportsConnectionStatus isConnected={isConnected} lastUpdated={lastUpdated} />
      </div>

      <ReportSummaryCards counts={counts} customCount={customCount} />

      <CustomReportGenerator onGenerate={generateCustomReport} isGenerating={customGenerating} />

      <Tabs
        value={selectedType}
        onValueChange={(value) => setSelectedType(value as ReportsTab)}
        className="space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 border border-border/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={isCustomTab ? customSearchQuery : searchQuery}
              onChange={(e) =>
                isCustomTab ? setCustomSearchQuery(e.target.value) : setSearchQuery(e.target.value)
              }
              className="pl-9 bg-background border-border/50 focus:border-primary"
            />
          </div>
        </div>

        {error && !isCustomTab && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
        {customError && isCustomTab && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
            <p className="text-destructive text-sm">{customError}</p>
          </div>
        )}

        {["all", "daily", "weekly", "monthly"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4 mt-0">
            <ReportsList reports={paginatedReports} loading={loading} onReportClick={onReportClick} />
            <ReportsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredReports.length}
              pageSize={pageSize}
            />
          </TabsContent>
        ))}

        <TabsContent value="custom" className="space-y-4 mt-0">
          <ReportsList
            reports={customPaginatedReports}
            loading={customLoading || customGenerating}
            onReportClick={onReportClick}
          />
          <ReportsPagination
            currentPage={customCurrentPage}
            totalPages={customTotalPages}
            onPageChange={setCustomCurrentPage}
            totalItems={customFilteredReports.length}
            pageSize={customPageSize}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsContentView;

