import { useState, useEffect } from "react";
import UserLayout from "@/layouts/UserLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody, 
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Search,
  Wifi,
  WifiOff,
  Server,
  AlertTriangle,
  HardDrive,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Shield,
  ShieldOff,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useVeeamBackupAndReplication,
  formatDuration,
  formatBytes,
  TransformedVeeamJob,
} from "@/hooks/useVeeamBackupAndReplication";
import VeeamStatusBadge from "@/components/veeam/VeeamStatusBadge";
import VeeamJobDetailDrawer from "@/components/veeam/VeeamJobDetailDrawer";
import VeeamFilters from "@/components/veeam/VeeamFilters";
import { useVeeamAlarms, VeeamAlarm, getRelativeTime } from "@/hooks/useVeeamAlarms";
import VeeamAlarmDetailDrawer from "@/components/veeam/VeeamAlarmDetailDrawer";
import VeeamAlarmsFilters from "@/components/veeam/VeeamAlarmsFilters";
import { useVeeamInfrastructure, VeeamVM, formatLastBackup } from "@/hooks/useVeeamInfrastructure";
import VeeamInfrastructureFilters from "@/components/veeam/VeeamInfrastructureFilters";
import VeeamVMDetailDrawer from "@/components/veeam/VeeamVMDetailDrawer";

