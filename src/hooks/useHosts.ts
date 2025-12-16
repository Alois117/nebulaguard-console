import { useState, useEffect, useCallback, useRef } from "react";

const WEBHOOK_URL = "http://10.100.12.54:5678/webhook/zabbix/host-details";
const REFRESH_INTERVAL = 5000; // 5 seconds

export interface HostMetrics {
  hostid: string;
  host: string;
  name?: string;
  status?: string;
  ip?: string;
  hostgroups?: Array<{
    groupid: string;
    name: string;
  }>;
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    uptime?: string;
  };
  collected_at?: string;
}

export interface Host {
  id: string;
  name: string;
  displayName: string;
  ip: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  group: string;
  collectedAt: string | null;
}

// Determine host status based on metrics
const determineStatus = (metrics?: HostMetrics["metrics"], hostStatus?: string): Host["status"] => {
  if (hostStatus === "1") return "critical"; // Host disabled in Zabbix
  if (!metrics) return "unknown";
  
  const { cpu = 0, memory = 0 } = metrics;
  if (cpu > 90 || memory > 90) return "critical";
  if (cpu > 70 || memory > 70) return "warning";
  return "healthy";
};

// Extract primary group name
const extractGroup = (hostgroups?: HostMetrics["hostgroups"]): string => {
  if (!hostgroups || hostgroups.length === 0) return "Ungrouped";
  return hostgroups[0].name;
};

// Transform webhook data to our Host format
const transformWebhookHost = (webhook: HostMetrics): Host => {
  return {
    id: webhook.hostid,
    name: webhook.host,
    displayName: webhook.name || webhook.host,
    ip: webhook.ip || "N/A",
    status: determineStatus(webhook.metrics, webhook.status),
    cpu: webhook.metrics?.cpu ?? 0,
    memory: webhook.metrics?.memory ?? 0,
    disk: webhook.metrics?.disk ?? 0,
    uptime: webhook.metrics?.uptime || "N/A",
    group: extractGroup(webhook.hostgroups),
    collectedAt: webhook.collected_at || null,
  };
};

export interface HostCounts {
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
  total: number;
}

export interface UseHostsReturn {
  hosts: Host[];
  loading: boolean;
  error: string | null;
  counts: HostCounts;
  groups: string[];
  isConnected: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export const useHosts = (): UseHostsReturn => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hostsMapRef = useRef<Map<string, Host>>(new Map());

  // Calculate counts from hosts
  const counts: HostCounts = {
    healthy: hosts.filter(h => h.status === "healthy").length,
    warning: hosts.filter(h => h.status === "warning").length,
    critical: hosts.filter(h => h.status === "critical").length,
    unknown: hosts.filter(h => h.status === "unknown").length,
    total: hosts.length,
  };

  // Extract unique groups
  const groups = Array.from(new Set(hosts.map(h => h.group))).filter(g => g !== "Ungrouped");

  // Fetch hosts from webhook
  const fetchHosts = useCallback(async (silent = false) => {
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
      const webhookHosts: HostMetrics[] = Array.isArray(data) ? data : [data];
      
      // Transform to our format
      const transformedHosts = webhookHosts.map(transformWebhookHost);
      
      // Smart merge: only update changed hosts to avoid flicker
      const newHostsMap = new Map<string, Host>();
      transformedHosts.forEach(host => {
        const existing = hostsMapRef.current.get(host.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(host)) {
          newHostsMap.set(host.id, host);
        } else {
          newHostsMap.set(host.id, existing);
        }
      });
      
      hostsMapRef.current = newHostsMap;
      setHosts(Array.from(newHostsMap.values()));
      setIsConnected(true);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch hosts:", err);
      // Don't clear existing data on error - keep last successful fetch
      if (hosts.length === 0) {
        setError(err instanceof Error ? err.message : "Failed to fetch hosts");
      }
      setIsConnected(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [hosts.length]);

  // Initial fetch
  useEffect(() => {
    fetchHosts(false);
  }, []);

  // Set up auto-refresh every 5 minutes (silent refresh)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchHosts(true);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchHosts]);

  // WebSocket simulation layer - ready for future upgrade
  useEffect(() => {
    // When endpoint supports WebSocket, implement here:
    // const ws = new WebSocket('ws://10.100.12.54:5678/ws/hosts');
    // ws.onmessage = (event) => {
    //   const newHost = JSON.parse(event.data);
    //   // Smart merge into hosts
    // };
    
    console.log("[WebSocket] Hosts - Simulated connection active - using polling fallback");
    
    return () => {
      console.log("[WebSocket] Hosts - Simulated connection closed");
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchHosts(false);
  }, [fetchHosts]);

  return {
    hosts,
    loading,
    error,
    counts,
    groups,
    isConnected,
    lastUpdated,
    refresh,
  };
};

export default useHosts;
