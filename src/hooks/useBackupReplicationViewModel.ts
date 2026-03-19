import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type {
  MatchedVm,
  UnprotectedVm,
  OrphanJob,
  MultiVmJob,
  Replica,
} from "@/pages/user/backup-replication/types";
import { usePagination } from "@/pages/user/backup-replication/hooks/usePagination";
import { useAuthenticatedFetch } from "@/keycloak/hooks/useAuthenticatedFetch";
import { WEBHOOK_BACKUP_REPLICATION_URL } from "@/config/env";
import { safeParseResponse } from "@/lib/safeFetch";
import {
  deriveBackupReplicationTotalJobs,
  deriveBackupReplicationVmCounts,
  type BackupReplicationVmCounts,
  withCanonicalBackupReplicationVmCounts,
} from "@/lib/backupReplicationCounts";

type Status = "idle" | "loading" | "success" | "error";

type MainObject = {
  summary?: unknown;
  matched?: MatchedVm[];
  alerts?: unknown;
  statistics?: unknown;
  vmsWithoutJobs?: UnprotectedVm[];
  jobsWithoutVMs?: OrphanJob[];
  multiVMJobs?: MultiVmJob[];
  replicas?: Replica[];
};

type MetaObject = {
  changes?: unknown;
  summary?: unknown;
};

export interface BackupReplicationExternalData {
  rawData: unknown;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected?: boolean;
  refresh?: () => Promise<void> | void;
}

interface UseBackupReplicationViewModelOptions {
  externalData?: BackupReplicationExternalData;
  refreshIntervalMs?: number;
}

interface UseBackupReplicationViewModelReturn {
  status: Status;
  loading: boolean;
  error: string | null;
  raw: unknown;
  lastUpdatedAt: Date | null;
  refresh: (isSilent?: boolean) => Promise<void>;
  showNoDataBanner: boolean;
  summary: unknown;
  vmCounts: BackupReplicationVmCounts;
  matched: MatchedVm[];
  alerts: unknown;
  statistics: unknown;
  vmsWithoutJobs: UnprotectedVm[];
  jobsWithoutVMs: OrphanJob[];
  multiVMJobs: MultiVmJob[];
  replicas: Replica[];
  changes: unknown;
  changeSummary: unknown;
  filteredMatched: MatchedVm[];
  query: string;
  setQuery: (query: string) => void;
  protectedFilter: "all" | "protected" | "unprotected";
  setProtectedFilter: (value: "all" | "protected" | "unprotected") => void;
  statusFilter: "all" | "success" | "warning" | "stale";
  setStatusFilter: (value: "all" | "success" | "warning" | "stale") => void;
  powerStateFilter: "all" | "running" | "off";
  setPowerStateFilter: (value: "all" | "running" | "off") => void;
  vmPagination: ReturnType<typeof usePagination<MatchedVm>>;
}

const ENDPOINT = WEBHOOK_BACKUP_REPLICATION_URL;

const safeLower = (v: unknown) => String(v ?? "").toLowerCase();

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const parseRecordString = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return {};
  }
};

const parseMaybeRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object") return asRecord(value);
  return parseRecordString(value);
};

const normalizeBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "protected", "on"].includes(lower)) return true;
    if (["false", "no", "n", "0", "unprotected", "off"].includes(lower)) return false;
  }
  return fallback;
};

const normalizePowerState = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown";

  const lower = raw.toLowerCase();
  if (
    lower === "poweredon" ||
    lower === "powered on" ||
    lower === "running" ||
    lower === "on"
  ) {
    return "PoweredOn";
  }

  if (
    lower === "poweredoff" ||
    lower === "powered off" ||
    lower === "stopped" ||
    lower === "off"
  ) {
    return "PoweredOff";
  }

  if (lower === "unknown" || lower === "n/a" || lower === "na") {
    return "Unknown";
  }

  return raw;
};

