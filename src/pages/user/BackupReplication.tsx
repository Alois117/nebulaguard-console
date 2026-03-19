import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TriangleAlert,
  Shield,
  ShieldOff,
  Briefcase,
  Clock,
  Bell,
  Plus,
  Pencil,
  Power,
  PowerOff,
  Server,
  AlertCircle,
  Copy,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";

import type {
  AlertItem,
  MultiVmJob,
  OrphanJob,
  Job,
  MatchedVm,
  Replica,
  UnprotectedVm,
  ChangedJob,
} from "@/pages/user/backup-replication/types";
import { formatDateTime } from "@/pages/user/backup-replication/utils/format";
import StatusBadge from "@/pages/user/backup-replication/components/shared/StatusBadge";
import TablePagination from "@/pages/user/backup-replication/components/shared/TablePagination";
import VmDrawer from "@/pages/user/backup-replication/components/VmDrawer";
import JobDetailDrawer from "@/pages/user/backup-replication/components/JobDetailDrawer";
import ChangeActivityDrawer from "@/pages/user/backup-replication/components/ChangeActivityDrawer";
import { usePagination } from "@/pages/user/backup-replication/hooks/usePagination";
import { useTableFilter } from "@/pages/user/backup-replication/hooks/useTableFilter";
import useBackupReplicationViewModel, {
  type BackupReplicationExternalData,
} from "@/hooks/useBackupReplicationViewModel";

interface BackupReplicationProps {
  externalData?: BackupReplicationExternalData;
}

export type { BackupReplicationExternalData };

function safeLower(v: unknown) {
  return String(v ?? "").toLowerCase();
}

function formatCount(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "â€”";
}

function useFilteredTabData<T>(data: T[], searchFields: string[]) {
  const table = useTableFilter(data, { searchFields });
  const pagination = usePagination(table.filteredData, { defaultPageSize: 10 });

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [table.searchQuery, table.filters, pagination.setCurrentPage]);

  return {
    ...table,
    pagination,
  };
}

// ================== Summary Card Components ==================

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant: "info" | "success" | "warning" | "danger";
  onClick?: () => void;
}

