import UserLayout from "@/layouts/UserLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const UserProblems = () => {
  const problems = [
    { id: 1, host: "web-server-01", issue: "High CPU usage", severity: "high", time: "2 min ago" },
    { id: 2, host: "db-server-01", issue: "Disk space low", severity: "medium", time: "15 min ago" },
    { id: 3, host: "app-server-01", issue: "Memory usage critical", severity: "critical", time: "1 hour ago" },
  ];

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Problems
          </h1>
          <p className="text-muted-foreground mt-1">
            Active issues and alerts across your infrastructure
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Problems</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="high">High</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {problems.map((problem) => (
              <Card key={problem.id} className="p-6 bg-card/50 backdrop-blur border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                    <div>
                      <h3 className="font-semibold text-lg">{problem.issue}</h3>
                      <p className="text-sm text-muted-foreground">
                        {problem.host} • {problem.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        problem.severity === "critical" ? "destructive" :
                        problem.severity === "high" ? "destructive" :
                        "secondary"
                      }
                    >
                      {problem.severity}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Acknowledge
                    </Button>
                    <Button variant="ghost" size="sm">
                      <XCircle className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="critical">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Critical problems would be filtered here</p>
            </Card>
          </TabsContent>

          <TabsContent value="high">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">High severity problems would be filtered here</p>
            </Card>
          </TabsContent>

          <TabsContent value="medium">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Medium severity problems would be filtered here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default UserProblems;
