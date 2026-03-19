import type { InfraVM } from "@/hooks/super-admin/organizations/useOrganizationVeeamMetrics";

type UnknownRecord = Record<string, unknown>;

export interface VeeamVmStatusCounts {
  total: number;
  protected: number;
  unprotected: number;
  poweredOn: number;
  poweredOff: number;
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

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (["true", "yes", "1", "on", "protected"].includes(lower)) return true;
    if (["false", "no", "0", "off", "unprotected", "not protected"].includes(lower)) {
      return false;
    }
  }

  return null;
};

const normalizePowerState = (value: unknown): "PoweredOn" | "PoweredOff" | "Unknown" => {
  const lower = toStringValue(value).toLowerCase();
  if (
    [
      "poweredon",
      "powered on",
      "powered_on",
      "poweron",
      "running",
      "on",
    ].includes(lower)
  ) {
    return "PoweredOn";
  }
  if (
    [
      "poweredoff",
      "powered off",
      "powered_off",
      "poweroff",
      "off",
      "stopped",
    ].includes(lower)
  ) {
    return "PoweredOff";
  }
  return "Unknown";
};

const resolveRawJson = (vm: UnknownRecord): UnknownRecord => {
  const directRaw = vm.raw_json;
  if (directRaw && typeof directRaw === "object") return asRecord(directRaw);
  const parsedRaw = parseRecordString(directRaw);
  if (Object.keys(parsedRaw).length > 0) return parsedRaw;
  return vm;
};

const resolveMetrics = (vm: UnknownRecord, rawJson: UnknownRecord): UnknownRecord => {
  const nestedMetrics = asRecord(rawJson.vm_metrics);
  if (Object.keys(nestedMetrics).length > 0) return nestedMetrics;

  const directMetrics = asRecord(vm.vm_metrics);
  if (Object.keys(directMetrics).length > 0) return directMetrics;

  const fallbackMetrics = asRecord(rawJson.metrics);
  if (Object.keys(fallbackMetrics).length > 0) return fallbackMetrics;

  return {};
};

const resolveProtection = (
  vmRecord: UnknownRecord,
  rawJson: UnknownRecord,
  metrics: UnknownRecord
): boolean => {
  const explicit =
    toBooleanOrNull(metrics.isProtected) ??
    toBooleanOrNull(metrics.is_protected) ??
    toBooleanOrNull(metrics.protected) ??
    toBooleanOrNull(metrics.protectionStatus) ??
    toBooleanOrNull(metrics.protection_status) ??
    toBooleanOrNull(rawJson.isProtected) ??
    toBooleanOrNull(rawJson.is_protected) ??
    toBooleanOrNull(rawJson.protected) ??
    toBooleanOrNull(rawJson.protectionStatus) ??
    toBooleanOrNull(rawJson.protection_status) ??
    toBooleanOrNull(vmRecord.isProtected) ??
    toBooleanOrNull(vmRecord.is_protected) ??
    toBooleanOrNull(vmRecord.protected) ??
    toBooleanOrNull(vmRecord.protectionStatus) ??
    toBooleanOrNull(vmRecord.protection_status);

  if (explicit != null) return explicit;

  const protectionJobCount = Number(
    metrics.protectionJobUidsCount ??
      metrics.protection_job_uids_count ??
      rawJson.protectionJobUidsCount ??
      rawJson.protection_job_uids_count ??
      vmRecord.protectionJobUidsCount ??
      vmRecord.protection_job_uids_count
  );
  if (Number.isFinite(protectionJobCount) && protectionJobCount > 0) {
    return true;
  }

  // Fallback: if last protected date exists, treat as protected.
  const lastProtectedDate = toStringValue(
    metrics.lastProtectedDate ??
      metrics.last_protected_date ??
      rawJson.lastProtectedDate ??
      rawJson.last_protected_date ??
      vmRecord.lastProtectedDate ??
      vmRecord.last_protected_date
  );
  return lastProtectedDate.length > 0;
};

const resolvePowerState = (
  vmRecord: UnknownRecord,
  rawJson: UnknownRecord,
  metrics: UnknownRecord
): "PoweredOn" | "PoweredOff" | "Unknown" =>
  normalizePowerState(
    metrics.powerState ??
      metrics.power_state ??
      metrics.runtimePowerState ??
      metrics.runtime_power_state ??
      metrics.guestPowerState ??
      metrics.guest_power_state ??
      metrics.state ??
      metrics.status ??
      rawJson.powerState ??
      rawJson.power_state ??
      rawJson.runtimePowerState ??
      rawJson.runtime_power_state ??
      rawJson.guestPowerState ??
      rawJson.guest_power_state ??
      rawJson.state ??
      rawJson.status ??
      vmRecord.powerState ??
      vmRecord.power_state ??
      vmRecord.runtimePowerState ??
      vmRecord.runtime_power_state ??
      vmRecord.guestPowerState ??
      vmRecord.guest_power_state ??
      vmRecord.state ??
      vmRecord.status
  );

export const getVeeamVmStatusCounts = (vms: InfraVM[]): VeeamVmStatusCounts => {
  const counts: VeeamVmStatusCounts = {
    total: 0,
    protected: 0,
    unprotected: 0,
    poweredOn: 0,
    poweredOff: 0,
  };

  for (let index = 0; index < vms.length; index += 1) {
    const vmRecord = asRecord(vms[index]);
    const rawJson = resolveRawJson(vmRecord);
    const metrics = resolveMetrics(vmRecord, rawJson);

    counts.total += 1;

    const isProtected = resolveProtection(vmRecord, rawJson, metrics);
    if (isProtected) counts.protected += 1;
    else counts.unprotected += 1;

    const powerState = resolvePowerState(vmRecord, rawJson, metrics);
    if (powerState === "PoweredOn") counts.poweredOn += 1;
    if (powerState === "PoweredOff") counts.poweredOff += 1;
  }

  return counts;
};
