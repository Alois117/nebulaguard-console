import UserLayout from "@/layouts/UserLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Server, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserHosts = () => {
  const navigate = useNavigate();
  
  const hosts = [
    { id: "1", name: "web-server-01", ip: "192.168.1.10", status: "online", problems: 0 },
    { id: "2", name: "db-server-01", ip: "192.168.1.20", status: "online", problems: 2 },
    { id: "3", name: "app-server-01", ip: "192.168.1.30", status: "warning", problems: 1 },
    { id: "4", name: "cache-server-01", ip: "192.168.1.40", status: "online", problems: 0 },
  ];

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Hosts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your infrastructure hosts
            </p>
          </div>
        </div>

        <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search hosts..."
                className="pl-10 bg-surface/50 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-3">
            {hosts.map((host) => (
              <div
                key={host.id}
                onClick={() => navigate(`/dashboard/hosts/${host.id}`)}
                className="flex items-center justify-between p-4 rounded-lg bg-surface/50 border border-border/50 hover:border-primary/50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Server className="w-6 h-6 text-background" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{host.name}</h3>
                    <p className="text-sm text-muted-foreground">{host.ip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {host.problems > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {host.problems} problems
                    </Badge>
                  )}
                  <Badge
                    variant={host.status === "online" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {host.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </UserLayout>
  );
};

export default UserHosts;
