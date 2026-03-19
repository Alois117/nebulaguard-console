import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthenticatedFetch } from "@/keycloak/hooks/useAuthenticatedFetch";
import { safeParseResponse } from "@/lib/safeFetch";
import {
  WEBHOOK_AI_INSIGHTS_URL,
  WEBHOOK_ALERTS_URL,
  WEBHOOK_BACKUP_REPLICATION_URL,
  WEBHOOK_REPORTS_URL,
  WEBHOOK_VEEAM_ALARMS_URL,
  WEBHOOK_VEEAM_VMS_URL,
  WEBHOOK_ZABBIX_HOSTS_URL,
} from "@/config/env";
import { normalizeReportTemplateHtml } from "@/hooks/super-admin/shared-ui/reportTemplate";
import {
  dedupeVeeamAlarmsByLatest,
  mapVeeamAlarmsPayload,
} from "@/hooks/super-admin/shared-ui/veeamAlarmPayload";
import { extractAlertHost } from "@/lib/alertPresentation";
import {
  deriveScopedBackupReplicationSummary,
  extractClientIdFromBackupReplicationItem as extractClientIdFromBRPayload,
  normalizeBackupReplicationChanges,
} from "@/lib/backupReplicationScope";
import type { Organization } from "./types";
import type {
  AlertItem,
  HostItem,
  InsightItem,
  ReportItem,
  VeeamJobItem,
} from "./useOrganizationDetails";
import type {
  BackupReplicationData,
  InfraVM,
  VeeamAlarmItem,
  PreloadedVeeamMetricsData,
} from "./useOrganizationVeeamMetrics";

export type GlobalScope = "all" | "specific";
export type GlobalTimeRange = "24h" | "7d" | "30d" | "custom" | "all";

export type GlobalAlertItem = AlertItem & {
  organizationId: string | null;
  organizationName: string;
  clientId: number | null;
};

export type GlobalHostItem = HostItem & {
  organizationId: string | null;
  organizationName: string;
  clientId: number | null;
};

export type GlobalReportItem = ReportItem & {
  organizationId: string | null;
  organizationName: string;
  clientId: number | null;
};

export type GlobalInsightItem = InsightItem & {
  organizationId: string | null;
  organizationName: string;
  clientId: number | null;

  entity_type?: string;
  entity_id?: string;
  entity_uid?: string;
  event_reference?: string;
  host?: string | null;
  status?: string;
  response_content?: string;
  impact?: string;
  confidence?: number | null;
  confidence_score?: number | null;
  recommendation?: string;
  updated_at?: Date | null;
};

export type GlobalVeeamJobItem = VeeamJobItem & {
  organizationId: string | null;
  organizationName: string;
  clientId: number | null;
};

export type VeeamBreakdownSection = "backup" | "infrastructure" | "alarms";

export interface VeeamSectionBreakdowns {
  backup: CategoryBreakdownRow[];
  infrastructure: CategoryBreakdownRow[];
  alarms: CategoryBreakdownRow[];
}

export type GlobalVeeamDrilldownData = PreloadedVeeamMetricsData & {
  sectionBreakdowns?: VeeamSectionBreakdowns;
};

export interface GlobalMetricSummary {
  alerts: { total: number; active: number; critical: number };
  hosts: { total: number; enabled: number; disabled: number };
  reports: { total: number; daily: number; weekly: number; monthly: number };
  insights: { total: number; predictions: number; anomalies: number };
  veeam: { jobs: number; success: number; failed: number };
}

export interface CategoryBreakdownRow {
  organizationId: string;
  organizationName: string;
  total: number;
  secondary: number;
  tertiary: number;
}

interface GlobalReportLiteItem {
  id: string;
  organizationId: string | null;
  organizationName: string;
  clientId: number | null;
  reportType: string;
  createdAtMs: number;
}

interface UseGlobalInfrastructureMetricsOptions {
  organizations: Organization[];
  scope: GlobalScope;
  selectedOrgIds: string[];
  timeRange: GlobalTimeRange;
  customDateFrom?: Date;
  customDateTo?: Date;
  enabled?: boolean;
}

const REFRESH_INTERVAL = 60_000;
type UnknownRecord = Record<string, unknown>;

let reportsDetailsRequestedGlobal = false;
const reportsDetailsSubscribers = new Set<() => void>();

export const requestGlobalReportsDetails = () => {
  if (reportsDetailsRequestedGlobal) return;
  reportsDetailsRequestedGlobal = true;
  reportsDetailsSubscribers.forEach((notify) => notify());
};

const toNumberOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const inferSeverity = (value: unknown): string => {
  const raw = String(value ?? "").toLowerCase();
  if (!raw) return "info";
  return raw;
};

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const safeString = (v: unknown): string => (typeof v === "string" ? v : "");

const decodeCommonEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const inferInsightType = (rawType: string, text: string): string => {
  const t = (rawType || "").toLowerCase();
  const blob = `${t} ${text}`.toLowerCase();
  if (blob.includes("predict")) return "prediction";
  if (blob.includes("anomal")) return "anomaly";
  if (blob.includes("recommend")) return "recommendation";
  return t || "insight";
};

const toDateOrUndefined = (value: unknown): Date | undefined => {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : undefined;
  }
  if (typeof value === "number") {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isFinite(date.getTime()) ? date : undefined;
  }
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : undefined;
};

const pickInsightTimestamp = (i: UnknownRecord): Date => {
  const zbxRaw = asRecord(i.zbx_raw);
  const rawEvent = asRecord(zbxRaw.raw_event);
  const event = asRecord(i.event);

  const clock =
    i.clock ??
    zbxRaw.clock ??
    rawEvent.clock ??
    event.clock ??
    i.zabbix_clock ??
    i.zabbixClock;

  if (clock != null && Number.isFinite(Number(clock))) {
    return new Date(Number(clock) * 1000);
  }

  return (
    toDateOrUndefined(
      i.created_at ?? i.timestamp ?? i.time ?? i.updated_at ?? i.first_seen ?? i.last_seen_at
    ) ?? new Date()
  );
};

const getClientIdFromAny = (obj: UnknownRecord): number | null => {
  const direct = toNumberOrNull(obj.client_id ?? obj.clientId);
  if (direct != null) return direct;

  const meta = asRecord(obj.meta);
  const org = asRecord(obj.organization);
  const nestedOrg = asRecord(obj.org);

  return (
    toNumberOrNull(meta.client_id ?? meta.clientId) ??
    toNumberOrNull(org.client_id ?? org.clientId) ??
    toNumberOrNull(nestedOrg.client_id ?? nestedOrg.clientId) ??
    null
  );
};

const REPORT_CONTAINER_KEYS = [
  "reports",
  "items",
  "data",
  "results",
  "payload",
  "result",
  "response",
  "details",
  "report",
] as const;

const REPORT_TEMPLATE_KEYS = [
  "report_template",
  "reportTemplate",
  "report_html",
  "reportHtml",
  "html",
  "template",
  "content_html",
  "contentHtml",
  "body_html",
  "bodyHtml",
  "body",
  "content",
  "markup",
] as const;