const normalizeMatchedVm = (item: unknown): MatchedVm => {
  const record = asRecord(item);
  const vm = asRecord(record.vm);
  const vmRawJson = parseMaybeRecord(vm.raw_json);
  const vmMetrics = asRecord(vmRawJson.vm_metrics);
  const vmPairedItem = asRecord(vmRawJson.pairedItem);
  const vmPairedRawJson = parseMaybeRecord(vmPairedItem.raw_json);
  const vmPairedItemMetrics = asRecord(vmPairedItem.vm_metrics);
  const vmPairedMetrics =
    Object.keys(vmPairedItemMetrics).length > 0
      ? vmPairedItemMetrics
      : asRecord(vmPairedRawJson.vm_metrics);
  const protectionSummary = asRecord(record.protectionSummary);

  const name =
    String(vm.name ?? vm.vm_name ?? record.vm_name ?? record.name ?? "").trim() ||
    String(vm.vmid ?? record.vmid ?? "Unknown VM");

  const guestOs = String(
    vm.guestOs ??
      vm.guest_os ??
      vm.os ??
      vmMetrics.guestOs ??
      vmMetrics.guest_os ??
      vmPairedMetrics.guestOs ??
      vmPairedMetrics.guest_os ??
      vmPairedItem.guestOs ??
      vmPairedItem.guest_os ??
      vmPairedRawJson.guestOs ??
      vmPairedRawJson.guest_os ??
      ""
  ).trim();

  const powerState = normalizePowerState(
    vm.powerState ??
      vm.power_state ??
      vm.runtimePowerState ??
      vm.runtime_power_state ??
      vm.guestPowerState ??
      vm.guest_power_state ??
      vm.vmPowerState ??
      vm.vm_power_state ??
      vm.state ??
      vm.status ??
      record.powerState ??
      record.power_state ??
      vmMetrics.powerState ??
      vmMetrics.power_state ??
      vmMetrics.runtimePowerState ??
      vmMetrics.runtime_power_state ??
      vmPairedMetrics.powerState ??
      vmPairedMetrics.power_state ??
      vmPairedMetrics.runtimePowerState ??
      vmPairedMetrics.runtime_power_state ??
      vmPairedMetrics.guestPowerState ??
      vmPairedMetrics.guest_power_state ??
      vmPairedItem.powerState ??
      vmPairedItem.power_state ??
      vmPairedItem.runtimePowerState ??
      vmPairedItem.runtime_power_state ??
      vmPairedItem.guestPowerState ??
      vmPairedItem.guest_power_state ??
      vmPairedRawJson.powerState ??
      vmPairedRawJson.power_state ??
      vmPairedRawJson.runtimePowerState ??
      vmPairedRawJson.runtime_power_state ??
      vmPairedRawJson.guestPowerState ??
      vmPairedRawJson.guest_power_state
  );

  const isProtected = normalizeBoolean(
    vm.isProtected ??
      vm.is_protected ??
      vm.protected ??
      vmMetrics.isProtected ??
      vmMetrics.is_protected
  );

  const lastProtectedDate = String(
    vm.lastProtectedDate ??
      vm.last_protected_date ??
      vm.lastBackupDate ??
      vmMetrics.lastProtectedDate ??
      ""
  );

  const normalizedVm: MatchedVm["vm"] = {
    name,
    guestOs,
    powerState,
    isProtected,
    lastProtectedDate,
  };

  const normalizedProtectionSummary: MatchedVm["protectionSummary"] = {
    totalJobs: Number(
      protectionSummary.totalJobs ??
        protectionSummary.total_jobs ??
        (Array.isArray(record.jobs) ? record.jobs.length : 0)
    ) || 0,
    overallStatus: String(
      protectionSummary.overallStatus ??
        protectionSummary.overall_status ??
        protectionSummary.status ??
        "Unknown"
    ),
    backupCurrent: normalizeBoolean(
      protectionSummary.backupCurrent ?? protectionSummary.backup_current,
      false
    ),
  };

  const jobs = Array.isArray(record.jobs) ? (record.jobs as MatchedVm["jobs"]) : [];

  return {
    vm: normalizedVm,
    protectionSummary: normalizedProtectionSummary,
    jobs,
  };
};

