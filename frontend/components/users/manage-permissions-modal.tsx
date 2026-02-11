"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { teamMembersApi } from "@/lib/api/services"
import { Loader2 } from "lucide-react"
import { RoleSelector } from "./role-selector"
import { AppPermissionsSelector } from "./app-permissions-selector"
import { useMemo } from "react"

const apps = [
  { id: "1", name: "Weather Plus Pro", icon: "🌤️" },
  { id: "2", name: "Game Master", icon: "🎮" },
  { id: "3", name: "Photo Editor Pro", icon: "📷" },
  { id: "4", name: "Fitness Tracker", icon: "💪" },
  { id: "5", name: "Music Player", icon: "🎵" },
]

interface ManagePermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  initialRole: "admin" | "editor" | "viewer"
  teamId?: string
}

export function ManagePermissionsModal({
  open,
  onOpenChange,
  userId,
  userName,
  initialRole,
  teamId,
}: ManagePermissionsModalProps) {
  const [role, setRole] = useState<"admin" | "editor" | "viewer">(initialRole)
  const [giveAllApps, setGiveAllApps] = useState(false)
  const [appPermissions, setAppPermissions] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert Record to Array for AppPermissionsSelector
  const selectedApps = useMemo(
    () => Object.entries(appPermissions).map(([id, permission]) => ({ id, permission })),
    [appPermissions]
  )

  const toggleApp = (appId: string) => {
    setAppPermissions((prev) => {
      const copy = { ...prev }
      if (copy[appId]) {
        delete copy[appId]
      } else {
        copy[appId] = "view"
      }
      return copy
    })
  }

  const updateAppPermission = (appId: string, level: string) => {
    setAppPermissions((prev) => ({ ...prev, [appId]: level }))
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
        setSaving(false)
        return
      }
      onOpenChange(false)
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to update permissions")
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
