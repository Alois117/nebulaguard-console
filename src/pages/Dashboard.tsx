import { Server, AlertTriangle, CheckCircle, Activity, TrendingUp, TrendingDown } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import AppLayout from "@/components/layout/AppLayout";

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring intelligence powered by AI</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Hosts"
            value="142"
            change="+12%"
            changeType="positive"
            icon={Server}
            color="primary"
          />
          <KPICard
            title="Active Problems"
            value="23"
            change="-8%"
            changeType="positive"
            icon={AlertTriangle}
            color="accent"
          />
          <KPICard
            title="Healthy Systems"
            value="119"
            change="+5%"
            changeType="positive"
            icon={CheckCircle}
            color="success"
          />
          <KPICard
            title="Avg Response Time"
            value="127ms"
            change="-15%"
            changeType="positive"
            icon={Activity}
            color="secondary"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health Overview */}
          <div className="cyber-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold mb-1">System Health</h3>
                <p className="text-sm text-muted-foreground">Last 24 hours</p>
              </div>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-medium">67%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary w-[67%] rounded-full" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm font-medium">82%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-warning to-accent w-[82%] rounded-full" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Disk Usage</span>
                  <span className="text-sm font-medium">45%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success to-primary w-[45%] rounded-full" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Network I/O</span>
                  <span className="text-sm font-medium">34%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-secondary to-accent w-[34%] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Problems */}
          <div className="cyber-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold mb-1">Recent Problems</h3>
                <p className="text-sm text-muted-foreground">Critical alerts</p>
              </div>
              <TrendingDown className="w-5 h-5 text-accent" />
            </div>

            <div className="space-y-3">
              {[
                { host: "prod-web-01", severity: "high", issue: "High CPU usage detected", time: "2m ago" },
                { host: "db-master-02", severity: "critical", issue: "Disk space critical", time: "5m ago" },
                { host: "cache-redis-03", severity: "warning", issue: "Memory pressure warning", time: "12m ago" },
                { host: "api-gateway-01", severity: "high", issue: "Response time elevated", time: "15m ago" },
              ].map((problem, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-border/50 hover:border-primary/50 transition-all cursor-pointer hover-lift"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    problem.severity === "critical" ? "bg-destructive animate-pulse-glow" :
                    problem.severity === "high" ? "bg-accent" : "bg-warning"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{problem.host}</span>
                      <span className="text-xs text-muted-foreground">{problem.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{problem.issue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="cyber-card border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">AI Insight</h3>
              <p className="text-muted-foreground mb-4">
                Based on pattern analysis, we've detected increased memory pressure on database cluster DB-PROD-WEST. 
                AI recommends scaling horizontally by adding 2 read replicas to distribute load. 
                Estimated cost impact: $240/month. Performance improvement: +35% query throughput.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-primary text-background font-medium hover:opacity-90 transition-opacity">
                  Apply Recommendation
                </button>
                <button className="px-4 py-2 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
