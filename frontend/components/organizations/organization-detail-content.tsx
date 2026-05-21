"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { OrgSettingsTab } from "./tabs/org-settings-tab"
import { organizationsApi, type OrganizationDetail } from "@/lib/api/services"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { getOrgInitials, getOrgColor, formatDate } from "./org-utils"
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
    navigator.clipboard.writeText(`${org.slug}.mediationpro.io`)
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-600 mb-4">{error || "Organization not found"}</p>
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
    status: status as "active" | "inactive",
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    users: org.userCount,
    activeUsers: org.userCount,
    teams: 0,
    appsAccess: 0,
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={backLink}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      {/* Organization Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-xl">
            <AvatarFallback className={`rounded-xl text-lg font-bold ${getOrgColor(org.name)}`}>
              {getOrgInitials(org.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
              <Badge
                className={
                  status === "active"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-red-100 text-red-700 border-red-200"
                }
              >
                {status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{org.slug}.mediationpro.io</span>
              <button
                onClick={handleCopySlug}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Copy slug"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-sm text-slate-500">Created {formatDate(org.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" asChild>
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
            <Button variant="outline" className="gap-2 bg-transparent">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="bg-transparent">
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
                    <DropdownMenuItem className="text-red-600 focus:text-red-600">
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
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canViewUsers && <TabsTrigger value="users">Users</TabsTrigger>}
          {canViewPersonnelChart && <TabsTrigger value="org-chart">Organizational Chart</TabsTrigger>}
          {canViewTeams && <TabsTrigger value="teams">Teams</TabsTrigger>}
          {canEdit && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <OrgOverviewTab org={orgTabData} orgId={orgId} />
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

        {canEdit && (
          <TabsContent value="settings">
            <OrgSettingsTab org={orgTabData} orgId={orgId} canEdit={canEdit} onStatusChange={() => {
              const refetch = async () => {
                try {
                  const data = await organizationsApi.getById(orgId)
                  setOrg(data)
                } catch (err) {
                  console.error("Failed to refresh organization:", err)
                }
              }
              refetch()
            }} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
