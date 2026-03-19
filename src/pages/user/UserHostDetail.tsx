import UserLayout from "@/layouts/UserLayout";
import { HostDetailContent } from "@/components/monitoring";

const UserHostDetail = () => (
  <UserLayout>
    <HostDetailContent backPath="/dashboard/zabbix" />
  </UserLayout>
);

export default UserHostDetail;
