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

  // Mock counts for summary cards
  const criticalCount = 1;
  const highCount = 2;
  const warningCount = 2;
  const acknowledgedCount = 2;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Alerts</h1>
            <p className="text-muted-foreground">5 active alerts</p>
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
