import { X, Server, Clock, ExternalLink, CheckCircle, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SeverityBadge, { Severity } from "./SeverityBadge";
import { Alert } from "./AlertsTable";

interface AlertDetailDrawerProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge?: (id: number) => void;
}

const AlertDetailDrawer = ({ alert, isOpen, onClose, onAcknowledge }: AlertDetailDrawerProps) => {
  if (!alert) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SeverityBadge severity={alert.severity} />
              <SheetTitle className="text-2xl mt-4">{alert.problem}</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Server className="w-4 h-4" />
              <span className="font-medium">{alert.host}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Duration: {alert.duration}</span>
            </div>
            {alert.status === "acknowledged" && (
              <Badge variant="outline" className="border-success/50 text-success gap-1">
                <CheckCircle className="w-3 h-3" />
                Acknowledged
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Raw Event Metadata */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              Event Metadata
            </h3>
            <div className="glass-card rounded-lg p-4 space-y-2 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Alert ID:</span>
                <span className="font-semibold">#{alert.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Host:</span>
                <span className="font-semibold">{alert.host}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Severity:</span>
                <span className="font-semibold capitalize">{alert.severity}</span>
              </div>
              {alert.category && (
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-semibold">{alert.category}</span>
                </div>
              )}
              {alert.scope && (
                <div className="flex justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Scope:</span>
                  <span className="font-semibold">{alert.scope}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="font-semibold">{alert.timestamp}</span>
              </div>
            </div>
          </section>

          {/* AI Insights Block (Placeholder) */}
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              AI Root Cause Analysis
            </h3>
            <div className="glass-card rounded-lg p-4 border-2 border-accent/30">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-background" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Analysis Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    AI analysis will appear here. This is a placeholder for the AI-generated
                    root cause analysis, recommendations, and suggested remediation steps.
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  ✓ Analysis complete • Confidence: 87% • Generated 2m ago
                </p>
              </div>
            </div>
          </section>

          {/* Throttle/Dedupe Status (Placeholder) */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Throttle & Deduplication</h3>
            <div className="glass-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dedupe Key:</span>
                <code className="text-xs bg-surface px-2 py-1 rounded font-mono">
                  {alert.host.replace(/\./g, "-")}-{alert.severity}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sent:</span>
                <span className="text-sm font-medium">{alert.timestamp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Throttled:</span>
                <Badge variant="outline">No</Badge>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <section className="flex gap-3 pt-4">
            {alert.status !== "acknowledged" && (
              <Button
                onClick={() => onAcknowledge?.(alert.id)}
                className="flex-1 bg-gradient-to-r from-success to-primary hover:opacity-90"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Acknowledge Alert
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Zabbix
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AlertDetailDrawer;
