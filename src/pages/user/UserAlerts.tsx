import { useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import AlertsTable, { Alert } from "@/components/alerts/AlertsTable";
import AlertDetailDrawer from "@/components/alerts/AlertDetailDrawer";
import AlertFilters, { AlertFiltersState } from "@/components/alerts/AlertFilters";

const mockAlerts: Alert[] = [
  {
    id: 1,
    severity: "critical",
    host: "api-gateway-01",
    category: "Performance",
    scope: "Production",
    problem: "Disk space critical - 95% full",
    duration: "5m",
    status: "active",
    timestamp: "2024-01-15 14:23:45"
  },
  {
    id: 2,
    severity: "high",
    host: "prod-web-01",
    category: "System",
    scope: "Production",
    problem: "High CPU usage detected - 92%",
    duration: "12m",
    status: "active",
    timestamp: "2024-01-15 14:18:22"
  },
  {
    id: 3,
    severity: "high",
    host: "db-master-01",
    category: "Database",
    scope: "Production",
    problem: "Slow query performance detected",
    duration: "18m",
    status: "acknowledged",
    timestamp: "2024-01-15 14:12:10"
  },
  {
    id: 4,
    severity: "warning",
    host: "cache-redis-03",
    category: "Memory",
    scope: "Staging",
    problem: "Memory pressure warning - 78%",
    duration: "25m",
    status: "active",
    timestamp: "2024-01-15 14:05:33"
  },
  {
    id: 5,
    severity: "warning",
    host: "worker-queue-02",
    category: "Queue",
    scope: "Production",
    problem: "Queue processing delay detected",
    duration: "32m",
    status: "acknowledged",
    timestamp: "2024-01-15 13:58:15"
  },
];

const UserAlerts = () => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AlertFiltersState>({
    searchQuery: "",
    severities: [],
    hosts: [],
    timeRange: "24h"
  });

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsDrawerOpen(true);
  };

  const handleAcknowledge = (id: number) => {
    console.log("Acknowledge alert:", id);
  };

  const criticalCount = mockAlerts.filter(a => a.severity === "critical" || a.severity === "disaster").length;
  const highCount = mockAlerts.filter(a => a.severity === "high").length;
  const warningCount = mockAlerts.filter(a => a.severity === "warning").length;
  const acknowledgedCount = mockAlerts.filter(a => a.status === "acknowledged").length;

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Alerts</h1>
            <p className="text-muted-foreground">{mockAlerts.length} active alerts</p>
          </div>
          <Button className="bg-gradient-to-r from-success to-primary hover:opacity-90 text-background">
            <CheckCircle className="w-4 h-4 mr-2" />
            Acknowledge All
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="cyber-card border-destructive/30 bg-gradient-to-br from-destructive/20 to-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical</p>
                <p className="text-3xl font-bold">{criticalCount}</p>
              </div>
            </div>
          </div>

          <div className="cyber-card border-accent/30 bg-gradient-to-br from-accent/20 to-accent/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">High</p>
                <p className="text-3xl font-bold">{highCount}</p>
              </div>
            </div>
          </div>

          <div className="cyber-card border-warning/30 bg-gradient-to-br from-warning/20 to-warning/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Warning</p>
                <p className="text-3xl font-bold">{warningCount}</p>
              </div>
            </div>
          </div>

          <div className="cyber-card border-success/30 bg-gradient-to-br from-success/20 to-success/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Acknowledged</p>
                <p className="text-3xl font-bold">{acknowledgedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <AlertFilters filters={filters} onFiltersChange={setFilters} />

        {/* Alerts Table */}
        <AlertsTable
          alerts={mockAlerts}
          onAlertClick={handleAlertClick}
          onAcknowledge={handleAcknowledge}
          currentPage={currentPage}
          totalPages={3}
          onPageChange={setCurrentPage}
        />

        {/* Alert Detail Drawer */}
        <AlertDetailDrawer
          alert={selectedAlert}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onAcknowledge={handleAcknowledge}
        />
      </div>
    </UserLayout>
  );
};

export default UserAlerts;
