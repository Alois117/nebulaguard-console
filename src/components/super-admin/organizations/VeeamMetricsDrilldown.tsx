import VeeamMetricsContentView, {
  type VeeamMetricsTab,
} from "@/components/monitoring/VeeamMetricsContentView";
import useSuperAdminVeeamBackupReplication from "@/hooks/super-admin/shared-ui/useSuperAdminVeeamBackupReplication";
import useSuperAdminVeeamAlarms from "@/hooks/super-admin/shared-ui/useSuperAdminVeeamAlarms";
import useSuperAdminVeeamInfrastructure from "@/hooks/super-admin/shared-ui/useSuperAdminVeeamInfrastructure";
import {
  useOrganizationVeeamMetrics,
  type PreloadedVeeamMetricsData,
} from "@/hooks/super-admin/organizations/useOrganizationVeeamMetrics";

interface VeeamMetricsDrilldownProps {
  orgName: string;
  clientId?: number | null;
  preloadedData?: PreloadedVeeamMetricsData;
  onRefresh?: () => void;
  onSectionChange?: (section: VeeamSectionTab) => void;
  initialSection?: VeeamSectionTab;
}

export type VeeamSectionTab = "backup" | "alarms" | "infrastructure";

const VeeamMetricsDrilldown = ({
  clientId = null,
  preloadedData,
  onRefresh,
  onSectionChange,
  initialSection = "backup",
}: VeeamMetricsDrilldownProps) => {
  const isGlobalPreloaded = Boolean(preloadedData);
  const enabled = isGlobalPreloaded || (Number.isFinite(clientId) && Number(clientId) > 0);

  const source = useOrganizationVeeamMetrics({
    clientId: isGlobalPreloaded ? null : Number(clientId),
    enabled,
    preloadedData,
  });

  const refreshHandler = () => {
    const result = source.refresh();
    onRefresh?.();
    return result;
  };

  const backupExternalData = useSuperAdminVeeamBackupReplication({
    brData: source.brData,
    loading: source.loading,
    error: source.error,
    lastUpdated: source.lastUpdated,
    isConnected: !source.error,
    onRefresh: refreshHandler,
  });

  const alarmsView = useSuperAdminVeeamAlarms({
    alarmItems: source.alarmItems,
    loading: source.loading,
    error: source.error,
    isConnected: !source.error,
    lastUpdated: source.lastUpdated,
    onRefresh: refreshHandler,
    pageSize: 10,
  });

  const infrastructureView = useSuperAdminVeeamInfrastructure({
    vms: source.infraVMs,
    loading: source.loading,
    error: source.error,
    isConnected: !source.error,
    lastUpdated: source.lastUpdated,
    onRefresh: refreshHandler,
    pageSize: 9,
  });

  if (!enabled) {
    return (
      <div className="text-sm text-muted-foreground">
        Veeam metrics require a valid <span className="font-mono">client_id</span>.
      </div>
    );
  }

  return (
    <VeeamMetricsContentView
      alarmsView={alarmsView}
      infrastructureView={infrastructureView}
      backupExternalData={backupExternalData}
      initialTab={initialSection as VeeamMetricsTab}
      onTabChange={(tab) => onSectionChange?.(tab as VeeamSectionTab)}
    />
  );
};

export default VeeamMetricsDrilldown;
