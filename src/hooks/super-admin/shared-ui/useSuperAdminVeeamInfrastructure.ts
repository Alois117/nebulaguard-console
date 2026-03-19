import { useCallback, useEffect, useMemo, useState } from "react";
import type { VeeamVM } from "@/hooks/useVeeamInfrastructure";
import type { InfraVM } from "@/hooks/super-admin/organizations/useOrganizationVeeamMetrics";

interface UseSuperAdminVeeamInfrastructureOptions {
  vms: InfraVM[];
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => Promise<void> | void;
  pageSize?: number;
  selectedOrganizationClientId?: number | null;
}

interface UseSuperAdminVeeamInfrastructureReturn {
  vms: VeeamVM[];
  filteredVMs: VeeamVM[];
  paginatedVMs: VeeamVM[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterPowerState: "PoweredOn" | "PoweredOff" | null;
  setFilterPowerState: (state: "PoweredOn" | "PoweredOff" | null) => void;
  filterProtection: "Protected" | "Not Protected" | null;
  setFilterProtection: (status: "Protected" | "Not Protected" | null) => void;
  filterCategory: string | null;
  setFilterCategory: (category: string | null) => void;
  categories: string[];
  counts: {
    total: number;
    poweredOn: number;
    poweredOff: number;
    protected: number;
    unprotected: number;
  };
  refresh: () => Promise<void> | void;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const parseRecordString = (value: unknown): UnknownRecord => {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return {};
  }
};

const toStringValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const toNumberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toBooleanValue = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["true", "yes", "1", "on", "protected"].includes(lower)) return true;
    if (["false", "no", "0", "off", "unprotected"].includes(lower)) return false;
  }
  return fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "")).filter(Boolean);
};

const normalizePowerState = (value: unknown): string => {
  const raw = toStringValue(value, "Unknown").trim();
  const lower = raw.toLowerCase();

  if (["poweredon", "powered on", "running", "on"].includes(lower)) return "PoweredOn";
  if (["poweredoff", "powered off", "off", "stopped"].includes(lower)) return "PoweredOff";
  if (!raw) return "Unknown";
  return raw;
};

const resolveRawJson = (itemRecord: UnknownRecord): UnknownRecord => {
  const directRaw = itemRecord.raw_json;
  if (directRaw && typeof directRaw === "object") return asRecord(directRaw);
  const parsedRaw = parseRecordString(directRaw);
  if (Object.keys(parsedRaw).length > 0) return parsedRaw;
  return itemRecord;
};

const resolveMetrics = (itemRecord: UnknownRecord, rawJson: UnknownRecord): UnknownRecord => {
  const nestedMetrics = asRecord(rawJson.vm_metrics);
  if (Object.keys(nestedMetrics).length > 0) return nestedMetrics;

  const directMetrics = asRecord(itemRecord.vm_metrics);
  if (Object.keys(directMetrics).length > 0) return directMetrics;

  const fallbackMetrics = asRecord(rawJson.metrics);
  if (Object.keys(fallbackMetrics).length > 0) return fallbackMetrics;

  return {};
};

