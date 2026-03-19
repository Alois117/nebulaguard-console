import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ZabbixHost,
  ZabbixHostCounts,
  ZabbixHostStatusFilter,
} from "@/hooks/useZabbixHosts";
import type { HostItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import type { GlobalHostItem } from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";

type SuperAdminHostSource = (HostItem | GlobalHostItem) & Record<string, unknown>;

interface UseSuperAdminZabbixHostsOptions {
  hosts: Array<HostItem | GlobalHostItem>;
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  lastUpdated?: Date | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
  pageSize?: number;
  onRefresh?: () => Promise<void> | void;
}

interface UseSuperAdminZabbixHostsReturn {
  hosts: ZabbixHost[];
  loading: boolean;
  error: string | null;
  counts: ZabbixHostCounts;
  isConnected: boolean;
  lastUpdated: Date | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  statusFilter: ZabbixHostStatusFilter;
  setStatusFilter: (status: ZabbixHostStatusFilter) => void;
  clearFilters: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  paginatedHosts: ZabbixHost[];
  uniqueGroups: string[];
  refresh: () => Promise<void> | void;
}

const safeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toNumberOrNull = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toDateOrNull = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const getSourceClientId = (item: SuperAdminHostSource): number | null => {
  const candidate = item.clientId ?? item.client_id;
  return toNumberOrNull(candidate);
};

const getSourceOrganizationId = (item: SuperAdminHostSource): string | null => {
  const value = item.organizationId;
  return typeof value === "string" ? value : null;
};

const filterByScope = (
  hosts: SuperAdminHostSource[],
  selectedOrganizationId?: string | null,
  selectedOrganizationClientId?: number | null
) => {
  if (!selectedOrganizationId && selectedOrganizationClientId == null) return hosts;

  return hosts.filter((item) => {
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

const mapToSharedHost = (host: SuperAdminHostSource, fallbackIndex: number): ZabbixHost => {
  const id =
    safeString(host.hostid) ||
    safeString(host.id) ||
    `${getSourceClientId(host) ?? 0}-${fallbackIndex}`;
  const createdAt =
    toDateOrNull(host.created_at ?? host.createdAt ?? host.lastAccess) ?? new Date(0);
  const updatedAt =
    toDateOrNull(host.updated_at ?? host.updatedAt ?? host.lastAccess) ?? createdAt;

  return {
    id,
    name: safeString(host.name) || safeString(host.host) || "Unknown Host",
    ip: safeString(host.host) || safeString(host.ip) || "—",
    groups: Array.isArray(host.groups)
      ? host.groups
          .map((group) =>
            typeof group === "string"
              ? group
              : safeString(isRecord(group) ? group.name : "")
          )
          .filter(Boolean)
      : [],
    status: Number(host.status) === 0 ? "enabled" : "disabled",
    clientId: getSourceClientId(host) ?? 0,
    createdAt,
    updatedAt,
    lastCollectedAt:
      toDateOrNull(host.last_collected_at ?? host.lastCollectedAt ?? host.lastAccess) ?? null,
    linkedVeeamMoref:
      safeString(host.linked_veeam_moref ?? host.linkedVeeamMoref) || null,
    tags: isRecord(host.tags_json)
      ? host.tags_json
      : isRecord(host.tags)
      ? host.tags
      : {},
  };
};

const useSuperAdminZabbixHosts = ({
  hosts,
  loading,
  error,
  isConnected = true,
  lastUpdated = null,
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
  pageSize = 10,
  onRefresh,
}: UseSuperAdminZabbixHostsOptions): UseSuperAdminZabbixHostsReturn => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ZabbixHostStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const scopedHosts = useMemo(
    () =>
      filterByScope(
        hosts as SuperAdminHostSource[],
        selectedOrganizationId,
        selectedOrganizationClientId
      ),
    [hosts, selectedOrganizationId, selectedOrganizationClientId]
  );

  const mappedHosts = useMemo(
    () =>
      scopedHosts
        .map(mapToSharedHost)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [scopedHosts]
  );

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    mappedHosts.forEach((host) => {
      host.groups.forEach((group) => groups.add(group));
    });
    return Array.from(groups).sort();
  }, [mappedHosts]);

  const counts = useMemo<ZabbixHostCounts>(
    () => ({
      total: mappedHosts.length,
      enabled: mappedHosts.filter((host) => host.status === "enabled").length,
      disabled: mappedHosts.filter((host) => host.status === "disabled").length,
      withVeeamLink: mappedHosts.filter((host) => Boolean(host.linkedVeeamMoref)).length,
      uniqueGroups: uniqueGroups.length,
    }),
    [mappedHosts, uniqueGroups]
  );

  const filteredHosts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return mappedHosts.filter((host) => {
      const matchesSearch =
        !query ||
        host.name.toLowerCase().includes(query) ||
        host.ip.toLowerCase().includes(query) ||
        host.groups.some((group) => group.toLowerCase().includes(query));

      const matchesGroup = !selectedGroup || host.groups.includes(selectedGroup);
      const matchesStatus = statusFilter === "all" || host.status === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [mappedHosts, searchQuery, selectedGroup, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredHosts.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, statusFilter, selectedOrganizationId, selectedOrganizationClientId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedHosts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredHosts.slice(startIndex, startIndex + pageSize);
  }, [filteredHosts, currentPage, pageSize]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedGroup(null);
    setStatusFilter("all");
    setCurrentPage(1);
  }, []);

  const refresh = useCallback(() => {
    if (onRefresh) return onRefresh();
  }, [onRefresh]);

  const displayLoading = loading && mappedHosts.length === 0;

  return {
    hosts: filteredHosts,
    loading: displayLoading,
    error,
    counts,
    isConnected,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    selectedGroup,
    setSelectedGroup,
    statusFilter,
    setStatusFilter,
    clearFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    totalPages,
    paginatedHosts,
    uniqueGroups,
    refresh,
  };
};

export default useSuperAdminZabbixHosts;
