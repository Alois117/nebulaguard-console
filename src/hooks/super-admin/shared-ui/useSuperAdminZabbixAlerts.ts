import { useCallback, useMemo } from "react";
import type { Alert as DashboardAlert } from "@/components/alerts/AlertsTable";
import type { AlertSeverity } from "@/components/alerts/SeverityBadge";
import type { AlertCounts } from "@/hooks/useAlerts";
import type { AlertItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import type { GlobalAlertItem } from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";
import {
  extractAlertHost,
  extractAlertProblem,
  normalizeAlertInlineText,
} from "@/lib/alertPresentation";

type SuperAdminAlertSource = (AlertItem | GlobalAlertItem) & Record<string, unknown>;

interface UseSuperAdminZabbixAlertsOptions {
  alerts: Array<AlertItem | GlobalAlertItem>;
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
  onRefresh?: () => Promise<void> | void;
}

interface UseSuperAdminZabbixAlertsReturn {
  alerts: DashboardAlert[];
  loading: boolean;
  error: string | null;
  counts: AlertCounts;
  isConnected: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void> | void;
}

const safeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toNumberOrNull = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeSeverity = (severity: string): AlertSeverity => {
  const value = severity.toLowerCase();
  if (value.includes("disaster")) return "disaster";
  if (value.includes("critical")) return "critical";
  if (value.includes("high") || value.includes("error")) return "high";
  if (value.includes("average") || value.includes("medium")) return "average";
  if (value.includes("warning")) return "warning";
  return "info";
};

const inferCategory = (title: string, message: string): string => {
  const blob = `${title} ${message}`.toLowerCase();
  if (blob.includes("vmware") || blob.includes("vm")) return "VMware";
  if (blob.includes("disk")) return "Disk";
  if (blob.includes("cpu")) return "CPU";
  if (blob.includes("memory")) return "Memory";
  if (blob.includes("network")) return "Network";
  if (blob.includes("database") || blob.includes("db")) return "Database";
  if (blob.includes("service")) return "Service";
  return "System";
};

const formatDuration = (timestamp: Date): string => {
  const diffMs = Math.max(0, Date.now() - timestamp.getTime());
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

const toTimestamp = (value: unknown): Date => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  const parsed = new Date(String(value ?? ""));
  if (Number.isFinite(parsed.getTime())) {
    return parsed;
  }

  return new Date();
};

const hashToPositiveInt = (seed: string): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const toStableNumericId = (item: SuperAdminAlertSource): number => {
  const numericCandidate = toNumberOrNull(item.eventid ?? item.id);
  if (numericCandidate != null) return numericCandidate;

  const problemSeed = extractAlertProblem({
    primary: safeString(item.title),
    content: safeString(item.message) || safeString(item.first_ai_response) || safeString(item.response_content),
  });
  const hostSeed = extractAlertHost({
    directHost: safeString(item.host),
    content: safeString(item.message) || safeString(item.first_ai_response) || safeString(item.response_content),
    dedupeKey: safeString(item.dedupeKey) || safeString(item.dedupe_key),
  });
  const seed = [
    safeString(item.dedupeKey),
    safeString(item.dedupe_key),
    safeString(item.eventid),
    problemSeed,
    hostSeed,
    safeString(item.firstSeen),
    safeString(item.first_seen),
    safeString(item.lastSeen),
    safeString(item.last_seen_at),
    safeString(item.timestamp),
  ]
    .filter(Boolean)
    .join("|");

  return hashToPositiveInt(seed || safeString(item.id) || "super-admin-alert");
};

const toDashboardStatus = (
  status: string,
  acknowledged: boolean
): "active" | "acknowledged" | "resolved" => {
  const value = status.toLowerCase();
  if (value.includes("resolved")) return "resolved";
  if (acknowledged || value.includes("ack")) return "acknowledged";
  return "active";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getSourceClientId = (item: SuperAdminAlertSource): number | null => {
  const candidate = item.clientId ?? item.client_id;
  return toNumberOrNull(candidate);
};

const getSourceOrganizationId = (item: SuperAdminAlertSource): string | null => {
  const value = item.organizationId;
  return typeof value === "string" ? value : null;
};

const filterByScope = (
  alerts: SuperAdminAlertSource[],
  selectedOrganizationId?: string | null,
  selectedOrganizationClientId?: number | null
) => {
  if (!selectedOrganizationId && selectedOrganizationClientId == null) return alerts;

  return alerts.filter((item) => {
    if (selectedOrganizationId) {
      const orgId = getSourceOrganizationId(item);
      if (orgId != null) return orgId === selectedOrganizationId;
    }

    if (selectedOrganizationClientId != null) {
      const clientId = getSourceClientId(item);
      if (clientId == null) return true;
      return clientId === selectedOrganizationClientId;
    }

    return true;
  });
};

const useSuperAdminZabbixAlerts = ({
  alerts,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
  onRefresh,
}: UseSuperAdminZabbixAlertsOptions): UseSuperAdminZabbixAlertsReturn => {
  const scopedAlerts = useMemo(
    () =>
      filterByScope(
        alerts as SuperAdminAlertSource[],
        selectedOrganizationId,
        selectedOrganizationClientId
      ),
    [alerts, selectedOrganizationId, selectedOrganizationClientId]
  );

  const mappedAlerts = useMemo<DashboardAlert[]>(
    () =>
      [...scopedAlerts]
        .sort((left, right) => toTimestamp(right.timestamp).getTime() - toTimestamp(left.timestamp).getTime())
        .map((item) => {
          const timestamp = toTimestamp(item.timestamp);
          const message =
            safeString(item.message) ||
            safeString(item.first_ai_response) ||
            safeString(item.response_content);
          const firstSeen =
            safeString(item.firstSeen) || safeString(item.first_seen);
          const lastSeen =
            safeString(item.lastSeen) ||
            safeString(item.last_seen_at) ||
            safeString(item.updated_at) ||
            timestamp.toISOString();
          const dedupeKey =
            safeString(item.dedupeKey) ||
            safeString(item.dedupe_key) ||
            safeString(item.eventid);

          const host = extractAlertHost({
            directHost: safeString(item.host),
            content: message,
            dedupeKey,
          });
          const problem = extractAlertProblem({
            primary: safeString(item.title),
            content: message,
            fallbacks: [
              safeString((isRecord(item.rawMetadata) ? item.rawMetadata.name : "")),
              safeString((isRecord(item.rawMetadata) ? item.rawMetadata.problem_name : "")),
              safeString((isRecord(item.rawMetadata) ? item.rawMetadata.description : "")),
            ],
          });
          const severity = normalizeSeverity(safeString(item.severity));
          const acknowledged = Boolean(item.acknowledged);
          const status = toDashboardStatus(safeString(item.status), acknowledged);

          const timesSent = toNumberOrNull(item.timesSent ?? item.times_sent) ?? undefined;
          const seenCount = toNumberOrNull(item.seenCount ?? item.seen_count) ?? undefined;

          const rawMetadata = {
            ...(isRecord(item.rawMetadata) ? item.rawMetadata : {}),
            ...(isRecord(item.raw_metadata) ? item.raw_metadata : {}),
            eventid: safeString(item.eventid),
            severity: safeString(item.severity),
            dedupe_key: dedupeKey || undefined,
          };

          return {
            id: toStableNumericId(item),
            severity,
            host,
            category: inferCategory(problem, message),
            problem,
            duration: formatDuration(timestamp),
            scope: "Production",
            acknowledged,
            status,
            timestamp: timestamp.toLocaleString(),
            aiInsights: normalizeAlertInlineText(message) ? message : undefined,
            timesSent,
            seenCount,
            firstSeen: firstSeen || timestamp.toISOString(),
            lastSeen,
            dedupeKey: dedupeKey || undefined,
            rawMetadata,
          };
        }),
    [scopedAlerts]
  );

  const counts = useMemo<AlertCounts>(
    () => ({
      disaster: mappedAlerts.filter((alert) => alert.severity === "disaster").length,
      high: mappedAlerts.filter((alert) => alert.severity === "high" || alert.severity === "critical").length,
      average: mappedAlerts.filter((alert) => alert.severity === "average").length,
      warning: mappedAlerts.filter((alert) => alert.severity === "warning").length,
      acknowledged: mappedAlerts.filter((alert) => alert.acknowledged).length,
      total: mappedAlerts.length,
    }),
    [mappedAlerts]
  );

  const refresh = useCallback(() => {
    if (onRefresh) return onRefresh();
  }, [onRefresh]);

  const displayLoading = loading && mappedAlerts.length === 0;

  return {
    alerts: mappedAlerts,
    loading: displayLoading,
    error,
    counts,
    isConnected,
    lastUpdated,
    refresh,
  };
};

export default useSuperAdminZabbixAlerts;
