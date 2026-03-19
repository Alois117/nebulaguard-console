import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Brain,
  Clock,
  Info,
  Lightbulb,
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TablePagination from "@/components/ui/table-pagination";
import InsightCard from "@/components/AI-Insights/InsightCard";
import type { AiInsight } from "@/hooks/useAiInsights";

type InsightFilter = "all" | "prediction" | "anomaly" | "optimization" | "alert" | "info";

interface AiInsightsPanelProps {
  contextLabel?: string;
  insights: AiInsight[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  showHeader?: boolean;
  showSummaryCards?: boolean;
  enableSearch?: boolean;
  enableTypeFilter?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  isRead?: (id: string) => boolean;
  onMarkRead?: (id: string) => void;
}

const DEFAULT_PAGE_SIZE = 8;

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

const AiInsightsPanel = ({
  contextLabel,
  insights,
  loading,
  error,
  onRefresh,
  showHeader = true,
  showSummaryCards = true,
  enableSearch = false,
  enableTypeFilter = false,
  emptyMessage,
  pageSize = DEFAULT_PAGE_SIZE,
  isRead,
  onMarkRead,
}: AiInsightsPanelProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<InsightFilter>("all");

  const sortedInsights = useMemo(() => {
    return [...insights].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [insights]);

  const filteredInsights = useMemo(() => {
    let result = sortedInsights;

    if (enableTypeFilter && filter !== "all") {
      result = result.filter((item) => item.type === filter);
    }

    if (enableSearch && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();

      result = result.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.responseContent.toLowerCase().includes(query) ||
          (item.host ?? "").toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.severity.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [sortedInsights, enableTypeFilter, filter, enableSearch, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const totalCount = filteredInsights.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedInsights = useMemo(() => {
    return filteredInsights.slice(startIndex, endIndex);
  }, [filteredInsights, startIndex, endIndex]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const highPriorityCount = useMemo(() => {
    return sortedInsights.filter(
      (item) =>
        item.severity === "critical" ||
        item.severity === "high" ||
        item.impact === "critical" ||
        item.impact === "high"
    ).length;
  }, [sortedInsights]);

  const last24hCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return sortedInsights.filter((item) => item.createdAt.getTime() >= cutoff).length;
  }, [sortedInsights]);

  const mostAffectedHost = useMemo(() => {
    if (sortedInsights.length === 0) return "—";

    const counts = new Map<string, number>();

    sortedInsights.forEach((item) => {
      const host = item.host?.trim();
      if (!host) return;
      counts.set(host, (counts.get(host) ?? 0) + 1);
    });

    if (counts.size === 0) return "—";

    let topHost = "—";
    let maxCount = 0;

    counts.forEach((count, host) => {
      if (count > maxCount) {
        maxCount = count;
        topHost = host;
      }
    });

    return topHost;
  }, [sortedInsights]);

  const filterCounts = useMemo(() => {
    return {
      all: sortedInsights.length,
      prediction: sortedInsights.filter((item) => item.type === "prediction").length,
      anomaly: sortedInsights.filter((item) => item.type === "anomaly").length,
      optimization: sortedInsights.filter((item) => item.type === "optimization").length,
      alert: sortedInsights.filter((item) => item.type === "alert").length,
      info: sortedInsights.filter((item) => item.type === "info").length,
    };
  }, [sortedInsights]);

  const setExpanded = useCallback((id: string, open: boolean) => {
    setExpandedInsights((prev) => ({
      ...prev,
      [id]: open,
    }));

    if (open && onMarkRead) {
      onMarkRead(id);
    }
  }, [onMarkRead]);

  if (error) {
    return (
      <Card className="p-8 border-destructive/30 bg-destructive/5">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-destructive">Failed to Load Insights</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {contextLabel ? `AI Insights — ${contextLabel}` : "AI Insights"}
              </h3>
              <p className="text-sm text-muted-foreground">
                AI-generated predictions, anomalies, and recommendations
              </p>
            </div>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="gap-2 self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      )}

      {showSummaryCards && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
          <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/15 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{sortedInsights.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Insights</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/15 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/20">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-3xl font-bold">{highPriorityCount}</p>
                <p className="text-sm text-muted-foreground mt-1">High Priority</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-accent/30 bg-gradient-to-br from-accent/5 to-accent/15 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/20">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-3xl font-bold">{last24hCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Last 24h</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-warning/30 bg-gradient-to-br from-warning/5 to-warning/15 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/20">
                <Server className="w-6 h-6 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold truncate">{mostAffectedHost}</p>
                <p className="text-sm text-muted-foreground mt-1">Most Affected Host</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {(enableSearch || enableTypeFilter) && (
        <Card className="p-4 border-border/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {enableTypeFilter ? (
              <Tabs value={filter} onValueChange={(value) => setFilter(value as InsightFilter)} className="w-full lg:w-auto">
                <TabsList className="bg-muted/50 flex flex-wrap h-auto">
                  <TabsTrigger value="all">All ({filterCounts.all})</TabsTrigger>
                  <TabsTrigger value="prediction">Predictions ({filterCounts.prediction})</TabsTrigger>
                  <TabsTrigger value="anomaly">Anomalies ({filterCounts.anomaly})</TabsTrigger>
                  <TabsTrigger value="optimization">Optimizations ({filterCounts.optimization})</TabsTrigger>
                  <TabsTrigger value="alert">Alerts ({filterCounts.alert})</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <div />
            )}

            {enableSearch && (
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:max-w-sm bg-background/50"
              />
            )}
          </div>
        </Card>
      )}

      {loading && sortedInsights.length === 0 && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4 border-border/50">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && totalCount === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 rounded-full bg-muted">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Insights Found</h3>
              <p className="text-muted-foreground mt-1">
                {emptyMessage ?? "No AI insights available at this time."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {totalCount > 0 && (
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
              isRead={isRead ? isRead(insight.id) : false}
              onMarkRead={onMarkRead ? () => onMarkRead(insight.id) : undefined}
            />
          ))}
        </div>
      )}

      {!loading && totalCount > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          startIndex={startIndex + 1}
          endIndex={endIndex}
          itemName="insights"
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default AiInsightsPanel;