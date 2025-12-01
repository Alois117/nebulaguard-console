import { AlertTriangle, X, AlertCircle, Info, CheckCircle } from "lucide-react";

export type Severity = "disaster" | "critical" | "high" | "warning" | "average" | "info";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const getSeverityConfig = (severity: Severity) => {
  switch (severity) {
    case "disaster":
      return {
        icon: X,
        bg: "bg-destructive/20",
        text: "text-destructive",
        border: "border-destructive/30",
        label: "DISASTER"
      };
    case "critical":
      return {
        icon: X,
        bg: "bg-destructive/20",
        text: "text-destructive",
        border: "border-destructive/30",
        label: "CRITICAL"
      };
    case "high":
      return {
        icon: AlertTriangle,
        bg: "bg-accent/20",
        text: "text-accent",
        border: "border-accent/30",
        label: "HIGH"
      };
    case "warning":
      return {
        icon: AlertCircle,
        bg: "bg-warning/20",
        text: "text-warning",
        border: "border-warning/30",
        label: "WARNING"
      };
    case "average":
      return {
        icon: Info,
        bg: "bg-secondary/20",
        text: "text-secondary",
        border: "border-secondary/30",
        label: "AVERAGE"
      };
    case "info":
      return {
        icon: CheckCircle,
        bg: "bg-primary/20",
        text: "text-primary",
        border: "border-primary/30",
        label: "INFO"
      };
    default:
      return {
        icon: Info,
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-muted",
        label: "UNKNOWN"
      };
  }
};

const SeverityBadge = ({ severity, className = "" }: SeverityBadgeProps) => {
  const config = getSeverityConfig(severity);
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center ${config.text}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
};

export default SeverityBadge;