const isReportRecord = (record: UnknownRecord): boolean => {
  const hasTemplateLike =
    "report_template" in record ||
    "reportTemplate" in record ||
    "report_html" in record ||
    "reportHtml" in record ||
    "html" in record ||
    "template" in record ||
    "content" in record ||
    "body" in record;

  const hasTypeLike = "report_type" in record || "type" in record || "frequency" in record || "period" in record;
  const hasTimeLike =
    "created_at" in record ||
    "createdAt" in record ||
    "generated_at" in record ||
    "generatedAt" in record ||
    "timestamp" in record ||
    "time" in record ||
    "date" in record;

  return hasTemplateLike || (hasTypeLike && hasTimeLike);
};

const hasTemplateField = (record: UnknownRecord): boolean =>
  REPORT_TEMPLATE_KEYS.some((key) => key in record);

const reportRecordKey = (record: UnknownRecord, fallbackIndex: number): string => {
  const idPart = String(record.id ?? record.report_id ?? record.uuid ?? record.guid ?? "");
  const typePart = String(record.report_type ?? record.type ?? record.frequency ?? record.period ?? "");
  const timePart = String(
    record.created_at ??
      record.createdAt ??
      record.generated_at ??
      record.generatedAt ??
      record.timestamp ??
      record.time ??
      record.date ??
      ""
  );

  if (!idPart && !typePart && !timePart) {
    return `__fallback__${fallbackIndex}`;
  }

  return `${idPart}|${typePart}|${timePart}`;
};

const reportRecordScore = (record: UnknownRecord): number => {
  let score = 0;
  const template = normalizeReportTemplateHtml(record);

  if (template) score += 1000;
  if (hasTemplateField(record)) score += 100;
  if ("name" in record || "title" in record || "report_name" in record || "reportTitle" in record) {
    score += 10;
  }
  if ("status" in record || "state" in record) score += 5;
  if ("client_id" in record || "clientId" in record) score += 2;

  return score;
};

const tryParseRecordString = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const collectReportRecords = (
  input: unknown,
  sink: UnknownRecord[],
  depth = 0,
  seen = new WeakSet<object>()
) => {
  if (depth > 8 || input == null) return;

  if (typeof input === "string") {
    const parsed = tryParseRecordString(input.trim());
    if (parsed != null) {
      collectReportRecords(parsed, sink, depth + 1, seen);
    }
    return;
  }

  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i += 1) {
      collectReportRecords(input[i], sink, depth + 1, seen);
    }
    return;
  }

  if (typeof input !== "object") return;

  const obj = input as object;
  if (seen.has(obj)) return;
  seen.add(obj);

  const record = asRecord(input);
  if (isReportRecord(record)) {
    sink.push(record);
  }

  for (let i = 0; i < REPORT_CONTAINER_KEYS.length; i += 1) {
    const key = REPORT_CONTAINER_KEYS[i];
    if (!(key in record)) continue;
    collectReportRecords(record[key], sink, depth + 1, seen);
  }

  const values = Object.values(record);
  for (let i = 0; i < values.length; i += 1) {
    collectReportRecords(values[i], sink, depth + 1, seen);
  }
};

const extractReportsRecords = (value: unknown): UnknownRecord[] => {
  const records: UnknownRecord[] = [];
  collectReportRecords(value, records);

  if (records.length === 0) return [];

  const bestByKey = new Map<string, { score: number; record: UnknownRecord }>();

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const key = reportRecordKey(record, i);
    const score = reportRecordScore(record);
    const existing = bestByKey.get(key);

    if (!existing || score > existing.score) {
      bestByKey.set(key, { score, record });
    }
  }

  return Array.from(bestByKey.values()).map((entry) => entry.record);
};

const extractClientIdFromRecord = (record: UnknownRecord): number | null => {
  const meta = asRecord(record.meta);
  const org = asRecord(record.organization);
  const nestedOrg = asRecord(record.org);
  return (
    toNumberOrNull(record.client_id ?? record.clientId) ??
    toNumberOrNull(meta.client_id ?? meta.clientId) ??
    toNumberOrNull(org.client_id ?? org.clientId) ??
    toNumberOrNull(nestedOrg.client_id ?? nestedOrg.clientId)
  );
};

const normalizeReportType = (record: UnknownRecord): string => {
  const raw = String(
    record.report_type ?? record.type ?? record.frequency ?? record.period ?? "daily"
  )
    .trim()
    .toLowerCase();

  if (raw === "day") return "daily";
  if (raw === "week") return "weekly";
  if (raw === "month") return "monthly";
  return raw;
};

const extractReportTimestamp = (record: UnknownRecord): number => {
  const value =
    record.created_at ??
    record.createdAt ??
    record.generated_at ??
    record.generatedAt ??
    record.timestamp ??
    record.time ??
    record.date;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const parsed = value ? new Date(String(value)).getTime() : NaN;
  if (Number.isFinite(parsed)) return parsed;
  return Date.now();
};

const extractReportId = (
  record: UnknownRecord,
  fallbackIndex: number,
  reportType: string,
  createdAtMs: number,
  clientId: number | null
): string =>
  String(
    record.id ??
      record.report_id ??
      record.uuid ??
      record.guid ??
      `${clientId ?? "na"}-${reportType}-${createdAtMs}-${fallbackIndex}`
  );

const normalizeReportTemplate = (record: UnknownRecord): string | undefined => {
  const template = normalizeReportTemplateHtml(record);
  return template || undefined;
};

const parseMaybeRecord = (value: unknown): UnknownRecord => {
  if (value && typeof value === "object") return asRecord(value);
  if (typeof value === "string") {
    const parsed = tryParseRecordString(value.trim());
    return asRecord(parsed);
  }
  return {};
};

const mapReportRecord = (
  record: UnknownRecord,
  index: number,
  orgMapByClientId: Map<number, Organization>
): { lite: GlobalReportLiteItem; detail: GlobalReportItem } => {
  const clientId = extractClientIdFromRecord(record);
  const org = clientId != null ? orgMapByClientId.get(clientId) : undefined;
  const reportType = normalizeReportType(record);
  const createdAtMs = extractReportTimestamp(record);
  const id = extractReportId(record, index, reportType, createdAtMs, clientId);
  const name = String(
    record.name ??
      record.title ??
      record.report_name ??
      record.reportTitle ??
      `${reportType} report`
  );
  const status = String(record.status ?? record.state ?? "completed");
  const createdAt = new Date(createdAtMs);
  const organizationId = org?.id ?? null;
  const organizationName = org?.name ?? "Unknown Organization";
  const template = normalizeReportTemplate(record);

  return {
    lite: {
      id,
      organizationId,
      organizationName,
      clientId,
      reportType,
      createdAtMs,
    },
    detail: {
      id,
      name,
      report_type: reportType,
      report_template: template,
      status,
      created_at: createdAt,
      client_id: clientId ?? undefined,
      organizationId,
      organizationName,
      clientId,
    },
  };
};

