import { useMemo } from "react";
import { DashboardContentView } from "@/components/monitoring";
import type {
  DashboardChartData,
  DashboardSummary,
  CriticalIssue,
} from "@/hooks/dashboard/useUserDashboard";
import type {
  GlobalAlertItem,
  GlobalInsightItem,
  GlobalMetricSummary,
  GlobalVeeamDrilldownData,
} from "@/hooks/super-admin/organizations/useGlobalInfrastructureMetrics";
import { getVeeamVmStatusCounts } from "@/hooks/super-admin/shared-ui/veeamVmStatus";
import { extractAlertHost } from "@/lib/alertPresentation";

interface SuperAdminMonitoringOverviewProps {
  loading: boolean;
  error: string | null;
  summary: GlobalMetricSummary;
  alerts: GlobalAlertItem[];
  insights: GlobalInsightItem[];
  veeamDrilldownData: GlobalVeeamDrilldownData;
  isConnected: boolean;
  lastUpdated: Date | null;
  onOpenZabbix: (options?: { tab?: "alerts" | "hosts"; host?: string }) => void;
  onOpenVeeam: (section?: "backup" | "infrastructure" | "alarms") => void;
  onOpenInsights: () => void;
}

const severityRank: Record<string, number> = {
  info: 0,
  average: 1,
  warning: 2,
  high: 3,
  critical: 4,
  disaster: 5,
};

const normalizeSeverity = (value: string) => {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("disaster")) return "disaster";
  if (raw.includes("critical")) return "critical";
  if (raw.includes("high")) return "high";
  if (raw.includes("warning")) return "warning";
  if (raw.includes("average")) return "average";
  return "info";
};

