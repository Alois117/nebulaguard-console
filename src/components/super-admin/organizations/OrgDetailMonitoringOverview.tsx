/**
 * Organization Explorer – Monitoring Overview
 * Renders the shared DashboardContentView for a single organization,
 * shown when no drilldown card is selected.
 * Maps org-specific data (alerts + insights + veeam counts) to the shared UI shape.
 */
import { useMemo } from "react";
import { DashboardContentView } from "@/components/monitoring";
import type {
  DashboardChartData,
  DashboardSummary,
  CriticalIssue,
} from "@/hooks/dashboard/useUserDashboard";
import type { OrganizationDetailMetrics } from "@/hooks/super-admin/organizations/types";
import type {
  AlertItem,
  InsightItem,
} from "@/hooks/super-admin/organizations/useOrganizationDetails";
import { useOrganizationVeeamMetrics } from "@/hooks/super-admin/organizations/useOrganizationVeeamMetrics";
import { getVeeamVmStatusCounts } from "@/hooks/super-admin/shared-ui/veeamVmStatus";
import { extractAlertHost } from "@/lib/alertPresentation";

interface OrgDetailMonitoringOverviewProps {
  metrics: OrganizationDetailMetrics;
  clientId: number | null;
  alerts: AlertItem[];
  alertsLoading: boolean;
  alertsError: string | null;
  alertsLastUpdated: Date | null;
  insights: InsightItem[];
  insightsLoading: boolean;
  insightsError: string | null;
  insightsLastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  metricsLastUpdated: Date | null;
  onOpenZabbix: (options?: { tab?: "alerts" | "hosts"; host?: string }) => void;
  onOpenVeeam: () => void;
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
  return `${Math.floor(diffHours / 24)}d`;
};

const toValidDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const normalizeHostLabel = (alert: AlertItem): string => {
  const normalizedHost = extractAlertHost({
    directHost: String(alert.host ?? ""),
    content: String(alert.message ?? ""),
    dedupeKey: String(alert.dedupe_key ?? ""),
  });

  return normalizedHost && normalizedHost !== "unknown-host"
    ? normalizedHost
    : "Unknown host";
};

