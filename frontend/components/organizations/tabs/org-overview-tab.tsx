"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UsersRound,
  Layers,
  Smartphone,
  Edit,
  Loader2,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  organizationsApi,
  permissionApi,
  type OrganizationStatistics,
} from "@/lib/api/services";
import { getRoleDisplayName } from "@/lib/enums/user-role";
import { formatDate, getRoleColor } from "../org-utils";

interface OrgOverviewTabProps {
  org: {
    name: string;
    slug: string;
    status: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
    users: number;
    activeUsers: number;
    teams: number;
    appsAccess: number;
  };
  orgId: string;
  canViewUsers?: boolean;
}

export function OrgOverviewTab({
  org,
  orgId,
  canViewUsers = false,
}: OrgOverviewTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [statistics, setStatistics] = useState<OrganizationStatistics | null>(
    null,
  );
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const [roleFilterValues, setRoleFilterValues] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statisticsResult, rolesResult] = await Promise.allSettled([
          organizationsApi.getStatistics(orgId),
          permissionApi.getRoles(),
        ]);
        if (statisticsResult.status === "rejected") {
          throw statisticsResult.reason;
        }

        setStatistics(statisticsResult.value);

        if (rolesResult.status === "fulfilled") {
          setRoleLabels(
            rolesResult.value.reduce<Record<string, string>>((acc, role) => {
              acc[role.roleKey] = role.name;
              acc[role.roleKey.toLowerCase()] = role.name;
              return acc;
            }, {}),
          );
          setRoleFilterValues(
            rolesResult.value.reduce<Record<string, string>>((acc, role) => {
              acc[role.roleKey] = role.roleKey;
              acc[role.roleKey.toLowerCase()] = role.roleKey;
              acc[role.name] = role.roleKey;
              acc[role.name.toLowerCase()] = role.roleKey;
              return acc;
            }, {}),
          );
        }
      } catch (err) {
        console.error("Failed to fetch organization statistics:", err);
        setError("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };
    fetchOverviewData();
  }, [orgId]);

  const totalRoleUsers =
    statistics?.roleDistribution.reduce((sum, r) => sum + r.count, 0) || 0;
  const getRoleLabel = (roleKey: string) =>
    roleLabels[roleKey] ||
    roleLabels[roleKey.toLowerCase()] ||
    getRoleDisplayName(roleKey);
  const getRoleFilterValue = (role: string) =>
    roleFilterValues[role] || roleFilterValues[role.toLowerCase()] || role;

  const handleRoleClick = (role: string) => {
    if (!canViewUsers) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "users");
    params.set("role", getRoleFilterValue(role));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column (3/5) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Organization Information */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Organization Information
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Name
                </p>
                <p className="text-sm font-medium text-foreground">
                  {org.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Slug
                </p>
                <p className="text-sm font-medium text-foreground">
                  {org.slug}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Status
                </p>
                <Badge
                  className={
                    org.status === "active"
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {org.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Created
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(org.createdAt, "long")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Last Updated
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(org.updatedAt, "long")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive text-sm">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {statistics?.totalUsers || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <UsersRound className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {statistics?.activeUsers || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Active Users
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Layers className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {statistics?.totalTeams || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Teams</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="p-2 rounded-lg bg-muted">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {statistics?.appsWithAccess || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Apps with Access
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column (2/5) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Users by Role */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive text-sm">
                {error}
              </div>
            ) : statistics?.roleDistribution &&
              statistics.roleDistribution.length > 0 ? (
              <>
                {/* Bar */}
                <div className="h-3 rounded-full overflow-hidden flex mb-4">
                  {statistics.roleDistribution.map((role) => (
                    <div
                      key={role.role}
                      role={canViewUsers ? "button" : undefined}
                      tabIndex={canViewUsers ? 0 : undefined}
                      aria-label={
                        canViewUsers
                          ? `View users with ${getRoleLabel(role.role)} role`
                          : undefined
                      }
                      className={`${getRoleColor(role.role)} first:rounded-l-full last:rounded-r-full ${canViewUsers ? "cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" : ""}`}
                      style={{
                        width: `${totalRoleUsers > 0 ? (role.count / totalRoleUsers) * 100 : 0}%`,
                      }}
                      onClick={() => handleRoleClick(role.role)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleRoleClick(role.role);
                        }
                      }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-2">
                  {statistics.roleDistribution.map((role) => (
                    <button
                      key={role.role}
                      type="button"
                      disabled={!canViewUsers}
                      onClick={() => handleRoleClick(role.role)}
                      className="flex w-full items-center justify-between rounded-md py-1 text-left transition-colors enabled:hover:bg-muted/60 enabled:cursor-pointer disabled:cursor-default"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-sm ${getRoleColor(role.role)}`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {getRoleLabel(role.role)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {role.count}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
