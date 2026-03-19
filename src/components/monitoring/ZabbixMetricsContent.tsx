import { useAlerts } from "@/hooks/useAlerts";
import { useZabbixHosts } from "@/hooks/useZabbixHosts";
import ZabbixMetricsContentView from "./ZabbixMetricsContentView";

const ZabbixMetricsContent = () => {
  const {
    alerts,
    loading: alertsLoading,
    counts: alertCounts,
    isConnected: alertsConnected,
    lastUpdated: alertsLastUpdated,
  } = useAlerts();

  const {
    paginatedHosts,
    loading: hostsLoading,
    error: hostsError,
    counts: hostCounts,
    isConnected: hostsConnected,
    lastUpdated: hostsLastUpdated,
    searchQuery: hostSearchQuery,
    setSearchQuery: setHostSearchQuery,
    selectedGroup,
    setSelectedGroup,
    statusFilter: hostStatusFilter,
    setStatusFilter: setHostStatusFilter,
    clearFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    totalPages,
    hosts: filteredHosts,
    uniqueGroups,
  } = useZabbixHosts(10);

  return (
    <ZabbixMetricsContentView
      alertsView={{
        alerts,
        loading: alertsLoading,
        counts: alertCounts,
        isConnected: alertsConnected,
        lastUpdated: alertsLastUpdated,
      }}
      hostsView={{
        paginatedHosts,
        loading: hostsLoading,
        error: hostsError,
        counts: hostCounts,
        isConnected: hostsConnected,
        lastUpdated: hostsLastUpdated,
        searchQuery: hostSearchQuery,
        setSearchQuery: setHostSearchQuery,
        selectedGroup,
        setSelectedGroup,
        statusFilter: hostStatusFilter,
        setStatusFilter: setHostStatusFilter,
        clearFilters,
        currentPage,
        setCurrentPage,
        pageSize,
        totalPages,
        hosts: filteredHosts,
        uniqueGroups,
      }}
    />
  );
};

export default ZabbixMetricsContent;
