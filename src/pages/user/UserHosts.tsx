import { useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Server, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHosts } from "@/hooks/useHosts";
import { Skeleton } from "@/components/ui/skeleton";

const UserHosts = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  const { hosts, loading, groups, counts } = useHosts();
  
  const filteredHosts = hosts.filter(host => {
    const matchesSearch = host.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          host.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          host.ip.includes(searchQuery);
    const matchesGroup = !selectedGroup || host.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const getProblemsCount = (status: string): number => {
    switch (status) {
      case "critical": return 2;
      case "warning": return 1;
      default: return 0;
    }
  };

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
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search hosts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-surface/50 border-border/50"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
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

          {/* Loading State */}
          {loading && hosts.length === 0 && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-surface/50 border border-border/50">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Hosts List */}
          {(!loading || hosts.length > 0) && (
            <div className="space-y-3">
              {filteredHosts.map((host) => (
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
                      <h3 className="font-semibold">{host.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{host.ip}</p>
                      <p className="text-xs text-muted-foreground mt-1">{host.group}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getProblemsCount(host.status) > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getProblemsCount(host.status)} problems
                      </Badge>
                    )}
                    <Badge
                      variant={host.status === "healthy" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      {host.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredHosts.length === 0 && (
            <div className="text-center py-12">
              <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hosts found matching your criteria</p>
            </div>
          )}
        </Card>
      </div>
    </UserLayout>
  );
};

export default UserHosts;
