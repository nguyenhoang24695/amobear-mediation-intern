"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Activity,
  Edit,
  MoreHorizontal,
  KeyRound,
  UserX,
  Copy,
  CheckCircle2,
  Plus,
  X,
  LogIn,
  Shield,
  UserCog,
  Monitor,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { teamMembersApi, structureApi } from "@/lib/api/services";
import { buildActivityLogsHref } from "@/lib/activity-logs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCurrentUser, hasScreenFunction } from "@/lib/auth";
import { canRemoveUserFromTeam } from "@/lib/organizations/team-member-permissions";
import { useToast } from "@/hooks/use-toast";
import { NoPermissionView } from "@/components/shared/no-permission-view";
import { useRoles } from "@/hooks/use-roles";
import {
  hasPrivilegedRole,
  hasSuperAdminRole,
  normalizeUserRoles,
} from "@/lib/enums/user-role";
import { AddUserToTeamModal } from "../organizations/add-user-to-team-modal";
import { AddEditUserModal } from "../organizations/modals/add-edit-user-modal";
import { ResetUserPasswordModal } from "./reset-user-password-modal";
import { AbUserAppMappingEditor } from "./ab-user-app-mapping-editor";

// Mock data for sections not yet in API
const activityLog = [
  {
    action: "Logged in",
    details: "from 192.168.1.1",
    time: "2 hours ago",
    icon: LogIn,
  },
  {
    action: "Updated mediation group",
    details: "Banner Ads - US Region",
    time: "5 hours ago",
    icon: Edit,
  },
  {
    action: "Changed role",
    details: "to Admin by System Admin",
    time: "Yesterday",
    icon: Shield,
  },
  {
    action: "Added to team",
    details: "Product Team",
    time: "2 days ago",
    icon: UserCog,
  },
];

const sessions = [
  {
    device: "Chrome on Windows",
    ip: "192.168.1.1",
    location: "Ho Chi Minh City, Vietnam",
    lastActive: "2 minutes ago",
    isCurrent: true,
  },
  {
    device: "Safari on iPhone",
    ip: "192.168.1.45",
    location: "Ho Chi Minh City, Vietnam",
    lastActive: "1 hour ago",
    isCurrent: false,
  },
  {
    device: "Firefox on MacOS",
    ip: "10.0.0.15",
    location: "Hanoi, Vietnam",
    lastActive: "3 days ago",
    isCurrent: false,
  },
];

interface UserDetailContentProps {
  userId?: string;
  backHref?: string;
}

const SCREEN_USERS = "s-users";
const FN_VIEW = "view";
const FN_EDIT = "edit";
const FN_RESET_PASSWORD = "reset-password";
const FN_ENABLE_DISABLE = "enable-disable";

const userStatusConfig: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  active: {
    dot: "bg-emerald-500",
    badge: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    label: "Active",
  },
  inactive: {
    dot: "bg-muted-foreground",
    badge: "border-border text-muted-foreground",
    label: "Inactive",
  },
  locked: {
    dot: "bg-orange-500",
    badge: "border-orange-500/30 text-orange-700 dark:text-orange-300",
    label: "Locked",
  },
  invited: {
    dot: "bg-amber-500",
    badge: "border-amber-500/30 text-amber-700 dark:text-amber-300",
    label: "Invited",
  },
};

function formatDateTime(value?: string) {
  if (!value) return "Never";

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isPrivilegedRole(role?: string, roles?: string[]) {
  return hasPrivilegedRole(role, roles);
}

function extractTeamActionError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  const anyErr = err as {
    response?: { data?: { error?: { message?: string }; message?: string } };
    message?: string;
  };
  return (
    anyErr?.response?.data?.error?.message ||
    anyErr?.response?.data?.message ||
    anyErr?.message ||
    fallback
  );
}