const UserVeeam = () => {
  const [activeTab, setActiveTab] = useState("backup");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<TransformedVeeamJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<TransformedVeeamJob["status"] | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Alarms state
  const [selectedAlarm, setSelectedAlarm] = useState<VeeamAlarm | null>(null);
  const [alarmDrawerOpen, setAlarmDrawerOpen] = useState(false);

  // Infrastructure state
  const [selectedVM, setSelectedVM] = useState<VeeamVM | null>(null);
  const [vmDrawerOpen, setVMDrawerOpen] = useState(false);

  // Veeam Infrastructure hook
  const infraHook = useVeeamInfrastructure({ pageSize: 9 });

  const itemsPerPage = 10;

  const { jobs, loading, counts, isConnected, lastUpdated } = useVeeamBackupAndReplication();

  // Veeam Alarms hook
  const alarmsHook = useVeeamAlarms({ pageSize: 10 });
  // Filter jobs based on search, status, time range, and category
  const filteredJobs = jobs.filter((job) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      (job.vmName || "").toLowerCase().includes(search) ||
      (job.jobName || "").toLowerCase().includes(search) ||
      (job.esxiHost || "").toLowerCase().includes(search);

    const matchesStatus = filterStatus ? job.status === filterStatus : true;

    const matchesCategory = filterCategory ? job.category === filterCategory : true;

    // Time filter logic
    let matchesTime = true;
    const jobTime = job.lastRun.getTime();

    if (selectedTimeRange !== "24h" || customDateFrom || customDateTo) {
      if (selectedTimeRange !== "custom") {
        let subtractMs = 0;
        switch (selectedTimeRange) {
          case "1h": subtractMs = 60 * 60 * 1000; break;
          case "6h": subtractMs = 6 * 60 * 60 * 1000; break;
          case "24h": subtractMs = 24 * 60 * 60 * 1000; break;
          case "7d": subtractMs = 7 * 24 * 60 * 60 * 1000; break;
          case "30d": subtractMs = 30 * 24 * 60 * 60 * 1000; break;
        }
        if (subtractMs > 0) {
          matchesTime = jobTime >= Date.now() - subtractMs;
        }
      } else if (customDateFrom || customDateTo) {
        if (customDateFrom) {
          matchesTime = matchesTime && jobTime >= customDateFrom.getTime();
        }
        if (customDateTo) {
          const toEnd = new Date(customDateTo);
          toEnd.setHours(23, 59, 59, 999);
          matchesTime = matchesTime && jobTime <= toEnd.getTime();
        }
      }
    }

    return matchesSearch && matchesStatus && matchesTime && matchesCategory;
  });

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, selectedTimeRange, customDateFrom, customDateTo, filterCategory]);

  // Keep page in valid range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleRowClick = (job: TransformedVeeamJob) => {
    setSelectedJob(job);
    setDrawerOpen(true);
  };

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Veeam</h1>
            <p className="text-muted-foreground">Backup & Replication Management</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card">
            <TabsTrigger value="backup" className="gap-2">
              <HardDrive className="w-4 h-4" />
              Backup & Replication
            </TabsTrigger>
            <TabsTrigger value="alarms" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alarms
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="gap-2">
              <Server className="w-4 h-4" />
              Infrastructure
            </TabsTrigger>
          </TabsList>

          {/* Backup & Replication Tab */}
          <TabsContent value="backup" className="space-y-6">
            {/* Status Bar with restored count badges */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <p className="text-muted-foreground">{counts.total} backup jobs</p>
                <div className="flex items-center gap-1 text-xs">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-success" />
                      <span className="text-success">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-destructive" />
                      <span className="text-destructive">Offline</span>
                    </>
                  )}
                </div>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Count badges (non-clickable) */}
              <div className="flex items-center gap-2">
                <Badge className="bg-success/20 text-success border-success/30">
                  {counts.success} Success
                </Badge>
                <Badge className="bg-warning/20 text-warning border-warning/30">
                  {counts.warning} Warning
                </Badge>
                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                  {counts.failed} Failed
                </Badge>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search VMs, jobs, hosts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <VeeamFilters
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                selectedTimeRange={selectedTimeRange}
                onTimeRangeChange={setSelectedTimeRange}
                customDateFrom={customDateFrom}
                onCustomDateFromChange={setCustomDateFrom}
                customDateTo={customDateTo}
                onCustomDateToChange={setCustomDateTo}
                filterCategory={filterCategory}
                onFilterCategoryChange={setFilterCategory}
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Table + Pagination */}
            {!loading && (
              <div className="cyber-card overflow-hidden">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <Table role="table" aria-label="Veeam backup jobs table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>VM Name</TableHead>
                        <TableHead>Job Name</TableHead>
                        <TableHead>ESXi Host</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {currentJobs.map((job, index) => (
                          <motion.tr
                            key={job.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15, delay: index * 0.02 }}
                            onClick={() => handleRowClick(job)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <TableCell>
                              <VeeamStatusBadge status={job.status} />
                            </TableCell>
                            <TableCell className="font-medium">{job.vmName}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {job.jobName}
                            </TableCell>
                            <TableCell>{job.esxiHost}</TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {job.lastRun.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>{formatDuration(job.durationSec)}</TableCell>
                            <TableCell>{job.category}</TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredJobs.length)} of{" "}
                      {filteredJobs.length} jobs
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm" aria-live="polite" aria-atomic="true">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {filteredJobs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Database className="w-12 h-12 mb-4 opacity-50" />
                    <p>No backup jobs found</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Alarms Tab (Real Data) */}
          <TabsContent value="alarms" className="space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <p className="text-muted-foreground">{alarmsHook.counts.total} alarms</p>
                <div className="flex items-center gap-1 text-xs">
                  {alarmsHook.isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-success" />
                      <span className="text-success">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-destructive" />
                      <span className="text-destructive">Offline</span>
                    </>
                  )}
                </div>
                {alarmsHook.lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated: {alarmsHook.lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Count badges */}
              <div className="flex items-center gap-2">
                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                  {alarmsHook.counts.active} Active
                </Badge>
                <Badge className="bg-warning/20 text-warning border-warning/30">
                  {alarmsHook.counts.acknowledged} Acknowledged
                </Badge>
                <Badge className="bg-success/20 text-success border-success/30">
                  {alarmsHook.counts.resolved} Resolved
                </Badge>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search alarms, entities..."
                  value={alarmsHook.searchQuery}
                  onChange={(e) => alarmsHook.setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <VeeamAlarmsFilters
                filterStatus={alarmsHook.filterStatus}
                onFilterStatusChange={alarmsHook.setFilterStatus}
                filterSeverity={alarmsHook.filterSeverity}
                onFilterSeverityChange={alarmsHook.setFilterSeverity}
                filterEntityType={alarmsHook.filterEntityType}
                onFilterEntityTypeChange={alarmsHook.setFilterEntityType}
                entityTypes={alarmsHook.entityTypes}
                timeRange={alarmsHook.timeRange}
                onTimeRangeChange={alarmsHook.setTimeRange}
                customDateFrom={alarmsHook.customDateFrom}
                onCustomDateFromChange={alarmsHook.setCustomDateFrom}
                customDateTo={alarmsHook.customDateTo}
                onCustomDateToChange={alarmsHook.setCustomDateTo}
              />
            </div>

            {/* Loading State */}
            {alarmsHook.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Alarm Cards */}
            {!alarmsHook.loading && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {alarmsHook.paginatedAlarms.map((alarm, index) => (
                    <motion.div
                      key={alarm.dedupe_key || alarm.alarm_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                    >
                      <Card
                        className="p-4 hover:border-primary/30 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedAlarm(alarm);
                          setAlarmDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <AlertTriangle
                              className={`w-5 h-5 mt-0.5 ${
                                alarm.severity?.toLowerCase() === "critical"
                                  ? "text-destructive"
                                  : alarm.severity?.toLowerCase() === "warning"
                                  ? "text-warning"
                                  : alarm.severity?.toLowerCase() === "high"
                                  ? "text-orange-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div className="flex-1 space-y-1">
                              <p className="font-medium">{alarm.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Server className="w-3 h-3" />
                                <span>{alarm.entity_name}</span>
                                <span>•</span>
                                <span className="text-muted-foreground/70">{alarm.entity_type}</span>
                                <span>•</span>
                                <span>{getRelativeTime(alarm.last_seen || alarm.triggered_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                alarm.severity?.toLowerCase() === "critical"
                                  ? "bg-destructive/20 text-destructive border-destructive/30"
                                  : alarm.severity?.toLowerCase() === "warning"
                                  ? "bg-warning/20 text-warning border-warning/30"
                                  : alarm.severity?.toLowerCase() === "high"
                                  ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
                                  : "bg-muted/20 text-muted-foreground border-muted/30"
                              }
                            >
                              {alarm.severity}
                            </Badge>
                            <Badge
                              variant={alarm.status === "Active" ? "destructive" : "secondary"}
                              className={
                                alarm.status === "Active"
                                  ? "bg-destructive/20 text-destructive border-destructive/30"
                                  : alarm.status === "Resolved"
                                  ? "bg-success/20 text-success border-success/30"
                                  : alarm.status === "Acknowledged"
                                  ? "bg-warning/20 text-warning border-warning/30"
                                  : ""
                              }
                            >
                              {alarm.status}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {alarmsHook.paginatedAlarms.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                    <p>No alarms found</p>
                  </div>
                )}

                {/* Load More / Pagination Info */}
                {alarmsHook.paginatedAlarms.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing 1–{alarmsHook.paginatedAlarms.length} of {alarmsHook.totalCount}
                    </p>
                    {alarmsHook.hasMore && (
                      <Button
                        variant="outline"
                        onClick={alarmsHook.loadMore}
                        className="gap-2"
                      >
                        Load more
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Infrastructure Tab (Real Data) */}
          <TabsContent value="infrastructure" className="space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <p className="text-muted-foreground">{infraHook.counts.total} VMs</p>
                <div className="flex items-center gap-1 text-xs">
                  {infraHook.isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-success" />
                      <span className="text-success">Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-destructive" />
                      <span className="text-destructive">Offline</span>
                    </>
                  )}
                </div>
                {infraHook.lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated: {infraHook.lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Count badges */}
              <div className="flex items-center gap-2">
                <Badge className="bg-success/20 text-success border-success/30">
                  {infraHook.counts.poweredOn} Powered On
                </Badge>
                <Badge className="bg-muted/20 text-muted-foreground border-muted/30">
                  {infraHook.counts.poweredOff} Powered Off
                </Badge>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {infraHook.counts.protected} Protected
                </Badge>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search VMs, DNS, IPs..."
                  value={infraHook.searchQuery}
                  onChange={(e) => infraHook.setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <VeeamInfrastructureFilters
                filterPowerState={infraHook.filterPowerState}
                onFilterPowerStateChange={infraHook.setFilterPowerState}
                filterProtection={infraHook.filterProtection}
                onFilterProtectionChange={infraHook.setFilterProtection}
                filterCategory={infraHook.filterCategory}
                onFilterCategoryChange={infraHook.setFilterCategory}
                categories={infraHook.categories}
              />
            </div>

            {/* Loading State */}
            {infraHook.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* VM Cards Grid */}
            {!infraHook.loading && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {infraHook.paginatedVMs.map((vm, index) => {
                      const data = vm.raw_json?.json; // ← central safe access point

                      if (!data) {
                        return (
                          <Card key={vm.VM_id} className="p-6 text-center text-muted-foreground">
                            Invalid VM data
                          </Card>
                        );
                      }

                      const isPoweredOn = data.powerState === "PoweredOn";
                      const isProtected = !!data.isProtected;

                      return (
                        <motion.div
                          key={vm.VM_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
                        >
                          <Card
                            className="p-4 hover:border-primary/30 transition-all cursor-pointer h-full"
                            onClick={() => {
                              setSelectedVM(vm);
                              setVMDrawerOpen(true);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isPoweredOn ? "bg-success/10" : "bg-muted/30"}`}>
                                <Monitor className={`w-5 h-5 ${isPoweredOn ? "text-success" : "text-muted-foreground"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* VM Name */}
                                <h4 className="font-semibold truncate">
                                  {data.name || "Unnamed VM"}
                                </h4>

                                {/* Power & Connection State */}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      isPoweredOn
                                        ? "text-success border-success/30"
                                        : "text-muted-foreground border-muted/30"
                                    }`}
                                  >
                                    {data.powerState || "Unknown"}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      data.connectionState === "Connected"
                                        ? "text-primary border-primary/30"
                                        : "text-destructive border-destructive/30"
                                    }`}
                                  >
                                    {data.connectionState || "Unknown"}
                                  </Badge>
                                </div>

                                {/* CPU & Memory */}
                                <div className="mt-3 space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Cpu className="w-3.5 h-3.5" />
                                      CPU
                                    </span>
                                    <span className="font-medium">{data.cpuCount ?? "?"} vCPU</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Server className="w-3.5 h-3.5" />
                                      Memory
                                    </span>
                                    <span className="font-medium">{data.memorySizeHuman || "? GB"}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <HardDrive className="w-3.5 h-3.5" />
                                      Disk
                                    </span>
                                    <span className="font-medium text-xs">
                                      {data.totalCommittedHuman || "?"} / {data.totalAllocatedHuman || "?"}
                                    </span>
                                  </div>
                                </div>

                                {/* Last Backup & Protection */}
                                <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      Last Backup
                                    </span>
                                    <span className="font-medium text-xs">
                                      {formatLastBackup(data.lastProtectedDate)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      {isProtected ? (
                                        <Shield className="w-3.5 h-3.5 text-success" />
                                      ) : (
                                        <ShieldOff className="w-3.5 h-3.5 text-warning" />
                                      )}
                                      Protection
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        isProtected
                                          ? "text-success border-success/30"
                                          : "text-warning border-warning/30"
                                      }`}
                                    >
                                      {isProtected ? "Protected" : "Not Protected"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Empty State */}
                {infraHook.paginatedVMs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Server className="w-12 h-12 mb-4 opacity-50" />
                    <p>No VMs found</p>
                  </div>
                )}

                {/* Pagination */}
                {infraHook.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((infraHook.currentPage - 1) * 9) + 1}–
                      {Math.min(infraHook.currentPage * 9, infraHook.totalCount)} of{" "}
                      {infraHook.totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={infraHook.prevPage}
                        disabled={infraHook.currentPage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm px-2" aria-live="polite" aria-atomic="true">
                        {infraHook.currentPage}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={infraHook.nextPage}
                        disabled={infraHook.currentPage === infraHook.totalPages}
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <VeeamJobDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        job={selectedJob}
      />

      <VeeamAlarmDetailDrawer
        open={alarmDrawerOpen}
        onOpenChange={setAlarmDrawerOpen}
        alarm={selectedAlarm}
      />

      <VeeamVMDetailDrawer
        open={vmDrawerOpen}
        onOpenChange={setVMDrawerOpen}
        vm={selectedVM}
      />
    </UserLayout>
  );
};

export default UserVeeam;