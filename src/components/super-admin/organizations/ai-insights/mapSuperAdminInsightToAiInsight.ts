import type { AiInsight } from "@/hooks/useAiInsights";
import type { GlobalInsightItem } from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";
import { normalizeInsightContent } from "@/lib/insightContent";

type InsightLike = GlobalInsightItem & Record<string, unknown>;

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

const safeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toPlainText = (value: string): string => {
  if (!value) return "";

  return normalizeInsightContent(value)
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const isValidHost = (value?: string | null): boolean => {
  if (!value) return false;
  return !UNKNOWN_HOST_VALUES.has(value.trim().toLowerCase());
};

const extractLabeledValue = (content: string, label: string): string | null => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = "(?=\\s*(?:\\*\\*[A-Za-z][A-Za-z\\s]+:\\*\\*|[A-Za-z][A-Za-z\\s]+:\\s)|$)";

  const patterns = [
    new RegExp(`\\*\\*${escapedLabel}:\\*\\*\\s*([\\s\\S]*?)${boundary}`, "i"),
    new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)${boundary}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const value = toPlainText(match[1]).replace(/^:+/, "").trim();
      if (value) return value;
    }
  }

  return null;
};

const extractHostFromContent = (content: string): string | null => {
  const candidates = [
    extractLabeledValue(content, "Host"),
    extractLabeledValue(content, "VM"),
    extractLabeledValue(content, "Job"),
  ];

  for (const candidate of candidates) {
    if (isValidHost(candidate)) return candidate!.trim();
  }

  return null;
};

const extractEvent = (content: string): string | null => {
  return extractLabeledValue(content, "Event");
};

const extractImpactText = (content: string): string | null => {
  return extractLabeledValue(content, "Impact");
};

const normalizeSeverity = (severity?: string): AiInsight["severity"] => {
  const value = (severity ?? "").toLowerCase();

  if (value.includes("critical") || value.includes("disaster")) return "critical";
  if (value.includes("high") || value.includes("error")) return "high";
  if (value.includes("warning") || value.includes("average") || value.includes("medium")) return "medium";
  if (value.includes("low")) return "low";

  return "info";
};

const normalizeImpact = (impact?: string, severity?: string, content?: string): AiInsight["impact"] => {
  const explicitImpact = (impact ?? extractImpactText(content ?? "") ?? "").toLowerCase();

  if (explicitImpact.includes("critical")) return "critical";
  if (explicitImpact.includes("high")) return "high";
  if (explicitImpact.includes("low")) return "low";

  const mapped = normalizeSeverity(severity);
  if (mapped === "critical") return "critical";
  if (mapped === "high") return "high";
  if (mapped === "low") return "low";
  return "medium";
};

const normalizeType = (
  rawType?: string,
  severity?: string,
  title?: string,
  content?: string
): AiInsight["type"] => {
  const blob = `${rawType ?? ""} ${severity ?? ""} ${title ?? ""} ${content ?? ""}`.toLowerCase();

  if (blob.includes("predict") || blob.includes("forecast")) return "prediction";
  if (blob.includes("anomal") || blob.includes("outlier")) return "anomaly";
  if (blob.includes("optimi") || blob.includes("improve") || blob.includes("recommend")) return "optimization";
  if (
    blob.includes("alert") ||
    blob.includes("warning") ||
    blob.includes("critical") ||
    blob.includes("error") ||
    blob.includes("problem") ||
    blob.includes("failed")
  ) {
    return "alert";
  }

  return "info";
};

const extractRecommendation = (content: string): string => {
  const patterns = [
    /\*?\*?Recommended Actions\*?\*?:?\s*([\s\S]+)$/i,
    /\*?\*?Recommendations?\*?\*?:?\s*([\s\S]+)$/i,
    /\*?\*?Mitigations?\*?\*?:?\s*([\s\S]+)$/i,
    /\*?\*?Actions?\*?\*?:?\s*([\s\S]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const cleaned = toPlainText(match[1])
        .replace(/^(recommend(?:ed)?(?: actions?)?|mitigations?|actions?)\s*:\s*/i, "")
        .trim();
      if (cleaned && cleaned !== "=problem") {
        return cleaned.slice(0, 220);
      }
    }
  }

  return "Click the card to view the full recommendation.";
};

