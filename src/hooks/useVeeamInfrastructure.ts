import { useState, useEffect, useCallback, useMemo } from "react";

export interface VeeamVMRawJson {
  name: string;
  vmId: number;
  moRef: string;
  notes: string | null;
  guestOs: string;
  category: string;
  cpuCount: number;
  isReplica: boolean;
  dedupe_key: string;
  powerState: string;
  isProtected: boolean;
  collected_at: string;
  guestDnsName: string;
  isCdpReplica: boolean;
  memorySizeMb: number;
  connectionState: string;
  memorySizeHuman: string;
  guestIpAddresses: string[];
  guestUsedPercent: number;
  lastProtectedDate: string | null;
  guestTotalFreeBytes: number;
  guestTotalFreeHuman: string;
  totalAllocatedBytes: number;
  totalAllocatedHuman: string;
  totalCommittedBytes: number;
  totalCommittedHuman: string;
  virtualDisksSummary: Array<{
    name: string;
    capacityBytes: number;
    capacityHuman: string;
  }>;
  datastoreUsageSummary: Array<{
    unsharedBytes: number;
    committedBytes: number;
    committedHuman: string;
    datastoreMoRef: string;
    uncommittedBytes: number;
  }>;
  guestUsedPercentHuman: string;
  protectionJobUidsCount: number;
  guestTotalCapacityBytes: number;
  guestTotalCapacityHuman: string;
  virtualDiskCountReported: number;
  virtualDisksCountCalculated: number;
}

export interface VeeamVM {
  client_id: number;
  client_name: string;
  VM_id: string;
  fetch_time: string;
  Category: string;
  raw_json: VeeamVMRawJson;
}

export type PowerState = "PoweredOn" | "PoweredOff";
export type ProtectionStatus = "Protected" | "Not Protected";

interface UseVeeamInfrastructureOptions {
  pageSize?: number;
}

interface UseVeeamInfrastructureReturn {
  vms: VeeamVM[];
  filteredVMs: VeeamVM[];
  paginatedVMs: VeeamVM[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  totalCount: number;
  // Pagination
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterPowerState: PowerState | null;
  setFilterPowerState: (state: PowerState | null) => void;
  filterProtection: ProtectionStatus | null;
  setFilterProtection: (status: ProtectionStatus | null) => void;
  filterCategory: string | null;
  setFilterCategory: (category: string | null) => void;
  // Available filter options
  categories: string[];
  // Counts
  counts: {
    total: number;
    poweredOn: number;
    poweredOff: number;
    protected: number;
    unprotected: number;
  };
}

const VEEAM_VMS_ENDPOINT = "http://10.100.12.54:5678/webhook/veeamone_vms";
const REFRESH_INTERVAL = 10000;

export const useVeeamInfrastructure = (
  options: UseVeeamInfrastructureOptions = {}
): UseVeeamInfrastructureReturn => {
  const { pageSize = 9 } = options;

  const [vms, setVMs] = useState<VeeamVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPowerState, setFilterPowerState] = useState<PowerState | null>(null);
  const [filterProtection, setFilterProtection] = useState<ProtectionStatus | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterPowerState, filterProtection, filterCategory]);

  const fetchVMs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const response = await fetch(VEEAM_VMS_ENDPOINT);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const vmsArray = Array.isArray(data) ? data : [data];

      setVMs(vmsArray);
      setIsConnected(true);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch Veeam VMs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch VMs");
      setIsConnected(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial fetch and silent refresh
  useEffect(() => {
    fetchVMs();
    const interval = setInterval(() => fetchVMs(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchVMs]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(vms.map((vm) => vm.Category).filter(Boolean));
    return Array.from(cats).sort();
  }, [vms]);

  // Filter VMs
  const filteredVMs = useMemo(() => {
    return vms.filter((vm) => {
      const rawJson = vm.raw_json;

      // Search filter - by VM name, DNS name, or IP address
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        const matchesName = rawJson.name?.toLowerCase().includes(search);
        const matchesDns = rawJson.guestDnsName?.toLowerCase().includes(search);
        const matchesIp = rawJson.guestIpAddresses?.some((ip) =>
          ip.toLowerCase().includes(search)
        );
        if (!matchesName && !matchesDns && !matchesIp) return false;
      }

      // Power state filter
      if (filterPowerState) {
        if (rawJson.powerState !== filterPowerState) return false;
      }

      // Protection status filter
      if (filterProtection) {
        const isProtected = rawJson.isProtected;
        if (filterProtection === "Protected" && !isProtected) return false;
        if (filterProtection === "Not Protected" && isProtected) return false;
      }

      // Category filter
      if (filterCategory && vm.Category !== filterCategory) return false;

      return true;
    }).sort((a, b) => {
      // Sort by name alphabetically
      return a.raw_json.name.localeCompare(b.raw_json.name);
    });
  }, [vms, debouncedSearch, filterPowerState, filterProtection, filterCategory]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredVMs.length / pageSize));

  // Keep page in valid range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedVMs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVMs.slice(start, start + pageSize);
  }, [filteredVMs, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  // Counts
  const counts = useMemo(() => {
    return {
      total: vms.length,
      poweredOn: vms.filter((vm) => vm.raw_json.powerState === "PoweredOn").length,
      poweredOff: vms.filter((vm) => vm.raw_json.powerState === "PoweredOff").length,
      protected: vms.filter((vm) => vm.raw_json.isProtected).length,
      unprotected: vms.filter((vm) => !vm.raw_json.isProtected).length,
    };
  }, [vms]);

  return {
    vms,
    filteredVMs,
    paginatedVMs,
    loading,
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
  };
};

export const formatLastBackup = (dateString: string | null): string => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "< 1 hour ago";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};
