import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuthenticatedFetch } from "@/keycloak/hooks/useAuthenticatedFetch";
import { WEBHOOK_AI_INSIGHTS_URL } from "@/config/env";
import { safeParseResponse } from "@/lib/safeFetch";

const AI_INSIGHTS_ENDPOINT = WEBHOOK_AI_INSIGHTS_URL;
const REFRESH_INTERVAL = 5000;

export interface AiInsightRaw {
  id?: string | number;
  ai_response_id?: string;
  ai_response_uuid?: string;
  entity_type?: string;
  entity_uid?: string;
  entity_id?: string;
  host?: string;
  hostname?: string;
  event_reference?: string;
  severity?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  timestamp?: string;
  response_content?: string;
  summary?: string;
  title?: string;
  type?: string;
  impact?: string;
  confidence?: number | null;
  confidence_score?: number | null;
  recommendation?: string;
  generated_by?: string | null;
  [key: string]: unknown;
}

export interface AiInsight {
  id: string;
  entityType: string;
  entityId: string;
  host: string | null;
  eventReference: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
  responseContent: string;
  summary: string;
  title: string;
  type: "prediction" | "anomaly" | "optimization" | "alert" | "info";
  impact: "critical" | "high" | "medium" | "low";
  confidence: number | null;
  recommendation: string;
}

export type TimeFilter = "all" | "today" | "24h" | "7d" | "30d" | "custom";

interface UseAiInsightsOptions {
  pageSize?: number;
}

