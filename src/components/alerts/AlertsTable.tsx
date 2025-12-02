import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import SeverityBadge, { AlertSeverity } from "./SeverityBadge";
import AlertActionMenu from "./AlertActionMenu";
import AlertDetailDrawer from "./AlertDetailDrawer";
import TableSkeleton from "@/components/loading/TableSkeleton";

export interface Alert {
  id: number;
  severity: AlertSeverity;
  host: string;
  category: string;
  problem: string;
  duration: string;
  scope?: string;
  acknowledged: boolean;
  status: "active" | "acknowledged" | "resolved";
  timestamp: string;
}

// Mock data - 8 alerts for pagination testing
const mockAlerts: Alert[] = [
  {
    id: 1,
    severity: "critical",
    host: "api-gateway-01",
    category: "Disk",
    problem: "Disk space critical - 95% full",
    duration: "5m",
    acknowledged: false,
    status: "active",  
    timestamp: "2025-11-30 14:23:00",
  },
  {
    id: 2,
    severity: "high",
    host: "prod-web-01",
    category: "CPU",
    problem: "High CPU usage detected - 92%",
    duration: "12m",
    acknowledged: false,
    status: "active", 
    timestamp: "2025-11-30 14:16:00",
  },
  {
    id: 3,
    severity: "high",
    host: "db-master-01",
    category: "Performance",
    problem: "Slow query performance detected",
    duration: "18m",
    acknowledged: true,
    status: "acknowledged",
    timestamp: "2025-11-30 14:10:00",
  },
  {
    id: 4,
    severity: "warning",
    host: "cache-redis-03",
    category: "Memory",
    problem: "Memory pressure warning - 78%",
    duration: "25m",
    acknowledged: false,
    status: "active",
    timestamp: "2025-11-30 14:03:00",
  },
  {
    id: 5,
    severity: "warning",
    host: "worker-queue-02",
    category: "Queue",
    problem: "Queue processing delay detected",
    duration: "32m",
    acknowledged: true,
    status: "acknowledged",
    timestamp: "2025-11-30 13:56:00",
  },
  {
    id: 6,
    severity: "disaster",
    host: "prod-db-master",
    category: "Database",
    problem: "Database replication lag critical - 45s",
    duration: "8m",
    acknowledged: false,
    status: "active",
    timestamp: "2025-11-30 14:20:00",
  },
  {
    id: 7,
    severity: "average",
    host: "backup-server-01",
    category: "Backup",
    problem: "Backup job completed with warnings",
    duration: "1h 15m",
    acknowledged: false,
    status: "active",
    timestamp: "2025-11-30 13:13:00",
  },
  {
    id: 8,
    severity: "info",
    host: "monitoring-agent-02",
    category: "System",
    problem: "Agent reconnected after network timeout",
    duration: "45m",
    acknowledged: true,
    status: "acknowledged",
    timestamp: "2025-11-30 13:43:00",
  },
];

interface AlertsTableProps {
  alerts?: Alert[];
  loading?: boolean;
}

const AlertsTable = ({ alerts = mockAlerts, loading = false }: AlertsTableProps) => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(alerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAlerts = alerts.slice(startIndex, endIndex);

  const handleRowClick = useCallback((alert: Alert) => {
    setSelectedAlert(alert);
    setDrawerOpen(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, alert: Alert, index: number) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        handleRowClick(alert);
        break;
      case "ArrowDown":
        e.preventDefault();
        const nextIndex = Math.min(index + 1, currentAlerts.length - 1);
        setFocusedRowIndex(nextIndex);
        break;
      case "ArrowUp":
        e.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        setFocusedRowIndex(prevIndex);
        break;
      case "Escape":
        if (drawerOpen) {
          setDrawerOpen(false);
        }
        break;
    }
  }, [currentAlerts.length, handleRowClick, drawerOpen]);

  if (loading) {
    return <TableSkeleton rows={5} columns={7} />;
  }

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="cyber-card flex flex-col items-center justify-center py-16"
      >
        <Search className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Alerts Found</h3>
        <p className="text-muted-foreground mb-4">
          No alerts match your current filter criteria
        </p>
        <Button variant="outline">Clear Filters</Button>
      </motion.div>
    );
  }

  return (
    <>
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <Table role="table" aria-label="Alerts table">
            <TableHeader>
              <TableRow>
                <TableHead role="columnheader" aria-sort="none" className="w-24">Severity</TableHead>
                <TableHead role="columnheader" className="w-32 sm:w-auto">Host</TableHead>
                <TableHead role="columnheader" className="hidden sm:table-cell">Category</TableHead>
                <TableHead role="columnheader" className="min-w-[200px]">Problem</TableHead>
                <TableHead role="columnheader" className="hidden md:table-cell">Duration</TableHead>
                <TableHead role="columnheader" className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="text-right w-20" role="columnheader">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentAlerts.map((alert, index) => (
                <motion.tr
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(alert)}
                  onKeyDown={(e) => handleKeyDown(e, alert, index)}
                  tabIndex={0}
                  role="row"
                  aria-label={`Alert ${alert.severity} on ${alert.host}: ${alert.problem}`}
                >
                  <TableCell role="cell" className="whitespace-nowrap">
                    <SeverityBadge severity={alert.severity} />
                  </TableCell>
                  <TableCell role="cell" className="whitespace-nowrap">
                    <Badge variant="outline" className="text-xs">{alert.host}</Badge>
                  </TableCell>
                  <TableCell role="cell" className="hidden sm:table-cell whitespace-nowrap">
                    <Badge variant="secondary" className="text-xs">{alert.category}</Badge>
                  </TableCell>
                  <TableCell className="font-medium min-w-[200px] sm:min-w-[250px]" role="cell">
                    <span className="line-clamp-2">{alert.problem}</span>
                  </TableCell>
                  <TableCell role="cell" className="hidden md:table-cell whitespace-nowrap">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {alert.duration}
                    </span>
                  </TableCell>
                  <TableCell role="cell" className="hidden lg:table-cell whitespace-nowrap">
                    {alert.acknowledged ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle className="w-3 h-3" aria-hidden="true" />
                        <span className="hidden xl:inline">Acknowledged</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()} role="cell">
                    <AlertActionMenu
                      alertId={alert.id}
                      acknowledged={alert.acknowledged}
                      onViewDetails={() => handleRowClick(alert)}
                    />
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, alerts.length)} of{" "}
              {alerts.length} alerts
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
      </div>

      <AlertDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        alert={selectedAlert}
      />
    </>
  );
};

export default AlertsTable;
