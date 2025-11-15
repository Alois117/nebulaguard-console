import { useState } from "react";
import { Server, Search, Filter, Check, X, AlertCircle } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const mockHosts = [
  { id: 1, name: "prod-web-01", status: "healthy", cpu: 45, memory: 67, uptime: "99.9%", group: "Web Servers" },
  { id: 2, name: "prod-web-02", status: "healthy", cpu: 52, memory: 71, uptime: "99.8%", group: "Web Servers" },
  { id: 3, name: "db-master-01", status: "warning", cpu: 78, memory: 89, uptime: "99.5%", group: "Databases" },
  { id: 4, name: "db-replica-01", status: "healthy", cpu: 34, memory: 56, uptime: "99.9%", group: "Databases" },
  { id: 5, name: "cache-redis-01", status: "healthy", cpu: 23, memory: 45, uptime: "100%", group: "Cache" },
  { id: 6, name: "api-gateway-01", status: "critical", cpu: 92, memory: 94, uptime: "98.2%", group: "API Gateway" },
  { id: 7, name: "lb-nginx-01", status: "healthy", cpu: 41, memory: 52, uptime: "99.9%", group: "Load Balancers" },
  { id: 8, name: "worker-queue-01", status: "healthy", cpu: 38, memory: 48, uptime: "99.7%", group: "Workers" },
];

const Hosts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const groups = Array.from(new Set(mockHosts.map(h => h.group)));
  
  const filteredHosts = mockHosts.filter(host => {
    const matchesSearch = host.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = !selectedGroup || host.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "success";
      case "warning": return "warning";
      case "critical": return "destructive";
      default: return "muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <Check className="w-4 h-4" />;
      case "warning": return <AlertCircle className="w-4 h-4" />;
      case "critical": return <X className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Hosts</h1>
            <p className="text-muted-foreground">{filteredHosts.length} hosts monitored</p>
          </div>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-background">
            <Server className="w-4 h-4 mr-2" />
            Add Host
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search hosts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface/50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedGroup === null ? "default" : "outline"}
              onClick={() => setSelectedGroup(null)}
              className={selectedGroup === null ? "bg-primary" : ""}
            >
              All
            </Button>
            {groups.map(group => (
              <Button
                key={group}
                variant={selectedGroup === group ? "default" : "outline"}
                onClick={() => setSelectedGroup(group)}
                className={selectedGroup === group ? "bg-primary" : ""}
              >
                {group}
              </Button>
            ))}
          </div>
        </div>

        {/* Hosts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHosts.map((host, index) => (
            <div
              key={host.id}
              className="cyber-card cursor-pointer"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">{host.name}</h3>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-${getStatusColor(host.status)}/20 text-${getStatusColor(host.status)} text-xs`}>
                  {getStatusIcon(host.status)}
                  {host.status}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-medium">{host.cpu}%</span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        host.cpu > 80 ? "bg-destructive" : 
                        host.cpu > 60 ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${host.cpu}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-medium">{host.memory}%</span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        host.memory > 80 ? "bg-destructive" : 
                        host.memory > 60 ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${host.memory}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">{host.group}</span>
                  <span className="text-xs font-medium text-success">↑ {host.uptime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Hosts;
