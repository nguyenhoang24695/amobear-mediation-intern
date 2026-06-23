"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, Layers, Lock } from "lucide-react"
import { RoleSelector } from "./role-selector"
import { RoleEditor } from "./role-editor"
import { PermissionList } from "./permission-list"

// --- Types ---
export interface FunctionDef {
  id: string
  label: string
}

export interface Screen {
  id: string
  name: string
  module: string
  functions: FunctionDef[]
}

export interface Role {
  id: string
  name: string
  description: string
  userCount: number
  isSystem?: boolean
}

// permissions[roleId][screenId] = array of functionId strings that are granted
export type PermissionMap = Record<string, Record<string, string[]>>

// --- Mock Data ---
const mockRoles: Role[] = [
  { id: "role-admin", name: "Admin", description: "Full access to all features and settings", userCount: 3, isSystem: true },
  { id: "role-manager", name: "Manager", description: "Can manage apps, mediation groups, and view reports", userCount: 8 },
  { id: "role-analyst", name: "Analyst", description: "Read-only access with export capabilities", userCount: 12 },
  { id: "role-viewer", name: "Viewer", description: "View-only access to dashboards and reports", userCount: 25 },
  { id: "role-ops", name: "Operations", description: "Manage jobs, waterfall rules, and alerts", userCount: 5 },
]

const mockScreens: Screen[] = [
  {
    id: "s-dashboard",
    name: "Dashboard",
    module: "Core",
    functions: [
      { id: "view", label: "View Dashboard" },
      { id: "export", label: "Export Reports" },
      { id: "customize", label: "Customize Widgets" },
    ],
  },
  {
    id: "s-apps",
    name: "Apps",
    module: "Core",
    functions: [
      { id: "view", label: "View Apps" },
      { id: "create", label: "Create App" },
      { id: "edit", label: "Edit App" },
      { id: "delete", label: "Delete App" },
      { id: "manage-ad-units", label: "Manage Ad Units" },
    ],
  },
  {
    id: "s-mediation",
    name: "Mediation Groups",
    module: "Core",
    functions: [
      { id: "view", label: "View Groups" },
      { id: "create", label: "Create Group" },
      { id: "edit", label: "Edit Group" },
      { id: "delete", label: "Delete Group" },
      { id: "manage-waterfall", label: "Manage Waterfall" },
      { id: "run-ab-test", label: "Run A/B Tests" },
      { id: "apply-variant", label: "Apply Variant" },
    ],
  },
  {
    id: "s-reports",
    name: "Reports",
    module: "Analytics",
    functions: [
      { id: "view", label: "View Reports" },
      { id: "export-csv", label: "Export CSV" },
      { id: "export-pdf", label: "Export PDF" },
      { id: "schedule", label: "Schedule Reports" },
    ],
  },
  {
    id: "s-alerts",
    name: "Alert Center",
    module: "Analytics",
    functions: [
      { id: "view", label: "View Alerts" },
      { id: "create-rule", label: "Create Alert Rule" },
      { id: "edit-rule", label: "Edit Alert Rule" },
      { id: "delete-rule", label: "Delete Alert Rule" },
      { id: "acknowledge", label: "Acknowledge Alerts" },
    ],
  },
  {
    id: "s-waterfall",
    name: "Waterfall Rules",
    module: "Optimization",
    functions: [
      { id: "view", label: "View Rules" },
      { id: "create", label: "Create Rule" },
      { id: "edit", label: "Edit Rule" },
      { id: "delete", label: "Delete Rule" },
      { id: "manage-configs", label: "Manage App Configs" },
      { id: "reorder", label: "Reorder Priority" },
    ],
  },
  {
    id: "s-jobs",
    name: "Job Management",
    module: "System",
    functions: [
      { id: "view", label: "View Jobs" },
      { id: "edit", label: "Edit Schedule" },
      { id: "run", label: "Run Job Manually" },
      { id: "enable-disable", label: "Enable / Disable" },
      { id: "reload", label: "Reload Schedules" },
    ],
  },
  {
    id: "s-orgs",
    name: "Organizations",
    module: "Admin",
    functions: [
      { id: "view", label: "View Organizations" },
      { id: "create", label: "Create Organization" },
      { id: "edit", label: "Edit Organization" },
      { id: "delete", label: "Delete Organization" },
      { id: "manage-users", label: "Manage Org Users" },
      { id: "manage-settings", label: "Manage Org Settings" },
    ],
  },
  {
    id: "s-users",
    name: "User Management",
    module: "Admin",
    functions: [
      { id: "view", label: "View Users" },
      { id: "create", label: "Invite User" },
      { id: "edit", label: "Edit User" },
      { id: "delete", label: "Delete User" },
      { id: "reset-password", label: "Reset Password" },
      { id: "enable-disable", label: "Enable / Disable" },
    ],
  },
  {
    id: "s-permissions",
    name: "Permission Management",
    module: "Admin",
    functions: [
      { id: "view", label: "View Permissions" },
      { id: "edit", label: "Edit Permissions" },
      { id: "manage-roles", label: "Manage Roles" },
    ],
  },
  {
    id: "s-settings",
    name: "Settings",
    module: "Admin",
    functions: [
      { id: "view", label: "View Settings" },
      { id: "edit-general", label: "Edit General Settings" },
      { id: "edit-billing", label: "Edit Billing" },
      { id: "manage-api-keys", label: "Manage API Keys" },
    ],
  },
]

