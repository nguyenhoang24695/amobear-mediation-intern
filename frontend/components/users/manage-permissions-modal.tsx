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
import { teamMembersApi, structureApi } from "@/lib/api/services"
import { Loader2 } from "lucide-react"
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

  // Map API apps to AppPermissionsSelector format
  const apps = useMemo(
    () =>
      appsResponse?.apps?.map((app) => ({
        id: app.appId, // Use appId (string) as id
        name: app.displayName || app.name,
        icon: app.iconUri,
        platform: app.platform,
      })) || [],
    [appsResponse]
  )


  // Load current permissions when modal opens
  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      setAppPermissions({})
      setRole(initialRole)
      setGiveAllApps(false)
      setError(null)
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
      <DialogContent className="max-w-lg">
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

          {/* App Permissions */}
          <AppPermissionsSelector
            apps={apps}
            giveAllApps={giveAllApps}
            onGiveAllAppsChange={setGiveAllApps}
            selectedApps={selectedApps}
            onToggleApp={toggleApp}
            onUpdateAppPermission={updateAppPermission}
            onRemoveApp={removeApp}
            label="App Permissions"
            showOwnerPermission={true}
            mode="popover"
            error={error}
            hideGiveAllApps={true}
          />
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