const mapVeeamJobFromMatchedEntry = (
  vmEntry: unknown,
  vmIndex: number,
  orgMapByClientId: Map<number, Organization>
): GlobalVeeamJobItem[] => {
  const vm = asRecord(vmEntry);
  const vmJobs = Array.isArray(vm.jobs) ? vm.jobs : [];
  const jobs: GlobalVeeamJobItem[] = [];

  for (let jobIndex = 0; jobIndex < vmJobs.length; jobIndex += 1) {
    const job = asRecord(vmJobs[jobIndex]);
    const parsedJob = asRecord(job.parsedJob);
    const vmMeta = asRecord(vm.vm);
    const protectionSummary = asRecord(vm.protectionSummary);
    const backupStatus = asRecord(job.backupStatus);
    const clientId = toNumberOrNull(
      job.client_id ??
        job.clientId ??
        parsedJob.client_id ??
        parsedJob.clientId ??
        vm.client_id ??
        vm.clientId
    );
    const org = clientId ? orgMapByClientId.get(clientId) : undefined;
    const statusRaw = String(
      backupStatus.status ??
        backupStatus.jobStatus ??
        protectionSummary.overallStatus ??
        "unknown"
    ).toLowerCase();

    const severity = statusRaw.includes("success")
      ? "success"
      : statusRaw.includes("warn")
        ? "warning"
        : statusRaw.includes("fail") || statusRaw.includes("error")
          ? "failed"
          : "unknown";

    jobs.push({
      id: `${clientId ?? "na"}-${vmIndex}-${jobIndex}`,
      name: String(job.jobName ?? vmMeta.name ?? "Veeam Job"),
      type: String(job.jobType ?? ""),
      severity,
      status: severity,
      lastRun: toDateOrUndefined(job.lastRun),
      organizationId: org?.id ?? null,
      organizationName: org?.name ?? "Unknown Organization",
      clientId,
    });
  }

  return jobs;
};

const mapVeeamJobSeverity = (rawStatus: unknown): string => {
  const status = String(rawStatus ?? "").toLowerCase();
  if (status.includes("success")) return "success";
  if (status.includes("warn")) return "warning";
  if (status.includes("fail") || status.includes("error")) return "failed";
  return "unknown";
};

const mapStandaloneVeeamJob = (
  item: unknown,
  index: number,
  orgMapByClientId: Map<number, Organization>,
  fallbackName: string
): GlobalVeeamJobItem => {
  const record = asRecord(item);
  const clientId = extractClientIdFromBRPayload(record);
  const org = clientId != null ? orgMapByClientId.get(clientId) : undefined;
  const severity = mapVeeamJobSeverity(record.status);

  return {
    id: String(
      record.id ??
        record.jobId ??
        record.jobName ??
        `${clientId ?? "na"}-${fallbackName}-${index}`
    ),
    name: String(record.jobName ?? record.name ?? fallbackName),
    type: String(record.jobType ?? record.platform ?? ""),
    severity,
    status: severity,
    lastRun: toDateOrUndefined(record.lastRun ?? record.lastRunAt ?? record.updated_at),
    organizationId: org?.id ?? null,
    organizationName: org?.name ?? "Unknown Organization",
    clientId,
  };
};

const getTimeCutoff = (
  timeRange: GlobalTimeRange,
  customDateFrom?: Date,
  customDateTo?: Date
) => {
  const now = Date.now();

  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }

  if (timeRange === "24h") return { from: new Date(now - 24 * 60 * 60 * 1000), to: undefined };
  if (timeRange === "7d") return { from: new Date(now - 7 * 24 * 60 * 60 * 1000), to: undefined };
  if (timeRange === "30d") return { from: new Date(now - 30 * 24 * 60 * 60 * 1000), to: undefined };

  return { from: customDateFrom, to: customDateTo };
};

const isWithinTimeRange = (date: Date | undefined, from?: Date, to?: Date) => {
  if (!date) return true;
  const ts = date.getTime();
  if (from && ts < from.getTime()) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (ts > end.getTime()) return false;
  }
  return true;
};

const typeOfInsight = (value: unknown) => String(value ?? "").toLowerCase();

const getOrgScope = (
  organizations: Organization[],
  scope: GlobalScope,
  selectedOrgIds: string[]
) => {
  if (scope === "specific") {
    return selectedOrgIds;
  }
  return selectedOrgIds;
};

