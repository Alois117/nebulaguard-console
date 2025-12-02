import { useState } from "react";
import { CheckCircle } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import AlertsTable from "@/components/alerts/AlertsTable";
import AlertFilters from "@/components/alerts/AlertFilters";
import { AlertSeverity } from "@/components/alerts/SeverityBadge";

const Alerts = () => {
  const [selectedSeverities, setSelectedSeverities] = useState<AlertSeverity[]>([
    "disaster",
    "critical",
    "high",
    "warning",
    "average",
    "info",
  ]);
  const [showAcknowledged, setShowAcknowledged] = useState(true);

  const handleAcknowledgeAll = () => {
    console.log("Acknowledge all alerts");
    // TODO: Implement acknowledge all logic
  };

  // Mock alerts data (same as AlertsTable)
  const alertsData = [
    { id: 1, severity: "critical", acknowledged: false },
    { id: 2, severity: "high", acknowledged: false },
    { id: 3, severity: "high", acknowledged: true },
    { id: 4, severity: "warning", acknowledged: false },
    { id: 5, severity: "warning", acknowledged: true },
    { id: 6, severity: "disaster", acknowledged: false },
    { id: 7, severity: "average", acknowledged: false },
    { id: 8, severity: "info", acknowledged: true },
  ];

  // Calculate counts dynamically
  const criticalCount = alertsData.filter(a => a.severity === "critical" || a.severity === "disaster").length;
  const highCount = alertsData.filter(a => a.severity === "high").length;
  const warningCount = alertsData.filter(a => a.severity === "warning").length;
  const acknowledgedCount = alertsData.filter(a => a.acknowledged).length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Alerts</h1>
            <p className="text-muted-foreground">{alertsData.length} active alerts</p>
          </div>
          <Button 
            onClick={handleAcknowledgeAll}
            className="bg-gradient-to-r from-success to-primary hover:opacity-90 text-background"
          >
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

        {/* Filters */}
        <AlertFilters 
          selectedSeverities={selectedSeverities}
          onSeverityChange={setSelectedSeverities}
          showAcknowledged={showAcknowledged}
          onShowAcknowledgedChange={setShowAcknowledged}
        />

        {/* Alerts Table - uses internal mock data and drawer */}
        <AlertsTable />
      </div>
    </AppLayout>
  );
};

export default Alerts;
