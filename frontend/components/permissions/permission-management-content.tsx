"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, Layers, Lock } from "lucide-react"
import { RoleSelector } from "./role-selector"
import { RoleEditor } from "./role-editor"
import { PermissionList } from "./permission-list"
import { permissionApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

const SCREEN_PERMISSIONS = "s-permissions"
const FN_VIEW = "view"
const FN_CREATE = "create"
const FN_RENAME = "rename"
const FN_CHANGE = "change"
const FN_DELETE = "delete"

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

function emptyPermissionsForScreens(screens: Screen[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const s of screens) out[s.id] = []
  return out
}

export function PermissionManagementContent() {
  const [roles, setRoles] = useState<Role[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [permissions, setPermissions] = useState<PermissionMap>({})
  const [savedPermissions, setSavedPermissions] = useState<PermissionMap>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSavedToast, setShowSavedToast] = useState(false)

  // Permission checks
  const canView = hasScreenFunction(SCREEN_PERMISSIONS, FN_VIEW)
  const canCreate = hasScreenFunction(SCREEN_PERMISSIONS, FN_CREATE)
  const canRename = hasScreenFunction(SCREEN_PERMISSIONS, FN_RENAME)
  const canChange = hasScreenFunction(SCREEN_PERMISSIONS, FN_CHANGE)
  const canDelete = hasScreenFunction(SCREEN_PERMISSIONS, FN_DELETE)

  // Load roles and screens on mount
  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setError(null)
    setLoading(true)
    Promise.all([permissionApi.getRoles(), permissionApi.getScreens()])
      .then(([rolesData, screensData]) => {
        if (cancelled) return
        const roleList: Role[] = rolesData.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          userCount: r.userCount,
          isSystem: r.isSystem,
        }))
        const screenList: Screen[] = screensData.map((s) => ({
          id: s.id,
          name: s.name,
          module: s.module,
          functions: s.functions.map((f) => ({ id: f.id, label: f.label })),
        }))
        setRoles(roleList)
        setScreens(screenList)
        if (roleList.length > 0 && !selectedRoleId) setSelectedRoleId(roleList[0].id)
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load permissions")
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // When selectedRoleId or roles change, set selected role and load permissions for that role
  useEffect(() => {
    if (!canView) return
    if (!selectedRoleId || roles.length === 0) return
    let cancelled = false
    setLoadingPermissions(true)
    permissionApi.getRolePermissions(selectedRoleId)
      .then((res) => {
        if (cancelled) return
        const perms = res.permissions ?? {}
        setPermissions((prev) => ({ ...prev, [selectedRoleId]: perms }))
        setSavedPermissions((prev) => ({ ...prev, [selectedRoleId]: { ...perms } }))
        setLoadingPermissions(false)
      })
      .catch(() => {
        if (!cancelled) setLoadingPermissions(false)
      })
    return () => { cancelled = true }
  }, [selectedRoleId, roles.length])

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? (roles.length === 0 ? { id: "", name: "", description: "", userCount: 0, isSystem: true } as Role : undefined),
    [roles, selectedRoleId],
  )

  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify(permissions[selectedRoleId] || {})
    const saved = JSON.stringify(savedPermissions[selectedRoleId] || {})
    return current !== saved
  }, [permissions, savedPermissions, selectedRoleId])

  // Stats
  const totalRoles = roles.length
  const totalScreens = screens.length
  const totalPermissionsGranted = useMemo(() => {
    const rolePerms = permissions[selectedRoleId] || {}
    return Object.values(rolePerms).reduce((sum, fns) => sum + fns.length, 0)
  }, [permissions, selectedRoleId])
  const maxPermissions = useMemo(
    () => screens.reduce((sum, s) => sum + s.functions.length, 0),
    [screens],
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
  const handleSave = useCallback(async () => {
    if (!selectedRoleId) return
    setSaving(true)
    setError(null)
    try {
      await permissionApi.saveRolePermissions(selectedRoleId, permissions[selectedRoleId] ?? {})
      setSavedPermissions((prev) => ({
        ...prev,
        [selectedRoleId]: JSON.parse(JSON.stringify(permissions[selectedRoleId] ?? {})),
      }))
      setShowSavedToast(true)
      setTimeout(() => setShowSavedToast(false), 3000)
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to save")
    } finally {
      setSaving(false)
    }
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
    async (name: string, description: string) => {
      setError(null)
      try {
        const created = await permissionApi.createRole(name, description)
        const newRole: Role = {
          id: created.id,
          name: created.name,
          description: created.description,
          userCount: 0,
          isSystem: false,
        }
        setRoles((prev) => [...prev, newRole])
        const emptyPerms = emptyPermissionsForScreens(screens)
        setPermissions((prev) => ({ ...prev, [created.id]: { ...emptyPerms } }))
        setSavedPermissions((prev) => ({ ...prev, [created.id]: { ...emptyPerms } }))
        setSelectedRoleId(created.id)
      } catch (err) {
        setError((err as Error)?.message ?? "Failed to create role")
      }
    },
    [screens],
  )

  const handleRenameRole = useCallback(async (roleId: string, name: string, description: string) => {
    setError(null)
    try {
      await permissionApi.updateRole(roleId, name, description)
      setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name, description } : r)))
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to update role")
    }
  }, [])

  const handleDeleteRole = useCallback(
    async (roleId: string) => {
      setError(null)
      try {
        await permissionApi.deleteRole(roleId)
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
          setSelectedRoleId(remaining.length > 0 ? remaining[0].id : "")
        }
      } catch (err) {
        setError((err as Error)?.message ?? "Failed to delete role")
      }
    },
    [selectedRoleId, roles],
  )

  if (!canView) {
    return <NoPermissionView />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && roles.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Could not load permissions</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800 text-sm">
          {error}
        </div>
      )}
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
            disabled={!hasUnsavedChanges || saving || loadingPermissions || !canChange}
            onClick={handleSave}
            title={!canChange ? "You don't have permission to change permissions" : undefined}
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
            canCreate={canCreate}
            canRename={canRename}
            canDelete={canDelete}
          />
        </div>

        {/* Right Panel: Permission List (accordion-style) */}
        <PermissionList
          screens={screens}
          permissions={permissions[selectedRoleId] || {}}
          onToggleFunction={handleToggleFunction}
          onToggleScreen={handleToggleScreen}
          onToggleAll={handleToggleAll}
          disabled={!canChange}
        />
      </div>
    </div>
  )
}
