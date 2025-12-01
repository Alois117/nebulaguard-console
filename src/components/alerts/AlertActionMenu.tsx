import { MoreVertical, CheckCircle, Eye, ExternalLink, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AlertActionMenuProps {
  alertId: number;
  isAcknowledged?: boolean;
  onAcknowledge?: (id: number) => void;
  onViewDetails?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const AlertActionMenu = ({ 
  alertId, 
  isAcknowledged = false,
  onAcknowledge,
  onViewDetails,
  onDelete 
}: AlertActionMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onViewDetails?.(alertId)}>
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </DropdownMenuItem>
        {!isAcknowledged && (
          <DropdownMenuItem onClick={() => onAcknowledge?.(alertId)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Acknowledge
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in Zabbix
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDelete?.(alertId)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AlertActionMenu;
