/**
 * Zabbix Metrics Drilldown Component
 * Reuses the shared Zabbix presentational view with Super Admin adapters.
 */
import { AlertItem, HostItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import ZabbixMetricsContentView from "@/components/monitoring/ZabbixMetricsContentView";
import useSuperAdminZabbixAlerts from "@/hooks/super-admin/shared-ui/useSuperAdminZabbixAlerts";
import useSuperAdminZabbixHosts from "@/hooks/super-admin/shared-ui/useSuperAdminZabbixHosts";

interface ZabbixMetricsDrilldownProps {
  orgName: string;
  alerts: {
    items: AlertItem[];
    loading: boolean;
    error: string | null;
    isConnected?: boolean;
    lastUpdated?: Date | null;
  };
  hosts: {
    items: HostItem[];
    loading: boolean;
    error: string | null;
    isConnected?: boolean;
    lastUpdated?: Date | null;
  };
  onRefreshAlerts: () => void;
  onRefreshHosts: () => void;
  initialTab?: "alerts" | "hosts";
  initialHostQuery?: string;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
}

const ZabbixMetricsDrilldown = ({
  orgName,
  alerts,
  hosts,
  onRefreshAlerts,
  onRefreshHosts,
  initialTab = "alerts",
  initialHostQuery = "",
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
}: ZabbixMetricsDrilldownProps) => {
  const alertsView = useSuperAdminZabbixAlerts({
    alerts: alerts.items,
    loading: alerts.loading,
    error: alerts.error,
    isConnected: alerts.isConnected ?? !alerts.error,
    lastUpdated: alerts.lastUpdated ?? null,
    selectedOrganizationId,
    selectedOrganizationClientId,
    onRefresh: onRefreshAlerts,
  });

  const hostsView = useSuperAdminZabbixHosts({
    hosts: hosts.items,
    loading: hosts.loading,
    error: hosts.error,
    isConnected: hosts.isConnected ?? !hosts.error,
    lastUpdated: hosts.lastUpdated ?? null,
    selectedOrganizationId,
    selectedOrganizationClientId,
    onRefresh: onRefreshHosts,
  });

  return (
    <ZabbixMetricsContentView
      alertsView={alertsView}
      hostsView={hostsView}
      title={`Zabbix Metrics for ${orgName}`}
      description="Combined alerts and host monitoring data"
      initialTab={initialTab}
      initialSearchQuery={initialHostQuery}
    />
  );
};

export default ZabbixMetricsDrilldown;
