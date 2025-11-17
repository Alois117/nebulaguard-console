import UserLayout from "@/layouts/UserLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio } from "lucide-react";

const UserTraps = () => {
  const traps = [
    { id: 1, source: "192.168.1.10", message: "Link down on interface eth0", category: "network", time: "1 min ago" },
    { id: 2, source: "192.168.1.20", message: "Temperature threshold exceeded", category: "hardware", time: "5 min ago" },
    { id: 3, source: "192.168.1.30", message: "Service restart detected", category: "service", time: "12 min ago" },
  ];

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SNMP Traps
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time SNMP trap notifications from your devices
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Traps</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {traps.map((trap) => (
              <Card key={trap.id} className="p-6 bg-card/50 backdrop-blur border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <Radio className="w-6 h-6 text-background" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{trap.message}</h3>
                      <p className="text-sm text-muted-foreground">
                        {trap.source} • {trap.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {trap.category}
                  </Badge>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="network">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Network traps would be filtered here</p>
            </Card>
          </TabsContent>

          <TabsContent value="hardware">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Hardware traps would be filtered here</p>
            </Card>
          </TabsContent>

          <TabsContent value="service">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Service traps would be filtered here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default UserTraps;
