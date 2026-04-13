"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { teamMembersApi, structureApi } from "@/lib/api/services"
import { Loader2, Filter } from "lucide-react"

const ALL_ADMOB_ACCOUNTS_VALUE = "all"
import { RoleSelector } from "./role-selector"
import { AppPermissionsSelector } from "./app-permissions-selector"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import {
  AppPermissionLevel,
  normalizePermissionLevel as normalizePermissionLevelUtil,
} from "@/lib/enums/app-permission-level"

interface ManagePermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  initialRole: "admin" | "editor" | "viewer"
  teamId?: string
  initialPermissions?: Record<string, string> // AppId -> PermissionLevel
  onSuccess?: () => void // Callback after successful save
}

export function ManagePermissionsModal({
  open,
  onOpenChange,
  userId,
  userName,
  initialRole,
  teamId,
  initialPermissions,
  onSuccess,
}: ManagePermissionsModalProps) {
  const { toast } = useToast()
  const [role, setRole] = useState<"admin" | "editor" | "viewer">(initialRole)
  const [giveAllApps, setGiveAllApps] = useState(false)
  const [appPermissions, setAppPermissions] = useState<Record<string, AppPermissionLevel>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingPermissions, setLoadingPermissions] = useState(false)

  // Fetch user profile to get current permissions when modal opens
  const { data: userProfile, loading: profileLoading } = useApi(
    () => teamMembersApi.viewProfile(userId),
    { enabled: open && !initialPermissions, cacheKey: `user_profile_${userId}` }
  )

  // Fetch apps from API
  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { enabled: open, cacheKey: 'apps_list_for_manage_permissions' }
  )

  // Map API apps to AppPermissionsSelector format (include type / publisher for sidebar filters)
  const apps = useMemo(
    () =>
      appsResponse?.apps?.map((app) => ({
        id: app.appId,
        name: app.displayName || app.name,
        icon: app.iconUri,
        platform: app.platform,
        type: app.type ?? null,
        publisherId: app.publisherId,
        appStoreId: app.appStoreId,
      })) || [],
    [appsResponse]
  )

  const admobAccountOptions = useMemo(() => {
    const ids = Array.from(new Set(apps.map((a) => a.publisherId).filter(Boolean))) as string[]
    return ids.sort()
  }, [apps])

  const [filterType, setFilterType] = useState<string>("all")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterAdmobAccount, setFilterAdmobAccount] = useState<string>(ALL_ADMOB_ACCOUNTS_VALUE)

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const typeMatch = filterType === "all" || app.type === filterType
      const platformMatch = filterPlatform === "all" || app.platform?.toUpperCase() === filterPlatform
      const publisherMatch =
        filterAdmobAccount === ALL_ADMOB_ACCOUNTS_VALUE ||
        (app.publisherId && app.publisherId === filterAdmobAccount)
      return typeMatch && platformMatch && publisherMatch
    })
  }, [apps, filterType, filterPlatform, filterAdmobAccount])


  // Load current permissions when modal opens
  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      setAppPermissions({})
      setRole(initialRole)
      setGiveAllApps(false)
      setError(null)
      setFilterType("all")
      setFilterPlatform("all")
      setFilterAdmobAccount(ALL_ADMOB_ACCOUNTS_VALUE)
      return
    }

    // Use initialPermissions if provided, otherwise fetch from API
    let permissionsToLoad: Record<string, string> | undefined
    if (initialPermissions) {
      permissionsToLoad = initialPermissions
    } else if (userProfile?.data?.permissions) {
      permissionsToLoad = userProfile.data.permissions
    }

    // Normalize and set permissions
    if (permissionsToLoad && Object.keys(permissionsToLoad).length > 0) {
      const normalized: Record<string, AppPermissionLevel> = {}
      Object.entries(permissionsToLoad).forEach(([appId, level]) => {
        normalized[appId] = normalizePermissionLevelUtil(level)
      })
      setAppPermissions(normalized)
    } else {
      // If no permissions, ensure empty state
      setAppPermissions({})
    }

    // Update role from user profile if available
    if (userProfile?.data) {
      const teamRole = teamId
        ? userProfile.data.teams.find((t) => t.id === teamId)?.role
        : undefined
      const effectiveRole = (teamRole || userProfile.data.role || initialRole).toLowerCase()
      if (effectiveRole === "admin" || effectiveRole === "editor" || effectiveRole === "viewer") {
        setRole(effectiveRole as "admin" | "editor" | "viewer")
      }
    }
  }, [open, initialPermissions, userProfile, teamId, initialRole])

  // Convert Record to Array for AppPermissionsSelector
  const selectedApps = useMemo(
    () => Object.entries(appPermissions).map(([id, permission]) => ({ id, permission: permission as string })),
    [appPermissions]
  )

  const toggleApp = (appId: string) => {
    setAppPermissions((prev) => {
      const copy = { ...prev }
      if (copy[appId]) {
        delete copy[appId]
      } else {
        copy[appId] = AppPermissionLevel.View
      }
      return copy
    })
  }

  const updateAppPermission = (appId: string, level: string) => {
    const normalizedLevel = normalizePermissionLevelUtil(level)
    setAppPermissions((prev) => ({ ...prev, [appId]: normalizedLevel }))
  }

  const removeApp = (appId: string) => {
    setAppPermissions((prev) => {
      const copy = { ...prev }
      delete copy[appId]
      return copy
    })
  }

  const handleClose = () => {
    if (saving) return
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!teamId) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        teamId,
        role,
        appPermissions:
          giveAllApps || Object.keys(appPermissions).length === 0
            ? undefined
            : Object.entries(appPermissions).map(([AppId, Level]) => ({ AppId, Level })),
      }
      const resp = await teamMembersApi.managePermissions(userId, body)
      if (!resp.success) {
        setError(resp.message || "Failed to update permissions")
        toast({
          title: "Error",
          description: resp.message || "Failed to update permissions",
          variant: "destructive",
        })
        setSaving(false)
        return
      }
      
      // Show success toast
      toast({
        title: "Permissions updated",
        description: `Permissions for ${userName} have been updated successfully.`,
      })
      
      // Call onSuccess callback to refresh data
      onSuccess?.()
      
      // Close modal
      onOpenChange(false)
    } catch (e: any) {
      const errorMessage = e?.response?.data?.error?.message || e?.message || "Failed to update permissions"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="w-full"
        style={{ maxWidth: "min(75vw, 800px)" }}
      >
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Update role and app permissions for <span className="font-semibold text-slate-900">{userName}</span> in this
            team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Role in team */}
          <RoleSelector
            value={role}
            onValueChange={(v) => setRole(v as "admin" | "editor" | "viewer")}
            label="Role in team"
            idPrefix="team"
            adminDescription="Full access to all features including user and permissions management for this team."
            editorDescription="Can view and edit apps and reports assigned to this team."
            viewerDescription="Read-only access to apps and reports for this team."
          />

          {/* App Permissions: sidebar filters + list */}
          <div className="border-t pt-4">
            <Label className="text-slate-500 text-xs uppercase tracking-wide">App Permissions</Label>
            <div className="flex gap-4 mt-3">
              {/* Left sidebar: filter by type & platform */}
              <aside className="w-48 shrink-0 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <Filter className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">AdMob account</Label>
                  <Select value={filterAdmobAccount} onValueChange={setFilterAdmobAccount}>
                    <SelectTrigger className="h-9 bg-white font-mono text-xs">
                      <SelectValue placeholder="Account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ADMOB_ACCOUNTS_VALUE}>All accounts</SelectItem>
                      {admobAccountOptions.map((pid) => (
                        <SelectItem key={pid} value={pid} className="font-mono text-xs">
                          {pid}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="game">Game</SelectItem>
                      <SelectItem value="app">App</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600">Platform</Label>
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      <SelectItem value="ANDROID">Android</SelectItem>
                      <SelectItem value="IOS">iOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {filteredApps.length} of {apps.length} apps
                </p>
              </aside>
              <div className="flex-1 min-w-0">
                <AppPermissionsSelector
                  apps={filteredApps.map(({ id, name, icon, platform, appStoreId }) => ({
                    id,
                    name,
                    icon,
                    platform,
                    appStoreId,
                  }))}
                  allAppsForDisplay={apps.map(({ id, name, icon, platform, appStoreId }) => ({
                    id,
                    name,
                    icon,
                    platform,
                    appStoreId,
                  }))}
                  giveAllApps={giveAllApps}
                  onGiveAllAppsChange={setGiveAllApps}
                  selectedApps={selectedApps}
                  onToggleApp={toggleApp}
                  onUpdateAppPermission={updateAppPermission}
                  onRemoveApp={removeApp}
                  label=""
                  showOwnerPermission={true}
                  mode="popover"
                  error={error}
                  hideGiveAllApps={true}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving || !teamId}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
