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

// Dummy data for Alarms tab
const dummyAlarms = [
  { id: 1, name: "Backup Repository Low Space", severity: "warning", entity: "Backup Repository 01", time: "5 min ago", status: "Active" },
  { id: 2, name: "Job Failed - Critical VM", severity: "critical", entity: "DC-PROD-01", time: "15 min ago", status: "Active" },
  { id: 3, name: "Replication RPO Exceeded", severity: "warning", entity: "APP-SERVER-02", time: "1 hour ago", status: "Acknowledged" },
  { id: 4, name: "Configuration Backup Missing", severity: "info", entity: "Veeam Server", time: "2 hours ago", status: "Resolved" },
];

// Dummy data for Infrastructure tab
const dummyInfrastructure = [
  { id: 1, name: "vCenter-Prod", type: "VMware vCenter", hosts: 12, vms: 156, status: "Connected" },
  { id: 2, name: "ESXi-Cluster-01", type: "ESXi Cluster", hosts: 4, vms: 45, status: "Connected" },
  { id: 3, name: "Backup-Repo-Primary", type: "Repository", hosts: 1, vms: 0, status: "Online", capacity: "8.5 TB / 12 TB" },
  { id: 4, name: "Backup-Repo-Archive", type: "Repository", hosts: 1, vms: 0, status: "Online", capacity: "15.2 TB / 20 TB" },
  { id: 5, name: "Proxy-01", type: "Backup Proxy", hosts: 1, vms: 0, status: "Available" },
];

const UserVeeam = () => {
  const [activeTab, setActiveTab] = useState("backup");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<TransformedVeeamJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const { jobs, loading, counts, isConnected, lastUpdated } = useVeeamBackupAndReplication();

  // Filter jobs based on search
  const filteredJobs = jobs.filter((job) => {
    const search = searchQuery.toLowerCase();
    return (
      (job.vmName || "").toLowerCase().includes(search) ||
      (job.jobName || "").toLowerCase().includes(search) ||
      (job.esxiHost || "").toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Keep current page in valid range
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

        {/* Tabs */}
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
            {/* Status Bar */}
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

              {/* Summary badges */}
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

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search VMs, jobs, hosts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
                        <TableHead>Data Transferred</TableHead>
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
                            <TableCell>{formatBytes(job.dataTransferredBytes)}</TableCell>
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

          {/* Alarms Tab (Dummy Data) */}
          <TabsContent value="alarms" className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Placeholder Data</Badge>
            </div>

            <div className="space-y-4">
              {dummyAlarms.map((alarm, index) => (
                <Card
                  key={alarm.id}
                  className="p-4 hover:border-primary/30 transition-all cursor-pointer"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle
                        className={`w-5 h-5 mt-0.5 ${
                          alarm.severity === "critical"
                            ? "text-destructive"
                            : alarm.severity === "warning"
                            ? "text-warning"
                            : "text-muted-foreground"
                        }`}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{alarm.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Server className="w-3 h-3" />
                          <span>{alarm.entity}</span>
                          <span>•</span>
                          <span>{alarm.time}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={alarm.status === "Active" ? "destructive" : "secondary"}>
                      {alarm.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Infrastructure Tab (Dummy Data) */}
          <TabsContent value="infrastructure" className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Placeholder Data</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dummyInfrastructure.map((item, index) => (
                <Card
                  key={item.id}
                  className="p-4 hover:border-primary/30 transition-all cursor-pointer"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        {item.capacity ? (
                          <span className="text-muted-foreground">{item.capacity}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {item.hosts} hosts • {item.vms} VMs
                          </span>
                        )}
                        <Badge variant="outline" className="text-success border-success/30">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Drawer */}
      <VeeamJobDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        job={selectedJob}
      />
    </UserLayout>
  );
};

export default UserVeeam;