const normalizeUnprotectedVm = (item: unknown): UnprotectedVm => {
  const record = asRecord(item);
  const recordRawJson = parseMaybeRecord(record.raw_json);
  const pairedItem = asRecord(recordRawJson.pairedItem);
  const pairedRawJson = parseMaybeRecord(pairedItem.raw_json);
  const recordMetrics = asRecord(recordRawJson.vm_metrics);
  const pairedMetrics =
    Object.keys(asRecord(pairedItem.vm_metrics)).length > 0
      ? asRecord(pairedItem.vm_metrics)
      : asRecord(pairedRawJson.vm_metrics);

  const name =
    String(
      record.name ??
        record.vm_name ??
        record.vmName ??
        recordRawJson.vm_name ??
        pairedItem.vm_name ??
        pairedRawJson.vm_name ??
        record.hostname ??
        record.vmid ??
        "Unknown VM"
    ).trim() || "Unknown VM";

  const guestOs = String(
    record.guestOs ??
      record.guest_os ??
      record.os ??
      record.platform ??
      recordMetrics.guestOs ??
      recordMetrics.guest_os ??
      pairedMetrics.guestOs ??
      pairedMetrics.guest_os ??
      pairedItem.guestOs ??
      pairedItem.guest_os ??
      pairedRawJson.guestOs ??
      pairedRawJson.guest_os ??
      ""
  ).trim();

  const lastSeen = String(
    record.lastSeen ??
      record.last_seen ??
      record.lastSeenAt ??
      record.seen_at ??
      record.updated_at ??
      ""
  ).trim();

  return {
    name,
    powerState: normalizePowerState(
      record.powerState ??
        record.power_state ??
        record.runtimePowerState ??
        record.runtime_power_state ??
        record.guestPowerState ??
        record.guest_power_state ??
        record.state ??
        record.status ??
        recordMetrics.powerState ??
        recordMetrics.power_state ??
        recordMetrics.runtimePowerState ??
        recordMetrics.runtime_power_state ??
        pairedMetrics.powerState ??
        pairedMetrics.power_state ??
        pairedMetrics.runtimePowerState ??
        pairedMetrics.runtime_power_state ??
        pairedMetrics.guestPowerState ??
        pairedMetrics.guest_power_state ??
        pairedItem.powerState ??
        pairedItem.power_state ??
        pairedItem.runtimePowerState ??
        pairedItem.runtime_power_state ??
        pairedRawJson.powerState ??
        pairedRawJson.power_state ??
        pairedRawJson.runtimePowerState ??
        pairedRawJson.runtime_power_state
    ),
    guestOs,
    lastSeen: lastSeen || undefined,
  };
};

const normalizeMain = (value: unknown): MainObject => {
  const record = asRecord(value);
  const matchedRaw = Array.isArray(record.matched) ? record.matched : [];

  return {
    summary: record.summary ?? null,
    matched: matchedRaw.map(normalizeMatchedVm),
    alerts: record.alerts ?? { warnings: [], critical: [] },
    statistics: record.statistics ?? null,
    vmsWithoutJobs: Array.isArray(record.vmsWithoutJobs)
      ? record.vmsWithoutJobs.map(normalizeUnprotectedVm)
      : [],
    jobsWithoutVMs: Array.isArray(record.jobsWithoutVMs)
      ? (record.jobsWithoutVMs as OrphanJob[])
      : [],
    multiVMJobs: Array.isArray(record.multiVMJobs)
      ? (record.multiVMJobs as MultiVmJob[])
      : [],
    replicas: Array.isArray(record.replicas) ? (record.replicas as Replica[]) : [],
  };
};

const normalizeMeta = (value: unknown): MetaObject => {
  const record = asRecord(value);
  return {
    changes: record.changes ?? null,
    summary: record.summary ?? null,
  };
};

