import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthenticatedFetch } from "@/keycloak/hooks/useAuthenticatedFetch";
import { safeParseResponse } from "@/lib/safeFetch";
import { WEBHOOK_VEEAM_ALARMS_URL } from "@/config/env";

export interface VeeamAlarm {
  client_id: number;
  alarm_id: string;
  dedupe_key: string;
  name: string;
  description: string;
  severity: string;
  status: string;
  entity_type: string;
  entity_name: string;
  triggered_at: string | null;
  resolved_at: string | null;
  first_seen: string | null;
  last_seen: string | null;
  seen_count: number;
  times_sent: number;
  reminder_interval?: number;
  first_ai_response?: string;
}

export type AlarmStatus = "Active" | "Acknowledged" | "Resolved" | "Suppressed" | "All";
export type AlarmSeverity = "Critical" | "Warning" | "High" | "Info" | "Unknown" | "All";
export type TimeRange = "1h" | "24h" | "7d" | "custom" | "all";

interface UseVeeamAlarmsOptions {
  pageSize?: number;
}

interface UseVeeamAlarmsReturn {
  alarms: VeeamAlarm[];
  filteredAlarms: VeeamAlarm[];
  paginatedAlarms: VeeamAlarm[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: AlarmStatus;
  setFilterStatus: (status: AlarmStatus) => void;
  filterSeverity: AlarmSeverity;
  setFilterSeverity: (severity: AlarmSeverity) => void;
  filterEntityType: string;
  setFilterEntityType: (entityType: string) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  customDateFrom: Date | undefined;
  setCustomDateFrom: (date: Date | undefined) => void;
  customDateTo: Date | undefined;
  setCustomDateTo: (date: Date | undefined) => void;

  // Pagination
  loadMore: () => void;
  resetPagination: () => void;

  // Counts
  counts: {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    suppressed: number;
  };

  // Entity types for filter dropdown (includes "All")
  entityTypes: string[];
}

const VEEAM_ALARMS_ENDPOINT = WEBHOOK_VEEAM_ALARMS_URL;
const REFRESH_INTERVAL = 5000;

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const toNumberOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const safeString = (v: unknown): string => (typeof v === "string" ? v : "");

const parseTimeMs = (value: unknown): number => {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const severityFromOuterKey = (outerKey: string): AlarmSeverity => {
  const severityMap: Record<string, AlarmSeverity> = {
    Error: "Critical",
    Warning: "Warning",
    Information: "Info",
    High: "High",
    Resolved: "Info",
  };
  return severityMap[outerKey] ?? "Unknown";
};

const severityFromStatus = (statusRaw: string): AlarmSeverity => {
  const s = (statusRaw || "").toLowerCase();
  if (s.includes("error") || s.includes("critical")) return "Critical";
  if (s.includes("warn")) return "Warning";
  if (s.includes("high")) return "High";
  if (s.includes("info")) return "Info";
  if (s.includes("resolved")) return "Info";
  if (s.includes("ack")) return "Warning";
  return "Unknown";
};

const normalizeStatus = (statusRaw: unknown, descriptionRaw: unknown): AlarmStatus => {
  const s = String(statusRaw ?? "").trim().toLowerCase();
  const description = String(descriptionRaw ?? "").toLowerCase();

  if (s === "resolved" || description.includes("back to normal")) return "Resolved";
  if (s === "acknowledged" || s === "ack") return "Acknowledged";
  if (s === "suppressed") return "Suppressed";
  return "Active";
};

const mapAlarmsPayload = (payload: unknown[]): VeeamAlarm[] => {
  const mapped: VeeamAlarm[] = [];

  for (let index = 0; index < payload.length; index += 1) {
    const entry = asRecord(payload[index]);
    const keys = Object.keys(entry);

    // Shape A: { "Error": {...} }
    const looksGrouped =
      keys.length === 1 &&
      entry[keys[0] as keyof typeof entry] &&
      typeof entry[keys[0] as keyof typeof entry] === "object";

    // Shape B: flat record
    const looksFlat =
      "client_id" in entry ||
      "clientId" in entry ||
      "alarm_name" in entry ||
      "alarmName" in entry ||
      "triggered_alarm_id" in entry ||
      "triggeredAlarmId" in entry ||
      "status" in entry;

    let outerKey = "Unknown";
    let inner: UnknownRecord = {};

    if (looksGrouped) {
      outerKey = keys[0]!;
      inner = asRecord(entry[outerKey]);
    } else if (looksFlat) {
      inner = entry;
      outerKey = String(inner.status ?? "Unknown");
    } else {
      continue;
    }

    if (!Object.keys(inner).length) continue;

    const description = String(inner.description ?? "");
    const status = normalizeStatus(inner.status, description);

    const severity: AlarmSeverity = looksGrouped
      ? severityFromOuterKey(outerKey)
      : severityFromStatus(String(inner.status ?? ""));

    const clientId = toNumberOrNull(inner.client_id ?? inner.clientId) ?? 0;

    const rawAlarmId =
      safeString(inner.triggered_alarm_id) ||
      safeString(inner.triggeredAlarmId) ||
      safeString(inner.alarm_id) ||
      safeString(inner.alarmId);

    const rawDedupeKey =
      safeString(inner.dedupe_key) ||
      safeString(inner.dedupeKey) ||
      rawAlarmId;

    const alarmId = rawAlarmId || `${clientId}-${rawDedupeKey || "alarm"}-${index}`;
    const dedupeKey = rawDedupeKey || alarmId;

    mapped.push({
      client_id: clientId,
      alarm_id: alarmId,
      dedupe_key: dedupeKey,
      name: String(inner.alarm_name ?? inner.alarmName ?? ""),
      description,
      severity,
      status,
      entity_type: String(inner.object_type ?? inner.objectType ?? ""),
      entity_name: String(inner.object_name ?? inner.objectName ?? ""),
      triggered_at: inner.triggered_time ? String(inner.triggered_time) : null,
      resolved_at: inner.resolved_at ? String(inner.resolved_at) : null,
      first_seen: inner.first_seen ? String(inner.first_seen) : null,
      last_seen: inner.last_seen ? String(inner.last_seen) : null,
      seen_count: toNumberOrNull(inner.repeat_count ?? inner.repeatCount) ?? 0,
      times_sent: 0,
      reminder_interval: undefined,
      first_ai_response: inner.comment ? String(inner.comment) : undefined,
    });
  }

  return mapped;
};

export const useVeeamAlarms = (options: UseVeeamAlarmsOptions = {}): UseVeeamAlarmsReturn => {
  const { pageSize = 10 } = options;

  const [alarms, setAlarms] = useState<VeeamAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ✅ Defaults: show everything
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AlarmStatus>("All");
  const [filterSeverity, setFilterSeverity] = useState<AlarmSeverity>("All");
  const [filterEntityType, setFilterEntityType] = useState<string>("All");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const [displayCount, setDisplayCount] = useState(pageSize);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setDisplayCount(pageSize);
  }, [
    debouncedSearch,
    filterStatus,
    filterSeverity,
    filterEntityType,
    timeRange,
    customDateFrom,
    customDateTo,
    pageSize,
  ]);

