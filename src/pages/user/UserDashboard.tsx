import UserLayout from "@/layouts/UserLayout";
import KPICard from "@/components/dashboard/KPICard";
import { Server, AlertTriangle, Activity, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const UserDashboard = () => {
  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor your infrastructure health and performance
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Hosts"
            value="142"
            change="+5.2%"
            changeType="positive"
            icon={Server}
            color="primary"
          />
          <KPICard
            title="Active Problems"
            value="23"
            change="-12%"
            changeType="positive"
            icon={AlertTriangle}
            color="warning"
          />
          <KPICard
            title="Avg Response Time"
            value="124ms"
            change="+8%"
            changeType="negative"
            icon={Activity}
            color="accent"
          />
          <KPICard
            title="System Uptime"
            value="99.8%"
            change="+0.2%"
            changeType="positive"
            icon={TrendingUp}
            color="success"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-lg font-semibold mb-4">Recent Problems</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse-glow" />
                    <div>
                      <p className="font-medium text-sm">High CPU usage on web-server-{i}</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <h3 className="text-lg font-semibold mb-4">System Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>CPU Load</span>
                  <span className="text-primary">45%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary w-[45%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Memory Usage</span>
                  <span className="text-accent">68%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent to-primary w-[68%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Disk Usage</span>
                  <span className="text-success">32%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success to-primary w-[32%]" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