const toVeeamVm = (item: InfraVM): VeeamVM => {
  const itemRecord = asRecord(item);
  const rawJson = resolveRawJson(itemRecord);
  const metrics = resolveMetrics(itemRecord, rawJson);

  const clientId = toNumberValue(
    itemRecord.client_id ?? itemRecord.clientId ?? rawJson.client_id ?? rawJson.clientId,
    0
  );
  const vmid = toStringValue(itemRecord.vmid ?? rawJson.vmid ?? metrics.vmid ?? "");
  const category = toStringValue(
    itemRecord.Category ?? rawJson.Category ?? metrics.category ?? itemRecord.category ?? ""
  );

  const vmName =
    toStringValue(
      rawJson.vm_name ??
        itemRecord.vm_name ??
        itemRecord.name ??
        metrics.vm_name ??
        metrics.name ??
        itemRecord.hostname,
      ""
    ).trim() || (vmid ? `VM-${vmid}` : "Unknown VM");

  return {
    client_id: clientId,
    vmid,
    fetch_time: toStringValue(itemRecord.fetch_time ?? rawJson.fetch_time ?? ""),
    Category: category,
    raw_json: {
      client_id: clientId,
      vmid,
      moref: toStringValue(rawJson.moref ?? itemRecord.moref ?? ""),
      vm_name: vmName,
      vm_metrics: {
        notes: (metrics.notes ?? null) as string | null,
        guestOs: toStringValue(metrics.guestOs ?? metrics.guest_os ?? ""),
        category,
        cpuCount: toNumberValue(metrics.cpuCount ?? metrics.cpu_count ?? 0),
        isReplica: toBooleanValue(metrics.isReplica ?? metrics.is_replica ?? false),
        dedupe_key: toStringValue(metrics.dedupe_key ?? metrics.dedupeKey ?? ""),
        powerState: normalizePowerState(metrics.powerState ?? metrics.power_state),
        isProtected: toBooleanValue(metrics.isProtected ?? metrics.is_protected ?? false),
        collected_at: toStringValue(metrics.collected_at ?? metrics.collectedAt ?? ""),
        guestDnsName: (metrics.guestDnsName ?? metrics.guest_dns_name ?? null) as string | null,
        isCdpReplica: toBooleanValue(metrics.isCdpReplica ?? metrics.is_cdp_replica ?? false),
        memorySizeMb: toNumberValue(metrics.memorySizeMb ?? metrics.memory_size_mb ?? 0),
        connectionState: toStringValue(
          metrics.connectionState ?? metrics.connection_state ?? "Unknown"
        ),
        memorySizeHuman: toStringValue(metrics.memorySizeHuman ?? metrics.memory_size_human ?? ""),
        guestIpAddresses: toStringArray(metrics.guestIpAddresses ?? metrics.guest_ip_addresses),
        guestUsedPercent: (metrics.guestUsedPercent ?? metrics.guest_used_percent ?? null) as
          | number
          | null,
        lastProtectedDate: (metrics.lastProtectedDate ?? metrics.last_protected_date ?? null) as
          | string
          | null,
        guestTotalFreeBytes: toNumberValue(metrics.guestTotalFreeBytes ?? metrics.guest_total_free_bytes ?? 0),
        guestTotalFreeHuman: toStringValue(metrics.guestTotalFreeHuman ?? metrics.guest_total_free_human ?? ""),
        totalAllocatedBytes: toNumberValue(metrics.totalAllocatedBytes ?? metrics.total_allocated_bytes ?? 0),
        totalAllocatedHuman: toStringValue(metrics.totalAllocatedHuman ?? metrics.total_allocated_human ?? ""),
        totalCommittedBytes: toNumberValue(metrics.totalCommittedBytes ?? metrics.total_committed_bytes ?? 0),
        totalCommittedHuman: toStringValue(metrics.totalCommittedHuman ?? metrics.total_committed_human ?? ""),
        virtualDisksSummary: Array.isArray(metrics.virtualDisksSummary)
          ? metrics.virtualDisksSummary
          : [],
        datastoreUsageSummary: Array.isArray(metrics.datastoreUsageSummary)
          ? metrics.datastoreUsageSummary
          : [],
        guestUsedPercentHuman: (metrics.guestUsedPercentHuman ?? metrics.guest_used_percent_human ?? null) as
          | string
          | null,
        protectionJobUidsCount: toNumberValue(
          metrics.protectionJobUidsCount ?? metrics.protection_job_uids_count ?? 0
        ),
        guestTotalCapacityBytes: toNumberValue(
          metrics.guestTotalCapacityBytes ?? metrics.guest_total_capacity_bytes ?? 0
        ),
        guestTotalCapacityHuman: toStringValue(
          metrics.guestTotalCapacityHuman ?? metrics.guest_total_capacity_human ?? ""
        ),
        virtualDiskCountReported: toNumberValue(
          metrics.virtualDiskCountReported ?? metrics.virtual_disk_count_reported ?? 0
        ),
        virtualDisksCountCalculated: toNumberValue(
          metrics.virtualDisksCountCalculated ?? metrics.virtual_disks_count_calculated ?? 0
        ),
      },
      ai_response_client_id: null,
      ai_response_id: null,
      created_at: toStringValue(rawJson.created_at ?? itemRecord.created_at ?? ""),
      updated_at: toStringValue(rawJson.updated_at ?? itemRecord.updated_at ?? ""),
    },
  };
};

