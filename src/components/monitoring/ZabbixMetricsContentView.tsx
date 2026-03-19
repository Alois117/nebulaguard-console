import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Server, CheckCircle, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import AlertsTable, { type Alert as DashboardAlert } from "@/components/alerts/AlertsTable";
import AlertFilters, { type StatusFilter, type TimeRange } from "@/components/alerts/AlertFilters";
import AlertSummaryCards from "@/components/alerts/AlertSummaryCards";
import { type AlertSeverity } from "@/components/alerts/SeverityBadge";
import {
  ZabbixHostsSummaryCards,
  ZabbixHostsFilters,
  ZabbixHostsTable,
} from "@/components/zabbix/hosts";
import type {
  ZabbixHost,
  ZabbixHostCounts,
  ZabbixHostStatusFilter,
} from "@/hooks/useZabbixHosts";
import type { AlertCounts } from "@/hooks/useAlerts";

export interface ZabbixAlertsViewModel {
  alerts: DashboardAlert[];
  loading: boolean;
  counts: AlertCounts;
  isConnected: boolean;
  lastUpdated: Date | null;
}

export interface ZabbixHostsViewModel {
  paginatedHosts: ZabbixHost[];
  loading: boolean;
  error: string | null;
  counts: ZabbixHostCounts;
  isConnected: boolean;
  lastUpdated: Date | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  statusFilter: ZabbixHostStatusFilter;
  setStatusFilter: (status: ZabbixHostStatusFilter) => void;
  clearFilters: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  hosts: ZabbixHost[];
  uniqueGroups: string[];
  onHostClick?: (host: ZabbixHost) => void;
}

interface ZabbixMetricsContentViewProps {
  alertsView: ZabbixAlertsViewModel;
  hostsView: ZabbixHostsViewModel;
  title?: string;
  description?: string;
  initialTab?: "alerts" | "hosts";
  initialSearchQuery?: string;
}

const ZabbixMetricsContentView = ({
  alertsView,
  hostsView,
  title = "Zabbix Metrics",
  description = "Manage Zabbix alerts and monitored hosts",
  initialTab = "alerts",
  initialSearchQuery = "",
}: ZabbixMetricsContentViewProps) => {
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("all");
  const [alertSearchQuery, setAlertSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"alerts" | "hosts">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setAlertSearchQuery(initialSearchQuery);
    hostsView.setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery, hostsView.setSearchQuery]);

  const hasActiveHostFilters =
    hostsView.searchQuery !== "" ||
    hostsView.selectedGroup !== null ||
    hostsView.statusFilter !== "all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "alerts" | "hosts")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="hosts" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Hosts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">{alertsView.counts.total} active alerts</p>
              <div className="flex items-center gap-1 text-xs">
                {alertsView.isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-success" />
                    <span className="text-success">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-destructive" />
                    <span className="text-destructive">Offline</span>
                  </>
                )}
              </div>
              {alertsView.lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated: {alertsView.lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <Button className="bg-gradient-to-r from-success to-primary hover:opacity-90 text-background">
              <CheckCircle className="w-4 h-4 mr-2" />
              Acknowledge All
            </Button>
          </div>

          <AlertSummaryCards counts={alertsView.counts} />

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                className="pl-10"
                value={alertSearchQuery}
                onChange={(event) => setAlertSearchQuery(event.target.value)}
              />
            </div>
            <AlertFilters
              selectedSeverity={selectedSeverity}
              onSeverityChange={setSelectedSeverity}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              selectedTimeRange={selectedTimeRange}
              onTimeRangeChange={setSelectedTimeRange}
            />
          </div>

          <AlertsTable
            alerts={alertsView.alerts}
            loading={alertsView.loading}
            selectedSeverity={selectedSeverity}
            statusFilter={statusFilter}
            timeRange={selectedTimeRange}
            searchQuery={alertSearchQuery}
          />
        </TabsContent>

        <TabsContent value="hosts" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">{hostsView.counts.total} monitored hosts</p>
              <div className="flex items-center gap-1 text-xs">
                {hostsView.isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-success" />
                    <span className="text-success">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-destructive" />
                    <span className="text-destructive">Offline</span>
                  </>
                )}
              </div>
              {hostsView.lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated: {hostsView.lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <ZabbixHostsSummaryCards counts={hostsView.counts} />

          <ZabbixHostsFilters
            searchQuery={hostsView.searchQuery}
            onSearchChange={hostsView.setSearchQuery}
            selectedGroup={hostsView.selectedGroup}
            onGroupChange={hostsView.setSelectedGroup}
            statusFilter={hostsView.statusFilter}
            onStatusChange={hostsView.setStatusFilter}
            uniqueGroups={hostsView.uniqueGroups}
            onClearFilters={hostsView.clearFilters}
            hasActiveFilters={hasActiveHostFilters}
          />

          <ZabbixHostsTable
            hosts={hostsView.paginatedHosts}
            loading={hostsView.loading}
            error={hostsView.error}
            currentPage={hostsView.currentPage}
            totalPages={hostsView.totalPages}
            pageSize={hostsView.pageSize}
            totalHosts={hostsView.hosts.length}
            onPageChange={hostsView.setCurrentPage}
            onHostClick={hostsView.onHostClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ZabbixMetricsContentView;
