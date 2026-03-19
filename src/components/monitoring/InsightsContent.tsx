import { useCallback, useEffect, useState } from "react";
import { useAiInsights } from "@/hooks/useAiInsights";
import { isItemRead, markItemRead } from "@/utils/readState";
import { useAuth } from "@/keycloak/context/AuthContext";
import InsightsContentView from "./InsightsContentView";

const InsightsContent = () => {
  const { decodedToken } = useAuth();
  const userId = decodedToken?.sub || "";

  const {
    paginatedInsights,
    loading,
    error,
    isConnected,
    lastUpdated,
    currentPage,
    totalPages,
    totalCount,
    setCurrentPage,
    startIndex,
    endIndex,
    timeFilter,
    setTimeFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    highPriorityCount,
    last24hCount,
    mostAffectedHost,
    refresh,
  } = useAiInsights({ pageSize: 8 });

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || paginatedInsights.length === 0) return;
    const readSet = new Set<string>();
    paginatedInsights.forEach((insight) => {
      if (isItemRead(userId, insight.id)) {
        readSet.add(insight.id);
      }
    });
    setReadIds(readSet);
  }, [userId, paginatedInsights]);

  const handleMarkRead = useCallback(
    (id: string) => {
      if (!userId) return;
      markItemRead(userId, id);
      setReadIds((prev) => new Set(prev).add(id));
    },
    [userId]
  );

  const handleIsRead = useCallback((id: string) => readIds.has(id), [readIds]);

  return (
    <InsightsContentView
      paginatedInsights={paginatedInsights}
      loading={loading}
      error={error}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      setCurrentPage={setCurrentPage}
      startIndex={startIndex}
      endIndex={endIndex}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      customDateFrom={customDateFrom}
      setCustomDateFrom={setCustomDateFrom}
      customDateTo={customDateTo}
      setCustomDateTo={setCustomDateTo}
      highPriorityCount={highPriorityCount}
      last24hCount={last24hCount}
      mostAffectedHost={mostAffectedHost}
      refresh={refresh}
      isInsightRead={handleIsRead}
      onMarkInsightRead={handleMarkRead}
    />
  );
};

export default InsightsContent;
