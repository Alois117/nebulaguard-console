import { useState, useEffect, useCallback, useRef } from "react";

const WEBHOOK_URL = "http://10.100.12.54:5678/webhook/backupandreplication";
const REFRESH_INTERVAL = 5000; // 5 seconds

export interface VeeamJobMetrics {
  lastRun: string;
  lastRunDurationSec: number;
  avgDurationSec: number;
  lastTransferredDataBytes: number;
}

export interface VeeamParsedJob {
  job_type: string;
  target: string;
  schedule: string;
}

export interface VeeamMeta {
  platform: string;
}

export interface VeeamRawMessage {
  metrics: VeeamJobMetrics;
  parsed_job: VeeamParsedJob;
  meta: VeeamMeta;
}

export interface VeeamBackupJob {
  dedupe_key: string;
  category: string;
  vm_name: string;
  esxi_host: string;
  job_name: string;
  severity: string;
  raw_message: VeeamRawMessage;
}

export interface TransformedVeeamJob {
  id: string;
  vmName: string;
  jobName: string;
  esxiHost: string;
  status: "Success" | "Warning" | "Failed" | "Running" | "Unknown";
  lastRun: Date;
  durationSec: number;
  avgDurationSec: number;
  dataTransferredBytes: number;
  jobType: string;
  target: string;
  schedule: string;
  platform: string;
  category: string;
  dedupeKey: string;
  rawMessage: VeeamRawMessage;
}

// Map severity string to status
const mapSeverity = (severity: string): TransformedVeeamJob["status"] => {
  const lower = severity.toLowerCase();
  if (lower === "success") return "Success";
  if (lower === "warning") return "Warning";
  if (lower === "failed" || lower === "error") return "Failed";
  if (lower === "running" || lower === "in progress") return "Running";
  return "Unknown";
};

// Transform webhook data to our format
const transformVeeamJob = (job: VeeamBackupJob): TransformedVeeamJob => {
  return {
    id: job.dedupe_key,
    vmName: job.vm_name,
    jobName: job.job_name,
    esxiHost: job.esxi_host,
    status: mapSeverity(job.severity),
    lastRun: new Date(job.raw_message?.metrics?.lastRun || Date.now()),
    durationSec: job.raw_message?.metrics?.lastRunDurationSec || 0,
    avgDurationSec: job.raw_message?.metrics?.avgDurationSec || 0,
    dataTransferredBytes: job.raw_message?.metrics?.lastTransferredDataBytes || 0,
    jobType: job.raw_message?.parsed_job?.job_type || job.category || "BACKUP",
    target: job.raw_message?.parsed_job?.target || "Unknown",
    schedule: job.raw_message?.parsed_job?.schedule || "N/A",
    platform: job.raw_message?.meta?.platform || "Unknown",
    category: job.category,
    dedupeKey: job.dedupe_key,
    rawMessage: job.raw_message,
  };
};

// Format duration from seconds
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
};

// Format bytes to human-readable
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export interface VeeamCounts {
  success: number;
  warning: number;
  failed: number;
  running: number;
  total: number;
}

export interface UseVeeamBackupReturn {
  jobs: TransformedVeeamJob[];
  loading: boolean;
  error: string | null;
  counts: VeeamCounts;
  isConnected: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export const useVeeamBackupAndReplication = (): UseVeeamBackupReturn => {
  const [jobs, setJobs] = useState<TransformedVeeamJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobsMapRef = useRef<Map<string, TransformedVeeamJob>>(new Map());

  // Calculate counts from jobs
  const counts: VeeamCounts = {
    success: jobs.filter(j => j.status === "Success").length,
    warning: jobs.filter(j => j.status === "Warning").length,
    failed: jobs.filter(j => j.status === "Failed").length,
    running: jobs.filter(j => j.status === "Running").length,
    total: jobs.length,
  };

  // Fetch jobs from webhook
  const fetchJobs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await fetch(WEBHOOK_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle both array and single object responses
      const webhookJobs: VeeamBackupJob[] = Array.isArray(data) ? data : [data];
      
      // Transform to our format
      const transformedJobs = webhookJobs.map(transformVeeamJob);
      
      // Smart merge: only update changed jobs to avoid flicker
      const newJobsMap = new Map<string, TransformedVeeamJob>();
      transformedJobs.forEach(job => {
        const existing = jobsMapRef.current.get(job.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(job)) {
          newJobsMap.set(job.id, job);
        } else {
          newJobsMap.set(job.id, existing);
        }
      });
      
      jobsMapRef.current = newJobsMap;
      // Sort by lastRun descending (most recent first)
      const sortedJobs = Array.from(newJobsMap.values()).sort((a, b) => 
        b.lastRun.getTime() - a.lastRun.getTime()
      );
      setJobs(sortedJobs);
      setIsConnected(true);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch Veeam jobs:", err);
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      }
      setIsConnected(false);
      // Keep existing data on error
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchJobs(false);
  }, [fetchJobs]);

  // Set up auto-refresh every 5 seconds (silent refresh)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchJobs(true);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchJobs]);

  const refresh = useCallback(async () => {
    await fetchJobs(false);
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    counts,
    isConnected,
    lastUpdated,
    refresh,
  };
};

export default useVeeamBackupAndReplication;
