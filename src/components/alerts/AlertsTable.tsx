import { useState } from "react";
import { Clock, Server, Tag } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SeverityBadge, { Severity } from "./SeverityBadge";
import AlertActionMenu from "./AlertActionMenu";

export interface Alert {
  id: number;
  severity: Severity;
  host: string;
  category?: string;
  scope?: string;
  problem: string;
  duration: string;
  status: "active" | "acknowledged" | "resolved";
  timestamp: string;
}

interface AlertsTableProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onAcknowledge?: (id: number) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const AlertsTable = ({
  alerts,
  onAlertClick,
  onAcknowledge,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: AlertsTableProps) => {
  if (alerts.length === 0) {
    return (
      <div className="cyber-card text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Server className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Alerts Found</h3>
        <p className="text-muted-foreground">
          All systems are operating normally. No active alerts at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="cyber-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-48">Severity</TableHead>
              <TableHead>Host / Category</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead className="w-32">Duration</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow
                key={alert.id}
                onClick={() => onAlertClick?.(alert)}
                className="cursor-pointer hover:bg-surface/50 transition-colors border-border/30"
              >
                <TableCell>
                  <SeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{alert.host}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.category && (
                        <Badge variant="outline" className="gap-1">
                          <Tag className="w-3 h-3" />
                          {alert.category}
                        </Badge>
                      )}
                      {alert.scope && (
                        <Badge variant="secondary" className="text-xs">
                          {alert.scope}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium line-clamp-2">{alert.problem}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{alert.duration}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {alert.status === "acknowledged" ? (
                    <Badge variant="outline" className="border-success/50 text-success">
                      Acknowledged
                    </Badge>
                  ) : alert.status === "resolved" ? (
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-accent/50 text-accent">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <AlertActionMenu
                    alertId={alert.id}
                    isAcknowledged={alert.status === "acknowledged"}
                    onAcknowledge={onAcknowledge}
                    onViewDetails={() => onAlertClick?.(alert)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsTable;
