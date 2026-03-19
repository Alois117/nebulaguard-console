import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TablePagination from "@/components/ui/table-pagination";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Zap,
  Info,
  Calendar as CalendarIcon,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Server,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AiInsight, TimeFilter } from "@/hooks/useAiInsights";
import InsightCard from "@/components/AI-Insights/InsightCard";

interface InsightsContentViewProps {
  paginatedInsights: AiInsight[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  setCurrentPage: (page: number) => void;
  startIndex: number;
  endIndex: number;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  customDateFrom: Date | undefined;
  setCustomDateFrom: (date: Date | undefined) => void;
  customDateTo: Date | undefined;
  setCustomDateTo: (date: Date | undefined) => void;
  highPriorityCount: number;
  last24hCount: number;
  mostAffectedHost: string;
  refresh: () => Promise<void> | void;
  isInsightRead?: (id: string) => boolean;
  onMarkInsightRead?: (id: string) => void;
}

const InsightsContentView = ({
  paginatedInsights,
  loading,
  error,
  isConnected,
  lastUpdated,
  currentPage,
  totalPages,
  totalCount,
  setCurrentPage,
  startIndex,
  endIndex,
  timeFilter,
  setTimeFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  highPriorityCount,
  last24hCount,
  mostAffectedHost,
  refresh,
  isInsightRead,
  onMarkInsightRead,
}: InsightsContentViewProps) => {
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});

  const setExpanded = (id: string, open: boolean) => {
    setExpandedInsights((prev) => ({ ...prev, [id]: open }));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical":
        return "text-error border-error/30 bg-error/10";
      case "high":
        return "text-accent border-accent/30 bg-accent/10";
      case "medium":
        return "text-warning border-warning/30 bg-warning/10";
      default:
        return "text-success border-success/30 bg-success/10";
    }
  };

  const getSeverityBadge = (severity: AiInsight["severity"]) => {
    const styles: Record<string, string> = {
      critical: "bg-error/20 text-error border-error/30",
      high: "bg-accent/20 text-accent border-accent/30",
      medium: "bg-warning/20 text-warning border-warning/30",
      low: "bg-success/20 text-success border-success/30",
      info: "bg-primary/20 text-primary border-primary/30",
    };
    return styles[severity] || styles.info;
  };

  const getTypeIcon = (type: AiInsight["type"]) => {
    switch (type) {
      case "prediction":
        return <TrendingUp className="w-5 h-5" />;
      case "anomaly":
        return <Zap className="w-5 h-5" />;
      case "optimization":
        return <Lightbulb className="w-5 h-5" />;
      case "alert":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: AiInsight["type"]) => {
    switch (type) {
      case "prediction":
        return "text-primary";
      case "anomaly":
        return "text-warning";
      case "optimization":
        return "text-success";
      case "alert":
        return "text-error";
      default:
        return "text-muted-foreground";
    }
  };

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "custom", label: "Custom Range" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 3xl:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
            <Lightbulb className="h-6 w-6 text-primary glow-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">AI Insights</h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Intelligent recommendations and predictions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-error" />
          )}
          {lastUpdated && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Updated:</span>
              <span className="font-medium">
                {lastUpdated.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/15 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/20 p-3">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{totalCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">Total Insights</p>
            </div>
          </div>
        </Card>

        <Card className="border-error/30 bg-gradient-to-br from-error/5 to-error/15 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-error/20 p-3">
              <AlertTriangle className="h-6 w-6 text-error" />
            </div>
            <div>
              <p className="text-3xl font-bold">{highPriorityCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">High Priority</p>
            </div>
          </div>
        </Card>

        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-accent/15 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent/20 p-3">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-3xl font-bold">{last24hCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">Last 24h</p>
            </div>
          </div>
        </Card>

        <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/15 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-warning/20 p-3">
              <Server className="h-6 w-6 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-bold md:text-3xl">{mostAffectedHost}</p>
              <p className="mt-1 text-sm text-muted-foreground">Most Affected Host</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Time Range:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {timeFilterOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter(option.value)}
                className={cn(
                  "transition-all",
                  timeFilter === option.value && "bg-primary text-primary-foreground"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {timeFilter === "custom" && (
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customDateFrom ? format(customDateFrom, "MMM d, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customDateTo ? format(customDateTo, "MMM d, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      )}

      {error && !loading && (
        <Card className="border-error/30 bg-error/5 p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-error" />
            <div>
              <h3 className="text-lg font-semibold text-error">Failed to Load Insights</h3>
              <p className="mt-1 text-muted-foreground">{error}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please try again. If the problem persists, confirm the AI insights service is
                reachable and returning a valid payload.
              </p>
            </div>
            <Button variant="outline" onClick={refresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && paginatedInsights.length === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Insights Found</h3>
              <p className="mt-1 text-muted-foreground">
                {timeFilter === "custom" && customDateFrom
                  ? "No insights were found for the selected date range."
                  : "No AI insights are available right now."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && paginatedInsights.length > 0 && (
        <div className="grid gap-4">
          {paginatedInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              expanded={!!expandedInsights[insight.id]}
              onExpandedChange={(open) => setExpanded(insight.id, open)}
              getImpactColor={getImpactColor}
              getSeverityBadge={getSeverityBadge}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
              isRead={isInsightRead ? isInsightRead(insight.id) : false}
              onMarkRead={onMarkInsightRead ? () => onMarkInsightRead(insight.id) : undefined}
            />
          ))}
        </div>
      )}

      {!loading && !error && totalCount > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          startIndex={startIndex}
          endIndex={endIndex}
          itemName="insights"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default InsightsContentView;
