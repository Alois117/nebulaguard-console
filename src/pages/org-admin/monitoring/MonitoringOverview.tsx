import OrgAdminLayout from "@/layouts/OrgAdminLayout";
import { DashboardContent } from "@/components/monitoring";

const MonitoringOverview = () => (
  <OrgAdminLayout>
    <DashboardContent basePath="/admin/monitoring" />
  </OrgAdminLayout>
);

export default MonitoringOverview;
