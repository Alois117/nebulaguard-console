import UserLayout from "@/layouts/UserLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Calendar } from "lucide-react";

const UserReports = () => {
  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate and download infrastructure reports
            </p>
          </div>
          <Button className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Report
          </Button>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 bg-card/50 backdrop-blur border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <FileText className="w-6 h-6 text-background" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Daily Report - 2024-01-{20 - i}</h3>
                      <p className="text-sm text-muted-foreground">
                        Infrastructure performance and incidents summary
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="weekly">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Weekly reports would appear here</p>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <p className="text-muted-foreground">Monthly reports would appear here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default UserReports;
