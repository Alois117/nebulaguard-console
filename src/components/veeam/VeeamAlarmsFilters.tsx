import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AlarmStatus, AlarmSeverity, TimeRange } from "@/hooks/useVeeamAlarms";

interface VeeamAlarmsFiltersProps {
  // ✅ "All" everywhere (non-nullable)
  filterStatus: AlarmStatus;
  onFilterStatusChange: (status: AlarmStatus) => void;

  filterSeverity: AlarmSeverity;
  onFilterSeverityChange: (severity: AlarmSeverity) => void;

  // ✅ "All" everywhere (string, default "All")
  filterEntityType: string;
  onFilterEntityTypeChange: (entityType: string) => void;

  // Should include "All" first (hook provides this)
  entityTypes: string[];

  // ✅ includes "all"
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;

  customDateFrom: Date | undefined;
  onCustomDateFromChange: (date: Date | undefined) => void;
  customDateTo: Date | undefined;
  onCustomDateToChange: (date: Date | undefined) => void;
}

const VeeamAlarmsFilters = ({
  filterStatus,
  onFilterStatusChange,
  filterSeverity,
  onFilterSeverityChange,
  filterEntityType,
  onFilterEntityTypeChange,
  entityTypes,
  timeRange,
  onTimeRangeChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
}: VeeamAlarmsFiltersProps) => {
  const hasActiveFilters =
    filterStatus !== "All" ||
    filterSeverity !== "All" ||
    filterEntityType !== "All" ||
    timeRange !== "all";

  const clearFilters = () => {
    onFilterStatusChange("All");
    onFilterSeverityChange("All");
    onFilterEntityTypeChange("All");
    onTimeRangeChange("all");
    onCustomDateFromChange(undefined);
    onCustomDateToChange(undefined);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status Filter */}
      <Select value={filterStatus} onValueChange={(v) => onFilterStatusChange(v as AlarmStatus)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Status</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Acknowledged">Acknowledged</SelectItem>
          <SelectItem value="Resolved">Resolved</SelectItem>
          <SelectItem value="Suppressed">Suppressed</SelectItem>
        </SelectContent>
      </Select>

      {/* Severity Filter */}
      <Select value={filterSeverity} onValueChange={(v) => onFilterSeverityChange(v as AlarmSeverity)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Severity</SelectItem>
          <SelectItem value="Critical">Critical</SelectItem>
          <SelectItem value="Warning">Warning</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Info">Info</SelectItem>
          <SelectItem value="Unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>

      {/* Entity Type Filter */}
      <Select value={filterEntityType} onValueChange={(v) => onFilterEntityTypeChange(v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Entity Type" />
        </SelectTrigger>
        <SelectContent>
          {entityTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type === "All" ? "All Entities" : type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Time Range Filter */}
      <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Time Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="1h">Last 1 hour</SelectItem>
          <SelectItem value="24h">Last 24 hours</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      {timeRange === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[130px] justify-start text-left font-normal",
                  !customDateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateFrom ? format(customDateFrom, "PP") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateFrom}
                onSelect={onCustomDateFromChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[130px] justify-start text-left font-normal",
                  !customDateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateTo ? format(customDateTo, "PP") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateTo}
                onSelect={onCustomDateToChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      )}
    </div>
  );
};

export default VeeamAlarmsFilters;