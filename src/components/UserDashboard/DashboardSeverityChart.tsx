import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SeverityData {
  severity: string;
  count: number;
  color: string;
}

interface DashboardSeverityChartProps {
  data: SeverityData[];
  loading?: boolean;
  basePath?: string;
  enableNavigation?: boolean;
  onOpen?: () => void;
}

const DashboardSeverityChart = ({
  data,
  loading,
  basePath = "/dashboard",
  enableNavigation = true,
  onOpen,
}: DashboardSeverityChartProps) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
      return;
    }
    navigate(`${basePath}/zabbix`);
  };

  if (loading) {
    return (
      <Card className="cyber-card p-6 bg-card/50 backdrop-blur border-border/50">
        <div className="mb-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="w-full h-[300px]" />
      </Card>
    );
  }

  const hasData = data.some((d) => d.count > 0);

  return (
    <Card
      className={cn(
        "cyber-card p-6 bg-card/50 backdrop-blur border-border/50 transition-all",
        enableNavigation && "hover:border-primary/30 cursor-pointer group"
      )}
      onClick={enableNavigation ? handleOpen : undefined}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-1">Severity Distribution</h3>
          <p className="text-sm text-muted-foreground">Alerts by severity level (Last 24h)</p>
        </div>
        {enableNavigation && (
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view details -&gt;
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="severity"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                cursor={{ fill: "hsl(var(--surface) / 0.3)" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {data.map((item) => (
              <div key={item.severity} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">
                  {item.severity}: <span className="font-medium text-foreground">{item.count}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No alerts in the last 24 hours</p>
            <p className="text-sm text-success mt-1">All systems operational</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DashboardSeverityChart;
