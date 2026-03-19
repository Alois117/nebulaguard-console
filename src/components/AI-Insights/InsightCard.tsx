import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { type AiInsight, getRelativeTime } from "@/hooks/useAiInsights";
import { renderInsightContent } from "@/lib/insightContent";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: AiInsight;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  getImpactColor: (impact: string) => string;
  getSeverityBadge: (severity: AiInsight["severity"]) => string;
  getTypeIcon: (type: AiInsight["type"]) => React.ReactNode;
  getTypeColor: (type: AiInsight["type"]) => string;
  isRead?: boolean;
  onMarkRead?: () => void;
}

const formatConfidence = (confidence: number | null): string => {
  if (confidence === null || Number.isNaN(confidence)) return "Unavailable";
  return `${Math.round(confidence)}%`;
};

const displayHost = (host: string | null): string => {
  return host?.trim() ? host : "Unavailable";
};

const displayRecommendation = (recommendation?: string): string => {
  const value = recommendation?.trim();
  if (!value || value === "=problem") return "Click the card to view the full recommendation.";
  return value;
};

const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  expanded,
  onExpandedChange,
  getImpactColor,
  getSeverityBadge,
  getTypeIcon,
  getTypeColor,
  isRead = false,
  onMarkRead,
}) => {
  const openCard = () => {
    onExpandedChange(true);
    if (!isRead) {
      onMarkRead?.();
    }
  };

  const closeCard = () => {
    onExpandedChange(false);
  };

  const toggleCard = () => {
    if (expanded) {
      closeCard();
    } else {
      openCard();
    }
  };

  return (
    <Card className="overflow-hidden border-border/60 bg-card/95 shadow-sm transition-all hover:shadow-md">
      <div
        className="cursor-pointer p-5 md:p-6"
        onClick={toggleCard}
        role="button"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleCard();
          }
        }}
      >
        <div className="flex items-start gap-4">
          <div className={cn("mt-1", getTypeColor(insight.type))}>
            {getTypeIcon(insight.type)}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    {insight.type}
                  </Badge>

                  <Badge variant="outline" className={getSeverityBadge(insight.severity)}>
                    {insight.severity}
                  </Badge>

                  {insight.host && (
                    <Badge variant="outline" className="border-border bg-secondary/60 text-foreground">
                      {insight.host}
                    </Badge>
                  )}

                  <div className="ml-auto flex items-center gap-2 xl:ml-0">
                    {isRead ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <h3 className="break-words text-xl font-semibold tracking-tight text-foreground">
                  {insight.title}
                </h3>

                <p className="break-words text-sm text-muted-foreground">
                  {insight.summary}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCard();
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    See less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    See more
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Impact</p>
                <Badge variant="outline" className={cn("mt-2", getImpactColor(insight.impact))}>
                  {insight.impact}
                </Badge>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {formatConfidence(insight.confidence)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {insight.createdAt.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <Badge variant="outline" className="mt-2 border-border bg-secondary/60 text-foreground">
                  {insight.status || "Unavailable"}
                </Badge>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Host</p>
                <p className="mt-2 break-words text-base font-semibold text-foreground">
                  {displayHost(insight.host)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-primary">
                Recommendation:{" "}
                <span className="font-normal text-foreground/85">
                  {displayRecommendation(insight.recommendation)}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{getRelativeTime(insight.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 bg-muted/10 px-5 py-5 md:px-6">
          <div className="space-y-5">
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  closeCard();
                }}
              >
                <ChevronUp className="h-4 w-4" />
                Close details
              </Button>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Full Analysis
              </h4>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 md:p-5">
                {renderInsightContent(insight.responseContent)}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  closeCard();
                }}
              >
                <ChevronUp className="h-4 w-4" />
                Close details
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default InsightCard;