function buildInitialPermissions(): PermissionMap {
  const map: PermissionMap = {}

  // Admin: full access
  map["role-admin"] = {}
  for (const s of mockScreens) {
    map["role-admin"][s.id] = s.functions.map((f) => f.id)
  }

  // Manager
  map["role-manager"] = {}
  for (const s of mockScreens) {
    if (["s-users", "s-permissions", "s-settings"].includes(s.id)) {
      map["role-manager"][s.id] = s.functions.filter((f) => f.id === "view").map((f) => f.id)
    } else if (["s-reports", "s-alerts"].includes(s.id)) {
      map["role-manager"][s.id] = s.functions.filter((f) => f.id.startsWith("view") || f.id.startsWith("export") || f.id === "acknowledge").map((f) => f.id)
    } else {
      map["role-manager"][s.id] = s.functions.filter((f) => !f.id.startsWith("manage-") || f.id === "manage-waterfall").map((f) => f.id)
    }
  }

  // Analyst: view + export
  map["role-analyst"] = {}
  for (const s of mockScreens) {
    if (["s-users", "s-permissions", "s-settings"].includes(s.id)) {
      map["role-analyst"][s.id] = []
    } else {
      map["role-analyst"][s.id] = s.functions.filter((f) => f.id.startsWith("view") || f.id.startsWith("export")).map((f) => f.id)
    }
  }

  // Viewer: view only
  map["role-viewer"] = {}
  for (const s of mockScreens) {
    if (["s-users", "s-permissions", "s-settings"].includes(s.id)) {
      map["role-viewer"][s.id] = []
    } else {
      map["role-viewer"][s.id] = s.functions.filter((f) => f.id === "view").map((f) => f.id)
    }
  }

  // Operations
  map["role-ops"] = {}
  for (const s of mockScreens) {
    if (["s-jobs", "s-waterfall", "s-alerts"].includes(s.id)) {
      map["role-ops"][s.id] = s.functions.map((f) => f.id)
    } else if (["s-users", "s-permissions", "s-settings"].includes(s.id)) {
      map["role-ops"][s.id] = []
    } else {
      map["role-ops"][s.id] = s.functions.filter((f) => f.id === "view").map((f) => f.id)
    }
  }

  return map
}