const extractClientId = (item: InfraVM): number | null => {
  const itemRecord = asRecord(item);
  const rawJson = resolveRawJson(itemRecord);
  const clientId = toNumberValue(
    itemRecord.client_id ?? itemRecord.clientId ?? rawJson.client_id ?? rawJson.clientId,
    NaN
  );
  return Number.isFinite(clientId) ? clientId : null;
};

const useSuperAdminVeeamInfrastructure = ({
  vms,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  onRefresh,
  pageSize = 9,
  selectedOrganizationClientId = null,
}: UseSuperAdminVeeamInfrastructureOptions): UseSuperAdminVeeamInfrastructureReturn => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPowerState, setFilterPowerState] = useState<"PoweredOn" | "PoweredOff" | null>(null);
  const [filterProtection, setFilterProtection] = useState<"Protected" | "Not Protected" | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterPowerState, filterProtection, filterCategory]);

  const mappedVms = useMemo(() => {
    const scoped = selectedOrganizationClientId == null
      ? vms
      : vms.filter((item) => extractClientId(item) === selectedOrganizationClientId);
    return scoped.map(toVeeamVm);
  }, [vms, selectedOrganizationClientId]);

  const categories = useMemo(() => {
    const unique = new Set(mappedVms.map((vm) => vm.Category).filter(Boolean));
    return Array.from(unique).sort();
  }, [mappedVms]);

  const filteredVMs = useMemo(() => {
    return mappedVms
      .filter((vm) => {
        const metrics = vm.raw_json?.vm_metrics;
        if (!metrics) return false;

        if (debouncedSearch) {
          const search = debouncedSearch.toLowerCase();
          const matchesName = (vm.raw_json?.vm_name ?? "").toLowerCase().includes(search);
          const matchesDns = (metrics.guestDnsName ?? "").toLowerCase().includes(search);
          const matchesIp = (metrics.guestIpAddresses ?? []).some((ip) => ip.toLowerCase().includes(search));
          if (!matchesName && !matchesDns && !matchesIp) return false;
        }

        if (filterPowerState && metrics.powerState !== filterPowerState) return false;

        if (filterProtection) {
          if (filterProtection === "Protected" && !metrics.isProtected) return false;
          if (filterProtection === "Not Protected" && metrics.isProtected) return false;
        }

        if (filterCategory && vm.Category !== filterCategory) return false;

        return true;
      })
      .sort((left, right) => (left.raw_json?.vm_name ?? "").localeCompare(right.raw_json?.vm_name ?? ""));
  }, [mappedVms, debouncedSearch, filterPowerState, filterProtection, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredVMs.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedVMs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVMs.slice(start, start + pageSize);
  }, [filteredVMs, currentPage, pageSize]);

  const goToPage = useCallback(
    (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    [totalPages]
  );

  const nextPage = useCallback(() => setCurrentPage((prev) => Math.min(prev + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setCurrentPage((prev) => Math.max(prev - 1, 1)), []);

  const counts = useMemo(
    () => ({
      total: mappedVms.length,
      poweredOn: mappedVms.filter((vm) => vm.raw_json?.vm_metrics?.powerState === "PoweredOn").length,
      poweredOff: mappedVms.filter((vm) => vm.raw_json?.vm_metrics?.powerState === "PoweredOff").length,
      protected: mappedVms.filter((vm) => vm.raw_json?.vm_metrics?.isProtected === true).length,
      unprotected: mappedVms.filter((vm) => vm.raw_json?.vm_metrics?.isProtected === false).length,
    }),
    [mappedVms]
  );

  const refresh = useCallback(() => {
    if (onRefresh) return onRefresh();
  }, [onRefresh]);

  const displayLoading = loading && mappedVms.length === 0;

  return {
    vms: mappedVms,
    filteredVMs,
    paginatedVMs,
    loading: displayLoading,
    error,
    isConnected,
    lastUpdated,
    totalCount: filteredVMs.length,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    searchQuery,
    setSearchQuery,
    filterPowerState,
    setFilterPowerState,
    filterProtection,
    setFilterProtection,
    filterCategory,
    setFilterCategory,
    categories,
    counts,
    refresh,
  };
};

export default useSuperAdminVeeamInfrastructure;