export const useGlobalInfrastructureMetrics = ({
  organizations,
  scope,
  selectedOrgIds,
  timeRange,
  customDateFrom,
  customDateTo,
  enabled = true,
}: UseGlobalInfrastructureMetricsOptions) => {
  const { authenticatedFetch } = useAuthenticatedFetch();
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [rawAlerts, setRawAlerts] = useState<GlobalAlertItem[]>([]);
  const [rawHosts, setRawHosts] = useState<GlobalHostItem[]>([]);
  const [rawReportLiteItems, setRawReportLiteItems] = useState<GlobalReportLiteItem[]>([]);
  const [rawReportRecords, setRawReportRecords] = useState<UnknownRecord[]>([]);
  const [rawReportDetails, setRawReportDetails] = useState<GlobalReportItem[]>([]);
  const [rawInsights, setRawInsights] = useState<GlobalInsightItem[]>([]);
  const [rawVeeamBackupData, setRawVeeamBackupData] = useState<BackupReplicationData | null>(null);
  const [rawVeeamInfraVMs, setRawVeeamInfraVMs] = useState<InfraVM[]>([]);
  const [rawVeeamAlarmItems, setRawVeeamAlarmItems] = useState<VeeamAlarmItem[]>([]);

  const [reportsDetailsRequested, setReportsDetailsRequested] = useState(
    reportsDetailsRequestedGlobal
  );
  const orgMapByClientIdRef = useRef<Map<number, Organization>>(new Map());
  const reportsDetailsRequestedRef = useRef(reportsDetailsRequestedGlobal);

  const orgMapByClientId = useMemo(() => {
    const map = new Map<number, Organization>();
    organizations.forEach((org) => {
      if (org.clientId > 0) map.set(org.clientId, org);
    });
    return map;
  }, [organizations]);

  const orgMapById = useMemo(() => {
    const map = new Map<string, Organization>();
    organizations.forEach((org) => map.set(org.id, org));
    return map;
  }, [organizations]);

  useEffect(() => {
    orgMapByClientIdRef.current = orgMapByClientId;
  }, [orgMapByClientId]);

  useEffect(() => {
    reportsDetailsRequestedRef.current = reportsDetailsRequested;
  }, [reportsDetailsRequested]);

  useEffect(() => {
    const notify = () => setReportsDetailsRequested(true);
    reportsDetailsSubscribers.add(notify);
    return () => {
      reportsDetailsSubscribers.delete(notify);
    };
  }, []);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!enabled) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (!silent) setInitialLoading(true);
      if (!silent) setError(null);

      try {
        const currentOrgMapByClientId = orgMapByClientIdRef.current;
        const shouldIncludeReportDetails = reportsDetailsRequestedRef.current;
        const commonPost = {
          method: "POST" as const,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({}),
          signal: abortControllerRef.current.signal,
        };

        const [
          alertsRes,
          hostsRes,
          reportsRes,
          insightsRes,
          veeamBackupRes,
          veeamInfraRes,
          veeamAlarmsRes,
        ] = await Promise.all([
          authenticatedFetch(WEBHOOK_ALERTS_URL, commonPost).catch(() => null),
          authenticatedFetch(WEBHOOK_ZABBIX_HOSTS_URL, commonPost).catch(() => null),
          authenticatedFetch(WEBHOOK_REPORTS_URL, commonPost).catch(() => null),
          authenticatedFetch(WEBHOOK_AI_INSIGHTS_URL, commonPost).catch(() => null),
          authenticatedFetch(WEBHOOK_BACKUP_REPLICATION_URL, commonPost).catch(() => null),
          authenticatedFetch(WEBHOOK_VEEAM_VMS_URL, commonPost).catch(() => null),
          authenticatedFetch(WEBHOOK_VEEAM_ALARMS_URL, commonPost).catch(() => null),
        ]);

        if (alertsRes?.ok) {
          const parsed = await safeParseResponse<unknown[]>(alertsRes, WEBHOOK_ALERTS_URL);
          if (parsed.ok && Array.isArray(parsed.data)) {
            const mapped: GlobalAlertItem[] = parsed.data.map((entry, index) => {
              const item = asRecord(entry);
              const zbxRaw = asRecord(item.zbx_raw);
              const rawEvent = asRecord(zbxRaw.raw_event);
              const clientId = toNumberOrNull(item.client_id ?? item.clientId);
              const org = clientId ? currentOrgMapByClientId.get(clientId) : undefined;
              const timestampValue = item.created_at ?? item.first_seen ?? item.last_seen_at;
              const timestamp = toDateOrUndefined(timestampValue) ?? new Date();
              const message = String(item.first_ai_response ?? item.response_content ?? "");
              const dedupeKey =
                String(item.dedupe_key ?? zbxRaw.dedupe_key ?? "").trim() || undefined;
              const normalizedHost = extractAlertHost({
                directHost:
                  safeString(item.host) ||
                  safeString(zbxRaw.host) ||
                  safeString(rawEvent.host),
                content: message,
                dedupeKey,
              });
              const host =
                normalizedHost && normalizedHost !== "unknown-host"
                  ? normalizedHost
                  : undefined;

              return {
                id: String(item.eventid ?? item.id ?? `global-alert-${index}`),
                title: String(item.problem_name ?? item.description ?? item.title ?? "Alert"),
                message,
                severity: inferSeverity(item.severity ?? zbxRaw.severity),
                status: String(item.status ?? (item.acknowledged ? "acknowledged" : "active")),
                host,
                timestamp,
                acknowledged: Boolean(item.acknowledged),
                eventid: String(item.eventid ?? ""),
                organizationId: org?.id ?? null,
                organizationName: org?.name ?? "Unknown Organization",
                clientId,
                client_id: clientId ?? undefined,
                times_sent: toNumberOrNull(item.times_sent) ?? undefined,
                seen_count: toNumberOrNull(item.seen_count) ?? undefined,
                first_seen: safeString(item.first_seen) || undefined,
                last_seen_at:
                  safeString(item.last_seen_at) ||
                  safeString(item.updated_at) ||
                  timestamp.toISOString(),
                dedupe_key: dedupeKey,
                rawMetadata: {
                  ...zbxRaw,
                  ...rawEvent,
                  eventid: String(item.eventid ?? zbxRaw.eventid ?? rawEvent.eventid ?? ""),
                  severity: String(item.severity ?? zbxRaw.severity ?? rawEvent.severity ?? ""),
                  dedupe_key: dedupeKey,
                },
              };
            });

            setRawAlerts(mapped);
          }
        }

        if (hostsRes?.ok) {
          const parsed = await safeParseResponse<unknown[]>(hostsRes, WEBHOOK_ZABBIX_HOSTS_URL);
          if (parsed.ok && Array.isArray(parsed.data)) {
            const mapped: GlobalHostItem[] = parsed.data.map((entry, index) => {
              const item = asRecord(entry);
              const groupsJson = asRecord(item.groups_json);
              const clientId = toNumberOrNull(item.client_id ?? item.clientId);
              const org = clientId ? currentOrgMapByClientId.get(clientId) : undefined;
              const groups = Array.isArray(groupsJson.groups)
                ? groupsJson.groups.map((groupItem: unknown) => {
                    const groupRecord = asRecord(groupItem);
                    return String(groupRecord.name ?? groupItem ?? "");
                  })
                : [];

              return {
                hostid: String(item.hostid ?? item.id ?? `global-host-${index}`),
                host: String(groupsJson.ip ?? item.host ?? "Unknown"),
                name: String(groupsJson.name ?? item.name ?? "Host"),
                status: typeof item.status === "number" ? item.status : Number(item.status ?? 0),
                available: toNumberOrNull(item.available) ?? undefined,
                groups,
                client_id: clientId ?? undefined,
                created_at: toDateOrUndefined(item.created_at) ?? undefined,
                updated_at: toDateOrUndefined(item.updated_at) ?? undefined,
                last_collected_at: toDateOrUndefined(item.last_collected_at) ?? null,
                linked_veeam_moref: safeString(item.linked_veeam_moref) || null,
                tags_json: asRecord(item.tags_json),
                organizationId: org?.id ?? null,
                organizationName: org?.name ?? "Unknown Organization",
                clientId,
              };
            });

            setRawHosts(mapped);
          }
        }

        if (reportsRes?.ok) {
          const parsed = await safeParseResponse<unknown>(reportsRes, WEBHOOK_REPORTS_URL);
          if (parsed.ok && parsed.data != null) {
            const records = extractReportsRecords(parsed.data);
            const liteItems: GlobalReportLiteItem[] = [];
            const detailedItems: GlobalReportItem[] = [];

            for (let index = 0; index < records.length; index += 1) {
              const mapped = mapReportRecord(records[index], index, currentOrgMapByClientId);
              liteItems.push(mapped.lite);
              if (shouldIncludeReportDetails) {
                detailedItems.push(mapped.detail);
              }
            }

            setRawReportRecords(records);
            setRawReportLiteItems(liteItems);
            if (shouldIncludeReportDetails) {
              setRawReportDetails(detailedItems);
            } else {
              setRawReportDetails([]);
            }
          }
        }

        if (insightsRes?.ok) {
          const parsed = await safeParseResponse<unknown[]>(insightsRes, WEBHOOK_AI_INSIGHTS_URL);
          if (parsed.ok && Array.isArray(parsed.data)) {
            const mapped: GlobalInsightItem[] = parsed.data.map((entry, index) => {
              const item = asRecord(entry);
              const effectiveClientId = getClientIdFromAny(item);
              const org = effectiveClientId
                ? currentOrgMapByClientId.get(effectiveClientId)
                : undefined;

              const responseContent = String(
                item.response_content ??
                  item.content ??
                  item.details ??
                  item.message ??
                  item.first_ai_response ??
                  ""
              );

              const summary = String(
                item.summary ??
                  item.description ??
                  item.message ??
                  item.details ??
                  item.first_ai_response ??
                  item.response_content ??
                  item.content ??
                  ""
              );

              const titleRaw =
                safeString(item.title) ||
                safeString(item.name) ||
                safeString(item.problem_name) ||
                safeString(asRecord(item.zbx_raw).problem_name) ||
                "AI Insight";

              const title = titleRaw.trim() || "AI Insight";

              const rawType =
                safeString(item.type) ||
                safeString(item.insight_type) ||
                safeString(item.category) ||
                safeString(item.kind);

              const computedType = inferInsightType(
                rawType,
                `${title} ${summary} ${responseContent}`
              );

              const timestamp = pickInsightTimestamp(item);

              const id =
                safeString(item.id).trim() ||
                safeString(item.insight_id).trim() ||
                safeString(item.ai_response_id).trim() ||
                `global-insight-${effectiveClientId ?? "na"}-${computedType}-${timestamp.getTime()}-${index}`;

              return {
                id,
                type: computedType,
                title,
                summary: decodeCommonEntities(summary).trim(),
                severity: inferSeverity(item.severity ?? item.level ?? item.priority ?? ""),
                timestamp,
                client_id: effectiveClientId ?? undefined,
                organizationId: org?.id ?? null,
                organizationName: org?.name ?? "Unknown Organization",
                clientId: effectiveClientId,

                entity_type: safeString(item.entity_type),
                entity_id: safeString(item.entity_id),
                entity_uid: safeString(item.entity_uid),
                event_reference: safeString(item.event_reference),
                host: safeString(item.host) || safeString(item.hostname) || null,
                status: safeString(item.status) || "generated",
                response_content: decodeCommonEntities(responseContent).trim(),
                impact: safeString(item.impact),
                confidence: typeof item.confidence === "number" ? item.confidence : null,
                confidence_score:
                  typeof item.confidence_score === "number" ? item.confidence_score : null,
                recommendation: safeString(item.recommendation),
                updated_at: toDateOrUndefined(item.updated_at) ?? null,
              };
            });

            setRawInsights(mapped);
          }
        }

        if (veeamBackupRes?.ok) {
          const parsed = await safeParseResponse<unknown>(
            veeamBackupRes,
            WEBHOOK_BACKUP_REPLICATION_URL
          );

          if (parsed.ok && parsed.data) {
            const arr = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
            const mainObj = asRecord(arr[0]);
            const metaObj = asRecord(arr[1]);
            const matched = Array.isArray(mainObj.matched)
              ? (mainObj.matched as BackupReplicationData["matched"])
              : [];
            const warnings = Array.isArray(asRecord(mainObj.alerts).warnings)
              ? (asRecord(mainObj.alerts).warnings as unknown[])
              : [];
            const critical = Array.isArray(asRecord(mainObj.alerts).critical)
              ? (asRecord(mainObj.alerts).critical as unknown[])
              : [];

            setRawVeeamBackupData({
              summary: mainObj.summary ?? null,
              matched,
              alerts: { warnings, critical },
              statistics: mainObj.statistics ?? null,
              vmsWithoutJobs: Array.isArray(mainObj.vmsWithoutJobs)
                ? (mainObj.vmsWithoutJobs as BackupReplicationData["vmsWithoutJobs"])
                : [],
              jobsWithoutVMs: Array.isArray(mainObj.jobsWithoutVMs)
                ? (mainObj.jobsWithoutVMs as BackupReplicationData["jobsWithoutVMs"])
                : [],
              multiVMJobs: Array.isArray(mainObj.multiVMJobs)
                ? (mainObj.multiVMJobs as BackupReplicationData["multiVMJobs"])
                : [],
              replicas: Array.isArray(mainObj.replicas)
                ? (mainObj.replicas as BackupReplicationData["replicas"])
                : [],
              changes: metaObj.changes ?? null,
              changeSummary: metaObj.summary ?? null,
            });
          }
        }

        if (veeamInfraRes?.ok) {
          const parsed = await safeParseResponse<InfraVM[]>(
            veeamInfraRes,
            WEBHOOK_VEEAM_VMS_URL
          );

          if (parsed.ok && parsed.data) {
            const vms = Array.isArray(parsed.data)
              ? parsed.data
              : [parsed.data as unknown as InfraVM];
            setRawVeeamInfraVMs(vms);
          }
        }

        if (veeamAlarmsRes?.ok) {
          const parsed = await safeParseResponse<unknown[]>(
            veeamAlarmsRes,
            WEBHOOK_VEEAM_ALARMS_URL
          );

          if (parsed.ok && Array.isArray(parsed.data)) {
            const mappedAlarms = mapVeeamAlarmsPayload(parsed.data);
            setRawVeeamAlarmItems(
              dedupeVeeamAlarmsByLatest(mappedAlarms) as VeeamAlarmItem[]
            );
          }
        }

        setIsConnected(true);
        setLastUpdated(new Date());
        hasLoadedOnce.current = true;
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          if (!silent) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to load global infrastructure metrics"
            );
          }

          if (!silent) setIsConnected(false);
        }
      } finally {
        if (!silent) {
          setInitialLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    },
    [authenticatedFetch, enabled]
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => fetchAll(true), REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [enabled, fetchAll]);

  useEffect(() => {
    if (!reportsDetailsRequested) return;

    if (rawReportRecords.length === 0) {
      setRawReportDetails([]);
      return;
    }

    const detailedItems = new Array<GlobalReportItem>(rawReportRecords.length);
    for (let index = 0; index < rawReportRecords.length; index += 1) {
      detailedItems[index] = mapReportRecord(
        rawReportRecords[index],
        index,
        orgMapByClientId
      ).detail;
    }

    setRawReportDetails(detailedItems);
  }, [reportsDetailsRequested, rawReportRecords, orgMapByClientId]);

  const orgScopeIds = useMemo(
    () => getOrgScope(organizations, scope, selectedOrgIds),
    [organizations, scope, selectedOrgIds]
  );

  const scopedOrgIdsSet = useMemo(() => {
    if (orgScopeIds.length === 0) return null;
    return new Set(orgScopeIds);
  }, [orgScopeIds]);

  const { from: rangeFrom, to: rangeTo } = useMemo(
    () => getTimeCutoff(timeRange, customDateFrom, customDateTo),
    [timeRange, customDateFrom, customDateTo]
  );

  const rangeFromMs = rangeFrom?.getTime();

  const rangeToMs = useMemo(() => {
    if (!rangeTo) return undefined;
    const end = new Date(rangeTo);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }, [rangeTo]);

  const inScope = useCallback(
    (organizationId: string | null) => {
      if (!scopedOrgIdsSet) return true;
      if (!organizationId) return false;
      return scopedOrgIdsSet.has(organizationId);
    },
    [scopedOrgIdsSet]
  );

  const alerts = useMemo(
    () =>
      rawAlerts.filter(
        (item) =>
          inScope(item.organizationId) &&
          isWithinTimeRange(item.timestamp, rangeFrom, rangeTo)
      ),
    [rawAlerts, inScope, rangeFrom, rangeTo]
  );

  const hosts = useMemo(
    () => rawHosts.filter((item) => inScope(item.organizationId)),
    [rawHosts, inScope]
  );

  const filteredReportsMeta = useMemo(() => {
    const selectedIds = new Set<string>();
    const breakdownByOrg = new Map<
      string,
      { organizationName: string; total: number; daily: number; weekly: number }
    >();

    let total = 0;
    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    for (let index = 0; index < rawReportLiteItems.length; index += 1) {
      const item = rawReportLiteItems[index];
      if (!inScope(item.organizationId)) continue;
      if (rangeFromMs != null && item.createdAtMs < rangeFromMs) continue;
      if (rangeToMs != null && item.createdAtMs > rangeToMs) continue;

      total += 1;
      selectedIds.add(item.id);

      if (item.reportType === "daily") daily += 1;
      else if (item.reportType === "weekly") weekly += 1;
      else if (item.reportType === "monthly") monthly += 1;

      const key = item.organizationId ?? "unknown";
      const existing = breakdownByOrg.get(key);

      if (!existing) {
        breakdownByOrg.set(key, {
          organizationName: item.organizationName,
          total: 1,
          daily: item.reportType === "daily" ? 1 : 0,
          weekly: item.reportType === "weekly" ? 1 : 0,
        });
      } else {
        existing.total += 1;
        if (item.reportType === "daily") existing.daily += 1;
        if (item.reportType === "weekly") existing.weekly += 1;
      }
    }

    return { total, daily, weekly, monthly, selectedIds, breakdownByOrg };
  }, [rawReportLiteItems, inScope, rangeFromMs, rangeToMs]);

  const reports = useMemo(() => {
    if (!reportsDetailsRequested) return [];
    if (filteredReportsMeta.selectedIds.size === 0) return [];

    const items: GlobalReportItem[] = [];
    for (let index = 0; index < rawReportDetails.length; index += 1) {
      const report = rawReportDetails[index];
      if (filteredReportsMeta.selectedIds.has(report.id)) {
        items.push(report);
      }
    }

    return items;
  }, [reportsDetailsRequested, rawReportDetails, filteredReportsMeta]);

  const insights = useMemo(
    () =>
      rawInsights.filter(
        (item) =>
          inScope(item.organizationId) &&
          isWithinTimeRange(item.timestamp, rangeFrom, rangeTo)
      ),
    [rawInsights, inScope, rangeFrom, rangeTo]
  );

  const filteredVeeam = useMemo(() => {
    const includeClientId = (clientId: number | null) => {
      if (!scopedOrgIdsSet) return true;
      if (clientId == null) return false;
      const org = orgMapByClientId.get(clientId);
      return Boolean(org && scopedOrgIdsSet.has(org.id));
    };

    const includeTimestamp = (value: unknown) => {
      const dt = toDateOrUndefined(value);
      if (!dt) return true;
      const ms = dt.getTime();
      if (rangeFromMs != null && ms < rangeFromMs) return false;
      if (rangeToMs != null && ms > rangeToMs) return false;
      return true;
    };

    const filterBrList = <T,>(list: T[], timeKeys: string[] = []) => {
      const next: T[] = [];

      for (let index = 0; index < list.length; index += 1) {
        const item = list[index];
        const clientId = extractClientIdFromBRPayload(item);
        if (!includeClientId(clientId)) continue;

        if (timeKeys.length > 0) {
          const record = asRecord(item);
          let hasTimeValue = false;
          let includeByTime = true;

          for (let i = 0; i < timeKeys.length; i += 1) {
            const rawTime = record[timeKeys[i]];
            if (rawTime == null || rawTime === "") continue;
            hasTimeValue = true;
            if (!includeTimestamp(rawTime)) includeByTime = false;
            break;
          }

          if (hasTimeValue && !includeByTime) continue;
        }

        next.push(item);
      }

      return next;
    };

    const jobs: GlobalVeeamJobItem[] = [];
    let brData: BackupReplicationData | null = null;

    if (rawVeeamBackupData) {
      const matchedRaw = Array.isArray(rawVeeamBackupData.matched)
        ? rawVeeamBackupData.matched
        : [];

      const matched: BackupReplicationData["matched"] = [];

      for (let vmIndex = 0; vmIndex < matchedRaw.length; vmIndex += 1) {
        const vmEntry = matchedRaw[vmIndex];
        const vmRecord = asRecord(vmEntry);
        const vmJobsRaw = Array.isArray(vmRecord.jobs) ? vmRecord.jobs : [];
        const vmClientId = extractClientIdFromBRPayload(vmEntry);
        const filteredJobs: unknown[] = [];

        for (let jobIndex = 0; jobIndex < vmJobsRaw.length; jobIndex += 1) {
          const job = vmJobsRaw[jobIndex];
          const jobRecord = asRecord(job);
          const jobClientId = extractClientIdFromBRPayload(job) ?? vmClientId;

          if (!includeClientId(jobClientId)) continue;
          if (!includeTimestamp(jobRecord.lastRun)) continue;
          filteredJobs.push(job);
        }

        if (filteredJobs.length === 0) continue;

        const nextVm = {
          ...vmRecord,
          jobs: filteredJobs,
        } as unknown as BackupReplicationData["matched"][number];

        matched.push(nextVm);

        const vmJobs = mapVeeamJobFromMatchedEntry(nextVm, vmIndex, orgMapByClientId);
        for (let i = 0; i < vmJobs.length; i += 1) {
          jobs.push(vmJobs[i]);
        }
      }

      const brAlerts = asRecord(rawVeeamBackupData.alerts);
      const warnings = Array.isArray(brAlerts.warnings) ? brAlerts.warnings : [];
      const critical = Array.isArray(brAlerts.critical) ? brAlerts.critical : [];
      const jobsWithoutVMs = Array.isArray(rawVeeamBackupData.jobsWithoutVMs)
        ? rawVeeamBackupData.jobsWithoutVMs
        : [];
      const multiVMJobs = Array.isArray(rawVeeamBackupData.multiVMJobs)
        ? rawVeeamBackupData.multiVMJobs
        : [];

      const filteredVmsWithoutJobs = filterBrList(
        Array.isArray(rawVeeamBackupData.vmsWithoutJobs)
          ? rawVeeamBackupData.vmsWithoutJobs
          : [],
        ["lastSeen"]
      );
      const filteredOrphanJobs = filterBrList(jobsWithoutVMs, ["lastRun"]);
      const filteredMultiVmJobs = filterBrList(multiVMJobs, ["lastRun"]);
      const filteredReplicas = filterBrList(
        Array.isArray(rawVeeamBackupData.replicas) ? rawVeeamBackupData.replicas : [],
        ["lastSync"]
      );
      const rawChanges = normalizeBackupReplicationChanges(rawVeeamBackupData.changes);
      const filteredChanges = {
        new: filterBrList(rawChanges.new, ["changedAt"]),
        modified: filterBrList(rawChanges.modified, ["changedAt"]),
        enabled: filterBrList(rawChanges.enabled, ["changedAt"]),
        disabled: filterBrList(rawChanges.disabled, ["changedAt"]),
        unchanged: filterBrList(rawChanges.unchanged, ["changedAt"]),
      };
      const scopedBackupSummary = deriveScopedBackupReplicationSummary({
        summary: rawVeeamBackupData.summary,
        matched,
        vmsWithoutJobs: filteredVmsWithoutJobs,
        jobsWithoutVMs: filteredOrphanJobs,
        multiVMJobs: filteredMultiVmJobs,
        changes: filteredChanges,
      });

      brData = {
        ...rawVeeamBackupData,
        summary: scopedBackupSummary.summary,
        matched,
        vmsWithoutJobs: filteredVmsWithoutJobs,
        jobsWithoutVMs: filteredOrphanJobs,
        multiVMJobs: filteredMultiVmJobs,
        replicas: filteredReplicas,
        alerts: {
          warnings: filterBrList(warnings, ["timestamp", "lastSeen", "created_at"]),
          critical: filterBrList(critical, ["timestamp", "lastSeen", "created_at"]),
        },
        changes: filteredChanges,
        changeSummary: scopedBackupSummary.changeSummary,
      };

      for (let index = 0; index < filteredOrphanJobs.length; index += 1) {
        jobs.push(
          mapStandaloneVeeamJob(
            filteredOrphanJobs[index],
            index,
            orgMapByClientId,
            "Orphan Veeam Job"
          )
        );
      }

      for (let index = 0; index < filteredMultiVmJobs.length; index += 1) {
        jobs.push(
          mapStandaloneVeeamJob(
            filteredMultiVmJobs[index],
            index,
            orgMapByClientId,
            "Multi-VM Veeam Job"
          )
        );
      }
    }

    const infraVMs: InfraVM[] = [];
    for (let index = 0; index < rawVeeamInfraVMs.length; index += 1) {
      const vm = rawVeeamInfraVMs[index] as unknown;
      const record = asRecord(vm);
      const rawJson = asRecord(record.raw_json);
      const clientId = toNumberOrNull(
        record.client_id ?? record.clientId ?? rawJson.client_id ?? rawJson.clientId
      );

      if (!includeClientId(clientId)) continue;
      infraVMs.push(vm as InfraVM);
    }

    const alarmItems: VeeamAlarmItem[] = [];
    for (let index = 0; index < rawVeeamAlarmItems.length; index += 1) {
      const alarm = rawVeeamAlarmItems[index];
      const clientId = toNumberOrNull(alarm.client_id);

      if (!includeClientId(clientId)) continue;
      if (!includeTimestamp(alarm.last_seen ?? alarm.triggered_at ?? alarm.first_seen)) continue;
      alarmItems.push(alarm);
    }

    return { brData, infraVMs, alarmItems, jobs };
  }, [
    rawVeeamBackupData,
    rawVeeamInfraVMs,
    rawVeeamAlarmItems,
    orgMapByClientId,
    scopedOrgIdsSet,
    rangeFromMs,
    rangeToMs,
  ]);

  const veeamJobs = filteredVeeam.jobs;

  const veeamAggregates = useMemo(() => {
    const resolveOrg = (clientId: number | null) => {
      if (clientId == null) {
        return {
          key: "unknown",
          organizationId: "unknown",
          organizationName: "Unknown Organization",
        };
      }

      const org = orgMapByClientId.get(clientId);
      if (org) {
        return {
          key: org.id,
          organizationId: org.id,
          organizationName: org.name,
        };
      }

      return {
        key: `unknown-${clientId}`,
        organizationId: `unknown-${clientId}`,
        organizationName: `Unknown Organization (${clientId})`,
      };
    };

    const ensureRow = (
      map: Map<
        string,
        {
          organizationId: string;
          organizationName: string;
          total: number;
          secondary: number;
          tertiary: number;
        }
      >,
      clientId: number | null
    ) => {
      const orgRef = resolveOrg(clientId);
      let row = map.get(orgRef.key);

      if (!row) {
        row = {
          organizationId: orgRef.organizationId,
          organizationName: orgRef.organizationName,
          total: 0,
          secondary: 0,
          tertiary: 0,
        };
        map.set(orgRef.key, row);
      }

      return row;
    };

    const rowsFromMap = (
      map: Map<
        string,
        {
          organizationId: string;
          organizationName: string;
          total: number;
          secondary: number;
          tertiary: number;
        }
      >
    ): CategoryBreakdownRow[] =>
      Array.from(map.values())
        .map((row) => ({
          organizationId: row.organizationId,
          organizationName: row.organizationName,
          total: row.total,
          secondary: row.secondary,
          tertiary: row.tertiary,
        }))
        .sort((a, b) => b.total - a.total || a.organizationName.localeCompare(b.organizationName));

    const sumRows = (rows: CategoryBreakdownRow[]) => {
      let total = 0;
      let secondary = 0;
      let tertiary = 0;

      for (let index = 0; index < rows.length; index += 1) {
        total += rows[index].total;
        secondary += rows[index].secondary;
        tertiary += rows[index].tertiary;
      }

      return { total, secondary, tertiary };
    };

    const backupMap = new Map<
      string,
      { organizationId: string; organizationName: string; total: number; secondary: number; tertiary: number }
    >();

    const infrastructureMap = new Map<
      string,
      { organizationId: string; organizationName: string; total: number; secondary: number; tertiary: number }
    >();

    const alarmsMap = new Map<
      string,
      { organizationId: string; organizationName: string; total: number; secondary: number; tertiary: number }
    >();

    const combinedMap = new Map<
      string,
      { organizationId: string; organizationName: string; total: number; secondary: number; tertiary: number }
    >();

    for (let index = 0; index < filteredVeeam.jobs.length; index += 1) {
      const job = filteredVeeam.jobs[index];
      const severity = String(job.severity).toLowerCase();
      const isSuccess = severity === "success";
      const row = ensureRow(backupMap, job.clientId ?? null);
      row.total += 1;
      row.secondary += isSuccess ? 1 : 0;
      row.tertiary += isSuccess ? 0 : 1;
    }

    for (let index = 0; index < filteredVeeam.infraVMs.length; index += 1) {
      const vm = filteredVeeam.infraVMs[index] as unknown as Record<string, unknown>;
      const clientId = toNumberOrNull(vm.client_id ?? vm.clientId);
      const metrics = asRecord(asRecord(vm.raw_json).vm_metrics);
      const isProtected = Boolean(metrics.isProtected);
      const row = ensureRow(infrastructureMap, clientId);
      row.total += 1;
      row.secondary += isProtected ? 1 : 0;
      row.tertiary += isProtected ? 0 : 1;
    }

    for (let index = 0; index < filteredVeeam.alarmItems.length; index += 1) {
      const alarm = filteredVeeam.alarmItems[index];
      const isResolved = String(alarm.status).toLowerCase() === "resolved";
      const row = ensureRow(alarmsMap, toNumberOrNull(alarm.client_id));
      row.total += 1;
      row.secondary += isResolved ? 0 : 1;
      row.tertiary += isResolved ? 1 : 0;
    }

    const backupRows = rowsFromMap(backupMap);
    const infrastructureRows = rowsFromMap(infrastructureMap);
    const alarmsRows = rowsFromMap(alarmsMap);

    const mergeRows = (rows: CategoryBreakdownRow[]) => {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const existing = combinedMap.get(row.organizationId);

        if (!existing) {
          combinedMap.set(row.organizationId, {
            organizationId: row.organizationId,
            organizationName: row.organizationName,
            total: row.total,
            secondary: row.secondary,
            tertiary: row.tertiary,
          });
          continue;
        }

        existing.total += row.total;
        existing.secondary += row.secondary;
        existing.tertiary += row.tertiary;
      }
    };

    mergeRows(backupRows);
    mergeRows(infrastructureRows);
    mergeRows(alarmsRows);

    const combinedRows = rowsFromMap(combinedMap);
    const combined = sumRows(combinedRows);

    return {
      sectionBreakdowns: {
        backup: backupRows,
        infrastructure: infrastructureRows,
        alarms: alarmsRows,
      } as VeeamSectionBreakdowns,
      rows: combinedRows,
      total: combined.total,
      success: combined.secondary,
      failed: combined.tertiary,
    };
  }, [filteredVeeam, orgMapByClientId]);

  const veeamDrilldownData = useMemo<GlobalVeeamDrilldownData>(
    () => ({
      brData: filteredVeeam.brData,
      infraVMs: filteredVeeam.infraVMs,
      alarmItems: filteredVeeam.alarmItems,
      sectionBreakdowns: veeamAggregates.sectionBreakdowns,
      loading: initialLoading,
      error,
      lastUpdated,
    }),
    [filteredVeeam, veeamAggregates, initialLoading, error, lastUpdated]
  );

  const summary = useMemo<GlobalMetricSummary>(
    () => ({
      alerts: {
        total: alerts.length,
        active: alerts.filter((a) => !a.acknowledged && a.status !== "resolved").length,
        critical: alerts.filter((a) => {
          const sev = a.severity.toLowerCase();
          return sev === "critical" || sev === "disaster";
        }).length,
      },
      hosts: {
        total: hosts.length,
        enabled: hosts.filter((h) => h.status === 0).length,
        disabled: hosts.filter((h) => h.status !== 0).length,
      },
      reports: {
        total: filteredReportsMeta.total,
        daily: filteredReportsMeta.daily,
        weekly: filteredReportsMeta.weekly,
        monthly: filteredReportsMeta.monthly,
      },
      insights: {
        total: insights.length,
        predictions: insights.filter((i) => typeOfInsight(i.type).includes("predict")).length,
        anomalies: insights.filter((i) => typeOfInsight(i.type).includes("anomal")).length,
      },
      veeam: {
        jobs: veeamAggregates.total,
        success: veeamAggregates.success,
        failed: veeamAggregates.failed,
      },
    }),
    [alerts, hosts, filteredReportsMeta, insights, veeamAggregates]
  );

  const buildBreakdown = useCallback(
    <T extends { organizationId: string | null; organizationName: string }>(
      rows: T[],
      mapper: (items: T[]) => { total: number; secondary: number; tertiary: number }
    ): CategoryBreakdownRow[] => {
      const grouped = new Map<string, T[]>();

      rows.forEach((row) => {
        const orgId = row.organizationId ?? "unknown";
        if (!grouped.has(orgId)) grouped.set(orgId, []);
        grouped.get(orgId)!.push(row);
      });

      return Array.from(grouped.entries())
        .map(([orgId, items]) => {
          const baseOrg =
            orgMapById.get(orgId) ??
            organizations.find((o) => o.name === items[0]?.organizationName);

          const metrics = mapper(items);

          return {
            organizationId: baseOrg?.id ?? orgId,
            organizationName:
              baseOrg?.name ?? String(items[0]?.organizationName ?? "Unknown Organization"),
            ...metrics,
          };
        })
        .sort((a, b) => b.total - a.total || a.organizationName.localeCompare(b.organizationName));
    },
    [orgMapById, organizations]
  );

  const alertsBreakdown = useMemo(
    () =>
      buildBreakdown(alerts, (items) => ({
        total: items.length,
        secondary: items.filter((a) => !a.acknowledged && a.status !== "resolved").length,
        tertiary: items.filter((a) => {
          const sev = String(a.severity).toLowerCase();
          return sev === "critical" || sev === "disaster";
        }).length,
      })),
    [alerts, buildBreakdown]
  );

  const hostsBreakdown = useMemo(
    () =>
      buildBreakdown(hosts, (items) => ({
        total: items.length,
        secondary: items.filter((h) => h.status === 0).length,
        tertiary: items.filter((h) => h.status !== 0).length,
      })),
    [hosts, buildBreakdown]
  );

  const reportsBreakdown = useMemo(() => {
    const rows: CategoryBreakdownRow[] = [];

    filteredReportsMeta.breakdownByOrg.forEach((metrics, orgIdKey) => {
      const baseOrg = orgMapById.get(orgIdKey);
      rows.push({
        organizationId: baseOrg?.id ?? orgIdKey,
        organizationName: baseOrg?.name ?? metrics.organizationName,
        total: metrics.total,
        secondary: metrics.daily,
        tertiary: metrics.weekly,
      });
    });

    return rows.sort(
      (a, b) => b.total - a.total || a.organizationName.localeCompare(b.organizationName)
    );
  }, [filteredReportsMeta, orgMapById]);

  const insightsBreakdown = useMemo(
    () =>
      buildBreakdown(insights, (items) => ({
        total: items.length,
        secondary: items.filter((i) => typeOfInsight(i.type).includes("predict")).length,
        tertiary: items.filter((i) => typeOfInsight(i.type).includes("anomal")).length,
      })),
    [insights, buildBreakdown]
  );

  const veeamBreakdown = useMemo(() => veeamAggregates.rows, [veeamAggregates]);

  return {
    loading: initialLoading,
    error,
    isConnected,
    lastUpdated,
    refresh: () => fetchAll(false),
    summary,
    alerts,
    hosts,
    reports,
    insights,
    veeamJobs,
    veeamDrilldownData,
    alertsBreakdown,
    hostsBreakdown,
    reportsBreakdown,
    insightsBreakdown,
    veeamBreakdown,
  };
};

export default useGlobalInfrastructureMetrics;
