import { useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CheckCircle } from "lucide-react";
import AlertsTable, { Alert } from "@/components/alerts/AlertsTable";
import AlertFilters from "@/components/alerts/AlertFilters";
import { AlertSeverity } from "@/components/alerts/SeverityBadge";

const mockAlerts: Alert[] = [
  {
    id: 1,
    severity: "critical",
    host: "api-gateway-01",
    category: "Performance",
    scope: "Production",
    problem: "Disk space critical - 95% full",
    duration: "5m",
    acknowledged: false,  
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
    acknowledged: false,  
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
    acknowledged: true,   
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
    acknowledged: false,  
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
    acknowledged: true,   
    status: "acknowledged",
    timestamp: "2024-01-15 13:58:15"
  },
  {
    id: 6,
    severity: "disaster",
    host: "prod-db-master",
    category: "Database",
    scope: "Production",
    problem: "Database replication lag critical - 45s",
    duration: "8m",
    acknowledged: false,
    status: "active",
    timestamp: "2024-01-15 14:20:00"
  },
  {
    id: 7,
    severity: "average",
    host: "backup-server-01",
    category: "Backup",
    scope: "Production",
    problem: "Backup job completed with warnings",
    duration: "1h 15m",
    acknowledged: false,
    status: "active",
    timestamp: "2024-01-15 13:13:00"
  },
  {
    id: 8,
    severity: "info",
    host: "monitoring-agent-02",
    category: "System",
    scope: "Staging",
    problem: "Agent reconnected after network timeout",
    duration: "45m",
    acknowledged: true,
    status: "acknowledged",
    timestamp: "2024-01-15 13:43:00"
  },
];

const UserAlerts = () => {
  const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>([
    "critical",
    "high",
    "warning",
    "info",
  ]);
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate counts from mock data
  const criticalCount = mockAlerts.filter(a => a.severity === "critical" || a.severity === "disaster").length;
  const highCount = mockAlerts.filter(a => a.severity === "high").length;
  const warningCount = mockAlerts.filter(a => a.severity === "warning").length;
  const acknowledgedCount = mockAlerts.filter(a => a.acknowledged).length;

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

        {/* Top Summary Cards */}
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

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <AlertFilters
            selectedSeverities={selectedSeverities}
            onSeverityChange={setSelectedSeverities}
            showAcknowledged={showAcknowledged}
            onShowAcknowledgedChange={setShowAcknowledged}
          />
        </div>

        {/* Alerts Table */}
        <AlertsTable />
      </div>
        
    </UserLayout>
  );
};

export default UserAlerts;
