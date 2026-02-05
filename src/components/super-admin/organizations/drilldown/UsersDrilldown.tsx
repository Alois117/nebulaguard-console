/**
 * Users Drilldown Component
 * Shows detailed users list for the selected organization
 */
import { useState, useMemo, useEffect } from "react";
import { Users, User, XCircle, RefreshCw, Mail, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserItem } from "@/hooks/super-admin/organizations/useOrganizationDetails";
import DrilldownPagination, { ITEMS_PER_PAGE } from "./DrilldownPagination";

interface UsersDrilldownProps {
  orgName: string;
  users: UserItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type UserFilter = "all" | "active" | "inactive";

const roleColors: Record<string, string> = {
  admin: "border-destructive/30 bg-destructive/10 text-destructive",
  user: "border-primary/30 bg-primary/10 text-primary",
  viewer: "border-muted/30 bg-muted/10 text-muted-foreground",
};

/**
 * Get user display name using fallback chain
 * Primary: name, fullName, firstName + lastName
 * Secondary: email username part
 * Fallback: User #id
 */
const getUserName = (user: UserItem): string => {
  if (user.name && user.name !== "Unknown User") return user.name;
  if (user.email) {
    const emailName = user.email.split("@")[0];
    // Capitalize first letter
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  return `User #${user.id}`;
};

/**
 * Get user identifier (email or username)
 */
const getUserIdentifier = (user: UserItem): string => {
  return user.email || `ID: ${user.id}`;
};

const UsersDrilldown = ({ orgName, users, loading, error, onRefresh }: UsersDrilldownProps) => {
  const [filter, setFilter] = useState<UserFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const filteredUsers = useMemo(() => {
    let result = users;

    switch (filter) {
      case "active":
        result = result.filter(u => u.status === "active");
        break;
      case "inactive":
        result = result.filter(u => u.status !== "active");
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u =>
        getUserName(u).toLowerCase().includes(query) ||
        getUserIdentifier(u).toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => getUserName(a).localeCompare(getUserName(b)));
  }, [users, filter, searchQuery]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => u.status === "active").length,
    inactive: users.filter(u => u.status !== "active").length,
  }), [users]);

  if (error) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-3">
          <XCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium">Failed to load users</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Users for {orgName}
          </h3>
          <p className="text-sm text-muted-foreground">
            Organization members and their roles
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as UserFilter)} className="flex-shrink-0">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="text-xs">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              Active ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">
              Inactive ({counts.inactive})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs bg-background/50"
        />
      </div>

      {/* Users List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 border-border/50">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </Card>
            ))
          ) : paginatedUsers.length === 0 ? (
            <Card className="p-8 border-border/50 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No users match your search" : "No users found"}
              </p>
            </Card>
          ) : (
            paginatedUsers.map((user) => (
              <Card 
                key={user.id} 
                className="p-4 border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${user.status === "active" 
                      ? "bg-primary/10 border border-primary/20" 
                      : "bg-muted/50 border border-muted/30"
                    }
                  `}>
                    <User className={`w-5 h-5 ${
                      user.status === "active" ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getUserName(user)}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{getUserIdentifier(user)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant="outline"
                      className={`text-xs capitalize ${roleColors[user.role] || roleColors.user}`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={`text-xs ${
                        user.status === "active"
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-muted/30 bg-muted/10 text-muted-foreground"
                      }`}
                    >
                      {user.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {!loading && (
        <DrilldownPagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default UsersDrilldown;