const OrgDetailMonitoringOverview = ({
  metrics,
  clientId,
  alerts,
  alertsLoading,
  alertsError,
  alertsLastUpdated,
  insights,
  insightsLoading,
  insightsError,
  insightsLastUpdated,
  loading,
  error,
  metricsLastUpdated,
  onOpenZabbix,
  onOpenVeeam,
  onOpenInsights,
}: OrgDetailMonitoringOverviewProps) => {
  const m = metrics;

  const {
    infraVMs,
    alarmItems: veeamAlarmItems,
    loading: veeamLoading,
    error: veeamError,
    lastUpdated: veeamLastUpdated,
  } = useOrganizationVeeamMetrics({
    clientId,
    enabled: clientId != null,
  });
  const veeamVmStatus = useMemo(() => getVeeamVmStatusCounts(infraVMs), [infraVMs]);
  const hasOverviewData = useMemo(
    () =>
      alerts.length > 0 ||
      insights.length > 0 ||
      infraVMs.length > 0 ||
      veeamAlarmItems.length > 0 ||
      m.alerts.total > 0 ||
      m.hosts.total > 0 ||
      m.reports.total > 0,
    [alerts, insights, infraVMs, veeamAlarmItems, m]
  );

  const combinedError = error ?? alertsError ?? insightsError ?? veeamError ?? null;
  const latestUpdate = useMemo(() => {
    const dates = [
      metricsLastUpdated,
      alertsLastUpdated,
      insightsLastUpdated,
      veeamLastUpdated,
    ]
      .map((value) => toValidDate(value))
      .filter((value): value is Date => value !== null);

    if (dates.length === 0) return null;
    return dates.reduce((latest, current) =>
      latest.getTime() > current.getTime() ? latest : current
    );
  }, [metricsLastUpdated, alertsLastUpdated, insightsLastUpdated, veeamLastUpdated]);

  const summary = useMemo<DashboardSummary>(() => {
    const warningAlerts = alerts.filter(
      (a) => normalizeSeverity(a.severity) === "warning"
    ).length;
    const highAlerts = alerts.filter((a) => {
      const l = normalizeSeverity(a.severity);
      return l === "high" || l === "critical";
    }).length;

    const highPriorityInsights = insights.filter((insight) => {
      const level = normalizeSeverity(insight.severity ?? "");
      return level === "critical" || level === "high";
    }).length;

    const recentInsights = insights.filter((insight) => {
      const ts = toValidDate(insight.timestamp);
      if (!ts) return false;
      return Date.now() - ts.getTime() <= 24 * 60 * 60 * 1000;
    }).length;

    const predictionsCount = insights.length
      ? insights.filter((insight) =>
          String(insight.type ?? "")
            .toLowerCase()
            .includes("predict")
        ).length
      : m.insights.predictions;

    const anomaliesCount = insights.length
      ? insights.filter((insight) =>
          String(insight.type ?? "")
            .toLowerCase()
            .includes("anomal")
        ).length
      : m.insights.anomalies;

    const totalInsights = insights.length > 0 ? insights.length : m.insights.total;

    const activeVeeamAlarms = veeamAlarmItems.filter(
      (alarm) => String(alarm.status).toLowerCase() === "active"
    ).length;
    const resolvedVeeamAlarms = veeamAlarmItems.filter(
      (alarm) => String(alarm.status).toLowerCase() === "resolved"
    ).length;

    return {
      totalHosts: m.hosts.total,
      enabledHosts: m.hosts.enabled,
      disabledHosts: m.hosts.disabled,
      totalAlerts: m.alerts.total,
      criticalAlerts: m.alerts.critical,
      highAlerts,
      warningAlerts,
      acknowledgedAlerts: alerts.filter((a) => Boolean(a.acknowledged)).length,
      totalVMs: veeamVmStatus.total,
      protectedVMs: veeamVmStatus.protected,
      unprotectedVMs: veeamVmStatus.unprotected,
      poweredOnVMs: veeamVmStatus.poweredOn,
      veeamAlarms: veeamAlarmItems.length,
      activeVeeamAlarms,
      resolvedVeeamAlarms,
      totalInsights,
      highPriorityInsights,
      recentInsights,
      predictionsCount,
      anomaliesCount,
      totalReports: m.reports.total,
      dailyReports: m.reports.daily,
      weeklyReports: m.reports.weekly,
      monthlyReports: m.reports.monthly,
    };
  }, [m, alerts, insights, veeamVmStatus, veeamAlarmItems]);

  const chartData = useMemo<DashboardChartData>(() => {
    const severityDistribution: DashboardChartData["severityDistribution"] = [
      {
        severity: "Info",
        count: alerts.filter((a) => normalizeSeverity(a.severity) === "info").length,
        color: "hsl(var(--muted-foreground))",
      },
      {
        severity: "Warning",
        count: alerts.filter((a) => normalizeSeverity(a.severity) === "warning").length,
        color: "hsl(var(--warning))",
      },
      {
        severity: "Average",
        count: alerts.filter((a) => normalizeSeverity(a.severity) === "average").length,
        color: "hsl(var(--accent))",
      },
      {
        severity: "High",
        count: alerts.filter((a) => {
          const l = normalizeSeverity(a.severity);
          return l === "high" || l === "critical";
        }).length,
        color: "hsl(var(--destructive))",
      },
      {
        severity: "Disaster",
        count: alerts.filter((a) => normalizeSeverity(a.severity) === "disaster").length,
        color: "hsl(var(--destructive))",
      },
    ];

    const labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "Now"];
    const buckets: Record<string, { total: number; critical: number; warning: number }> = {};
    labels.forEach((label) => {
      buckets[label] = { total: 0, critical: 0, warning: 0 };
    });

    alerts.forEach((alert) => {
      const hoursAgo = Math.floor((Date.now() - alert.timestamp.getTime()) / 3600000);
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

    const alertsTimeline = labels.map((time) => ({ time, ...buckets[time] }));

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

    return { severityDistribution, alertsTimeline, topNoisyHosts, veeamStatus };
  }, [alerts, veeamVmStatus]);

  const criticalIssues = useMemo<CriticalIssue[]>(() => {
    const zabbixIssues: CriticalIssue[] = alerts
      .filter((a) => {
        const level = normalizeSeverity(a.severity);
        return level === "disaster" || level === "critical" || level === "high";
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 4)
      .map((a) => ({
        id: String(a.id),
        host: normalizeHostLabel(a),
        problem: a.title,
        severity: normalizeSeverity(a.severity) as CriticalIssue["severity"],
        duration: getRelativeDuration(a.timestamp),
        acknowledged: Boolean(a.acknowledged),
        source: "zabbix" as const,
      }));

    const veeamIssues: CriticalIssue[] = veeamAlarmItems
      .filter((alarm) => {
        const status = String(alarm.status).toLowerCase();
        const severity = normalizeSeverity(alarm.severity);
        return status === "active" && (severity === "critical" || severity === "high");
      })
      .slice(0, 2)
      .map((alarm) => {
        const ts =
          toValidDate(alarm.triggered_at) ??
          toValidDate(alarm.last_seen) ??
          toValidDate(alarm.first_seen) ??
          new Date();

        return {
          id: alarm.alarm_id,
          host: alarm.entity_name || "Unknown host",
          problem: alarm.description || alarm.name || "Veeam alarm",
          severity:
            normalizeSeverity(alarm.severity) === "critical"
              ? "critical"
              : "high",
          duration: getRelativeDuration(ts),
          acknowledged: String(alarm.status).toLowerCase() === "acknowledged",
          source: "veeam" as const,
        };
      });

    return [...zabbixIssues, ...veeamIssues].slice(0, 5);
  }, [alerts, veeamAlarmItems]);

  const isLoading =
    (loading || alertsLoading || insightsLoading || veeamLoading) && !hasOverviewData;

  return (
    <DashboardContentView
      basePath="/super-admin/organizations"
      summary={summary}
      chartData={chartData}
      criticalIssues={criticalIssues}
      loading={isLoading}
      error={combinedError}
      isConnected={combinedError == null}
      lastUpdated={latestUpdate}
      showHeader={false}
      showSummaryCards={false}
      showAiInsightsCard={true}
      enableNavigation
      onOpenZabbix={() => onOpenZabbix({ tab: "alerts" })}
      onOpenVeeam={() => onOpenVeeam()}
      onOpenInsights={onOpenInsights}
      onTopHostClick={(host) => onOpenZabbix({ tab: "hosts", host })}
      onCriticalIssueClick={(issue) => {
        if (issue.source === "veeam") {
          onOpenVeeam();
          return;
        }
        onOpenZabbix({ tab: "alerts", host: issue.host });
      }}
    />
  );
};

export default OrgDetailMonitoringOverview;
