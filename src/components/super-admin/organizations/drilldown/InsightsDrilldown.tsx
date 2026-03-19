import { useMemo } from "react";
import AiInsightsPanel from "@/components/AI-Insights/AiInsightsPanel";
import type { AiInsight } from "@/hooks/useAiInsights";
import type { InsightItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import { mapSuperAdminInsightToAiInsight } from "@/components/super-admin/organizations/ai-insights/mapSuperAdminInsightToAiInsight";

interface InsightsDrilldownProps {
  orgName: string;
  insights: InsightItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onItemClick?: (item: InsightItem) => void;
}

const InsightsDrilldown = ({
  orgName,
  insights,
  loading,
  error,
  onRefresh,
}: InsightsDrilldownProps) => {
  const mappedInsights = useMemo<AiInsight[]>(
    () => insights.map(mapSuperAdminInsightToAiInsight),
    [insights]
  );

  return (
    <AiInsightsPanel
      contextLabel={orgName}
      insights={mappedInsights}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      showHeader
      showSummaryCards
      enableSearch
      enableTypeFilter
      emptyMessage={`No AI insights found for ${orgName}.`}
    />
  );
};

export default InsightsDrilldown;
