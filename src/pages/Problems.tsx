import { AlertTriangle, X, CheckCircle, Clock } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

const mockProblems = [
  {
    id: 1,
    severity: "critical",
    host: "api-gateway-01",
    issue: "Disk space critical - 95% full",
    duration: "5m",
    acknowledged: false
  },
  {
    id: 2,
    severity: "high",
    host: "prod-web-01",
    issue: "High CPU usage detected - 92%",
    duration: "12m",
    acknowledged: false
  },
  {
    id: 3,
    severity: "high",
    host: "db-master-01",
    issue: "Slow query performance detected",
    duration: "18m",
    acknowledged: true
  },
  {
    id: 4,
    severity: "warning",
    host: "cache-redis-03",
    issue: "Memory pressure warning - 78%",
    duration: "25m",
    acknowledged: false
  },
  {
    id: 5,
    severity: "warning",
    host: "worker-queue-02",
    issue: "Queue processing delay detected",
    duration: "32m",
    acknowledged: true
  },
];

const Problems = () => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return { bg: "bg-destructive/20", text: "text-destructive", border: "border-destructive/30" };
      case "high": return { bg: "bg-accent/20", text: "text-accent", border: "border-accent/30" };
      case "warning": return { bg: "bg-warning/20", text: "text-warning", border: "border-warning/30" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted" };
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <X className="w-5 h-5" />;
      case "high": return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Problems</h1>
            <p className="text-muted-foreground">{mockProblems.length} active issues</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              Filter
            </Button>
            <Button className="bg-gradient-to-r from-success to-primary hover:opacity-90 text-background">
              Acknowledge All
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="cyber-card border-destructive/30 bg-gradient-to-br from-destructive/20 to-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical</p>
                <p className="text-3xl font-bold">1</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                <X className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="cyber-card border-accent/30 bg-gradient-to-br from-accent/20 to-accent/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">High</p>
                <p className="text-3xl font-bold">2</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>

          <div className="cyber-card border-warning/30 bg-gradient-to-br from-warning/20 to-warning/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Warning</p>
                <p className="text-3xl font-bold">2</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="cyber-card border-success/30 bg-gradient-to-br from-success/20 to-success/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Acknowledged</p>
                <p className="text-3xl font-bold">2</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Problems List */}
        <div className="space-y-3">
          {mockProblems.map((problem, index) => {
            const colors = getSeverityColor(problem.severity);
            return (
              <div
                key={problem.id}
                className={`cyber-card border ${colors.border} ${problem.acknowledged ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Icon */}
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 ${colors.text}`}>
                    {getSeverityIcon(problem.severity)}
                  </div>

                  {/* Problem Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {problem.severity.toUpperCase()}
                      </span>
                      <span className="font-bold">{problem.host}</span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {problem.duration}
                      </span>
                      {problem.acknowledged && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="w-3 h-3" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground">{problem.issue}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {!problem.acknowledged && (
                      <Button size="sm" variant="outline" className="hover:border-success hover:text-success">
                        Acknowledge
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Problems;