interface UseAiInsightsReturn {
  insights: AiInsight[];
  filteredInsights: AiInsight[];
  paginatedInsights: AiInsight[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  customDateFrom: Date | undefined;
  setCustomDateFrom: (date: Date | undefined) => void;
  customDateTo: Date | undefined;
  setCustomDateTo: (date: Date | undefined) => void;
  counts: {
    total: number;
    predictions: number;
    anomalies: number;
    optimizations: number;
    alerts: number;
  };
  highPriorityCount: number;
  last24hCount: number;
  mostAffectedHost: string;
  refresh: () => Promise<void>;
}

const UNKNOWN_HOST_VALUES = new Set([
  "",
  "unknown",
  "unknown host",
  "n/a",
  "null",
  "undefined",
  "—",
  "-",
]);

const htmlEntityMap: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const decodeHtmlEntities = (value?: string): string => {
  if (!value) return "";
  return value.replace(/&lt;|&gt;|&amp;|&quot;|&#39;|&nbsp;/g, (match) => htmlEntityMap[match] ?? match);
};

const stripHtmlTags = (value?: string): string => {
  if (!value) return "";
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
};

const normalizeWhitespace = (value?: string): string => {
  return (value ?? "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
};

const safeText = (value?: string | null): string => normalizeWhitespace(stripHtmlTags(value ?? ""));

const titleCaseHost = (host: string): string => {
  if (!host) return "—";
  return host;
};

const isValidHostValue = (value?: string | null): boolean => {
  if (!value) return false;
  return !UNKNOWN_HOST_VALUES.has(value.trim().toLowerCase());
};

const parseLabeledValue = (content: string, label: string): string | null => {
  const decoded = decodeHtmlEntities(content);

  const patterns = [
    new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i"),
    new RegExp(`<b>${label}:<\\/b>\\s*([^\\n<]+)`, "i"),
    new RegExp(`${label}:\\s*([^\\n]+)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match?.[1]) {
      const cleaned = safeText(match[1])
        .replace(/\*\*/g, "")
        .replace(/^:+/, "")
        .trim();

      if (cleaned) return cleaned;
    }
  }

  return null;
};

const extractHostFromContent = (content?: string): string | null => {
  if (!content) return null;

  const candidates = [
    parseLabeledValue(content, "Host"),
    parseLabeledValue(content, "VM"),
    parseLabeledValue(content, "Job"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (isValidHostValue(candidate)) {
      return candidate.trim();
    }
  }

  return null;
};

const extractSeverityFromContent = (content?: string): string | undefined => {
  const severity = parseLabeledValue(content ?? "", "Severity");
  if (!severity) return undefined;
  return severity.replace(/[🟡🟠🔴🟢🔵]/g, "").trim();
};

const extractImpactFromContent = (content?: string): string | undefined => {
  return parseLabeledValue(content ?? "", "Impact") ?? undefined;
};

const extractEventFromContent = (content?: string): string | null => {
  return parseLabeledValue(content ?? "", "Event");
};

const normalizeSeverity = (severity?: string): AiInsight["severity"] => {
  if (!severity) return "info";
  const lower = severity.toLowerCase();

  if (lower.includes("critical") || lower.includes("disaster")) return "critical";
  if (lower.includes("high") || lower.includes("error")) return "high";
  if (lower.includes("medium") || lower.includes("average") || lower.includes("warning")) return "medium";
  if (lower.includes("low")) return "low";

  return "info";
};

const normalizeImpact = (impact?: string): AiInsight["impact"] => {
  if (!impact) return "medium";
  const lower = impact.toLowerCase();

  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("low")) return "low";

  return "medium";
};

const normalizeType = (
  type?: string,
  severity?: string,
  content?: string,
  entityType?: string
): AiInsight["type"] => {
  const combined = `${type ?? ""} ${severity ?? ""} ${content ?? ""} ${entityType ?? ""}`.toLowerCase();

  if (combined.includes("predict") || combined.includes("forecast")) return "prediction";
  if (combined.includes("anomal") || combined.includes("outlier")) return "anomaly";
  if (combined.includes("optimi") || combined.includes("improve") || combined.includes("best practice")) return "optimization";
  if (
    combined.includes("alert") ||
    combined.includes("critical") ||
    combined.includes("warning") ||
    combined.includes("error") ||
    combined.includes("problem") ||
    combined.includes("failed")
  ) {
    return "alert";
  }

  return "info";
};

const parseConfidenceValue = (raw: AiInsightRaw): number | null => {
  if (typeof raw.confidence === "number" && Number.isFinite(raw.confidence)) {
    return raw.confidence <= 1 ? Math.round(raw.confidence * 100) : Math.round(raw.confidence);
  }

  if (typeof raw.confidence_score === "number" && Number.isFinite(raw.confidence_score)) {
    return raw.confidence_score <= 1
      ? Math.round(raw.confidence_score * 100)
      : Math.round(raw.confidence_score);
  }

  return null;
};

const formatFallbackRecommendation = (): string => {
  return "Click the card to view the full recommendation.";
};

const extractRecommendation = (content?: string): string => {
  if (!content) return formatFallbackRecommendation();

  const decoded = decodeHtmlEntities(content);

  const patterns = [
    /\*?\*?Recommended Actions\*?\*?:?\s*([\s\S]+)$/i,
    /\*?\*?Recommendations?\*?\*?:?\s*([\s\S]+)$/i,
    /\*?\*?Mitigations?\*?\*?:?\s*([\s\S]+)$/i,
    /\*?\*?Actions?\*?\*?:?\s*([\s\S]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match?.[1]) {
      const cleaned = safeText(match[1]).replace(/\s+/g, " ").trim();
      if (cleaned && cleaned !== "=problem") {
        return cleaned.slice(0, 220);
      }
    }
  }

  return formatFallbackRecommendation();
};

const extractSummary = (content?: string): string => {
  if (!content) return "No summary available.";

  const event = extractEventFromContent(content);
  const impact = extractImpactFromContent(content);

  if (event && impact) {
    return `${event}. ${impact}`.slice(0, 220);
  }

  const plain = safeText(content);
  const firstMeaningfulLine = plain
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !/^zabbix ai analysis$/i.test(line) &&
        !/^zabbix event summary:?$/i.test(line)
    );

  if (!firstMeaningfulLine) return "No summary available.";

  return firstMeaningfulLine.length <= 180
    ? firstMeaningfulLine
    : `${firstMeaningfulLine.slice(0, 177).trim()}...`;
};

const generateTitle = (raw: AiInsightRaw, derivedHost: string | null): string => {
  if (raw.title && safeText(raw.title)) return safeText(raw.title);

  const content = raw.response_content ?? "";
  const event = extractEventFromContent(content);
  if (event) return event;

  if (raw.entity_type && derivedHost) return `${raw.entity_type} - ${derivedHost}`;
  if (raw.entity_type) return `${raw.entity_type} Insight`;

  return "AI Insight";
};

const resolveHost = (raw: AiInsightRaw): string | null => {
  const directCandidates = [raw.host, raw.hostname, raw.entity_uid]
    .map((value) => safeText(String(value ?? "")))
    .filter(Boolean);

  for (const candidate of directCandidates) {
    if (isValidHostValue(candidate) && !candidate.includes("_") && !candidate.includes("{") && !candidate.includes("```json")) {
      return candidate;
    }
  }

  const fromContent = extractHostFromContent(raw.response_content);
  if (isValidHostValue(fromContent)) {
    return fromContent;
  }

  return null;
};

const transformInsight = (raw: AiInsightRaw): AiInsight => {
  const id =
    String(
      raw.ai_response_id ??
        raw.id ??
        raw.event_reference ??
        `${raw.entity_type ?? "insight"}-${raw.entity_uid ?? "unknown"}-${raw.created_at ?? raw.timestamp ?? Date.now()}`
    );

  const createdAt = raw.created_at
    ? new Date(raw.created_at)
    : raw.timestamp
      ? new Date(raw.timestamp)
      : new Date();

  const updatedAt = raw.updated_at ? new Date(raw.updated_at) : null;

  const content = normalizeWhitespace(decodeHtmlEntities(raw.response_content ?? ""));
  const derivedHost = resolveHost(raw);
  const severitySource = raw.severity ?? extractSeverityFromContent(content);
  const impactSource = raw.impact ?? extractImpactFromContent(content);
  const recommendation =
    raw.recommendation && safeText(raw.recommendation) !== "=problem"
      ? safeText(raw.recommendation)
      : extractRecommendation(content);

  return {
    id,
    entityType: safeText(raw.entity_type) || "Unknown",
    entityId: safeText(raw.entity_id) || safeText(raw.entity_uid) || "",
    host: derivedHost,
    eventReference: safeText(raw.event_reference),
    severity: normalizeSeverity(severitySource),
    status: safeText(raw.status) || "generated",
    createdAt,
    updatedAt,
    responseContent: content,
    summary: safeText(raw.summary) || extractSummary(content),
    title: generateTitle(raw, derivedHost),
    type: normalizeType(raw.type, severitySource, content, raw.entity_type),
    impact: normalizeImpact(impactSource),
    confidence: parseConfidenceValue(raw),
    recommendation,
  };
};

const sortInsights = (insights: AiInsight[]): AiInsight[] => {
  return [...insights].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const useAiInsights = (options: UseAiInsightsOptions = {}): UseAiInsightsReturn => {
  const { pageSize = 8 } = options;

  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const insightsMapRef = useRef<Map<string, AiInsight>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { authenticatedFetch } = useAuthenticatedFetch();

  const fetchInsights = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);

        const response = await authenticatedFetch(AI_INSIGHTS_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const result = await safeParseResponse<AiInsightRaw[] | AiInsightRaw>(response, AI_INSIGHTS_ENDPOINT);

        if (!result.ok) {
          throw new Error(result.userMessage || "We couldn't load AI insights right now.");
        }

        if (!result.data) {
          setInsights([]);
          setIsConnected(true);
          setLastUpdated(new Date());
          setError(null);
          return;
        }

        const rawInsights = Array.isArray(result.data) ? result.data : [result.data];
        const transformedInsights = rawInsights.map(transformInsight);

        const newMap = new Map<string, AiInsight>();

        transformedInsights.forEach((insight) => {
          const existing = insightsMapRef.current.get(insight.id);

          if (!existing) {
            newMap.set(insight.id, insight);
            return;
          }

          const incomingUpdated = insight.updatedAt?.getTime() ?? insight.createdAt.getTime();
          const existingUpdated = existing.updatedAt?.getTime() ?? existing.createdAt.getTime();

          newMap.set(insight.id, incomingUpdated >= existingUpdated ? insight : existing);
        });

        insightsMapRef.current = newMap;

        const nextInsights = sortInsights(Array.from(newMap.values()));

        setInsights((prev) => {
          const prevSerialized = JSON.stringify(prev);
          const nextSerialized = JSON.stringify(nextInsights);
          return prevSerialized === nextSerialized ? prev : nextInsights;
        });

        setIsConnected(true);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error("[useAiInsights] Fetch error:", err);

        const message =
          err instanceof Error && err.message
            ? err.message
            : "We couldn't load AI insights right now. Please try again.";

        if (!silent) setError(message);
        setIsConnected(false);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authenticatedFetch]
  );

  useEffect(() => {
    fetchInsights(false);
  }, [fetchInsights]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchInsights(true);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchInsights]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeFilter, customDateFrom, customDateTo]);

  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
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
        case "24h": {
          const cutoff = now - 24 * 60 * 60 * 1000;
          return insightTime >= cutoff;
        }
        case "7d": {
          const cutoff = now - 7 * 24 * 60 * 60 * 1000;
          return insightTime >= cutoff;
        }
        case "30d": {
          const cutoff = now - 30 * 24 * 60 * 60 * 1000;
          return insightTime >= cutoff;
        }
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
  }, [insights, timeFilter, customDateFrom, customDateTo]);

  const totalCount = filteredInsights.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedInsights = useMemo(() => {
    return filteredInsights.slice(startIndex, endIndex);
  }, [filteredInsights, startIndex, endIndex]);

  const counts = useMemo(
    () => ({
      total: insights.length,
      predictions: insights.filter((i) => i.type === "prediction").length,
      anomalies: insights.filter((i) => i.type === "anomaly").length,
      optimizations: insights.filter((i) => i.type === "optimization").length,
      alerts: insights.filter((i) => i.type === "alert").length,
    }),
    [insights]
  );

  const highPriorityCount = useMemo(() => {
    return insights.filter(
      (i) =>
        i.severity === "critical" ||
        i.severity === "high" ||
        i.impact === "critical" ||
        i.impact === "high"
    ).length;
  }, [insights]);

  const last24hCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return insights.filter((i) => i.createdAt.getTime() >= cutoff).length;
  }, [insights]);

  const mostAffectedHost = useMemo(() => {
    if (insights.length === 0) return "—";

    const hostCounts = new Map<string, number>();

    insights.forEach((insight) => {
      const host = safeText(insight.host ?? "");
      if (isValidHostValue(host)) {
        hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
      }
    });

    if (hostCounts.size === 0) return "—";

    let topHost = "—";
    let maxCount = 0;

    hostCounts.forEach((count, host) => {
      if (count > maxCount) {
        maxCount = count;
        topHost = host;
      }
    });

    return titleCaseHost(topHost);
  }, [insights]);

  const refresh = useCallback(async () => {
    await fetchInsights(false);
  }, [fetchInsights]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  return {
    insights,
    filteredInsights,
    paginatedInsights,
    loading,
    error,
    isConnected,
    lastUpdated,
    currentPage,
    totalPages,
    totalCount,
    setCurrentPage,
    pageSize,
    startIndex,
    endIndex,
    timeFilter,
    setTimeFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    counts,
    highPriorityCount,
    last24hCount,
    mostAffectedHost,
    refresh,
  };
};

export const formatInsightDate = (date: Date): string => {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getRelativeTime = (date: Date): string => {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatInsightDate(date);
};

export default useAiInsights;