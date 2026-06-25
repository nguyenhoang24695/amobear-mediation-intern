"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, Layers, Lock } from "lucide-react"
import { RoleSelector } from "./role-selector"
import { RoleEditor } from "./role-editor"
import { PermissionList } from "./permission-list"
import { QuickMappingGrid } from "./quick-mapping-grid"
import { permissionApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  const [activeTab, setActiveTab] = useState<"quick-mapping" | "role-configuration">(
    "role-configuration",
  )
  const [quickMappingEditMode, setQuickMappingEditMode] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [pendingTab, setPendingTab] = useState<null | "quick-mapping" | "role-configuration">(null)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

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
  }, [canView])

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
  }, [canView, selectedRoleId, roles.length])

  // Load permissions for all roles when opening Quick Mapping (lazy)
  useEffect(() => {
    if (!canView) return
    if (activeTab !== "quick-mapping") return
    if (roles.length === 0) return
    let cancelled = false

    ;(async () => {
      for (const r of roles) {
        if (cancelled) return
        if (permissions[r.id]) continue
        try {
          const res = await permissionApi.getRolePermissions(r.id)
          if (cancelled) return
          const perms = res.permissions ?? {}
          setPermissions((prev) => ({ ...prev, [r.id]: perms }))
          setSavedPermissions((prev) => ({ ...prev, [r.id]: { ...perms } }))
        } catch {
          // ignore; role can still be edited via Role Configuration tab
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [canView, activeTab, roles, permissions])

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? (roles.length === 0 ? { id: "", name: "", description: "", userCount: 0, isSystem: true } as Role : undefined),
    [roles, selectedRoleId],
  )

  const dirtyRoleIds = useMemo(() => {
    const out: string[] = []
    for (const r of roles) {
      const current = JSON.stringify(permissions[r.id] || {})
      const saved = JSON.stringify(savedPermissions[r.id] || {})
      if (current !== saved) out.push(r.id)
    }
    return out
  }, [permissions, roles, savedPermissions])

  const hasUnsavedChangesSelected = useMemo(() => {
    if (!selectedRoleId) return false
    return dirtyRoleIds.includes(selectedRoleId)
  }, [dirtyRoleIds, selectedRoleId])

  const hasUnsavedChangesAnyRole = dirtyRoleIds.length > 0

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
    (screenId: string, functionId: string, roleId?: string) => {
      setPermissions((prev) => {
        const targetRoleId = roleId ?? selectedRoleId
        const rolePerms = { ...(prev[targetRoleId] || {}) }
        const screenFns = [...(rolePerms[screenId] || [])]

        if (screenFns.includes(functionId)) {
          rolePerms[screenId] = screenFns.filter((f) => f !== functionId)
        } else {
          rolePerms[screenId] = [...screenFns, functionId]
        }
        return { ...prev, [targetRoleId]: rolePerms }
      })
    },
    [selectedRoleId],
  )

  // Toggle all functions for a screen
  const handleToggleScreen = useCallback(
    (screen: Screen, roleId?: string) => {
      setPermissions((prev) => {
        const targetRoleId = roleId ?? selectedRoleId
        const rolePerms = { ...(prev[targetRoleId] || {}) }
        const screenFns = rolePerms[screen.id] || []
        const allSelected = screenFns.length === screen.functions.length

        rolePerms[screen.id] = allSelected ? [] : screen.functions.map((f) => f.id)
        return { ...prev, [targetRoleId]: rolePerms }
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
  const handleSaveSelected = useCallback(async () => {
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
  const handleDiscardSelected = useCallback(() => {
    setPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: JSON.parse(JSON.stringify(savedPermissions[selectedRoleId] || {})),
    }))
  }, [savedPermissions, selectedRoleId])

  const handleSaveAllChanged = useCallback(async () => {
    if (dirtyRoleIds.length === 0) return
    setSaving(true)
    setError(null)
    try {
      for (const roleId of dirtyRoleIds) {
        await permissionApi.saveRolePermissions(roleId, permissions[roleId] ?? {})
        setSavedPermissions((prev) => ({
          ...prev,
          [roleId]: JSON.parse(JSON.stringify(permissions[roleId] ?? {})),
        }))
      }
      setShowSavedToast(true)
      setTimeout(() => setShowSavedToast(false), 3000)
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [dirtyRoleIds, permissions])

  const handleDiscardAllChanged = useCallback(() => {
    setPermissions((prev) => {
      const next = { ...prev }
      for (const roleId of dirtyRoleIds) {
        next[roleId] = JSON.parse(JSON.stringify(savedPermissions[roleId] || {}))
      }
      return next
    })
  }, [dirtyRoleIds, savedPermissions])

  const isQuickMappingDirty = quickMappingEditMode && hasUnsavedChangesAnyRole

  const requestTabChange = useCallback(
    (nextTab: "quick-mapping" | "role-configuration") => {
      if (nextTab === activeTab) return
      if (isQuickMappingDirty) {
        setPendingTab(nextTab)
        setConfirmLeaveOpen(true)
        return
      }
      setActiveTab(nextTab)
    },
    [activeTab, isQuickMappingDirty],
  )

  // Warn on hard refresh/close when quick mapping has unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isQuickMappingDirty) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isQuickMappingDirty])

  // Intercept in-app link navigation when quick mapping has unsaved edits
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!isQuickMappingDirty) return
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const target = e.target as HTMLElement | null
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute("href")
      if (!href) return
      if (href.startsWith("#")) return
      if (a.getAttribute("target") === "_blank") return

      // block and ask
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(a.href)
      setConfirmLeaveOpen(true)
    }

    document.addEventListener("click", onDocClick, true)
    return () => document.removeEventListener("click", onDocClick, true)
  }, [isQuickMappingDirty])

  const resolvePendingLeave = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab)
    } else if (pendingHref) {
      window.location.href = pendingHref
    }
    setPendingTab(null)
    setPendingHref(null)
  }, [pendingHref, pendingTab])

  const handleConfirmDiscard = useCallback(() => {
    handleDiscardAllChanged()
    setQuickMappingEditMode(false)
    setConfirmLeaveOpen(false)
    resolvePendingLeave()
  }, [handleDiscardAllChanged, resolvePendingLeave])

  const handleConfirmSave = useCallback(async () => {
    await handleSaveAllChanged()
    setQuickMappingEditMode(false)
    setConfirmLeaveOpen(false)
    resolvePendingLeave()
  }, [handleSaveAllChanged, resolvePendingLeave])

  const handleConfirmCancel = useCallback(() => {
    setConfirmLeaveOpen(false)
    setPendingTab(null)
    setPendingHref(null)
  }, [])

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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && roles.length === 0) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Could not load permissions</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-300">
          {error}
        </div>
      )}
      {/* Header + compact stats */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-balance text-foreground lg:text-3xl">
              Permission Management
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Define role-based access control for screens and functions
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:gap-3">
          <Card className="bg-muted/25 py-0 shadow-none">
            <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground">Total Roles</p>
                <p className="text-lg font-bold leading-tight text-foreground">{totalRoles}</p>
              </div>
              <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="bg-muted/25 py-0 shadow-none">
            <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground">Screens</p>
                <p className="text-lg font-bold leading-tight text-foreground">{totalScreens}</p>
              </div>
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/10 py-0 shadow-none">
            <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-primary">Granted</p>
                <p className="text-lg font-bold leading-tight text-primary">
                  {totalPermissionsGranted}
                  <span className="ml-0.5 text-[11px] font-normal text-primary/70">/ {maxPermissions}</span>
                </p>
              </div>
              <Lock className="h-4 w-4 shrink-0 text-primary" />
            </CardContent>
          </Card>
          <Card className="bg-muted/25 py-0 shadow-none">
            <CardContent className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground">Users in Role</p>
                <p className="text-lg font-bold leading-tight text-foreground">{selectedRole.userCount}</p>
              </div>
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>

      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-in fade-in slide-in-from-bottom-4 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white shadow-lg duration-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">Permissions saved successfully</span>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => requestTabChange(v as typeof activeTab)}
        className="gap-4"
      >
        <TabsList>
          <TabsTrigger value="quick-mapping">Quick Mapping</TabsTrigger>
          <TabsTrigger value="role-configuration">Role Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-mapping">
          <QuickMappingGrid
            roles={roles}
            screens={screens}
            permissions={permissions}
            disabled={!canChange || !quickMappingEditMode}
            notice={
              quickMappingEditMode && hasUnsavedChangesAnyRole ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    You have unsaved changes across {dirtyRoleIds.length} role(s)
                  </span>
                </div>
              ) : null
            }
            toolbar={
              <>
                {!quickMappingEditMode ? (
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    disabled={!canChange}
                    onClick={() => setQuickMappingEditMode(true)}
                    title={!canChange ? "You don't have permission to change permissions" : undefined}
                  >
                    Edit Mode
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => {
                      if (hasUnsavedChangesAnyRole) {
                        setPendingTab("quick-mapping")
                        setConfirmLeaveOpen(true)
                        return
                      }
                      setQuickMappingEditMode(false)
                    }}
                  >
                    Back to View Mode
                  </Button>
                )}

                {quickMappingEditMode && hasUnsavedChangesAnyRole && (
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground bg-transparent"
                    onClick={handleDiscardAllChanged}
                  >
                    Discard
                  </Button>
                )}
                {quickMappingEditMode && (
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!hasUnsavedChangesAnyRole || saving || loadingPermissions || !canChange}
                    onClick={handleSaveAllChanged}
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
                )}
              </>
            }
            onToggleScreenForRole={(roleId, screen) => handleToggleScreen(screen, roleId)}
            onToggleFunctionForRole={(roleId, screenId, functionId) =>
              handleToggleFunction(screenId, functionId, roleId)
            }
          />
        </TabsContent>

        <TabsContent value="role-configuration">
          {/* Role Configuration actions - sticky while scrolling */}
          <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center justify-end gap-2 border-b border-border bg-background/95 py-3 px-1 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
            {hasUnsavedChangesSelected && (
              <Button
                variant="outline"
                className="border-border text-muted-foreground bg-transparent"
                onClick={handleDiscardSelected}
              >
                Discard
              </Button>
            )}
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!hasUnsavedChangesSelected || saving || loadingPermissions || !canChange}
              onClick={handleSaveSelected}
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

          {hasUnsavedChangesSelected && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                You have unsaved changes for the &quot;{selectedRole.name}&quot; role
              </span>
            </div>
          )}

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
              onToggleFunction={(screenId, functionId) =>
                handleToggleFunction(screenId, functionId)
              }
              onToggleScreen={(screen) => handleToggleScreen(screen)}
              onToggleAll={handleToggleAll}
              disabled={!canChange}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in Quick Mapping (Edit Mode). Do you want to save before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmCancel}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleConfirmDiscard}
            >
              Discard
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              onClick={(e) => {
                // prevent radix from closing instantly while async save runs
                e.preventDefault()
                void handleConfirmSave()
              }}
            >
              Save changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

