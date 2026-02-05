/**
 * Reports Drilldown Component
 * Shows detailed reports list for the selected organization
 */
import { useState, useMemo, useEffect } from "react";
import { FileText, XCircle, RefreshCw, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import { format } from "date-fns";
import DrilldownPagination, { ITEMS_PER_PAGE } from "./DrilldownPagination";

interface ReportsDrilldownProps {
  orgName: string;
  reports: ReportItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type ReportFilter = "all" | "daily" | "weekly" | "monthly";

const typeColors: Record<string, string> = {
  daily: "border-primary/30 bg-primary/10 text-primary",
  weekly: "border-accent/30 bg-accent/10 text-accent",
  monthly: "border-secondary/30 bg-secondary/10 text-secondary",
};

/**
 * Get report display name using fallback chain
 * Primary: name, title, report_name
 * Fallback: Report #id
 */
const getReportName = (report: ReportItem): string => {
  if (report.name && report.name !== "Unnamed Report") return report.name;
  return `Report #${report.id}`;
};

/**
 * Get report type with proper casing
 */
const getReportType = (report: ReportItem): string => {
  const type = report.report_type?.toLowerCase() || "daily";
  return type;
};

const ReportsDrilldown = ({ orgName, reports, loading, error, onRefresh }: ReportsDrilldownProps) => {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const filteredReports = useMemo(() => {
    let result = reports;

    if (filter !== "all") {
      result = result.filter(r => getReportType(r) === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        getReportName(r).toLowerCase().includes(query) ||
        getReportType(r).toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }, [reports, filter, searchQuery]);

  // Paginated reports
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  const counts = useMemo(() => ({
    all: reports.length,
    daily: reports.filter(r => getReportType(r) === "daily").length,
    weekly: reports.filter(r => getReportType(r) === "weekly").length,
    monthly: reports.filter(r => getReportType(r) === "monthly").length,
  }), [reports]);

  if (error) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium">Failed to load reports</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-secondary" />
            Reports for {orgName}
          </h3>
          <p className="text-sm text-muted-foreground">
            Generated reports and their schedules
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as ReportFilter)} className="flex-shrink-0">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="text-xs">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">
              Daily ({counts.daily})
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              Weekly ({counts.weekly})
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">
              Monthly ({counts.monthly})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Input
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs bg-background/50"
        />
      </div>

      {/* Reports List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 border-border/50">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </Card>
            ))
          ) : paginatedReports.length === 0 ? (
            <Card className="p-8 border-border/50 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No reports match your search" : "No reports found"}
              </p>
            </Card>
          ) : (
            paginatedReports.map((report) => {
              const reportType = getReportType(report);
              return (
                <Card 
                  key={report.id} 
                  className="p-4 border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
                      <FileText className="w-5 h-5 text-secondary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getReportName(report)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(report.created_at, "PPP")}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline"
                        className={`text-xs capitalize ${typeColors[reportType] || typeColors.daily}`}
                      >
                        {reportType}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          report.status === "completed"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-warning/30 bg-warning/10 text-warning"
                        }`}
                      >
                        {report.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {!loading && (
        <DrilldownPagination
          currentPage={currentPage}
          totalItems={filteredReports.length}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ReportsDrilldown;
