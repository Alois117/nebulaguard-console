type UnknownRecord = Record<string, unknown>;

export interface NormalizedVeeamAlarm {
  client_id: number;
  alarm_id: string;
  dedupe_key: string;
  name: string;
  description: string;
  severity: string;
  status: string;
  entity_type: string;
  entity_name: string;
  triggered_at: string | null;
  resolved_at: string | null;
  first_seen: string | null;
  last_seen: string | null;
  seen_count: number;
  times_sent: number;
  reminder_interval?: number;
  first_ai_response?: string;
}

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const toNumberOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const safeString = (value: unknown): string => (typeof value === "string" ? value : "");

const parseTimeMs = (value: unknown): number => {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const severityFromOuterKey = (outerKey: string): string => {
  const map: Record<string, string> = {
    Error: "Critical",
    Warning: "Warning",
    Information: "Info",
    High: "High",
    Resolved: "Info",
  };
  return map[outerKey] ?? "Unknown";
};

const severityFromStatus = (statusRaw: string): string => {
  const lower = (statusRaw || "").toLowerCase();
  if (lower.includes("error") || lower.includes("critical")) return "Critical";
  if (lower.includes("warn")) return "Warning";
  if (lower.includes("high")) return "High";
  if (lower.includes("info")) return "Info";
  if (lower.includes("resolved")) return "Info";
  if (lower.includes("ack")) return "Warning";
  return "Unknown";
};

const normalizeStatus = (
  statusRaw: unknown,
  descriptionRaw: unknown,
  outerKey?: string
): string => {
  const status = String(statusRaw ?? "").trim().toLowerCase();
  const description = String(descriptionRaw ?? "").toLowerCase();
  const outer = String(outerKey ?? "").toLowerCase();

  if (outer === "resolved" || status === "resolved" || description.includes("back to normal")) {
    return "Resolved";
  }
  if (status === "acknowledged" || status === "ack") return "Acknowledged";
  if (status === "suppressed") return "Suppressed";
  return "Active";
};

const mapSingleAlarm = (item: unknown, index: number): NormalizedVeeamAlarm | null => {
  const entry = asRecord(item);
  const keys = Object.keys(entry);

  const groupedShape =
    keys.length === 1 &&
    entry[keys[0] as keyof typeof entry] &&
    typeof entry[keys[0] as keyof typeof entry] === "object";

  const flatShape =
    "client_id" in entry ||
    "clientId" in entry ||
    "alarm_name" in entry ||
    "alarmName" in entry ||
    "triggered_alarm_id" in entry ||
    "triggeredAlarmId" in entry ||
    "status" in entry;

  let outerKey = "Unknown";
  let inner: UnknownRecord = {};

  if (groupedShape) {
    outerKey = keys[0]!;
    inner = asRecord(entry[outerKey]);
  } else if (flatShape) {
    inner = entry;
    outerKey = String(inner.status ?? inner.severity ?? "Unknown");
  } else {
    return null;
  }

  if (!Object.keys(inner).length) return null;

  const description = String(inner.description ?? "");
  const status = normalizeStatus(inner.status, description, outerKey);
  const severity = groupedShape
    ? severityFromOuterKey(outerKey)
    : severityFromStatus(String(inner.status ?? inner.severity ?? ""));

  const clientId = toNumberOrNull(inner.client_id ?? inner.clientId) ?? 0;

  const rawAlarmId =
    safeString(inner.triggered_alarm_id) ||
    safeString(inner.triggeredAlarmId) ||
    safeString(inner.alarm_id) ||
    safeString(inner.alarmId);

  const rawDedupeKey = safeString(inner.dedupe_key) || safeString(inner.dedupeKey) || rawAlarmId;

  const alarmId = rawAlarmId || `${clientId}-alarm-${index}`;
  const dedupeKey = rawDedupeKey || alarmId;

  return {
    client_id: clientId,
    alarm_id: alarmId,
    dedupe_key: dedupeKey,
    name: String(inner.alarm_name ?? inner.alarmName ?? inner.name ?? ""),
    description,
    severity,
    status,
    entity_type: String(inner.object_type ?? inner.objectType ?? inner.entity_type ?? ""),
    entity_name: String(inner.object_name ?? inner.objectName ?? inner.entity_name ?? ""),
    triggered_at: inner.triggered_time ? String(inner.triggered_time) : null,
    resolved_at: inner.resolved_at ? String(inner.resolved_at) : null,
    first_seen: inner.first_seen ? String(inner.first_seen) : null,
    last_seen: inner.last_seen ? String(inner.last_seen) : null,
    seen_count: toNumberOrNull(inner.repeat_count ?? inner.repeatCount ?? inner.seen_count) ?? 0,
    times_sent: toNumberOrNull(inner.times_sent ?? inner.timesSent) ?? 0,
    reminder_interval: toNumberOrNull(inner.reminder_interval ?? inner.reminderInterval) ?? undefined,
    first_ai_response: inner.comment ? String(inner.comment) : undefined,
  };
};

export const mapVeeamAlarmsPayload = (payload: unknown[]): NormalizedVeeamAlarm[] => {
  const alarms: NormalizedVeeamAlarm[] = [];
  for (let index = 0; index < payload.length; index += 1) {
    const mapped = mapSingleAlarm(payload[index], index);
    if (mapped) alarms.push(mapped);
  }
  return alarms;
};

export const dedupeVeeamAlarmsByLatest = (
  alarms: NormalizedVeeamAlarm[]
): NormalizedVeeamAlarm[] => {
  const byKey = new Map<string, NormalizedVeeamAlarm>();

  for (let index = 0; index < alarms.length; index += 1) {
    const alarm = alarms[index];
    const key = `${alarm.client_id}::${alarm.dedupe_key || alarm.alarm_id || `idx-${index}`}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, alarm);
      continue;
    }

    const existingMs = parseTimeMs(existing.last_seen || existing.triggered_at || existing.first_seen);
    const currentMs = parseTimeMs(alarm.last_seen || alarm.triggered_at || alarm.first_seen);
    if (currentMs >= existingMs) byKey.set(key, alarm);
  }

  return Array.from(byKey.values());
};

