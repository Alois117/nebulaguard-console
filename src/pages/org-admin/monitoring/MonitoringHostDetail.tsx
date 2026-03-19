import OrgAdminLayout from "@/layouts/OrgAdminLayout";
import { HostDetailContent } from "@/components/monitoring";

const MonitoringHostDetail = () => (
  <OrgAdminLayout>
    <HostDetailContent backPath="/admin/monitoring/zabbix" />
  </OrgAdminLayout>
);

export default MonitoringHostDetail;
