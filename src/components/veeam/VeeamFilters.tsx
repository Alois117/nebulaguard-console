"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { TransformedVeeamJob } from "@/hooks/useVeeamBackupAndReplication";

const timeRanges = [
  { label: "Last 1 hour", value: "1h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

interface VeeamFiltersProps {
  filterStatus: TransformedVeeamJob["status"] | null;
  onFilterStatusChange: (status: TransformedVeeamJob["status"] | null) => void;
  selectedTimeRange: string;
  onTimeRangeChange: (range: string) => void;
  customDateFrom?: Date;
  onCustomDateFromChange: (date?: Date) => void;
  customDateTo?: Date;
  onCustomDateToChange: (date?: Date) => void;
}

export default function VeeamFilters({
  filterStatus,
  onFilterStatusChange,
  selectedTimeRange,
  onTimeRangeChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
}: VeeamFiltersProps) {
  const [open, setOpen] = useState(false);

  const timeLabel = useMemo(() => {
    if (selectedTimeRange !== "custom") {
      return timeRanges.find(r => r.value === selectedTimeRange)?.label || "Time Range";
    }
    if (customDateFrom && customDateTo) {
      return `${format(customDateFrom, "MMM d, yyyy")} – ${format(customDateTo, "MMM d, yyyy")}`;
    }
    if (customDateFrom) return `From ${format(customDateFrom, "MMM d, yyyy")}`;
    if (customDateTo) return `To ${format(customDateTo, "MMM d, yyyy")}`;
    return "Custom range";
  }, [selectedTimeRange, customDateFrom, customDateTo]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status badges as toggle filters */}
      <Badge
        variant="outline"
        className={`cursor-pointer min-w-[80px] text-center ${
          filterStatus === "Success"
            ? "bg-success/20 text-success border-success ring-2 ring-success/50"
            : "hover:bg-success/10"
        }`}
        onClick={() => onFilterStatusChange(filterStatus === "Success" ? null : "Success")}
      >
        Success
      </Badge>

      <Badge
        variant="outline"
        className={`cursor-pointer min-w-[80px] text-center ${
          filterStatus === "Warning"
            ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500 ring-2 ring-yellow-500/50"
            : "hover:bg-yellow-500/10"
        }`}
        onClick={() => onFilterStatusChange(filterStatus === "Warning" ? null : "Warning")}
      >
        Warning
      </Badge>

      <Badge
        variant="outline"
        className={`cursor-pointer min-w-[80px] text-center ${
          filterStatus === "Failed"
            ? "bg-destructive/20 text-destructive border-destructive ring-2 ring-destructive/50"
            : "hover:bg-destructive/10"
        }`}
        onClick={() => onFilterStatusChange(filterStatus === "Failed" ? null : "Failed")}
      >
        Failed
      </Badge>

      {/* Time Range Dropdown */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-w-[170px] justify-start text-left"
          >
            <CalendarIcon className="h-4 w-4" />
            {timeLabel}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Time Range</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {timeRanges.map((range) => (
            <DropdownMenuCheckboxItem
              key={range.value}
              checked={selectedTimeRange === range.value}
              onCheckedChange={(checked) => {
                if (checked) {
                  onTimeRangeChange(range.value);
                  onCustomDateFromChange(undefined);
                  onCustomDateToChange(undefined);
                  setOpen(false);
                }
              }}
            >
              {range.label}
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator />

          <div className="p-3 space-y-4">
            <p className="text-xs font-medium text-muted-foreground">Custom Range</p>

            <div className="grid gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                    {customDateFrom ? format(customDateFrom, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={(date) => {
                      onCustomDateFromChange(date ?? undefined);
                      onTimeRangeChange("custom");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                    {customDateTo ? format(customDateTo, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={(date) => {
                      onCustomDateToChange(date ?? undefined);
                      onTimeRangeChange("custom");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {(selectedTimeRange !== "24h" || customDateFrom || customDateTo) && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onTimeRangeChange("24h");
                    onCustomDateFromChange(undefined);
                    onCustomDateToChange(undefined);
                    setOpen(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Time Filter
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear status if active */}
      {filterStatus && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => onFilterStatusChange(null)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear status
        </Button>
      )}
    </div>
  );
}