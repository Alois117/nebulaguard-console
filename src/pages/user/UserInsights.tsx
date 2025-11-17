import UserLayout from "@/layouts/UserLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle } from "lucide-react";

const UserInsights = () => {
  const insights = [
    {
      id: 1,
      title: "Optimize Database Queries",
      description: "Your database server shows high query execution times during peak hours",
      impact: "high",
      confidence: 92
    },
    {
      id: 2,
      title: "Scale Web Servers",
      description: "CPU usage consistently above 80% on web-server-01 and web-server-02",
      impact: "medium",
      confidence: 87
    },
    {
      id: 3,
      title: "Review Backup Schedule",
      description: "Backup operations are impacting system performance during business hours",
      impact: "low",
      confidence: 75
    },
  ];

  return (
    <UserLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligent recommendations to optimize your infrastructure
          </p>
        </div>

        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-background" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{insight.title}</h3>
                    <Badge
                      variant={
                        insight.impact === "high" ? "destructive" :
                        insight.impact === "medium" ? "secondary" :
                        "outline"
                      }
                      className="capitalize"
                    >
                      {insight.impact} impact
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{insight.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">
                      {insight.confidence}% confidence
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserInsights;
