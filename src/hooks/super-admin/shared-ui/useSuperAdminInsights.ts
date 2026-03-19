import { useCallback, useEffect, useMemo, useState } from "react";
import type { AiInsight, TimeFilter } from "@/hooks/useAiInsights";
import type { InsightItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import type { GlobalInsightItem } from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";
import { mapSuperAdminInsightToAiInsight } from "@/components/super-admin/organizations/ai-insights/mapSuperAdminInsightToAiInsight";
import { isItemRead, markItemRead } from "@/utils/readState";
import { useAuth } from "@/keycloak/context/AuthContext";

type SuperAdminInsightSource = InsightItem | GlobalInsightItem;

interface UseSuperAdminInsightsOptions {
  insights: SuperAdminInsightSource[];
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
  pageSize?: number;
  onRefresh?: () => Promise<void> | void;
}

interface UseSuperAdminInsightsReturn {
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
  isInsightRead: (id: string) => boolean;
  markInsightRead: (id: string) => void;
}

const toNumberOrNull = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getSourceClientId = (insight: SuperAdminInsightSource): number | null => {
  const typedInsight = insight as {
    clientId?: number | null;
    client_id?: number;
  };
  return toNumberOrNull(typedInsight.clientId ?? typedInsight.client_id);
};

const getSourceOrganizationId = (insight: SuperAdminInsightSource): string | null => {
  const typedInsight = insight as { organizationId?: string | null };
  return typedInsight.organizationId ?? null;
};

const filterByScope = (
  insights: SuperAdminInsightSource[],
  selectedOrganizationId?: string | null,
  selectedOrganizationClientId?: number | null
) => {
  if (!selectedOrganizationId && selectedOrganizationClientId == null) return insights;

  return insights.filter((insight) => {
    if (selectedOrganizationId) {
      const orgId = getSourceOrganizationId(insight);
      if (orgId != null) return orgId === selectedOrganizationId;
    }

    if (selectedOrganizationClientId != null) {
      const clientId = getSourceClientId(insight);
      if (clientId == null) {
        // If source does not include explicit client identifiers, keep item.
        // Upstream source hooks may already be organization scoped.
        return true;
      }
      return clientId === selectedOrganizationClientId;
    }

    return true;
  });
};

const sortInsights = (insights: AiInsight[]) =>
  [...insights].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

const UNKNOWN_HOST = "—";

const useSuperAdminInsights = ({
  insights,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
  pageSize = 8,
  onRefresh,
}: UseSuperAdminInsightsOptions): UseSuperAdminInsightsReturn => {
  const { decodedToken } = useAuth();
  const userId = decodedToken?.sub || "";

  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const scopedSourceInsights = useMemo(
    () =>
      filterByScope(insights, selectedOrganizationId, selectedOrganizationClientId),
    [insights, selectedOrganizationId, selectedOrganizationClientId]
  );

  const mappedInsights = useMemo(
    () => sortInsights(scopedSourceInsights.map(mapSuperAdminInsightToAiInsight)),
    [scopedSourceInsights]
  );

  const filteredInsights = useMemo(() => {
    return mappedInsights.filter((insight) => {
      const insightTime = insight.createdAt.getTime();
      const now = Date.now();

      switch (timeFilter) {
        case "all":
          return true;
        case "today": {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          return insightTime >= startOfDay.getTime();
        }
        case "24h":
          return insightTime >= now - 24 * 60 * 60 * 1000;
        case "7d":
          return insightTime >= now - 7 * 24 * 60 * 60 * 1000;
        case "30d":
          return insightTime >= now - 30 * 24 * 60 * 60 * 1000;
        case "custom": {
          if (customDateFrom && insightTime < customDateFrom.getTime()) return false;
          if (customDateTo) {
            const endOfDay = new Date(customDateTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (insightTime > endOfDay.getTime()) return false;
          }
          return true;
        }
        default:
          return true;
      }
    });
  }, [mappedInsights, timeFilter, customDateFrom, customDateTo]);

  const totalCount = filteredInsights.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedInsights = useMemo(
    () => filteredInsights.slice(startIndex, endIndex),
    [filteredInsights, startIndex, endIndex]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    timeFilter,
    customDateFrom,
    customDateTo,
    selectedOrganizationId,
    selectedOrganizationClientId,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!userId || paginatedInsights.length === 0) return;
    const next = new Set<string>();
    paginatedInsights.forEach((insight) => {
      if (isItemRead(userId, insight.id)) {
        next.add(insight.id);
      }
    });
    setReadIds(next);
  }, [userId, paginatedInsights]);

  const markInsightRead = useCallback(
    (id: string) => {
      if (!userId) return;
      markItemRead(userId, id);
      setReadIds((prev) => new Set(prev).add(id));
    },
    [userId]
  );

  const isInsightRead = useCallback((id: string) => readIds.has(id), [readIds]);

  const highPriorityCount = useMemo(
    () =>
      mappedInsights.filter(
        (insight) =>
          insight.severity === "critical" ||
          insight.severity === "high" ||
          insight.impact === "critical" ||
          insight.impact === "high"
      ).length,
    [mappedInsights]
  );

  const last24hCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return mappedInsights.filter((insight) => insight.createdAt.getTime() >= cutoff).length;
  }, [mappedInsights]);

  const mostAffectedHost = useMemo(() => {
    if (mappedInsights.length === 0) return UNKNOWN_HOST;

    const hostCounts = new Map<string, number>();
    mappedInsights.forEach((insight) => {
      const host = insight.host?.trim();
      if (!host) return;
      hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
    });

    if (hostCounts.size === 0) return UNKNOWN_HOST;

    let topHost = UNKNOWN_HOST;
    let maxCount = 0;
    hostCounts.forEach((count, host) => {
      if (count > maxCount) {
        maxCount = count;
        topHost = host;
      }
    });

    return topHost;
  }, [mappedInsights]);

  const refresh = useCallback(() => {
    if (onRefresh) return onRefresh();
  }, [onRefresh]);

  const displayLoading = loading && mappedInsights.length === 0;

  return {
    paginatedInsights,
    loading: displayLoading,
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
    markInsightRead,
  };
};

export default useSuperAdminInsights;