export const useBackupReplicationViewModel = ({
  externalData,
  refreshIntervalMs = 5000,
}: UseBackupReplicationViewModelOptions = {}): UseBackupReplicationViewModelReturn => {
  const [internalStatus, setInternalStatus] = useState<Status>("idle");
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalRaw, setInternalRaw] = useState<unknown>(null);
  const [internalLastUpdatedAt, setInternalLastUpdatedAt] = useState<Date | null>(null);

  const [query, setQuery] = useState("");
  const [protectedFilter, setProtectedFilter] = useState<"all" | "protected" | "unprotected">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "warning" | "stale">(
    "all"
  );
  const [powerStateFilter, setPowerStateFilter] = useState<"all" | "running" | "off">("all");

  const isExternalDataMode = Boolean(externalData);
  const status: Status = isExternalDataMode
    ? externalData!.loading
      ? "loading"
      : externalData!.error
      ? "error"
      : "success"
    : internalStatus;
  const loading = status === "loading";
  const error = isExternalDataMode ? externalData!.error : internalError;
  const raw = isExternalDataMode ? externalData!.rawData : internalRaw;
  const lastUpdatedAt = isExternalDataMode ? externalData!.lastUpdated : internalLastUpdatedAt;

  const { authenticatedFetch } = useAuthenticatedFetch();
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(
    async (isSilent = false) => {
      if (isExternalDataMode) {
        if (!isSilent) {
          await externalData?.refresh?.();
        }
        return;
      }

      if (!isSilent) setInternalStatus("loading");
      if (!isSilent) setInternalError(null);

      try {
        const res = await authenticatedFetch(ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
        });

        const result = await safeParseResponse<unknown>(res, ENDPOINT);

        if (!result.ok) {
          console.error("[BackupReplication] Fetch error:", {
            endpoint: ENDPOINT,
            status: result.status,
            userMessage: result.userMessage,
            debug: (result as Record<string, unknown>).debug,
            errorId: (result as Record<string, unknown>).errorId,
          });

          if (isSilent && hasLoadedOnceRef.current) return;

          setInternalError(result.userMessage || "We couldn't load backup & replication data. Please try again.");
          setInternalStatus("error");
          return;
        }

        if (!result.data) {
          setInternalRaw(null);
          setInternalLastUpdatedAt(new Date());
          setInternalStatus("success");
          setInternalError(null);
          hasLoadedOnceRef.current = true;
          return;
        }

        setInternalRaw(result.data);
        setInternalLastUpdatedAt(new Date());
        setInternalStatus("success");
        setInternalError(null);
        hasLoadedOnceRef.current = true;
      } catch (e: unknown) {
        console.error("[BackupReplication] Unexpected fetch exception:", e);

        if (isSilent && hasLoadedOnceRef.current) return;

        setInternalError("We couldn't load backup & replication data. Please try again.");
        setInternalStatus("error");
      }
    },
    [authenticatedFetch, externalData, isExternalDataMode]
  );

  useEffect(() => {
    if (isExternalDataMode) return;
    void refresh(false);
    const interval = setInterval(() => {
      void refresh(true);
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, refreshIntervalMs, isExternalDataMode]);

  const { main, meta } = useMemo<{ main: MainObject; meta: MetaObject }>(() => {
    const arr = Array.isArray(raw) ? (raw as unknown[]) : null;
    const mainObj = normalizeMain(arr?.[0] ?? {});
    const metaObj = normalizeMeta(arr?.[1] ?? {});
    return { main: mainObj, meta: metaObj };
  }, [raw]);

  const matched = (main.matched ?? []) as MatchedVm[];
  const alerts = main.alerts ?? null;
  const statistics = main.statistics ?? null;
  const vmsWithoutJobs = main.vmsWithoutJobs ?? [];
  const jobsWithoutVMs = main.jobsWithoutVMs ?? [];
  const multiVMJobs = main.multiVMJobs ?? [];
  const replicas = main.replicas ?? [];
  const changes = meta.changes ?? null;
  const changeSummary = meta.summary ?? null;
  const vmCounts = useMemo(
    () => deriveBackupReplicationVmCounts(matched, vmsWithoutJobs),
    [matched, vmsWithoutJobs]
  );
  const totalJobs = useMemo(
    () => deriveBackupReplicationTotalJobs(matched, jobsWithoutVMs, multiVMJobs),
    [matched, jobsWithoutVMs, multiVMJobs]
  );
  const summary = useMemo(
    () => withCanonicalBackupReplicationVmCounts(main.summary ?? null, vmCounts, totalJobs),
    [main.summary, vmCounts, totalJobs]
  );

  const filteredMatched = useMemo<MatchedVm[]>(() => {
    const q = query.trim().toLowerCase();
    let list = (matched ?? []).filter(Boolean);

    if (q) {
      list = list.filter(
        (m) => safeLower(m.vm?.name).includes(q) || safeLower(m.vm?.guestOs).includes(q)
      );
    }

    if (protectedFilter !== "all") {
      list = list.filter((m) =>
        protectedFilter === "protected" ? m.vm?.isProtected : !m.vm?.isProtected
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((m) => {
        const s = safeLower(m.protectionSummary?.overallStatus);
        if (statusFilter === "success") return s.includes("success");
        if (statusFilter === "warning") return s.includes("warn");
        return s.includes("stale");
      });
    }

    if (powerStateFilter !== "all") {
      list = list.filter((m) => {
        const ps = safeLower(m.vm?.powerState);
        if (powerStateFilter === "running") return ps.includes("run") || ps.includes("on");
        return ps.includes("off") || ps.includes("stopped");
      });
    }

    return list;
  }, [matched, query, protectedFilter, statusFilter, powerStateFilter]);

  const vmPagination = usePagination(filteredMatched, { defaultPageSize: 10 });

  useEffect(() => {
    vmPagination.setCurrentPage(1);
  }, [query, protectedFilter, statusFilter, powerStateFilter]);

  const showNoDataBanner = !loading && !error && !raw;

  return {
    status,
    loading,
    error,
    raw,
    lastUpdatedAt,
    refresh,
    showNoDataBanner,
    summary,
    vmCounts,
    matched,
    alerts,
    statistics,
    vmsWithoutJobs,
    jobsWithoutVMs,
    multiVMJobs,
    replicas,
    changes,
    changeSummary,
    filteredMatched,
    query,
    setQuery,
    protectedFilter,
    setProtectedFilter,
    statusFilter,
    setStatusFilter,
    powerStateFilter,
    setPowerStateFilter,
    vmPagination,
  };
};

export default useBackupReplicationViewModel;