export function UserDetailContent({
  userId,
  backHref = "/team-members",
}: UserDetailContentProps) {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const canView = hasScreenFunction(SCREEN_USERS, FN_VIEW);
  const canEdit = hasScreenFunction(SCREEN_USERS, FN_EDIT);
  const canResetPassword = hasScreenFunction(SCREEN_USERS, FN_RESET_PASSWORD);
  const canEnableDisable = hasScreenFunction(SCREEN_USERS, FN_ENABLE_DISABLE);
  const isSuperAdmin = currentUser?.role?.toLowerCase() === "super_admin";
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [addToTeamOpen, setAddToTeamOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [removeTeamConfirmOpen, setRemoveTeamConfirmOpen] = useState(false);
  const [teamPendingRemoval, setTeamPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [removingFromTeam, setRemovingFromTeam] = useState(false);
  const [removeTeamError, setRemoveTeamError] = useState<string | null>(null);

  const { data: rolesData } = useRoles();
  const roles = rolesData || [];

  const {
    data: userResponse,
    loading,
    error,
    refetch,
  } = useApi(
    () =>
      userId
        ? teamMembersApi.viewProfile(userId)
        : Promise.resolve({ success: false, data: undefined }),
    { enabled: !!userId && canView, cacheKey: `user-profile-${userId}` },
  );

  const { data: appsResponse } = useApi(() => structureApi.getApps(), {
    enabled: canView,
    cacheKey: "all-apps-for-permissions",
  });
  const {
    data: metaAdAccountOptionsResponse,
    loading: metaAdAccountOptionsLoading,
  } = useApi(() => teamMembersApi.getMetaAdAccountPermissionOptions(), {
    enabled: canView,
    cacheKey: "meta_ad_account_permission_options",
  });
  const {
    data: tikTokAdAccountOptionsResponse,
    loading: tikTokAdAccountOptionsLoading,
  } = useApi(() => teamMembersApi.getTikTokAdAccountPermissionOptions(), {
    enabled: canView,
    cacheKey: "tiktok_ad_account_permission_options",
  });

  const user = userResponse?.data;
  const userRoleKeys = useMemo(
    () => normalizeUserRoles(user?.role, user?.roles),
    [user?.role, user?.roles],
  );
  const metaAdAccountOptions = metaAdAccountOptionsResponse?.data || [];
  const tikTokAdAccountOptions = tikTokAdAccountOptionsResponse?.data || [];
  const allApps = appsResponse?.apps;
  const userStatus = user?.status || "inactive";
  const statusMeta = userStatusConfig[userStatus] || userStatusConfig.inactive;
  const metaPermissionsList = useMemo(() => {
    const selectedMetaAdAccountIds = user?.metaAdAccountIds || [];
    const optionMap = new Map(
      metaAdAccountOptions.map((option) => [option.id, option]),
    );

    return selectedMetaAdAccountIds.map((id) => {
      const matchedOption = optionMap.get(id);
      return {
        id,
        metaAdAccountId: matchedOption?.metaAdAccountId || String(id),
        name: matchedOption?.name || "Unknown Meta ad account",
        integrationName: matchedOption?.integrationName || null,
        metaIntegrationId: matchedOption?.metaIntegrationId || null,
        isActive: matchedOption?.isActive ?? true,
      };
    });
  }, [metaAdAccountOptions, user?.metaAdAccountIds]);
  const tikTokPermissionsList = useMemo(() => {
    const selectedTikTokAdAccountIds = user?.tikTokAdAccountIds || [];
    const optionMap = new Map(
      tikTokAdAccountOptions.map((option) => [option.id, option]),
    );

    return selectedTikTokAdAccountIds.map((id) => {
      const matchedOption = optionMap.get(id);
      return {
        id,
        advertiserId: matchedOption?.advertiserId || String(id),
        name: matchedOption?.name || "Unknown TikTok ad account",
        integrationName: matchedOption?.integrationName || null,
        tiktokIntegrationId: matchedOption?.tiktokIntegrationId || null,
        isActive: matchedOption?.isActive ?? true,
      };
    });
  }, [tikTokAdAccountOptions, user?.tikTokAdAccountIds]);
  const canManageTargetUser =
    !!user &&
    canEdit &&
    (isSuperAdmin || !isPrivilegedRole(user.role, user.roles));
  const canResetTargetPassword =
    !!user &&
    canResetPassword &&
    currentUser?.id !== user.id &&
    (isSuperAdmin || !isPrivilegedRole(user.role, user.roles));
  const canToggleTargetStatus =
    !!user &&
    canEnableDisable &&
    currentUser?.id !== user.id &&
    (isSuperAdmin || !isPrivilegedRole(user.role, user.roles));
  const canAddToTeam = !!user?.organization?.id && canManageTargetUser;
  const canAssignPrivilegedRole = isSuperAdmin; // Explicitly pass down if needed, but let's just pass this as canManage for the modal.
  const isSelfProfile = !!user && currentUser?.id === user.id;
  const canShowTeamRemoveButton = (teamId: string) =>
    isSelfProfile || canRemoveUserFromTeam(teamId, currentUser);

  const handleRemoveTeamClick = (team: { id: string; name: string }) => {
    if (!canShowTeamRemoveButton(team.id)) return;
    setTeamPendingRemoval(team);
    setRemoveTeamError(null);
    setRemoveTeamConfirmOpen(true);
  };

  const handleConfirmRemoveFromTeam = async () => {
    if (!user || !teamPendingRemoval) return;

    setRemovingFromTeam(true);
    setRemoveTeamError(null);
    const isLeaveAction = isSelfProfile;

    try {
      const response = isLeaveAction
        ? await teamMembersApi.leaveTeam(teamPendingRemoval.id)
        : await teamMembersApi.removeUserFromTeam(
            user.id,
            teamPendingRemoval.id,
          );

      if (!response.success) {
        const message = extractTeamActionError(
          { message: response.message },
          isLeaveAction
            ? "Failed to leave team"
            : "Failed to remove user from team",
        );
        setRemoveTeamError(message);
        toast({
          title: isLeaveAction
            ? "Could not leave team"
            : "Could not remove from team",
          description: message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isLeaveAction ? "Left team" : "Removed from team",
        description: isLeaveAction
          ? `You have left ${teamPendingRemoval.name}.`
          : `${user.fullName || user.email} was removed from ${teamPendingRemoval.name}.`,
      });
      setRemoveTeamConfirmOpen(false);
      setTeamPendingRemoval(null);
      await refetch();
    } catch (err) {
      const message = extractTeamActionError(
        err,
        isLeaveAction
          ? "Failed to leave team"
          : "Failed to remove user from team",
      );
      setRemoveTeamError(message);
      toast({
        title: isLeaveAction
          ? "Could not leave team"
          : "Could not remove from team",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRemovingFromTeam(false);
    }
  };

  const copyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleStatusToggle = async () => {
    if (!user || !canToggleTargetStatus) {
      return;
    }

    const nextStatus = user.status === "active" ? "inactive" : "active";
    setStatusUpdating(true);
    try {
      await teamMembersApi.updateUser(user.id, { status: nextStatus });
      toast({
        title: nextStatus === "active" ? "User activated" : "User deactivated",
        description: `${user.email} is now ${nextStatus}.`,
      });
      await refetch();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  if (!canView) {
    return <NoPermissionView />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    if (!userId) {
      // Should not happen if parent handles empty userId, but good for safety
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No user ID provided.</AlertDescription>
        </Alert>
      );
    }
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message ||
              "Failed to load user profile. The user may not exist or you don't have permission to view them."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const permissionsList = Object.entries(user.permissions || {})
    .filter(([appId]) => !allApps || allApps.some((a) => a.appId === appId))
    .map(([appId, level]) => {
      const matchedApp = allApps?.find((a) => a.appId === appId);
      return {
        appId,
        level,
        appName: matchedApp?.displayName || matchedApp?.name || appId,
        icon: matchedApp?.iconUri || null,
        packageName: matchedApp?.appStoreId || "",
        platform: matchedApp?.platform || "Unknown",
      };
    });

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-primary hover:text-primary/80"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {user.fullName
                  ? user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                  : user.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online status mock */}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold ">{user.fullName || "User"}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {userRoleKeys.map((roleKey, index) => (
                  <Badge
                    key={roleKey}
                    className="bg-purple-500/10 text-purple-700 dark:text-purple-300 capitalize"
                  >
                    {user.roleNames?.[index] ||
                      roles.find((r) => r.roleKey === roleKey)?.name ||
                      roleKey}
                  </Badge>
                ))}
              </div>
              <Badge variant="outline" className={statusMeta.badge}>
                {statusMeta.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <button
                onClick={copyEmail}
                className="text-muted-foreground hover:text-foreground"
              >
                {copiedEmail ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link
              href={buildActivityLogsHref({
                domain: "user",
                targetType: "user",
                targetId: user.id,
              })}
            >
              <Activity className="w-4 h-4 mr-2" />
              View Activity
            </Link>
          </Button>
          {canManageTargetUser && (
            <Button variant="outline" onClick={() => setEditUserOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Button>
          )}
          {(canResetTargetPassword || canToggleTargetStatus) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={statusUpdating}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canResetTargetPassword && (
                  <DropdownMenuItem onClick={() => setResetPasswordOpen(true)}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Reset Password
                  </DropdownMenuItem>
                )}
                {canResetTargetPassword && canToggleTargetStatus && (
                  <DropdownMenuSeparator />
                )}
                {canToggleTargetStatus && (
                  <DropdownMenuItem
                    onClick={handleStatusToggle}
                    disabled={statusUpdating}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {user.status === "active" ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-3 space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">
                    Profile Information
                  </CardTitle>
                  {canManageTargetUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditUserOpen(true)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        First Name
                      </p>
                      <p className="text-sm font-medium ">
                        {user.firstName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Name</p>
                      <p className="text-sm font-medium ">
                        {user.lastName || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium ">{user.email}</p>
                        <Badge
                          variant="outline"
                          className={
                            user.emailVerified
                              ? "text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : "text-xs border-border text-muted-foreground"
                          }
                        >
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium ">
                        {user.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Roles</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {userRoleKeys.map((roleKey, index) => (
                          <Badge
                            key={roleKey}
                            variant="outline"
                            className="capitalize"
                          >
                            {user.roleNames?.[index] ||
                              roles.find((r) => r.roleKey === roleKey)?.name ||
                              roleKey}
                          </Badge>
                        ))}
                      </div>
                      {hasSuperAdminRole(user.role, user.roles) && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          Role assignment is locked for super_admin users.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Organization
                      </p>
                      <p className="text-sm font-medium ">
                        {user.organization?.name || "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Teams */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      Teams
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {user.teams?.length || 0}
                    </Badge>
                  </div>
                  {canAddToTeam && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddToTeamOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Team
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {user.teams?.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-sm font-medium ">
                          {team.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {team.role}
                          </Badge>
                          {canShowTeamRemoveButton(team.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={`Remove from ${team.name}`}
                              onClick={() =>
                                handleRemoveTeamClick({
                                  id: team.id,
                                  name: team.name,
                                })
                              }
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!user.teams || user.teams.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No teams assigned
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${statusMeta.dot}`}
                      />
                      <span className="text-sm font-medium ">
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Login
                    </span>
                    <span className="text-sm ">
                      {formatDateTime(user.lastLoginAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Login IP
                    </span>
                    <span className="text-sm ">{user.lastLoginIp || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Password Policy
                    </span>
                    <span className="text-sm ">
                      {user.mustChangePassword
                        ? "Must change on next login"
                        : "No forced change"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Password Updated
                    </span>
                    <span className="text-sm ">
                      {formatDateTime(user.passwordChangedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Apps with Access
                    </span>
                    <span className="text-sm font-medium ">
                      {permissionsList.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Direct Permissions
                    </span>
                    <span className="text-sm font-medium ">
                      {permissionsList.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Team-inherited
                    </span>
                    <span className="text-sm font-medium ">0</span>
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary text-sm"
                  >
                    View all permissions &rarr;
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <Tabs defaultValue="direct" className="space-y-6">
            <TabsList className="h-10 bg-muted p-1">
              <TabsTrigger
                value="direct"
                className="px-4 data-[state=active]:bg-background"
              >
                Direct Permissions
              </TabsTrigger>
              <TabsTrigger
                value="meta"
                className="px-4 data-[state=active]:bg-background"
              >
                Meta Permission
              </TabsTrigger>
              <TabsTrigger
                value="tiktok"
                className="px-4 data-[state=active]:bg-background"
              >
                TikTok Permission
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      Direct Permissions
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {permissionsList.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[280px]">App</TableHead>
                        <TableHead>Package Name</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Permission Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionsList.map((perm) => (
                        <TableRow key={perm.appId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 rounded-lg">
                                {perm.icon && (
                                  <AvatarImage
                                    src={perm.icon}
                                    alt={perm.appName}
                                  />
                                )}
                                <AvatarFallback className="rounded-lg bg-muted">
                                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium ">
                                  {perm.appName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {perm.appId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {perm.packageName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1",
                                perm.platform === "ANDROID"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border-border bg-muted/50 text-muted-foreground",
                              )}
                            >
                              {perm.platform === "ANDROID" ? (
                                <svg
                                  className="w-3 h-3"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3 h-3"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
                                </svg>
                              )}
                              {perm.platform}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              defaultValue={perm.level.toLowerCase()}
                              disabled
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="view">View</SelectItem>
                                <SelectItem value="edit">Edit</SelectItem>
                                <SelectItem value="manage">Manage</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                      {permissionsList.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground py-6"
                          >
                            No direct permissions granted
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meta" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      Meta Permission
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {metaPermissionsList.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[280px]">
                          Meta Ad Account
                        </TableHead>
                        <TableHead>Integration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metaAdAccountOptionsLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-6 text-center text-muted-foreground"
                          >
                            <div className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading Meta permissions...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : metaPermissionsList.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No Meta permissions granted
                          </TableCell>
                        </TableRow>
                      ) : (
                        metaPermissionsList.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell>
                              <div>
                                <div className="font-mono text-sm text-primary">
                                  {perm.metaAdAccountId}
                                </div>
                                <div className="mt-1 text-sm font-medium ">
                                  {perm.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {perm.integrationName ||
                                  (perm.metaIntegrationId
                                    ? `Integration #${perm.metaIntegrationId}`
                                    : "-")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  perm.isActive
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "border-border bg-muted/50 text-muted-foreground",
                                )}
                              >
                                {perm.isActive ? "Active" : "Disabled"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tiktok" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      TikTok Permission
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {tikTokPermissionsList.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[280px]">
                          TikTok Ad Account
                        </TableHead>
                        <TableHead>Integration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tikTokAdAccountOptionsLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-6 text-center text-muted-foreground"
                          >
                            <div className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading TikTok permissions...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : tikTokPermissionsList.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No TikTok permissions granted
                          </TableCell>
                        </TableRow>
                      ) : (
                        tikTokPermissionsList.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell>
                              <div>
                                <div className="font-mono text-sm text-primary">
                                  {perm.advertiserId}
                                </div>
                                <div className="mt-1 text-sm font-medium ">
                                  {perm.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {perm.integrationName ||
                                  (perm.tiktokIntegrationId
                                    ? `Integration #${perm.tiktokIntegrationId}`
                                    : "-")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  perm.isActive
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "border-border bg-muted/50 text-muted-foreground",
                                )}
                              >
                                {perm.isActive ? "Active" : "Disabled"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                History Permission
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Lịch sử phân quyền app từ{" "}
                <span className="font-mono">gold.ab_user_app_mapping</span> theo
                email user (StarRocks).
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {userId ? (
                <AbUserAppMappingEditor
                  userId={userId}
                  canBulkEdit={!!canManageTargetUser}
                  fetchEnabled={!!userId && canView && !!userResponse?.data}
                  mappingCacheKey={`ab-user-app-mapping-${userId}`}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Activity Log
              </CardTitle>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="permission">
                      Permission Changes
                    </SelectItem>
                    <SelectItem value="profile">Profile Updates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.map((activity, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <activity.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm ">
                        <span className="font-medium">{activity.action}</span>{" "}
                        <span className="text-muted-foreground">
                          {activity.details}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Active Sessions
              </CardTitle>
              <Button variant="destructive" size="sm">
                Revoke All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {session.device.includes("iPhone") ? (
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium ">
                            {session.device}
                          </p>
                          {session.isCurrent && (
                            <Badge
                              variant="outline"
                              className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            >
                              Current session
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.ip} {" • "} {session.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last active: {session.lastActive}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive/80 bg-transparent"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {canManageTargetUser && (
        <AddEditUserModal
          open={editUserOpen}
          onOpenChange={setEditUserOpen}
          mode="edit"
          canManage={canEdit && isSuperAdmin} // Using isSuperAdmin to give them ability to select ALL roles.
          user={{
            id: user.id,
            name: user.fullName || user.email,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            roles: userRoleKeys,
            status: user.status || "active",
          }}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}

      {canResetTargetPassword && (
        <ResetUserPasswordModal
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          userId={user.id}
          userName={user.fullName || user.email}
          userEmail={user.email}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}

      {canAddToTeam && user.organization?.id && (
        <AddUserToTeamModal
          open={addToTeamOpen}
          onOpenChange={setAddToTeamOpen}
          orgId={user.organization.id}
          userIds={[user.id]}
          userNames={[user.fullName || user.email]}
          excludedTeamIds={user.teams?.map((team) => team.id) || []}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}

      <AlertDialog
        open={removeTeamConfirmOpen}
        onOpenChange={(open) => {
          setRemoveTeamConfirmOpen(open);
          if (!open) {
            setTeamPendingRemoval(null);
            setRemoveTeamError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSelfProfile ? "Leave Team" : "Remove from Team"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {isSelfProfile ? (
                  <p>
                    Are you sure you want to leave{" "}
                    <span className="font-medium ">
                      {teamPendingRemoval?.name}
                    </span>
                    ? You will lose access to this team&apos;s resources.
                  </p>
                ) : (
                  <p>
                    Are you sure you want to remove{" "}
                    <span className="font-medium ">
                      {user.fullName || user.email}
                    </span>{" "}
                    from{" "}
                    <span className="font-medium ">
                      {teamPendingRemoval?.name}
                    </span>
                    ? This action cannot be undone.
                  </p>
                )}
                {removeTeamError && (
                  <p className="whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                    {removeTeamError}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingFromTeam}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRemoveFromTeam();
              }}
              disabled={removingFromTeam}
              className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
            >
              {removingFromTeam && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {removingFromTeam
                ? isSelfProfile
                  ? "Leaving..."
                  : "Removing..."
                : isSelfProfile
                  ? "Leave"
                  : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
