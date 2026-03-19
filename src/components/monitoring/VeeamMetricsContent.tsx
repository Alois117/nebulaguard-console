import { useVeeamAlarms } from "@/hooks/useVeeamAlarms";
import { useVeeamInfrastructure } from "@/hooks/useVeeamInfrastructure";
import VeeamMetricsContentView from "./VeeamMetricsContentView";

const VeeamMetricsContent = () => {
  const alarmsView = useVeeamAlarms({ pageSize: 10 });
  const infrastructureView = useVeeamInfrastructure({ pageSize: 9 });

  return (
    <VeeamMetricsContentView
      alarmsView={alarmsView}
      infrastructureView={infrastructureView}
    />
  );
};

export default VeeamMetricsContent;
