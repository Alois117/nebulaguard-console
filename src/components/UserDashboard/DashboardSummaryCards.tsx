import { LucideIcon, Server, AlertTriangle, Shield, ShieldOff, Lightbulb, FileText, Database, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardSummary } from "@/hooks/dashboard/useUserDashboard";

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant: "primary" | "success" | "warning" | "danger" | "info" | "purple";
  onClick?: () => void;
  loading?: boolean;
}

const variantStyles = {
  primary: "from-primary/20 to-primary/5 border-primary/30 hover:border-primary/60",
  success: "from-success/20 to-success/5 border-success/30 hover:border-success/60",
  warning: "from-warning/20 to-warning/5 border-warning/30 hover:border-warning/60",
  danger: "from-destructive/20 to-destructive/5 border-destructive/30 hover:border-destructive/60",
  info: "from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-500/60",
  purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:border-purple-500/60",
};

const iconVariantStyles = {
  primary: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-destructive/20 text-destructive",
  info: "bg-blue-500/20 text-blue-500",
  purple: "bg-purple-500/20 text-purple-500",
};

const SummaryCard = ({ title, value, subtitle, icon: Icon, variant, onClick, loading }: SummaryCardProps) => {
  const clickable = typeof onClick === "function";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-5 rounded-xl border bg-gradient-to-br transition-all duration-300",
        clickable
          ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          : "cursor-default",
        "group overflow-hidden",
        variantStyles[variant]
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-muted/30 animate-pulse rounded" />
          ) : (
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          )}
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {clickable && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Click to view -&gt;
        </div>
      )}
    </div>
  );
};

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
  loading: boolean;
  basePath?: string;
  enableNavigation?: boolean;
}

const DashboardSummaryCards = ({
  summary,
  loading,
  basePath = "/dashboard",
  enableNavigation = true,
}: DashboardSummaryCardsProps) => {
  const navigate = useNavigate();

  const cards: SummaryCardProps[] = [
    {
      title: "Total Hosts",
      value: summary.totalHosts,
      subtitle: `${summary.enabledHosts} enabled`,
      icon: Server,
      variant: "primary",
      onClick: enableNavigation ? () => navigate(`${basePath}/zabbix`) : undefined,
      loading,
    },
    {
      title: "Active Alerts",
      value: summary.totalAlerts,
      subtitle: `${summary.criticalAlerts} critical`,
      icon: AlertTriangle,
      variant: summary.criticalAlerts > 0 ? "danger" : "warning",
      onClick: enableNavigation ? () => navigate(`${basePath}/zabbix`) : undefined,
      loading,
    },
    {
      title: "Total VMs",
      value: summary.totalVMs,
      subtitle: `${summary.poweredOnVMs} powered on`,
      icon: Database,
      variant: "info",
      onClick: enableNavigation ? () => navigate(`${basePath}/veeam`) : undefined,
      loading,
    },
    {
      title: "Protected VMs",
      value: summary.protectedVMs,
      subtitle: `${summary.unprotectedVMs} unprotected`,
      icon: Shield,
      variant: summary.unprotectedVMs > 0 ? "warning" : "success",
      onClick: enableNavigation ? () => navigate(`${basePath}/veeam`) : undefined,
      loading,
    },
    {
      title: "Veeam Alarms",
      value: summary.veeamAlarms,
      subtitle: `${summary.activeVeeamAlarms} active`,
      icon: ShieldOff,
      variant: summary.activeVeeamAlarms > 0 ? "danger" : "success",
      onClick: enableNavigation ? () => navigate(`${basePath}/veeam`) : undefined,
      loading,
    },
    {
      title: "AI Insights",
      value: summary.totalInsights,
      subtitle: `${summary.highPriorityInsights} high priority`,
      icon: Lightbulb,
      variant: "purple",
      onClick: enableNavigation ? () => navigate(`${basePath}/insights`) : undefined,
      loading,
    },
    {
      title: "Reports",
      value: summary.totalReports,
      subtitle: `${summary.dailyReports} daily`,
      icon: FileText,
      variant: "info",
      onClick: enableNavigation ? () => navigate(`${basePath}/reports`) : undefined,
      loading,
    },
    {
      title: "System Health",
      value: summary.unprotectedVMs === 0 && summary.criticalAlerts === 0 ? "Healthy" : "Issues",
      subtitle:
        summary.acknowledgedAlerts > 0
          ? `${summary.acknowledgedAlerts} acknowledged`
          : "All systems monitored",
      icon: Activity,
      variant: summary.unprotectedVMs === 0 && summary.criticalAlerts === 0 ? "success" : "warning",
      onClick: enableNavigation ? () => navigate(`${basePath}/zabbix`) : undefined,
      loading,
    },
  ];

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-4 gap-3 sm:gap-4 3xl:gap-6">
      {cards.map((card) => (
        <SummaryCard key={card.title} {...card} />
      ))}
    </div>
  );
};

export default DashboardSummaryCards;
