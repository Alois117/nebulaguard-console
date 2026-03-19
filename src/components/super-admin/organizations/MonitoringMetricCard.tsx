import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";

interface MonitoringMetricCardProps {
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}

const MonitoringMetricCard = ({
  title,
  icon: Icon,
  iconColor = "text-primary",
  isSelected,
  onClick,
  children,
  loading = false,
  disabled = false,
  disabledTitle,
}: MonitoringMetricCardProps) => (
  <Card
    className={`
      p-4 border-border/50 transition-all duration-200
      ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
      ${!disabled ? "hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 hover:bg-muted/30" : ""}
      ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}
    `}
    onClick={() => {
      if (!disabled) onClick();
    }}
    title={disabled ? disabledTitle : undefined}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : iconColor}`} />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <ChevronDown
        className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
          isSelected ? "rotate-180 text-primary" : ""
        }`}
      />
    </div>
    {loading ? (
      <div className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
    ) : (
      children
    )}
  </Card>
);

export default MonitoringMetricCard;
