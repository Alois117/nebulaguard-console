import { useMemo } from "react";
import type { BackupReplicationExternalData } from "@/pages/user/BackupReplication";
import type { BackupReplicationData } from "@/hooks/super-admin/organizations/useOrganizationVeeamMetrics";

interface UseSuperAdminVeeamBackupReplicationOptions {
  brData: BackupReplicationData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected?: boolean;
  onRefresh?: () => Promise<void> | void;
}

const toMainPayload = (brData: BackupReplicationData | null) => {
  if (!brData) return null;

  return {
    summary: brData.summary ?? null,
    matched: Array.isArray(brData.matched) ? brData.matched : [],
    alerts: brData.alerts ?? { warnings: [], critical: [] },
    statistics: brData.statistics ?? null,
    vmsWithoutJobs: Array.isArray(brData.vmsWithoutJobs)
      ? brData.vmsWithoutJobs
      : [],
    jobsWithoutVMs: Array.isArray(brData.jobsWithoutVMs) ? brData.jobsWithoutVMs : [],
    multiVMJobs: Array.isArray(brData.multiVMJobs) ? brData.multiVMJobs : [],
    replicas: Array.isArray(brData.replicas) ? brData.replicas : [],
  };
};

const toMetaPayload = (brData: BackupReplicationData | null) => {
  if (!brData) return null;

  return {
    changes: brData.changes ?? null,
    summary: brData.changeSummary ?? null,
  };
};

const useSuperAdminVeeamBackupReplication = ({
  brData,
  loading,
  error,
  lastUpdated,
  isConnected = true,
  onRefresh,
}: UseSuperAdminVeeamBackupReplicationOptions): BackupReplicationExternalData => {
  const rawData = useMemo(() => {
    const main = toMainPayload(brData);
    const meta = toMetaPayload(brData);

    if (!main && !meta) return null;
    return [main ?? {}, meta ?? {}];
  }, [brData]);

  const displayLoading = loading && rawData == null;

  return {
    rawData,
    loading: displayLoading,
    error,
    lastUpdated,
    isConnected,
    refresh: onRefresh,
  };
};

export default useSuperAdminVeeamBackupReplication;