const getRelativeDuration = (timestamp: Date) => {
  const diffMs = Math.max(0, Date.now() - timestamp.getTime());
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

const normalizeHostLabel = (alert: GlobalAlertItem): string => {
  const normalizedHost = extractAlertHost({
    directHost: String(alert.host ?? ""),
    content: String(alert.message ?? ""),
    dedupeKey: String(alert.dedupe_key ?? ""),
  });

  return normalizedHost && normalizedHost !== "unknown-host"
    ? normalizedHost
    : "Unknown host";
};

const SuperAdminMonitoringOverview = ({
  loading,
  error,
  summary,
  alerts,
  insights,
  veeamDrilldownData,
  isConnected,
  lastUpdated,
  onOpenZabbix,
  onOpenVeeam,
  onOpenInsights,
}: SuperAdminMonitoringOverviewProps) => {
  const veeamVmStatus = useMemo(
    () => getVeeamVmStatusCounts(veeamDrilldownData.infraVMs),
    [veeamDrilldownData.infraVMs]
  );

  const hasOverviewData = useMemo(
    () =>
      alerts.length > 0 ||
      insights.length > 0 ||
      veeamDrilldownData.infraVMs.length > 0 ||
      veeamDrilldownData.alarmItems.length > 0 ||
      summary.alerts.total > 0 ||
      summary.hosts.total > 0 ||
      summary.reports.total > 0,
    [alerts, insights, veeamDrilldownData, summary]
  );
  const displayLoading = loading && !hasOverviewData;

  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const alarmItems = veeamDrilldownData.alarmItems;

    const highPriorityInsights = insights.filter((insight) => {
      const level = normalizeSeverity(insight.severity ?? "");
      return level === "critical" || level === "high";
    }).length;

    const recentInsights = insights.filter(
      (insight) => Date.now() - insight.timestamp.getTime() <= 24 * 60 * 60 * 1000
    ).length;

    const warningAlerts = alerts.filter((alert) => normalizeSeverity(alert.severity) === "warning").length;
    const highAlerts = alerts.filter((alert) => {
      const level = normalizeSeverity(alert.severity);
      return level === "high" || level === "critical";
    }).length;

    const activeVeeamAlarms = alarmItems.filter(
      (alarm) => String(alarm.status).toLowerCase() === "active"
    ).length;

    const resolvedVeeamAlarms = alarmItems.filter(
      (alarm) => String(alarm.status).toLowerCase() === "resolved"
    ).length;

    return {
      totalHosts: summary.hosts.total,
      enabledHosts: summary.hosts.enabled,
      disabledHosts: summary.hosts.disabled,
      totalAlerts: summary.alerts.total,
      criticalAlerts: summary.alerts.critical,
      highAlerts,
      warningAlerts,
      acknowledgedAlerts: alerts.filter((alert) => Boolean(alert.acknowledged)).length,
      totalVMs: veeamVmStatus.total,
      protectedVMs: veeamVmStatus.protected,
      unprotectedVMs: veeamVmStatus.unprotected,
      poweredOnVMs: veeamVmStatus.poweredOn,
      veeamAlarms: alarmItems.length,
      activeVeeamAlarms,
      resolvedVeeamAlarms,
      totalInsights: summary.insights.total,
      highPriorityInsights,
      recentInsights,
      predictionsCount: summary.insights.predictions,
      anomaliesCount: summary.insights.anomalies,
      totalReports: summary.reports.total,
      dailyReports: summary.reports.daily,
      weeklyReports: summary.reports.weekly,
      monthlyReports: summary.reports.monthly,
    };
  }, [summary, alerts, insights, veeamDrilldownData.alarmItems, veeamVmStatus]);

  const chartData = useMemo<DashboardChartData>(() => {
    const severityDistribution: DashboardChartData["severityDistribution"] = [
      {
        severity: "Info",
        count: alerts.filter((alert) => normalizeSeverity(alert.severity) === "info").length,
        color: "hsl(var(--muted-foreground))",
      },
      {
        severity: "Warning",
        count: alerts.filter((alert) => normalizeSeverity(alert.severity) === "warning").length,
        color: "hsl(var(--warning))",
      },
      {
        severity: "Average",
        count: alerts.filter((alert) => normalizeSeverity(alert.severity) === "average").length,
        color: "hsl(var(--accent))",
      },
      {
        severity: "High",
        count: alerts.filter((alert) => {
          const level = normalizeSeverity(alert.severity);
          return level === "high" || level === "critical";
        }).length,
        color: "hsl(var(--destructive))",
      },
      {
        severity: "Disaster",
        count: alerts.filter((alert) => normalizeSeverity(alert.severity) === "disaster").length,
        color: "hsl(var(--destructive))",
      },
    ];

    const labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "Now"];
    const buckets: Record<string, { total: number; critical: number; warning: number }> = {};
    labels.forEach((label) => {
      buckets[label] = { total: 0, critical: 0, warning: 0 };
    });

    alerts.forEach((alert) => {
      const ts = alert.timestamp.getTime();
      const hoursAgo = Math.floor((Date.now() - ts) / (1000 * 60 * 60));

      let bucket = "Now";
      if (hoursAgo >= 20) bucket = "00:00";
      else if (hoursAgo >= 16) bucket = "04:00";
      else if (hoursAgo >= 12) bucket = "08:00";
      else if (hoursAgo >= 8) bucket = "12:00";
      else if (hoursAgo >= 4) bucket = "16:00";
      else if (hoursAgo >= 1) bucket = "20:00";

      buckets[bucket].total += 1;

      const level = normalizeSeverity(alert.severity);
      if (level === "critical" || level === "disaster" || level === "high") {
        buckets[bucket].critical += 1;
      }
      if (level === "warning") {
        buckets[bucket].warning += 1;
      }
    });

    const alertsTimeline: DashboardChartData["alertsTimeline"] = labels.map((time) => ({
      time,
      total: buckets[time].total,
      critical: buckets[time].critical,
      warning: buckets[time].warning,
    }));

    const hostMap = new Map<string, { count: number; maxSeverity: string }>();

    alerts.forEach((alert) => {
      const host = normalizeHostLabel(alert);
      const level = normalizeSeverity(alert.severity);
      const existing = hostMap.get(host);

      if (!existing) {
        hostMap.set(host, { count: 1, maxSeverity: level });
        return;
      }

      existing.count += 1;
      if ((severityRank[level] ?? 0) > (severityRank[existing.maxSeverity] ?? 0)) {
        existing.maxSeverity = level;
      }
    });

    const topNoisyHosts: DashboardChartData["topNoisyHosts"] = Array.from(hostMap.entries())
      .map(([host, data]) => ({
        host,
        count: data.count,
        severity: (
          data.maxSeverity === "critical" || data.maxSeverity === "disaster"
            ? "critical"
            : data.maxSeverity === "high"
            ? "high"
            : data.maxSeverity === "warning"
            ? "warning"
            : "average"
        ) as "critical" | "high" | "warning" | "average",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const veeamStatus: DashboardChartData["veeamStatus"] = [
      {
        status: "Protected",
        count: veeamVmStatus.protected,
        color: "hsl(var(--success))",
      },
      {
        status: "Unprotected",
        count: veeamVmStatus.unprotected,
        color: "hsl(var(--destructive))",
      },
      {
        status: "Powered On",
        count: veeamVmStatus.poweredOn,
        color: "hsl(var(--primary))",
      },
      {
        status: "Powered Off",
        count: veeamVmStatus.poweredOff,
        color: "hsl(var(--muted-foreground))",
      },
    ];

    return {
      severityDistribution,
      alertsTimeline,
      topNoisyHosts,
      veeamStatus,
    };
  }, [alerts, veeamVmStatus]);

  const criticalIssues = useMemo<CriticalIssue[]>(() => {
    const zabbixIssues: CriticalIssue[] = alerts
      .filter((alert) => {
        const level = normalizeSeverity(alert.severity);
        return level === "disaster" || level === "critical" || level === "high";
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 4)
      .map((alert) => ({
        id: String(alert.id),
        host: normalizeHostLabel(alert),
        problem: alert.title,
        severity: normalizeSeverity(alert.severity) as CriticalIssue["severity"],
        duration: getRelativeDuration(alert.timestamp),
        acknowledged: Boolean(alert.acknowledged),
        source: "zabbix",
      }));

    const veeamIssues: CriticalIssue[] = veeamDrilldownData.alarmItems
      .filter((alarm) => {
        const status = String(alarm.status).toLowerCase();
        const severity = normalizeSeverity(alarm.severity);
        return status === "active" && (severity === "critical" || severity === "high");
      })
      .slice(0, 2)
      .map((alarm) => {
        const timestamp = new Date(alarm.triggered_at || alarm.last_seen || new Date().toISOString());
        return {
          id: alarm.alarm_id,
          host: alarm.entity_name,
          problem: alarm.description || alarm.name,
          severity: normalizeSeverity(alarm.severity) === "critical" ? "critical" : "high",
          duration: getRelativeDuration(timestamp),
          acknowledged: String(alarm.status).toLowerCase() === "acknowledged",
          source: "veeam" as const,
        };
      });

    return [...zabbixIssues, ...veeamIssues].slice(0, 5);
  }, [alerts, veeamDrilldownData]);

  return (
    <DashboardContentView
      basePath="/super-admin/organizations"
      summary={dashboardSummary}
      chartData={chartData}
      criticalIssues={criticalIssues}
      loading={displayLoading}
      error={error}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
      showHeader={false}
      showSummaryCards={false}
      enableNavigation
      onOpenZabbix={() => onOpenZabbix({ tab: "alerts" })}
      onOpenVeeam={() => onOpenVeeam("infrastructure")}
      onOpenInsights={onOpenInsights}
      onTopHostClick={(host) => onOpenZabbix({ tab: "hosts", host })}
      onCriticalIssueClick={(issue) => {
        if (issue.source === "veeam") {
          onOpenVeeam("alarms");
          return;
        }
        onOpenZabbix({ tab: "alerts", host: issue.host });
      }}
    />
  );
};

export default SuperAdminMonitoringOverview;
