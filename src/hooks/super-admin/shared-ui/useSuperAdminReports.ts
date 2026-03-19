import { useCallback, useEffect, useMemo, useState } from "react";
import { WEBHOOK_CUSTOM_REPORT_URL } from "@/config/env";
import { safeParseResponse } from "@/lib/safeFetch";
import { useAuthenticatedFetch } from "@/keycloak/hooks/useAuthenticatedFetch";
import type { ReportCounts, ReportItem as SharedReportItem, ReportTab } from "@/hooks/useReports";
import { normalizeReportTemplateHtml } from "./reportTemplate";

interface SuperAdminReportSourceItem {
  id?: string;
  report_type: string;
  report_template?: unknown;
  created_at: Date | string;
  status?: string;
  client_id?: number;
  clientId?: number | null;
  organizationId?: string | null;
}

interface UseSuperAdminReportsOptions {
  reports: SuperAdminReportSourceItem[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  selectedOrganizationId?: string | null;
  selectedOrganizationClientId?: number | null;
}

interface UseSuperAdminReportsReturn {
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  counts: ReportCounts;
  paginatedReports: SharedReportItem[];
  filteredReports: SharedReportItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: ReportTab;
  setSelectedType: (type: ReportTab) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  customGenerating: boolean;
  customError: string | null;
  generateCustomReport: (from: Date, to: Date) => Promise<void>;
  customPaginatedReports: SharedReportItem[];
  customFilteredReports: SharedReportItem[];
  customSearchQuery: string;
  setCustomSearchQuery: (query: string) => void;
  customCurrentPage: number;
  setCustomCurrentPage: (page: number) => void;
  customTotalPages: number;
  customPageSize: number;
  customCount: number;
  customLoading: boolean;
}

const PAGE_SIZE = 8;
const CUSTOM_PAGE_SIZE = 8;

const asDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : new Date();
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
};

const toSharedReport = (report: SuperAdminReportSourceItem): SharedReportItem => ({
  report_type: report.report_type || "daily",
  report_template: normalizeReportTemplateHtml(report),
  created_at: asDate(report.created_at).toISOString(),
});

