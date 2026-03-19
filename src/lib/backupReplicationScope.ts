import {
  deriveBackupReplicationTotalJobs,
  deriveBackupReplicationVmCounts,
  withCanonicalBackupReplicationVmCounts,
} from "@/lib/backupReplicationCounts";

export { deriveBackupReplicationTotalJobs } from "@/lib/backupReplicationCounts";

type UnknownRecord = Record<string, unknown>;

type BackupReplicationChangesRecord = {
  new: unknown[];
  modified: unknown[];
  enabled: unknown[];
  disabled: unknown[];
  unchanged: unknown[];
};

export interface BackupReplicationScopedDerivatives {
  summary: unknown;
  changeSummary: {
    totalJobs: number;
    newJobs: number;
    modifiedJobs: number;
    enabledJobs: number;
    disabledJobs: number;
  };
}

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const parseRecordString = (value: unknown): UnknownRecord => {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return {};
  }
};

const parseMaybeRecord = (value: unknown): UnknownRecord => {
  if (value && typeof value === "object") return asRecord(value);
  return parseRecordString(value);
};

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const extractClientIdFromBackupReplicationItem = (value: unknown): number | null => {
  const item = asRecord(value);
  const itemRawJson = parseMaybeRecord(item.raw_json);
  const itemPairedItem = asRecord(itemRawJson.pairedItem);
  const vm = asRecord(item.vm);
  const vmRawJson = parseMaybeRecord(vm.raw_json);
  const vmPairedItem = asRecord(vmRawJson.pairedItem);
  const parsedJob = asRecord(item.parsedJob);
  const firstJob = Array.isArray(item.jobs) ? asRecord(item.jobs[0]) : {};
  const firstJobRawJson = parseMaybeRecord(firstJob.raw_json);
  const firstParsedJob = asRecord(firstJob.parsedJob);

  return (
    toNumberOrNull(item.client_id ?? item.clientId) ??
    toNumberOrNull(itemRawJson.client_id ?? itemRawJson.clientId) ??
    toNumberOrNull(itemPairedItem.client_id ?? itemPairedItem.clientId) ??
    toNumberOrNull(vm.client_id ?? vm.clientId) ??
    toNumberOrNull(vmRawJson.client_id ?? vmRawJson.clientId) ??
    toNumberOrNull(vmPairedItem.client_id ?? vmPairedItem.clientId) ??
    toNumberOrNull(parsedJob.client_id ?? parsedJob.clientId) ??
    toNumberOrNull(firstJob.client_id ?? firstJob.clientId) ??
    toNumberOrNull(firstJobRawJson.client_id ?? firstJobRawJson.clientId) ??
    toNumberOrNull(firstParsedJob.client_id ?? firstParsedJob.clientId)
  );
};

export const defensivelyFilterBackupReplicationItems = <T,>(
  list: T[],
  clientId: number | null
): T[] => {
  if (clientId == null) return list;

  const hasVisibleClientIds = list.some((item) => extractClientIdFromBackupReplicationItem(item) != null);
  if (!hasVisibleClientIds) return list;

  return list.filter(
    (item) => extractClientIdFromBackupReplicationItem(item) === clientId
  );
};

export const normalizeBackupReplicationChanges = (changes: unknown): BackupReplicationChangesRecord => {
  const record = asRecord(changes);

  return {
    new: Array.isArray(record.new) ? record.new : [],
    modified: Array.isArray(record.modified) ? record.modified : [],
    enabled: Array.isArray(record.enabled) ? record.enabled : [],
    disabled: Array.isArray(record.disabled) ? record.disabled : [],
    unchanged: Array.isArray(record.unchanged) ? record.unchanged : [],
  };
};

export const deriveBackupReplicationChangeSummary = (changes: unknown) => {
  const normalized = normalizeBackupReplicationChanges(changes);
  const newJobs = normalized.new.length;
  const modifiedJobs = normalized.modified.length;
  const enabledJobs = normalized.enabled.length;
  const disabledJobs = normalized.disabled.length;

  return {
    totalJobs: newJobs + modifiedJobs + enabledJobs + disabledJobs,
    newJobs,
    modifiedJobs,
    enabledJobs,
    disabledJobs,
  };
};

export const deriveScopedBackupReplicationSummary = ({
  summary,
  matched,
  vmsWithoutJobs,
  jobsWithoutVMs,
  multiVMJobs,
  changes,
}: {
  summary: unknown;
  matched: unknown[];
  vmsWithoutJobs: unknown[];
  jobsWithoutVMs: unknown[];
  multiVMJobs: unknown[];
  changes: unknown;
}): BackupReplicationScopedDerivatives => {
  const vmCounts = deriveBackupReplicationVmCounts(matched, vmsWithoutJobs);
  const totalJobs = deriveBackupReplicationTotalJobs(matched, jobsWithoutVMs, multiVMJobs);

  return {
    summary: withCanonicalBackupReplicationVmCounts(summary, vmCounts, totalJobs),
    changeSummary: deriveBackupReplicationChangeSummary(changes),
  };
};
