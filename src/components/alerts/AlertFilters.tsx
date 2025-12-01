import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AlertFiltersState {
  searchQuery: string;
  severities: string[];
  hosts: string[];
  timeRange: string;
}

interface AlertFiltersProps {
  filters: AlertFiltersState;
  onFiltersChange: (filters: AlertFiltersState) => void;
}

const AlertFilters = ({ filters, onFiltersChange }: AlertFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleTimeRangeChange = (value: string) => {
    onFiltersChange({ ...filters, timeRange: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      severities: [],
      hosts: [],
      timeRange: "24h"
    });
  };

  const hasActiveFilters = 
    filters.searchQuery || 
    filters.severities.length > 0 || 
    filters.hosts.length > 0 ||
    filters.timeRange !== "24h";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts by problem, host, or AI summary..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Time Range */}
        <Select value={filters.timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle Filters */}
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className={hasActiveFilters ? "border-primary" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              Active
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="glass-card rounded-xl p-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Severity Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <div className="space-y-2">
                {["disaster", "critical", "high", "warning", "average", "info"].map((severity) => (
                  <label key={severity} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.severities.includes(severity)}
                      onChange={(e) => {
                        const newSeverities = e.target.checked
                          ? [...filters.severities, severity]
                          : filters.severities.filter((s) => s !== severity);
                        onFiltersChange({ ...filters, severities: newSeverities });
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Host Filter (Placeholder) */}
            <div>
              <label className="text-sm font-medium mb-2 block">Host</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Hosts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hosts</SelectItem>
                  <SelectItem value="api">API Servers</SelectItem>
                  <SelectItem value="db">Database Servers</SelectItem>
                  <SelectItem value="web">Web Servers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter (Placeholder) */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertFilters;
