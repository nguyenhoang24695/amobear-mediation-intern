"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrganizationLogoAvatar } from "./organization-logo-avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Edit, MoreHorizontal, Copy, ToggleLeft, Trash2, CheckCircle2, Loader2, Activity } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { OrgOverviewTab } from "./tabs/org-overview-tab"
import { OrgUsersTab } from "./tabs/org-users-tab"
import { OrgPersonnelTab } from "./tabs/org-personnel-tab"
import { OrgTeamsTab } from "./tabs/org-teams-tab"
import { OrgProfitPlanTab } from "./tabs/org-profit-plan-tab"
import { OrgSettingsTab } from "./tabs/org-settings-tab"
import { organizationsApi, type OrganizationDetail } from "@/lib/api/services"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { formatDate } from "./org-utils"
import { buildActivityLogsHref } from "@/lib/activity-logs"
import { NoPermissionView } from "@/components/shared/no-permission-view"

const SCREEN_ORGS = "s-orgs"
const FN_VIEW_DETAILS = "view-details"
const FN_EDIT = "edit"
const FN_DELETE = "delete"
const FN_VIEW_USERS = "view-users"
const FN_VIEW_TEAMS = "view-teams"
const FN_VIEW_PERSONNEL_CHART = "view-personnel-chart"
const FN_MANAGE_PERSONNEL_CHART = "manage-personnel-chart"
const FN_MANAGE_USERS = "manage-users"
const FN_MANAGE_TEAMS = "manage-teams"
const FN_VIEW_PROFIT_PLAN = "view-profit-plan"
const FN_MANAGE_PROFIT_PLAN = "manage-profit-plan"

interface OrganizationDetailContentProps {
  orgId: string
  backLink?: string
  backLabel?: string
}

export function OrganizationDetailContent({ orgId, backLink = "/organizations", backLabel = "Back to Organizations" }: OrganizationDetailContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "overview"

  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const currentUser = getCurrentUser()

  const canViewDetails = hasScreenFunction(SCREEN_ORGS, FN_VIEW_DETAILS)
  const canEdit = hasScreenFunction(SCREEN_ORGS, FN_EDIT)
  const canDelete = hasScreenFunction(SCREEN_ORGS, FN_DELETE)
  const canViewUsers = hasScreenFunction(SCREEN_ORGS, FN_VIEW_USERS)
  const canViewTeams = hasScreenFunction(SCREEN_ORGS, FN_VIEW_TEAMS)
  const canViewPersonnelChart = hasScreenFunction(SCREEN_ORGS, FN_VIEW_PERSONNEL_CHART)
  const canManagePersonnelChart = hasScreenFunction(SCREEN_ORGS, FN_MANAGE_PERSONNEL_CHART)
  const canManageUsers = hasScreenFunction(SCREEN_ORGS, FN_MANAGE_USERS)
  const canManageTeams = hasScreenFunction(SCREEN_ORGS, FN_MANAGE_TEAMS)
  const canViewProfitPlan = hasScreenFunction(SCREEN_ORGS, FN_VIEW_PROFIT_PLAN)
  const canManageProfitPlan = hasScreenFunction(SCREEN_ORGS, FN_MANAGE_PROFIT_PLAN)

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true)
        const data = await organizationsApi.getById(orgId)
        setOrg(data)
      } catch (err) {
        console.error("Failed to fetch organization:", err)
        setError("Failed to load organization")
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [orgId])

  const handleCopySlug = () => {
    if (!org) return
    navigator.clipboard.writeText(`${org.slug}.nexus.io`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (!canViewDetails) {
    return <NoPermissionView />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">{error || "Organization not found"}</p>
        <Link href={backLink}>
          <Button>{backLabel}</Button>
        </Link>
      </div>
    )
  }

  const status = org.isActive ? "active" : "inactive"
  const orgTabData = {
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    status: status as "active" | "inactive",
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    users: org.userCount,
    activeUsers: org.userCount,
    teams: 0,
    appsAccess: 0,
  }

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Back Link */}
      <Link
        href={backLink}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      {/* Organization Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-4 sm:items-center">
          <OrganizationLogoAvatar orgId={orgId} orgName={org.name} logoUrl={org.logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="min-w-0 break-words text-2xl font-bold text-foreground">{org.name}</h1>
              <Badge
                className={
                  status === "active"
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }
              >
                {status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 break-all text-sm text-muted-foreground">{org.slug}.nexus.io</span>
              <button
                onClick={handleCopySlug}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                title="Copy slug"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="mx-1 hidden text-border sm:inline">|</span>
              <span className="text-sm text-muted-foreground">Created {formatDate(org.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:shrink-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <Button variant="outline" className="h-10 shrink-0 gap-2 bg-transparent" asChild>
            <Link
              href={buildActivityLogsHref({
                domain: "organization",
                targetType: "organization",
                targetId: org.id,
              })}
            >
              <Activity className="w-4 h-4" />
              View Activity
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" className="h-10 shrink-0 gap-2 bg-transparent">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-transparent">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canEdit && (
                  <DropdownMenuItem>
                    <ToggleLeft className="w-4 h-4 mr-2" />
                    {status === "active" ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Organization
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max bg-muted">
            <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
            {canViewUsers && <TabsTrigger value="users" className="shrink-0">Users</TabsTrigger>}
            {canViewPersonnelChart && <TabsTrigger value="org-chart" className="shrink-0">Organizational Chart</TabsTrigger>}
            {canViewTeams && <TabsTrigger value="teams" className="shrink-0">Teams</TabsTrigger>}
            {canViewProfitPlan && <TabsTrigger value="profit-plan" className="shrink-0">Revenue Plan</TabsTrigger>}
            {canEdit && <TabsTrigger value="settings" className="shrink-0">Settings</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OrgOverviewTab org={orgTabData} orgId={orgId} canViewUsers={canViewUsers} />
        </TabsContent>

        {canViewUsers && (
          <TabsContent value="users">
            <OrgUsersTab org={orgTabData} orgId={orgId} canManage={canManageUsers} />
          </TabsContent>
        )}

        {canViewPersonnelChart && (
          <TabsContent value="org-chart">
            <OrgPersonnelTab
              orgId={orgId}
              orgName={orgTabData.name}
              organizationLogoUrl={org.logoUrl}
              canView={canViewPersonnelChart}
              canManage={canManagePersonnelChart}
            />
          </TabsContent>
        )}

        {canViewTeams && (
          <TabsContent value="teams">
            <OrgTeamsTab orgId={orgId} orgName={orgTabData.name} canManage={canManageTeams} />
          </TabsContent>
        )}

        {canViewProfitPlan && (
          <TabsContent value="profit-plan">
            <OrgProfitPlanTab orgId={orgId} canManage={canManageProfitPlan} />
          </TabsContent>
        )}

        {canEdit && (
          <TabsContent value="settings">
            <OrgSettingsTab
              org={orgTabData}
              orgId={orgId}
              canEdit={canEdit}
              onStatusChange={() => {
                void (async () => {
                  try {
                    const data = await organizationsApi.getById(orgId)
                    setOrg(data)
                  } catch (err) {
                    console.error("Failed to refresh organization:", err)
                  }
                })()
              }}
              onLogoChange={(nextLogoUrl) => {
                setOrg((prev) => (prev ? { ...prev, logoUrl: nextLogoUrl ?? undefined } : prev))
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
