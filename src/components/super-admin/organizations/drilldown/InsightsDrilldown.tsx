/**
 * AI Insights Drilldown Component
 * Shows detailed insights list for the selected organization
 */
import { useState, useMemo, useEffect } from "react";
import { Brain, Lightbulb, AlertTriangle, TrendingUp, RefreshCw, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import { format } from "date-fns";
import DrilldownPagination, { ITEMS_PER_PAGE } from "./DrilldownPagination";

interface InsightsDrilldownProps {
  orgName: string;
  insights: InsightItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type InsightFilter = "all" | "predictions" | "anomalies" | "recommendations";

const typeIcons: Record<string, React.ElementType> = {
  prediction: TrendingUp,
  anomaly: AlertTriangle,
  recommendation: Lightbulb,
  insight: Brain,
};

const typeColors: Record<string, string> = {
  prediction: "border-accent/30 bg-accent/10 text-accent",
  anomaly: "border-warning/30 bg-warning/10 text-warning",
  recommendation: "border-primary/30 bg-primary/10 text-primary",
  insight: "border-secondary/30 bg-secondary/10 text-secondary",
};

/**
 * Get insight display title using fallback chain
 * Primary: title, name, summary (first 50 chars)
 * Fallback: Insight #id
 */
const getInsightTitle = (insight: InsightItem): string => {
  if (insight.title && insight.title !== "AI Insight") return insight.title;
  if (insight.summary) return insight.summary.length > 60 ? insight.summary.slice(0, 60) + "..." : insight.summary;
  return `Insight #${insight.id}`;
};

/**
 * Get insight type category
 */
const getInsightType = (type: string): string => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes("predict")) return "prediction";
  if (lowerType.includes("anomal")) return "anomaly";
  if (lowerType.includes("recommend")) return "recommendation";
  return "insight";
};

const InsightsDrilldown = ({ orgName, insights, loading, error, onRefresh }: InsightsDrilldownProps) => {
  const [filter, setFilter] = useState<InsightFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const filteredInsights = useMemo(() => {
    let result = insights;

    if (filter !== "all") {
      result = result.filter(i => {
        const type = getInsightType(i.type);
        if (filter === "predictions") return type === "prediction";
        if (filter === "anomalies") return type === "anomaly";
        if (filter === "recommendations") return type === "recommendation";
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i =>
        getInsightTitle(i).toLowerCase().includes(query) ||
        i.summary.toLowerCase().includes(query) ||
        i.type.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [insights, filter, searchQuery]);

  // Paginated insights
  const paginatedInsights = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInsights.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInsights, currentPage]);

  const counts = useMemo(() => ({
    all: insights.length,
    predictions: insights.filter(i => getInsightType(i.type) === "prediction").length,
    anomalies: insights.filter(i => getInsightType(i.type) === "anomaly").length,
    recommendations: insights.filter(i => getInsightType(i.type) === "recommendation").length,
  }), [insights]);

  if (error) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium">Failed to load insights</p>
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
            <Brain className="w-5 h-5 text-accent" />
            AI Insights for {orgName}
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-generated predictions, anomalies, and recommendations
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as InsightFilter)} className="flex-shrink-0">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="text-xs">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">
              Predictions ({counts.predictions})
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="text-xs">
              Anomalies ({counts.anomalies})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Input
          placeholder="Search insights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs bg-background/50"
        />
      </div>

      {/* Insights List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 border-border/50">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </Card>
            ))
          ) : paginatedInsights.length === 0 ? (
            <Card className="p-8 border-border/50 text-center">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No insights match your search" : "No insights found"}
              </p>
            </Card>
          ) : (
            paginatedInsights.map((insight) => {
              const insightType = getInsightType(insight.type);
              const Icon = typeIcons[insightType] || Brain;
              
              return (
                <Card 
                  key={insight.id} 
                  className="p-4 border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${typeColors[insightType] || typeColors.insight}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <Badge 
                          variant="outline"
                          className={`text-xs capitalize ${typeColors[insightType] || typeColors.insight}`}
                        >
                          {insightType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(insight.timestamp, "MMM dd, HH:mm")}
                      </div>
                    </div>
                    
                    <p className="font-medium">{getInsightTitle(insight)}</p>
                    
                    {insight.summary && insight.title !== insight.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {insight.summary}
                      </p>
                    )}
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
          totalItems={filteredInsights.length}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default InsightsDrilldown;