  const { authenticatedFetch } = useAuthenticatedFetch();

  const fetchAlarms = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const response = await authenticatedFetch(VEEAM_ALARMS_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        const result = await safeParseResponse<unknown[]>(response, VEEAM_ALARMS_ENDPOINT);
        if (!result.ok) throw new Error(result.userMessage);

        const payload = Array.isArray(result.data) ? result.data : [];
        if (payload.length === 0) {
          setAlarms([]);
          setIsConnected(true);
          setLastUpdated(new Date());
          setError(null);
          return;
        }

        const alarmsArray = mapAlarmsPayload(payload);

        // Keep most recent per dedupe_key
        const uniqueMap = new Map<string, VeeamAlarm>();
        for (let i = 0; i < alarmsArray.length; i += 1) {
          const alarm = alarmsArray[i];
          if (!alarm.dedupe_key) continue;

          const existing = uniqueMap.get(alarm.dedupe_key);
          if (!existing) {
            uniqueMap.set(alarm.dedupe_key, alarm);
            continue;
          }

          const existingMs = parseTimeMs(existing.last_seen || existing.triggered_at);
          const currentMs = parseTimeMs(alarm.last_seen || alarm.triggered_at);
          if (currentMs >= existingMs) uniqueMap.set(alarm.dedupe_key, alarm);
        }

        setAlarms(Array.from(uniqueMap.values()));
        setIsConnected(true);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        const safeMessage =
          err instanceof Error ? err.message : "We couldn't load Veeam alarms. Please try again.";
        if (!silent) setError(safeMessage);
        setIsConnected(false);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authenticatedFetch]
  );

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(() => fetchAlarms(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlarms]);

  const entityTypes = useMemo(() => {
    const types = new Set(alarms.map((a) => a.entity_type).filter(Boolean));
    return ["All", ...Array.from(types).sort()];
  }, [alarms]);

  const filteredAlarms = useMemo(() => {
    return alarms
      .filter((alarm) => {
        // Search
        if (debouncedSearch) {
          const s = debouncedSearch.toLowerCase();
          const match =
            alarm.name?.toLowerCase().includes(s) ||
            alarm.entity_name?.toLowerCase().includes(s) ||
            alarm.entity_type?.toLowerCase().includes(s) ||
            alarm.description?.toLowerCase().includes(s) ||
            alarm.alarm_id?.toLowerCase().includes(s);

          if (!match) return false;
        }

        // Filters
        if (filterStatus !== "All" && alarm.status !== filterStatus) return false;
        if (filterSeverity !== "All" && alarm.severity !== filterSeverity) return false;
        if (filterEntityType !== "All" && alarm.entity_type !== filterEntityType) return false;

        // Time range
        const alarmTime = alarm.last_seen || alarm.triggered_at;
        if (!alarmTime) return true;

        if (timeRange !== "custom" && timeRange !== "all") {
          const alarmMs = new Date(alarmTime).getTime();
          if (!Number.isFinite(alarmMs)) return true;

          let cutoff = 0;
          switch (timeRange) {
            case "1h":
              cutoff = Date.now() - 60 * 60 * 1000;
              break;
            case "24h":
              cutoff = Date.now() - 24 * 60 * 60 * 1000;
              break;
            case "7d":
              cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
              break;
          }
          if (cutoff > 0 && alarmMs < cutoff) return false;
        }

        if (timeRange === "custom") {
          const alarmMs = new Date(alarmTime).getTime();
          if (!Number.isFinite(alarmMs)) return true;

          if (customDateFrom && alarmMs < customDateFrom.getTime()) return false;
          if (customDateTo) {
            const toEnd = new Date(customDateTo);
            toEnd.setHours(23, 59, 59, 999);
            if (alarmMs > toEnd.getTime()) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aTime = a.last_seen || a.triggered_at || "";
        const bTime = b.last_seen || b.triggered_at || "";
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
  }, [
    alarms,
    debouncedSearch,
    filterStatus,
    filterSeverity,
    filterEntityType,
    timeRange,
    customDateFrom,
    customDateTo,
  ]);

  const paginatedAlarms = useMemo(() => filteredAlarms.slice(0, displayCount), [
    filteredAlarms,
    displayCount,
  ]);

  const counts = useMemo(() => {
    return {
      total: alarms.length,
      active: alarms.filter((a) => a.status === "Active").length,
      acknowledged: alarms.filter((a) => a.status === "Acknowledged").length,
      resolved: alarms.filter((a) => a.status === "Resolved").length,
      suppressed: alarms.filter((a) => a.status === "Suppressed").length,
    };
  }, [alarms]);

  const loadMore = useCallback(() => setDisplayCount((p) => p + pageSize), [pageSize]);
  const resetPagination = useCallback(() => setDisplayCount(pageSize), [pageSize]);

  return {
    alarms,
    filteredAlarms,
    paginatedAlarms,
    loading,
    error,
    isConnected,
    lastUpdated,
    totalCount: filteredAlarms.length,
    currentPage: Math.ceil(displayCount / pageSize),
    totalPages: Math.ceil(filteredAlarms.length / pageSize),
    hasMore: displayCount < filteredAlarms.length,

    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterSeverity,
    setFilterSeverity,
    filterEntityType,
    setFilterEntityType,
    timeRange,
    setTimeRange,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,

    loadMore,
    resetPagination,
    counts,
    entityTypes,
  };
};

export const formatAlarmTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString();
};

export const getRelativeTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};