export function PermissionManagementContent() {
  const [roles, setRoles] = useState<Role[]>(mockRoles)
  const [selectedRoleId, setSelectedRoleId] = useState<string>(mockRoles[0].id)
  const [permissions, setPermissions] = useState<PermissionMap>(buildInitialPermissions)
  const [savedPermissions, setSavedPermissions] = useState<PermissionMap>(buildInitialPermissions)
  const [saving, setSaving] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(false)

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId)!, [roles, selectedRoleId])

  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify(permissions[selectedRoleId] || {})
    const saved = JSON.stringify(savedPermissions[selectedRoleId] || {})
    return current !== saved
  }, [permissions, savedPermissions, selectedRoleId])

  // Stats
  const totalRoles = roles.length
  const totalScreens = mockScreens.length
  const totalPermissionsGranted = useMemo(() => {
    const rolePerms = permissions[selectedRoleId] || {}
    return Object.values(rolePerms).reduce((sum, fns) => sum + fns.length, 0)
  }, [permissions, selectedRoleId])
  const maxPermissions = useMemo(
    () => mockScreens.reduce((sum, s) => sum + s.functions.length, 0),
    [],
  )

  // Toggle single function
  const handleToggleFunction = useCallback(
    (screenId: string, functionId: string) => {
      setPermissions((prev) => {
        const rolePerms = { ...(prev[selectedRoleId] || {}) }
        const screenFns = [...(rolePerms[screenId] || [])]

        if (screenFns.includes(functionId)) {
          rolePerms[screenId] = screenFns.filter((f) => f !== functionId)
        } else {
          rolePerms[screenId] = [...screenFns, functionId]
        }
        return { ...prev, [selectedRoleId]: rolePerms }
      })
    },
    [selectedRoleId],
  )

  // Toggle all functions for a screen
  const handleToggleScreen = useCallback(
    (screen: Screen) => {
      setPermissions((prev) => {
        const rolePerms = { ...(prev[selectedRoleId] || {}) }
        const screenFns = rolePerms[screen.id] || []
        const allSelected = screenFns.length === screen.functions.length

        rolePerms[screen.id] = allSelected ? [] : screen.functions.map((f) => f.id)
        return { ...prev, [selectedRoleId]: rolePerms }
      })
    },
    [selectedRoleId],
  )

  // Toggle all for all visible screens
  const handleToggleAll = useCallback(
    (screens: Screen[]) => {
      setPermissions((prev) => {
        const rolePerms = { ...(prev[selectedRoleId] || {}) }
        const total = screens.reduce((sum, s) => sum + (rolePerms[s.id] || []).length, 0)
        const max = screens.reduce((sum, s) => sum + s.functions.length, 0)
        const allSelected = total === max

        for (const s of screens) {
          rolePerms[s.id] = allSelected ? [] : s.functions.map((f) => f.id)
        }
        return { ...prev, [selectedRoleId]: rolePerms }
      })
    },
    [selectedRoleId],
  )

  // Save
  const handleSave = useCallback(() => {
    setSaving(true)
    setTimeout(() => {
      setSavedPermissions((prev) => ({
        ...prev,
        [selectedRoleId]: JSON.parse(JSON.stringify(permissions[selectedRoleId])),
      }))
      setSaving(false)
      setShowSavedToast(true)
      setTimeout(() => setShowSavedToast(false), 3000)
    }, 800)
  }, [permissions, selectedRoleId])

  // Discard
  const handleDiscard = useCallback(() => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: JSON.parse(JSON.stringify(savedPermissions[selectedRoleId] || {})),
    }))
  }, [savedPermissions, selectedRoleId])

  // Role CRUD
  const handleCreateRole = useCallback(
    (name: string, description: string) => {
      const newId = `role-${Date.now()}`
      setRoles((prev) => [...prev, { id: newId, name, description, userCount: 0 }])
      const emptyPerms: Record<string, string[]> = {}
      for (const s of mockScreens) {
        emptyPerms[s.id] = []
      }
      setPermissions((prev) => ({ ...prev, [newId]: { ...emptyPerms } }))
      setSavedPermissions((prev) => ({ ...prev, [newId]: { ...emptyPerms } }))
      setSelectedRoleId(newId)
    },
    [],
  )

  const handleRenameRole = useCallback((roleId: string, name: string, description: string) => {
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name, description } : r)))
  }, [])

  const handleDeleteRole = useCallback(
    (roleId: string) => {
      setRoles((prev) => prev.filter((r) => r.id !== roleId))
      setPermissions((prev) => {
        const next = { ...prev }
        delete next[roleId]
        return next
      })
      setSavedPermissions((prev) => {
        const next = { ...prev }
        delete next[roleId]
        return next
      })
      if (selectedRoleId === roleId) {
        const remaining = roles.filter((r) => r.id !== roleId)
        if (remaining.length > 0) setSelectedRoleId(remaining[0].id)
      }
    },
    [selectedRoleId, roles],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl text-balance">
              Permission Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Define role-based access control for screens and functions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              className="border-slate-300 text-slate-600 bg-transparent"
              onClick={handleDiscard}
            >
              Discard
            </Button>
          )}
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!hasUnsavedChanges || saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-medium text-amber-700">
            You have unsaved changes for the &quot;{selectedRole.name}&quot; role
          </span>
        </div>
      )}

      {/* Success toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Permissions saved successfully</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Roles</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalRoles}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Screens</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalScreens}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <Layers className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Granted</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {totalPermissionsGranted}
                  <span className="text-sm font-normal text-blue-400 ml-1">/ {maxPermissions}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-blue-200">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Users in Role</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{selectedRole.userCount}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <Users className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Role Selector + Permission List */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          <RoleSelector
            roles={roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={setSelectedRoleId}
          />
          <RoleEditor
            roles={roles}
            selectedRole={selectedRole}
            onCreateRole={handleCreateRole}
            onRenameRole={handleRenameRole}
            onDeleteRole={handleDeleteRole}
          />
        </div>

        {/* Right Panel: Permission List (accordion-style) */}
        <PermissionList
          screens={mockScreens}
          permissions={permissions[selectedRoleId] || {}}
          onToggleFunction={handleToggleFunction}
          onToggleScreen={handleToggleScreen}
          onToggleAll={handleToggleAll}
        />
      </div>
    </div>
  )
}