const extractSummary = (content: string): string => {
  const event = extractEvent(content);
  const impact = extractImpactText(content);

  if (event && impact) {
    return `${event}. ${impact}`.slice(0, 220);
  }

  const firstMeaningfulLine = content
    .split("\n")
    .map((line) => toPlainText(line))
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

const resolveTitle = (title: string, content: string, rawType: string): string => {
  const cleanTitle = toPlainText(safeString(title));
  if (cleanTitle && cleanTitle.toLowerCase() !== "ai insight") return cleanTitle;

  const event = extractEvent(content);
  if (event) return event;

  const typeValue = safeString(rawType);
  if (typeValue) return `${typeValue} Insight`;

  return "AI Insight";
};

const parseConfidence = (item: InsightLike): number | null => {
  if (typeof item.confidence === "number" && Number.isFinite(item.confidence)) {
    return item.confidence <= 1 ? Math.round(item.confidence * 100) : Math.round(item.confidence);
  }

  if (typeof item.confidence_score === "number" && Number.isFinite(item.confidence_score)) {
    return item.confidence_score <= 1
      ? Math.round(item.confidence_score * 100)
      : Math.round(item.confidence_score);
  }

  return null;
};

const sanitizeSummary = (summary: string): string => {
  const cleaned = toPlainText(summary);
  if (!cleaned) return "";

  const looksLikeFullPayload =
    cleaned.length > 240 ||
    /zabbix ai analysis|zabbix event summary|likely root cause|first diagnostics|recommended actions|mitigations?|false positive risk|confidence:\s*/i.test(
      cleaned
    );

  if (looksLikeFullPayload) {
    return "";
  }

  return cleaned.length <= 180
    ? cleaned
    : `${cleaned.slice(0, 177).trim()}...`;
};

const sanitizeRecommendation = (recommendation: string): string => {
  const cleaned = toPlainText(recommendation)
    .replace(/^(recommend(?:ed)?(?: actions?)?|mitigations?|actions?)\s*:\s*/i, "")
    .trim();

  if (!cleaned || cleaned === "=problem") return "";
  return cleaned.length <= 220 ? cleaned : `${cleaned.slice(0, 217).trim()}...`;
};

export const mapSuperAdminInsightToAiInsight = (item: GlobalInsightItem): AiInsight => {
  const raw = item as InsightLike;

  const responseContent = normalizeInsightContent(
    safeString(raw.response_content) || safeString(raw.summary) || safeString(item.summary)
  );

  const host =
    (isValidHost(safeString(raw.host)) ? safeString(raw.host) : null) ||
    extractHostFromContent(responseContent);

  const title = resolveTitle(item.title, responseContent, safeString(item.type));
  const severityValue = safeString(raw.severity) || safeString(item.severity);
  const summaryCandidate =
    sanitizeSummary(safeString(raw.summary)) || sanitizeSummary(safeString(item.summary));
  const recommendationCandidate =
    sanitizeRecommendation(safeString(raw.recommendation));

  return {
    id: String(item.id),
    entityType: safeString(raw.entity_type) || safeString(item.type) || "insight",
    entityId: safeString(raw.entity_id) || safeString(raw.entity_uid) || String(item.id),
    host,
    eventReference: safeString(raw.event_reference) || String(item.id),
    severity: normalizeSeverity(severityValue),
    status: safeString(raw.status) || "generated",
    createdAt: item.timestamp,
    updatedAt: raw.updated_at instanceof Date ? raw.updated_at : null,
    responseContent,
    summary: summaryCandidate || extractSummary(responseContent),
    title,
    type: normalizeType(safeString(item.type), severityValue, title, responseContent),
    impact: normalizeImpact(safeString(raw.impact), severityValue, responseContent),
    confidence: parseConfidence(raw),
    recommendation: recommendationCandidate || extractRecommendation(responseContent),
  };
};
