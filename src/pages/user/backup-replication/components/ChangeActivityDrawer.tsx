import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Power, PowerOff } from "lucide-react";

import type { ChangedJob, Changes, ChangeSummary } from "@/pages/user/backup-replication/types";
import { formatDateTime } from "@/pages/user/backup-replication/utils/format";
import StatusBadge from "@/pages/user/backup-replication/components/shared/StatusBadge";
import TablePagination from "@/pages/user/backup-replication/components/shared/TablePagination";
import { usePagination } from "@/pages/user/backup-replication/hooks/usePagination";

interface ChangeActivityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: Changes | null;
  changeSummary: ChangeSummary | null;
  onSelectJob?: (job: ChangedJob) => void;
}

export default function ChangeActivityDrawer({
  open,
  onOpenChange,
  changes,
  changeSummary,
  onSelectJob,
}: ChangeActivityDrawerProps) {
  const [activeTab, setActiveTab] = useState("new");

  const tabData = {
    new: changes?.new ?? [],
    modified: changes?.modified ?? [],
    enabled: changes?.enabled ?? [],
    disabled: changes?.disabled ?? [],
  };
  const currentJobs = (tabData[activeTab as keyof typeof tabData] ?? []) as ChangedJob[];
  const changePagination = usePagination(currentJobs, { defaultPageSize: 10 });

  useEffect(() => {
    changePagination.setCurrentPage(1);
  }, [activeTab, changePagination.setCurrentPage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="text-xl">Change Activity</SheetTitle>
          <SheetDescription>Job lifecycle tracking and change history</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border border-emerald-500/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">New</div>
                  <div className="text-xl font-bold text-emerald-500">
                    {changeSummary?.newJobs ?? tabData.new.length}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-emerald-500" />
              </div>
            </Card>
            <Card className="border border-blue-500/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Modified</div>
                  <div className="text-xl font-bold text-blue-500">
                    {changeSummary?.modifiedJobs ?? tabData.modified.length}
                  </div>
                </div>
                <Pencil className="h-4 w-4 text-blue-500" />
              </div>
            </Card>
            <Card className="border border-amber-500/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Enabled</div>
                  <div className="text-xl font-bold text-amber-500">
                    {changeSummary?.enabledJobs ?? tabData.enabled.length}
                  </div>
                </div>
                <Power className="h-4 w-4 text-amber-500" />
              </div>
            </Card>
            <Card className="border border-red-500/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Disabled</div>
                  <div className="text-xl font-bold text-red-500">
                    {changeSummary?.disabledJobs ?? tabData.disabled.length}
                  </div>
                </div>
                <PowerOff className="h-4 w-4 text-red-500" />
              </div>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start bg-muted/30 p-1">
              <TabsTrigger value="new" className="gap-1 text-xs">
                New ({tabData.new.length})
              </TabsTrigger>
              <TabsTrigger value="modified" className="gap-1 text-xs">
                Modified ({tabData.modified.length})
              </TabsTrigger>
              <TabsTrigger value="enabled" className="gap-1 text-xs">
                Enabled ({tabData.enabled.length})
              </TabsTrigger>
              <TabsTrigger value="disabled" className="gap-1 text-xs">
                Disabled ({tabData.disabled.length})
              </TabsTrigger>
            </TabsList>

            {Object.entries(tabData).map(([key, jobs]) => {
              const displayJobs =
                key === activeTab ? changePagination.paginatedData : (jobs as ChangedJob[]);
              const totalJobs = key === activeTab ? currentJobs.length : jobs.length;

              return (
                <TabsContent key={key} value={key} className="mt-4">
                  {totalJobs === 0 ? (
                    <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                      No jobs in this category
                    </div>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead>Job Name</TableHead>
                              <TableHead>Platform</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Changed At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayJobs.map((job, idx) => (
                              <TableRow
                                key={`${job.jobName}-${idx}`}
                                className="cursor-pointer hover:bg-muted/30"
                                onClick={() => onSelectJob?.(job)}
                              >
                                <TableCell className="font-medium">{job.jobName}</TableCell>
                                <TableCell>{job.platform ?? "-"}</TableCell>
                                <TableCell>
                                  <StatusBadge status={job.status} size="sm" />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDateTime(job.changedAt)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {key === activeTab && (
                        <TablePagination
                          currentPage={changePagination.currentPage}
                          totalPages={changePagination.totalPages}
                          totalItems={changePagination.totalItems}
                          startIndex={changePagination.startIndex}
                          endIndex={changePagination.endIndex}
                          pageSize={changePagination.pageSize}
                          onPageChange={changePagination.setCurrentPage}
                          onPageSizeChange={changePagination.setPageSize}
                          canGoNext={changePagination.canGoNext}
                          canGoPrevious={changePagination.canGoPrevious}
                          onFirstPage={changePagination.goToFirstPage}
                          onLastPage={changePagination.goToLastPage}
                          onNextPage={changePagination.goToNextPage}
                          onPreviousPage={changePagination.goToPreviousPage}
                        />
                      )}
                    </>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
