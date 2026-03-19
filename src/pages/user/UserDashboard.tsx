import UserLayout from "@/layouts/UserLayout";
import { DashboardContent } from "@/components/monitoring";

const UserDashboard = () => (
  <UserLayout>
    <DashboardContent basePath="/dashboard" />
  </UserLayout>
);

export default UserDashboard;
