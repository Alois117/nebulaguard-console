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

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Alerts</h1>
            <p className="text-muted-foreground">Monitor and manage active alerts</p>
            <p className="text-muted-foreground">{mockAlerts.length} active alerts</p>
          </div>
          <Button className="bg-gradient-to-r from-success to-primary hover:opacity-90 text-background">
            <CheckCircle className="w-4 h-4 mr-2" />
            Acknowledge All
          </Button>
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