const toClientId = (report: SuperAdminReportSourceItem): number | null => {
  const value = report.client_id ?? report.clientId;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const filterByScope = (
  reports: SuperAdminReportSourceItem[],
  selectedOrganizationId?: string | null,
  selectedOrganizationClientId?: number | null
) => {
  if (!selectedOrganizationId && !selectedOrganizationClientId) return reports;

  return reports.filter((report) => {
    if (selectedOrganizationId && report.organizationId != null) {
      return report.organizationId === selectedOrganizationId;
    }

    if (selectedOrganizationClientId != null) {
      const clientId = toClientId(report);
      if (clientId == null) {
        // If the payload is already scoped and does not include client identifiers,
        // keep it visible for the selected organization.
        return true;
      }
      return clientId === selectedOrganizationClientId;
    }

    return true;
  });
};

const sortNewestFirst = (reports: SharedReportItem[]) =>
  [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

const useSuperAdminReports = ({
  reports,
  loading,
  error,
  isConnected,
  lastUpdated,
  selectedOrganizationId = null,
  selectedOrganizationClientId = null,
}: UseSuperAdminReportsOptions): UseSuperAdminReportsReturn => {
  const { authenticatedFetch } = useAuthenticatedFetch();

  const [selectedType, setSelectedType] = useState<ReportTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [customReports, setCustomReports] = useState<SharedReportItem[]>([]);
  const [customGenerating, setCustomGenerating] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customSearchQuery, setCustomSearchQuery] = useState("");
  const [customCurrentPage, setCustomCurrentPage] = useState(1);

  const scopedReports = useMemo(
    () => filterByScope(reports, selectedOrganizationId, selectedOrganizationClientId),
    [reports, selectedOrganizationId, selectedOrganizationClientId]
  );

  const sharedReports = useMemo(
    () => sortNewestFirst(scopedReports.map(toSharedReport)),
    [scopedReports]
  );

  const counts = useMemo<ReportCounts>(
    () => ({
      total: sharedReports.length,
      daily: sharedReports.filter((report) => report.report_type === "daily").length,
      weekly: sharedReports.filter((report) => report.report_type === "weekly").length,
      monthly: sharedReports.filter((report) => report.report_type === "monthly").length,
    }),
    [sharedReports]
  );

  const filteredReports = useMemo(() => {
    let result = sharedReports;

    if (selectedType === "daily" || selectedType === "weekly" || selectedType === "monthly") {
      result = result.filter((report) => report.report_type === selectedType);
    }

    if (selectedType === "custom") {
      result = result.filter(
        (report) => report.report_type === "custom" || report.report_type === "custom_range"
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((report) => {
        const createdAt = new Date(report.created_at);
        return (
          report.report_type.toLowerCase().includes(query) ||
          createdAt.toLocaleDateString().toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [sharedReports, selectedType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, searchQuery, selectedOrganizationId, selectedOrganizationClientId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  const generateCustomReport = useCallback(
    async (from: Date, to: Date) => {
      setCustomGenerating(true);
      setCustomError(null);

      try {
        const fromMs = from.getTime();
        const toMs = to.getTime();

        if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
          throw new Error("Invalid date range. End date must be after start date.");
        }

        const durationHours = Math.max(1, Math.round((toMs - fromMs) / (1000 * 60 * 60)));

        const body: Record<string, unknown> = {
          first_seen_start: new Date(fromMs).toISOString(),
          first_seen_end: new Date(toMs).toISOString(),
          durationHours,
          period_label: "custom_range",
        };

        if (selectedOrganizationClientId != null) {
          body.client_id = selectedOrganizationClientId;
        }

        const response = await authenticatedFetch(WEBHOOK_CUSTOM_REPORT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result = await safeParseResponse<unknown[]>(response, WEBHOOK_CUSTOM_REPORT_URL);
        if (!result.ok) {
          throw new Error(result.userMessage);
        }

        const rawItems = Array.isArray(result.data) ? result.data : [];
        const mapped = rawItems
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const record = item as Record<string, unknown>;
            const reportType = String(record.report_type ?? "custom");
            const createdAtValue = record.created_at;
            const createdAt =
              typeof createdAtValue === "string" && createdAtValue
                ? createdAtValue
                : new Date().toISOString();
            const template = normalizeReportTemplateHtml(record);

            return {
              report_type: reportType,
              report_template: template,
              created_at: createdAt,
            } as SharedReportItem;
          });

        const dedupedMap = new Map<string, SharedReportItem>();
        [...mapped, ...customReports].forEach((report) => {
          const key = `${report.report_type}_${report.created_at}`;
          if (!dedupedMap.has(key)) {
            dedupedMap.set(key, report);
          }
        });

        const deduped = sortNewestFirst(Array.from(dedupedMap.values()));
        setCustomReports(deduped);
        setCustomCurrentPage(1);
      } catch (err) {
        setCustomError(
          err instanceof Error
            ? err.message
            : "Failed to generate custom report. Please try again."
        );
      } finally {
        setCustomGenerating(false);
      }
    },
    [authenticatedFetch, selectedOrganizationClientId, customReports]
  );

  const customFilteredReports = useMemo(() => {
    const query = customSearchQuery.trim().toLowerCase();
    if (!query) return customReports;

    return customReports.filter((report) => {
      const createdAt = new Date(report.created_at);
      return (
        report.report_type.toLowerCase().includes(query) ||
        createdAt.toLocaleDateString().toLowerCase().includes(query)
      );
    });
  }, [customReports, customSearchQuery]);

  const customTotalPages = Math.max(
    1,
    Math.ceil(customFilteredReports.length / CUSTOM_PAGE_SIZE)
  );

  useEffect(() => {
    setCustomCurrentPage(1);
  }, [customSearchQuery]);

  useEffect(() => {
    if (customCurrentPage > customTotalPages) {
      setCustomCurrentPage(customTotalPages);
    }
  }, [customCurrentPage, customTotalPages]);

  const customPaginatedReports = useMemo(() => {
    const startIndex = (customCurrentPage - 1) * CUSTOM_PAGE_SIZE;
    return customFilteredReports.slice(startIndex, startIndex + CUSTOM_PAGE_SIZE);
  }, [customFilteredReports, customCurrentPage]);

  const displayLoading = loading && sharedReports.length === 0;

  return {
    loading: displayLoading,
    error,
    isConnected,
    lastUpdated,
    counts,
    paginatedReports,
    filteredReports,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    customGenerating,
    customError,
    generateCustomReport,
    customPaginatedReports,
    customFilteredReports,
    customSearchQuery,
    setCustomSearchQuery,
    customCurrentPage,
    setCustomCurrentPage,
    customTotalPages,
    customPageSize: CUSTOM_PAGE_SIZE,
    customCount: customReports.length,
    customLoading: false,
  };
};

export default useSuperAdminReports;