function SummaryCard({ title, value, icon: Icon, variant, onClick }: SummaryCardProps) {
  const iconClasses = {
    info: "text-primary bg-primary/10",
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    danger: "text-destructive bg-destructive/10",
  };

  return (
    <Card
      onClick={onClick}
      className={`
        px-4 py-3
        rounded-lg
        border ${variant ? `border-${variant}/30 hover:border-${variant}/50` : "border-primary/30 hover:border-primary/50"}
        cursor-pointer
        transition-all
        hover:shadow-md
        flex flex-col items-center text-center
      `}
    >
      <div className={`mb-2 p-2 rounded-md ${iconClasses[variant]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums leading-none">{value}</div>
    </Card>
  );
}

interface ChangeSummaryCardProps {
  newJobs: number;
  modifiedJobs: number;
  enabledJobs: number;
  disabledJobs: number;
  onClick: () => void;
}

function ChangeSummaryCard({
  newJobs,
  modifiedJobs,
  enabledJobs,
  disabledJobs,
  onClick,
}: ChangeSummaryCardProps) {
  const total = newJobs + modifiedJobs + enabledJobs + disabledJobs;

  return (
    <Card
      onClick={onClick}
      className="
        px-4 py-3
        rounded-lg
        border border-primary/30
        hover:border-primary/50
        cursor-pointer
        transition-all
        hover:shadow-md
        flex flex-col items-center text-center
      "
    >
      <div className="mb-2 p-2 rounded-md bg-primary/10 text-primary">
        <Pencil className="w-4 h-4" />
      </div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">Change Activity</div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums leading-none">{total}</div>
    </Card>
  );
}

// ================== Main Component ==================

const BackupReplication = ({ externalData }: BackupReplicationProps) => {
  const {
    status,
    loading,
    error,
    lastUpdatedAt,
    showNoDataBanner,
    summary,
    vmCounts,
    matched,
    alerts,
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
  } = useBackupReplicationViewModel({ externalData });

  // Drawer states
  const [selectedVm, setSelectedVm] = useState<MatchedVm | null>(null);
  const [vmDrawerOpen, setVmDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);
  const [changeDrawerOpen, setChangeDrawerOpen] = useState(false);

  // Current view tab
  const [activeView, setActiveView] = useState("protected");

  // Handle clicks
  const handleVmClick = (vm: MatchedVm) => {
    setSelectedVm(vm);
    setVmDrawerOpen(true);
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setJobDrawerOpen(true);
  };

  const handleOpenChangeDrawer = () => {
    setChangeDrawerOpen(true);
  };

  const handleChangedJobClick = (changedJob: ChangedJob) => {
    const jobLike: Job = {
      jobName: changedJob.jobName,
      jobType: changedJob.jobType ?? "Unknown",
      platform: changedJob.platform ?? "Unknown",
      lastRun: changedJob.changedAt ?? "",
      lastRunDurationSec: 0,
      avgDurationSec: 0,
      lastTransferredBytes: 0,
      backupStatus: {
        status: changedJob.status ?? "Unknown",
        jobStatus: changedJob.status ?? "Unknown",
        backupAgeHours: 0,
        ranWithinLast24Hours: false,
      },
      parsedJob: {
        schedule: "",
        target: "",
        targetPlatform: "",
        client: "",
        location: "",
        source_host: "",
      },
    };
    setSelectedJob(jobLike);
    setJobDrawerOpen(true);
  };

  const unprotectedTable = useFilteredTabData<UnprotectedVm>(vmsWithoutJobs, ["name", "guestOs"]);
  const orphanTable = useFilteredTabData<OrphanJob>(jobsWithoutVMs, ["jobName", "platform"]);
  const multiVmTable = useFilteredTabData<MultiVmJob>(multiVMJobs, ["jobName", "platform"]);
  const replicasTable = useFilteredTabData<Replica>(replicas, ["name", "sourceVm", "target"]);

  const alertItems = useMemo<AlertItem[]>(() => {
    const criticalItems = Array.isArray(alerts?.critical) ? alerts.critical : [];
    const warningItems = Array.isArray(alerts?.warnings) ? alerts.warnings : [];

    return [
      ...criticalItems.map((alert, index) => ({
        ...(alert as AlertItem),
        id: String((alert as AlertItem)?.id ?? `critical-${index}`),
        severity: "critical" as const,
      })),
      ...warningItems.map((alert, index) => ({
        ...(alert as AlertItem),
        id: String((alert as AlertItem)?.id ?? `warning-${index}`),
        severity: "warning" as const,
      })),
    ];
  }, [alerts]);

  const alertsTable = useTableFilter(alertItems, {
    searchFields: ["message", "relatedVm", "relatedJob"],
  });

  const sortedFilteredAlerts = useMemo(() => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };

    return [...alertsTable.filteredData].sort((left, right) => {
      const severityDiff =
        (severityOrder[left.severity] ?? 2) - (severityOrder[right.severity] ?? 2);

      if (severityDiff !== 0) return severityDiff;

      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });
  }, [alertsTable.filteredData]);

  const alertsPagination = usePagination(sortedFilteredAlerts, { defaultPageSize: 10 });

  useEffect(() => {
    alertsPagination.setCurrentPage(1);
  }, [alertsTable.searchQuery, alertsTable.filters, alertsPagination.setCurrentPage]);

  const unprotectedPowerStates = useMemo(
    () => Array.from(new Set(vmsWithoutJobs.map((vm) => vm.powerState).filter(Boolean))),
    [vmsWithoutJobs]
  );
  const orphanJobTypes = useMemo(
    () => Array.from(new Set(jobsWithoutVMs.map((job) => job.jobType).filter(Boolean))),
    [jobsWithoutVMs]
  );
  const orphanPlatforms = useMemo(
    () => Array.from(new Set(jobsWithoutVMs.map((job) => job.platform).filter(Boolean))),
    [jobsWithoutVMs]
  );
  const multiVmJobTypes = useMemo(
    () => Array.from(new Set(multiVMJobs.map((job) => job.jobType).filter(Boolean))),
    [multiVMJobs]
  );
  const multiVmStatuses = useMemo(
    () => Array.from(new Set(multiVMJobs.map((job) => job.status).filter(Boolean))),
    [multiVMJobs]
  );
  const replicaStatuses = useMemo(
    () => Array.from(new Set(replicas.map((replica) => replica.status).filter(Boolean))),
    [replicas]
  );

  const paginatedAlerts = alertsPagination.paginatedData;
  const paginatedCriticalAlerts = paginatedAlerts.filter((alert) => alert.severity === "critical");
  const paginatedWarningAlerts = paginatedAlerts.filter((alert) => alert.severity === "warning");
  const totalAlertCount = alertItems.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - Only Updated timestamp + green/red connection icon */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {lastUpdatedAt && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-muted-foreground border-none px-0">
                Updated: {lastUpdatedAt.toLocaleTimeString()}
              </Badge>

              <div className="flex items-center gap-1">
                {status === "success" ? (
                  <Wifi className="w-4 h-4 text-success animate-pulse-slow" />
                ) : status === "error" ? (
                  <WifiOff className="w-4 h-4 text-destructive" />
                ) : (
                  <Wifi className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          )}
        </div>

        <div />
      </div>

      {/* Friendly â€œno data yetâ€ banner when webhook returns empty */}
      {showNoDataBanner && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="text-sm text-muted-foreground">
            No data available yet. Please check back shortly.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <SummaryCard
          title="Total VMs"
          value={formatCount(vmCounts.totalVMs)}
          icon={Server}
          variant="info"
        />
        <SummaryCard
          title="Protected VMs"
          value={formatCount(vmCounts.protectedVMs)}
          icon={Shield}
          variant="success"
        />
        <SummaryCard
          title="Unprotected VMs"
          value={formatCount(vmCounts.unprotectedVMs)}
          icon={ShieldOff}
          variant="danger"
        />
        <SummaryCard
          title="Total Jobs"
          value={formatCount(summary?.overview?.totalJobs ?? matched.reduce((acc, m) => acc + (m.jobs?.length ?? 0), 0))}
          icon={Briefcase}
          variant="info"
        />
        <SummaryCard
          title="Stale Backups"
          value={formatCount(summary?.backupHealth?.staleBackups ?? 0)}
          icon={Clock}
          variant="warning"
        />
        <SummaryCard
          title="Active Alerts"
          value={formatCount(totalAlertCount)}
          icon={Bell}
          variant={(alerts?.critical?.length ?? 0) > 0 ? "danger" : "warning"}
        />
        <ChangeSummaryCard
          newJobs={changeSummary?.newJobs ?? changes?.new?.length ?? 0}
          modifiedJobs={changeSummary?.modifiedJobs ?? changes?.modified?.length ?? 0}
          enabledJobs={changeSummary?.enabledJobs ?? changes?.enabled?.length ?? 0}
          disabledJobs={changeSummary?.disabledJobs ?? changes?.disabled?.length ?? 0}
          onClick={handleOpenChangeDrawer}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="w-full justify-start bg-muted/30 p-1 mb-4">
          <TabsTrigger value="protected" className="gap-2">
            <Shield className="h-4 w-4" />
            Protected VMs ({vmCounts.protectedVMs})
          </TabsTrigger>
          <TabsTrigger value="unprotected" className="gap-2">
            <ShieldOff className="h-4 w-4" />
            Unprotected ({vmCounts.unprotectedVMs})
          </TabsTrigger>
          <TabsTrigger value="orphan" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Orphan Jobs ({jobsWithoutVMs.length})
          </TabsTrigger>
          <TabsTrigger value="multivm" className="gap-2">
            <Copy className="h-4 w-4" />
            Multi-VM Jobs ({multiVMJobs.length})
          </TabsTrigger>
          <TabsTrigger value="replicas" className="gap-2">
            <Database className="h-4 w-4" />
            Replicas ({replicas.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alerts ({totalAlertCount})
          </TabsTrigger>
        </TabsList>

        {/* Protected VMs Tab */}
        <TabsContent value="protected" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">VM Protection Table</h2>
                <p className="text-sm text-muted-foreground">
                  Click a VM row to view details and jobs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search VM name or OSâ€¦"
                    className="pl-9 w-[180px] xl:w-[220px] bg-muted/30"
                  />
                </div>

                <Select
                  value={powerStateFilter}
                  onValueChange={(v: "all" | "running" | "off") => setPowerStateFilter(v)}
                >
                  <SelectTrigger className="w-[120px] xl:w-[130px] bg-muted/30">
                    <SelectValue placeholder="Power State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="off">Powered Off</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={protectedFilter}
                  onValueChange={(v: "all" | "protected" | "unprotected") => setProtectedFilter(v)}
                >
                  <SelectTrigger className="w-[120px] xl:w-[140px] bg-muted/30">
                    <SelectValue placeholder="Protection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="protected">Protected</SelectItem>
                    <SelectItem value="unprotected">Unprotected</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v: "all" | "success" | "warning" | "stale") => setStatusFilter(v)}
                >
                  <SelectTrigger className="w-[120px] xl:w-[130px] bg-muted/30">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="stale">Stale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <div className="font-medium">Failed to load data</div>
                    <div className="text-sm text-muted-foreground">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-sm text-muted-foreground py-10 text-center">
                Loading backup & replication dataâ€¦
              </div>
            )}

            {!error && !loading && (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>VM Name</TableHead>
                        <TableHead className="whitespace-nowrap">Power State</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Protected</TableHead>
                        <TableHead>Overall Status</TableHead>
                        <TableHead className="text-right">Jobs Count</TableHead>
                        <TableHead>Last Protected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vmPagination.paginatedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            No VMs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        vmPagination.paginatedData.map((item) => {
                          const vmName = item.vm?.name ?? "â€”";
                          return (
                            <TableRow
                              key={vmName}
                              className="hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => handleVmClick(item)}
                            >
                              <TableCell className="font-medium">{vmName}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    safeLower(item.vm?.powerState).includes("run") ||
                                    safeLower(item.vm?.powerState).includes("on")
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {item.vm?.powerState ?? "â€”"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.vm?.guestOs}>
                                {item.vm?.guestOs ?? "â€”"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.vm?.isProtected ? "default" : "destructive"}>
                                  {item.vm?.isProtected ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={item.protectionSummary?.overallStatus} size="sm" />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.protectionSummary?.totalJobs ?? item.jobs?.length ?? 0}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDateTime(item.vm?.lastProtectedDate)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {filteredMatched.length > 0 && (
                  <TablePagination
                    currentPage={vmPagination.currentPage}
                    totalPages={vmPagination.totalPages}
                    totalItems={vmPagination.totalItems}
                    startIndex={vmPagination.startIndex}
                    endIndex={vmPagination.endIndex}
                    pageSize={vmPagination.pageSize}
                    onPageChange={vmPagination.setCurrentPage}
                    onPageSizeChange={vmPagination.setPageSize}
                    canGoNext={vmPagination.canGoNext}
                    canGoPrevious={vmPagination.canGoPrevious}
                    onFirstPage={vmPagination.goToFirstPage}
                    onLastPage={vmPagination.goToLastPage}
                    onNextPage={vmPagination.goToNextPage}
                    onPreviousPage={vmPagination.goToPreviousPage}
                  />
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* Unprotected VMs */}
        <TabsContent value="unprotected" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Unprotected VMs</h2>
                <p className="text-sm text-muted-foreground">
                  Review discovered VMs without mapped backup jobs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={unprotectedTable.searchQuery}
                    onChange={(e) => unprotectedTable.setSearchQuery(e.target.value)}
                    placeholder="Search VM name or OS..."
                    className="pl-9 w-[180px] xl:w-[220px] bg-muted/30"
                  />
                </div>

                <Select
                  value={unprotectedTable.filters.powerState ?? "all"}
                  onValueChange={(value) => unprotectedTable.setFilter("powerState", value)}
                >
                  <SelectTrigger className="w-[140px] xl:w-[160px] bg-muted/30">
                    <SelectValue placeholder="Power State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {unprotectedPowerStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>VM Name</TableHead>
                    <TableHead className="whitespace-nowrap">Power State</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unprotectedTable.pagination.paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        {vmsWithoutJobs.length === 0
                          ? "No unprotected VMs"
                          : "No unprotected VMs match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    unprotectedTable.pagination.paginatedData.map((vm) => (
                      <TableRow key={`${vm.name}-${vm.lastSeen ?? "unknown"}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{vm.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              safeLower(vm.powerState).includes("run") ||
                              safeLower(vm.powerState).includes("on")
                                ? "default"
                                : "secondary"
                            }
                          >
                            {vm.powerState ?? "--"}
                          </Badge>
                        </TableCell>
                        <TableCell>{vm.guestOs ?? "--"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(vm.lastSeen)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {unprotectedTable.filteredData.length > 0 && (
              <TablePagination
                currentPage={unprotectedTable.pagination.currentPage}
                totalPages={unprotectedTable.pagination.totalPages}
                totalItems={unprotectedTable.pagination.totalItems}
                startIndex={unprotectedTable.pagination.startIndex}
                endIndex={unprotectedTable.pagination.endIndex}
                pageSize={unprotectedTable.pagination.pageSize}
                onPageChange={unprotectedTable.pagination.setCurrentPage}
                onPageSizeChange={unprotectedTable.pagination.setPageSize}
                canGoNext={unprotectedTable.pagination.canGoNext}
                canGoPrevious={unprotectedTable.pagination.canGoPrevious}
                onFirstPage={unprotectedTable.pagination.goToFirstPage}
                onLastPage={unprotectedTable.pagination.goToLastPage}
                onNextPage={unprotectedTable.pagination.goToNextPage}
                onPreviousPage={unprotectedTable.pagination.goToPreviousPage}
              />
            )}
          </Card>
        </TabsContent>

        {/* Orphan Jobs */}
        <TabsContent value="orphan" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Orphan Jobs (Jobs Without VMs)</h2>
                <p className="text-sm text-muted-foreground">
                  Review jobs that are no longer linked to discovered VMs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={orphanTable.searchQuery}
                    onChange={(e) => orphanTable.setSearchQuery(e.target.value)}
                    placeholder="Search job name or platform..."
                    className="pl-9 w-[200px] xl:w-[240px] bg-muted/30"
                  />
                </div>

                <Select
                  value={orphanTable.filters.jobType ?? "all"}
                  onValueChange={(value) => orphanTable.setFilter("jobType", value)}
                >
                  <SelectTrigger className="w-[130px] xl:w-[150px] bg-muted/30">
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {orphanJobTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={orphanTable.filters.platform ?? "all"}
                  onValueChange={(value) => orphanTable.setFilter("platform", value)}
                >
                  <SelectTrigger className="w-[130px] xl:w-[150px] bg-muted/30">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {orphanPlatforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Job Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orphanTable.pagination.paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {jobsWithoutVMs.length === 0
                          ? "No orphan jobs"
                          : "No orphan jobs match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    orphanTable.pagination.paginatedData.map((job, index) => (
                      <TableRow key={`${job.jobName}-${index}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{job.jobName}</TableCell>
                        <TableCell>{job.jobType ?? "--"}</TableCell>
                        <TableCell>{job.platform ?? "--"}</TableCell>
                        <TableCell>{job.schedule ?? "--"}</TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(job.lastRun)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {orphanTable.filteredData.length > 0 && (
              <TablePagination
                currentPage={orphanTable.pagination.currentPage}
                totalPages={orphanTable.pagination.totalPages}
                totalItems={orphanTable.pagination.totalItems}
                startIndex={orphanTable.pagination.startIndex}
                endIndex={orphanTable.pagination.endIndex}
                pageSize={orphanTable.pagination.pageSize}
                onPageChange={orphanTable.pagination.setCurrentPage}
                onPageSizeChange={orphanTable.pagination.setPageSize}
                canGoNext={orphanTable.pagination.canGoNext}
                canGoPrevious={orphanTable.pagination.canGoPrevious}
                onFirstPage={orphanTable.pagination.goToFirstPage}
                onLastPage={orphanTable.pagination.goToLastPage}
                onNextPage={orphanTable.pagination.goToNextPage}
                onPreviousPage={orphanTable.pagination.goToPreviousPage}
              />
            )}
          </Card>
        </TabsContent>

        {/* Multi-VM Jobs */}
        <TabsContent value="multivm" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Multi-VM Jobs</h2>
                <p className="text-sm text-muted-foreground">
                  Review jobs protecting more than one VM
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={multiVmTable.searchQuery}
                    onChange={(e) => multiVmTable.setSearchQuery(e.target.value)}
                    placeholder="Search job name or platform..."
                    className="pl-9 w-[200px] xl:w-[240px] bg-muted/30"
                  />
                </div>

                <Select
                  value={multiVmTable.filters.jobType ?? "all"}
                  onValueChange={(value) => multiVmTable.setFilter("jobType", value)}
                >
                  <SelectTrigger className="w-[130px] xl:w-[150px] bg-muted/30">
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {multiVmJobTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={multiVmTable.filters.status ?? "all"}
                  onValueChange={(value) => multiVmTable.setFilter("status", value)}
                >
                  <SelectTrigger className="w-[130px] xl:w-[150px] bg-muted/30">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {multiVmStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Job Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Linked VMs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {multiVmTable.pagination.paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {multiVMJobs.length === 0
                          ? "No multi-VM jobs"
                          : "No multi-VM jobs match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    multiVmTable.pagination.paginatedData.map((job, index) => (
                      <TableRow key={`${job.jobName}-${index}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{job.jobName}</TableCell>
                        <TableCell>{job.jobType ?? "--"}</TableCell>
                        <TableCell>{job.platform ?? "--"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{job.linkedVMs?.length ?? 0} VMs</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} size="sm" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(job.lastRun)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {multiVmTable.filteredData.length > 0 && (
              <TablePagination
                currentPage={multiVmTable.pagination.currentPage}
                totalPages={multiVmTable.pagination.totalPages}
                totalItems={multiVmTable.pagination.totalItems}
                startIndex={multiVmTable.pagination.startIndex}
                endIndex={multiVmTable.pagination.endIndex}
                pageSize={multiVmTable.pagination.pageSize}
                onPageChange={multiVmTable.pagination.setCurrentPage}
                onPageSizeChange={multiVmTable.pagination.setPageSize}
                canGoNext={multiVmTable.pagination.canGoNext}
                canGoPrevious={multiVmTable.pagination.canGoPrevious}
                onFirstPage={multiVmTable.pagination.goToFirstPage}
                onLastPage={multiVmTable.pagination.goToLastPage}
                onNextPage={multiVmTable.pagination.goToNextPage}
                onPreviousPage={multiVmTable.pagination.goToPreviousPage}
              />
            )}
          </Card>
        </TabsContent>

        {/* Replicas */}
        <TabsContent value="replicas" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Replicas</h2>
                <p className="text-sm text-muted-foreground">
                  Review replica status and recent synchronization activity
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={replicasTable.searchQuery}
                    onChange={(e) => replicasTable.setSearchQuery(e.target.value)}
                    placeholder="Search replica, source, or target..."
                    className="pl-9 w-[220px] xl:w-[260px] bg-muted/30"
                  />
                </div>

                <Select
                  value={replicasTable.filters.status ?? "all"}
                  onValueChange={(value) => replicasTable.setFilter("status", value)}
                >
                  <SelectTrigger className="w-[130px] xl:w-[150px] bg-muted/30">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {replicaStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Replica Name</TableHead>
                    <TableHead>Source VM</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Last Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replicasTable.pagination.paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {replicas.length === 0 ? "No replicas" : "No replicas match your filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    replicasTable.pagination.paginatedData.map((replica, index) => (
                      <TableRow
                        key={`${replica.name}-${replica.sourceVm}-${index}`}
                        className="hover:bg-muted/30"
                      >
                        <TableCell className="font-medium">{replica.name}</TableCell>
                        <TableCell>{replica.sourceVm ?? "--"}</TableCell>
                        <TableCell>{replica.target ?? "--"}</TableCell>
                        <TableCell>
                          <StatusBadge status={replica.status} size="sm" />
                        </TableCell>
                        <TableCell>{replica.health ?? "--"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(replica.lastSync)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {replicasTable.filteredData.length > 0 && (
              <TablePagination
                currentPage={replicasTable.pagination.currentPage}
                totalPages={replicasTable.pagination.totalPages}
                totalItems={replicasTable.pagination.totalItems}
                startIndex={replicasTable.pagination.startIndex}
                endIndex={replicasTable.pagination.endIndex}
                pageSize={replicasTable.pagination.pageSize}
                onPageChange={replicasTable.pagination.setCurrentPage}
                onPageSizeChange={replicasTable.pagination.setPageSize}
                canGoNext={replicasTable.pagination.canGoNext}
                canGoPrevious={replicasTable.pagination.canGoPrevious}
                onFirstPage={replicasTable.pagination.goToFirstPage}
                onLastPage={replicasTable.pagination.goToLastPage}
                onNextPage={replicasTable.pagination.goToNextPage}
                onPreviousPage={replicasTable.pagination.goToPreviousPage}
              />
            )}
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Alerts</h2>
                <p className="text-sm text-muted-foreground">
                  Review current warning and critical alert activity
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={alertsTable.searchQuery}
                    onChange={(e) => alertsTable.setSearchQuery(e.target.value)}
                    placeholder="Search message, VM, or job..."
                    className="pl-9 w-[220px] xl:w-[260px] bg-muted/30"
                  />
                </div>

                <Select
                  value={alertsTable.filters.severity ?? "all"}
                  onValueChange={(value) => alertsTable.setFilter("severity", value)}
                >
                  <SelectTrigger className="w-[140px] xl:w-[160px] bg-muted/30">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {paginatedCriticalAlerts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-destructive mb-2">Critical Alerts</h3>
                  <div className="space-y-2">
                    {paginatedCriticalAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{alert.message}</div>
                            {(alert.relatedVm || alert.relatedJob) && (
                              <div className="text-xs text-muted-foreground">
                                {[alert.relatedVm, alert.relatedJob].filter(Boolean).join(" • ")}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(alert.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paginatedWarningAlerts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-500 mb-2">Warnings</h3>
                  <div className="space-y-2">
                    {paginatedWarningAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                      >
                        <div className="flex items-start gap-3">
                          <TriangleAlert className="w-4 h-4 text-amber-500 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{alert.message}</div>
                            {(alert.relatedVm || alert.relatedJob) && (
                              <div className="text-xs text-muted-foreground">
                                {[alert.relatedVm, alert.relatedJob].filter(Boolean).join(" • ")}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(alert.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alertsTable.filteredData.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  {totalAlertCount === 0 ? "No active alerts" : "No alerts match your filters"}
                </div>
              )}
            </div>

            {alertsTable.filteredData.length > 0 && (
              <TablePagination
                currentPage={alertsPagination.currentPage}
                totalPages={alertsPagination.totalPages}
                totalItems={alertsPagination.totalItems}
                startIndex={alertsPagination.startIndex}
                endIndex={alertsPagination.endIndex}
                pageSize={alertsPagination.pageSize}
                onPageChange={alertsPagination.setCurrentPage}
                onPageSizeChange={alertsPagination.setPageSize}
                canGoNext={alertsPagination.canGoNext}
                canGoPrevious={alertsPagination.canGoPrevious}
                onFirstPage={alertsPagination.goToFirstPage}
                onLastPage={alertsPagination.goToLastPage}
                onNextPage={alertsPagination.goToNextPage}
                onPreviousPage={alertsPagination.goToPreviousPage}
              />
            )}
          </Card>
        </TabsContent>

        {/* Changes */}
        <TabsContent value="changes" className="mt-0">
          <Card className="p-6 rounded-lg border border-border">
            <ChangeActivityContent
              changes={changes}
              changeSummary={changeSummary}
              loading={loading}
              onSelectJob={handleChangedJobClick}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      <VmDrawer
        open={vmDrawerOpen}
        onOpenChange={setVmDrawerOpen}
        vm={selectedVm}
        onSelectJob={handleJobClick}
      />

      <JobDetailDrawer
        open={jobDrawerOpen}
        onOpenChange={setJobDrawerOpen}
        job={selectedJob}
      />

      <ChangeActivityDrawer
        open={changeDrawerOpen}
        onOpenChange={setChangeDrawerOpen}
        changes={changes}
        changeSummary={changeSummary}
        onSelectJob={handleChangedJobClick}
      />
    </div>
  );
};

// ================== Change Activity Content ==================

interface ChangeActivityContentProps {
  changes: any;
  changeSummary: any;
  loading: boolean;
  onSelectJob?: (job: ChangedJob) => void;
}

function ChangeActivityContent({ changes, changeSummary, loading, onSelectJob }: ChangeActivityContentProps) {
  const [activeTab, setActiveTab] = useState("new");

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading changesâ€¦</div>;
  }

  if (!changes) {
    return <div className="text-center py-10 text-muted-foreground">No change data available</div>;
  }

  const tabData = {
    new: changes.new ?? [],
    modified: changes.modified ?? [],
    enabled: changes.enabled ?? [],
    disabled: changes.disabled ?? [],
  };
  const currentJobs = (tabData[activeTab as keyof typeof tabData] ?? []) as ChangedJob[];
  const changePagination = usePagination(currentJobs, { defaultPageSize: 10 });

  useEffect(() => {
    changePagination.setCurrentPage(1);
  }, [activeTab, changePagination.setCurrentPage]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">New Jobs</div>
              <div className="text-2xl font-bold text-emerald-500">
                {changeSummary?.newJobs ?? tabData.new.length}
              </div>
            </div>
            <Plus className="w-5 h-5 text-emerald-500" />
          </div>
        </Card>

        <Card className="p-4 border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Modified Jobs</div>
              <div className="text-2xl font-bold text-blue-500">
                {changeSummary?.modifiedJobs ?? tabData.modified.length}
              </div>
            </div>
            <Pencil className="w-5 h-5 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Enabled Jobs</div>
              <div className="text-2xl font-bold text-amber-500">
                {changeSummary?.enabledJobs ?? tabData.enabled.length}
              </div>
            </div>
            <Power className="w-5 h-5 text-amber-500" />
          </div>
        </Card>

        <Card className="p-4 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Disabled Jobs</div>
              <div className="text-2xl font-bold text-red-500">
                {changeSummary?.disabledJobs ?? tabData.disabled.length}
              </div>
            </div>
            <PowerOff className="w-5 h-5 text-red-500" />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-muted/30 p-1">
          <TabsTrigger value="new" className="gap-2">
            <Plus className="h-4 w-4" />
            New ({tabData.new.length})
          </TabsTrigger>
          <TabsTrigger value="modified" className="gap-2">
            <Pencil className="h-4 w-4" />
            Modified ({tabData.modified.length})
          </TabsTrigger>
          <TabsTrigger value="enabled" className="gap-2">
            <Power className="h-4 w-4" />
            Enabled ({tabData.enabled.length})
          </TabsTrigger>
          <TabsTrigger value="disabled" className="gap-2">
            <PowerOff className="h-4 w-4" />
            Disabled ({tabData.disabled.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(tabData).map(([key, jobs]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <ChangedJobsTable
              jobs={key === activeTab ? changePagination.paginatedData : (jobs as ChangedJob[])}
              onSelectJob={onSelectJob}
            />

            {key === activeTab && currentJobs.length > 0 && (
              <TablePagination
                currentPage={changePagination.currentPage}
                totalPages={changePagination.totalPages}
                totalItems={changePagination.totalItems}
                startIndex={changePagination.startIndex}
                endIndex={changePagination.endIndex}
                pageSize={changePagination.pageSize}
                onPageChange={changePagination.setCurrentPage}
                onPageSizeChange={changePagination.setPageSize}
                canGoNext={changePagination.canGoNext}
                canGoPrevious={changePagination.canGoPrevious}
                onFirstPage={changePagination.goToFirstPage}
                onLastPage={changePagination.goToLastPage}
                onNextPage={changePagination.goToNextPage}
                onPreviousPage={changePagination.goToPreviousPage}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ================== Changed Jobs Table ==================

function ChangedJobsTable({
  jobs,
  onSelectJob,
}: {
  jobs: ChangedJob[];
  onSelectJob?: (job: ChangedJob) => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
        No jobs in this category
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Job Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Changed At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job, idx) => (
            <TableRow
              key={`${job.jobName}-${idx}`}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onSelectJob?.(job)}
            >
              <TableCell className="font-medium">{job.jobName}</TableCell>
              <TableCell>
                <Badge variant="outline">{job.jobType ?? "â€”"}</Badge>
              </TableCell>
              <TableCell>{job.platform ?? "â€”"}</TableCell>
              <TableCell>
                <StatusBadge status={job.status} size="sm" />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(job.changedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default BackupReplication;

