type MatchedVmLike = {
  jobs?: unknown[] | null;
  vm?: {
    name?: string | null;
  } | null;
} | null;

type UnprotectedVmLike = {
  name?: string | null;
} | null;

type SummaryLike = {
  overview?: {
    totalVMs?: number;
    totalJobs?: number;
  };
  protection?: {
    protectedVMs?: number;
    unprotectedVMs?: number;
  };
};

export interface BackupReplicationVmCounts {
  totalVMs: number;
  protectedVMs: number;
  unprotectedVMs: number;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const deriveBackupReplicationVmCounts = (
  matched: MatchedVmLike[] = [],
  vmsWithoutJobs: UnprotectedVmLike[] = []
): BackupReplicationVmCounts => {
  const protectedVMs = Array.isArray(matched) ? matched.length : 0;
  const unprotectedVMs = Array.isArray(vmsWithoutJobs) ? vmsWithoutJobs.length : 0;

  return {
    totalVMs: protectedVMs + unprotectedVMs,
    protectedVMs,
    unprotectedVMs,
  };
};

export const deriveBackupReplicationTotalJobs = (
  matched: MatchedVmLike[] = [],
  jobsWithoutVMs: unknown[] = [],
  multiVMJobs: unknown[] = []
): number => {
  const matchedJobs = Array.isArray(matched)
    ? matched.reduce(
        (total, item) => total + (Array.isArray(item?.jobs) ? item.jobs.length : 0),
        0
      )
    : 0;
  const orphanJobs = Array.isArray(jobsWithoutVMs) ? jobsWithoutVMs.length : 0;
  const multiVmJobCount = Array.isArray(multiVMJobs) ? multiVMJobs.length : 0;

  return matchedJobs + orphanJobs + multiVmJobCount;
};

export const withCanonicalBackupReplicationVmCounts = (
  summary: unknown,
  counts: BackupReplicationVmCounts,
  totalJobs?: number
): SummaryLike => {
  const record = asRecord(summary);
  const overview = asRecord(record.overview);
  const protection = asRecord(record.protection);
  const overviewTotalJobs = Number(overview.totalJobs);
  const normalizedTotalJobs =
    typeof totalJobs === "number" && Number.isFinite(totalJobs)
      ? totalJobs
      : Number.isFinite(overviewTotalJobs)
        ? overviewTotalJobs
        : undefined;

  return {
    ...record,
    overview: {
      ...overview,
      totalVMs: counts.totalVMs,
      totalJobs: normalizedTotalJobs,
    },
    protection: {
      ...protection,
      protectedVMs: counts.protectedVMs,
      unprotectedVMs: counts.unprotectedVMs,
    },
  };
};
