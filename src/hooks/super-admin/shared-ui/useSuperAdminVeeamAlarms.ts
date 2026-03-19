import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AlarmSeverity,
  AlarmStatus,
  TimeRange,
  VeeamAlarm,
} from "@/hooks/useVeeamAlarms";
import type { VeeamAlarmItem } from "@/hooks/super-admin/organizations/useOrganizationVeeamMetrics";

interface UseSuperAdminVeeamAlarmsOptions {
  alarmItems: VeeamAlarmItem[];
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => Promise<void> | void;
  pageSize?: number;
  selectedOrganizationClientId?: number | null;
}

interface UseSuperAdminVeeamAlarmsReturn {
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
  loadMore: () => void;
  resetPagination: () => void;
  counts: {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    suppressed: number;
  };
  entityTypes: string[];
  refresh: () => Promise<void> | void;
}

const parseTimeMs = (value: unknown): number => {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const normalizeStatus = (value: string): AlarmStatus => {
  const lower = value.toLowerCase();
  if (lower.includes("resolved")) return "Resolved";
  if (lower.includes("ack")) return "Acknowledged";
  if (lower.includes("suppressed")) return "Suppressed";
  return "Active";
};

const normalizeSeverity = (value: string): AlarmSeverity => {
  const lower = value.toLowerCase();
  if (lower.includes("critical") || lower.includes("error")) return "Critical";
  if (lower.includes("warning")) return "Warning";
  if (lower.includes("high")) return "High";
  if (lower.includes("info") || lower.includes("resolved")) return "Info";
  return "Unknown";
};

const toVeeamAlarm = (item: VeeamAlarmItem, index: number): VeeamAlarm => {
  const alarmId = item.alarm_id || `${item.client_id || 0}-alarm-${index}`;
  const dedupeKey = item.dedupe_key || alarmId;

  return {
    client_id: item.client_id,
    alarm_id: alarmId,
    dedupe_key: dedupeKey,
    name: item.name || "Unknown Alarm",
    description: item.description || "",
    severity: normalizeSeverity(item.severity || "Unknown"),
    status: normalizeStatus(item.status || "Active"),
    entity_type: item.entity_type || "",
    entity_name: item.entity_name || "",
    triggered_at: item.triggered_at,
    resolved_at: item.resolved_at,
    first_seen: item.first_seen,
    last_seen: item.last_seen,
    seen_count: Number(item.seen_count || 0),
    times_sent: Number(item.times_sent || 0),
    reminder_interval: item.reminder_interval,
    first_ai_response: item.first_ai_response,
  };
};

const useSuperAdminVeeamAlarms = ({
  alarmItems,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  onRefresh,
  pageSize = 10,
  selectedOrganizationClientId = null,
}: UseSuperAdminVeeamAlarmsOptions): UseSuperAdminVeeamAlarmsReturn => {
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
    pageSize,
    debouncedSearch,
    filterStatus,
    filterSeverity,
    filterEntityType,
    timeRange,
    customDateFrom,
    customDateTo,
  ]);

  const alarms = useMemo(() => {
    const scoped = selectedOrganizationClientId == null
      ? alarmItems
      : alarmItems.filter((item) => Number(item.client_id) === selectedOrganizationClientId);

    const mapped = scoped.map(toVeeamAlarm);

    const deduped = new Map<string, VeeamAlarm>();
    for (let index = 0; index < mapped.length; index += 1) {
      const alarm = mapped[index];
      const key = `${alarm.client_id}::${alarm.dedupe_key || alarm.alarm_id || `idx-${index}`}`;

      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, alarm);
        continue;
      }

      const existingMs = parseTimeMs(existing.last_seen || existing.triggered_at);
      const currentMs = parseTimeMs(alarm.last_seen || alarm.triggered_at);
      if (currentMs >= existingMs) deduped.set(key, alarm);
    }

    return Array.from(deduped.values());
  }, [alarmItems, selectedOrganizationClientId]);

  const entityTypes = useMemo(() => {
    const types = new Set(alarms.map((alarm) => alarm.entity_type).filter(Boolean));
    return ["All", ...Array.from(types).sort()];
  }, [alarms]);

  const filteredAlarms = useMemo(() => {
    return alarms
      .filter((alarm) => {
        if (debouncedSearch) {
          const search = debouncedSearch.toLowerCase();
          const matches =
            alarm.name.toLowerCase().includes(search) ||
            alarm.entity_name.toLowerCase().includes(search) ||
            alarm.entity_type.toLowerCase().includes(search) ||
            alarm.description.toLowerCase().includes(search) ||
            alarm.alarm_id.toLowerCase().includes(search);

          if (!matches) return false;
        }

        if (filterStatus !== "All" && alarm.status !== filterStatus) return false;
        if (filterSeverity !== "All" && alarm.severity !== filterSeverity) return false;
        if (filterEntityType !== "All" && alarm.entity_type !== filterEntityType) return false;

        const alarmTime = alarm.last_seen || alarm.triggered_at;
        if (!alarmTime) return true;

        if (timeRange !== "custom" && timeRange !== "all") {
          const alarmMs = new Date(alarmTime).getTime();
          if (!Number.isFinite(alarmMs)) return true;

          let cutoff = 0;
          if (timeRange === "1h") cutoff = Date.now() - 60 * 60 * 1000;
          if (timeRange === "24h") cutoff = Date.now() - 24 * 60 * 60 * 1000;
          if (timeRange === "7d") cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

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
      .sort((left, right) => {
        const leftTime = left.last_seen || left.triggered_at || "";
        const rightTime = right.last_seen || right.triggered_at || "";
        return new Date(rightTime).getTime() - new Date(leftTime).getTime();
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

  const paginatedAlarms = useMemo(
    () => filteredAlarms.slice(0, displayCount),
    [filteredAlarms, displayCount]
  );

  const counts = useMemo(
    () => ({
      total: alarms.length,
      active: alarms.filter((alarm) => alarm.status === "Active").length,
      acknowledged: alarms.filter((alarm) => alarm.status === "Acknowledged").length,
      resolved: alarms.filter((alarm) => alarm.status === "Resolved").length,
      suppressed: alarms.filter((alarm) => alarm.status === "Suppressed").length,
    }),
    [alarms]
  );

  const loadMore = useCallback(() => setDisplayCount((prev) => prev + pageSize), [pageSize]);
  const resetPagination = useCallback(() => setDisplayCount(pageSize), [pageSize]);

  const refresh = useCallback(() => {
    if (onRefresh) return onRefresh();
  }, [onRefresh]);

  const displayLoading = loading && alarms.length === 0;

  return {
    alarms,
    filteredAlarms,
    paginatedAlarms,
    loading: displayLoading,
    error,
    isConnected,
    lastUpdated,
    totalCount: filteredAlarms.length,
    currentPage: Math.ceil(displayCount / pageSize),
    totalPages: Math.max(1, Math.ceil(filteredAlarms.length / pageSize)),
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
    refresh,
  };
};

export default useSuperAdminVeeamAlarms;
