"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { teamMembersApi, structureApi } from "@/lib/api/services"
import { Loader2, Filter, Search } from "lucide-react"
import { RoleSelector } from "./role-selector"
import { AppPermissionsSelector } from "./app-permissions-selector"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import {
  AppPermissionLevel,
  normalizePermissionLevel as normalizePermissionLevelUtil,
} from "@/lib/enums/app-permission-level"

const ALL_ADMOB_ACCOUNTS_VALUE = "all"
const ALL_APP_STATES_VALUE = "all"
const DEFAULT_APP_STATE = "APPROVED"
const APP_STATE_OPTIONS = [
  { value: ALL_APP_STATES_VALUE, label: "All states" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "ACTION_REQUIRED", label: "Action required" },
] as const

interface ManagePermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  initialRole: "admin" | "editor" | "viewer"
  teamId?: string
  initialPermissions?: Record<string, string>
  onSuccess?: () => void
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
  const [metaAdAccountIds, setMetaAdAccountIds] = useState<number[]>([])
  const [metaAdAccountSearch, setMetaAdAccountSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: userProfile } = useApi(
    () => teamMembersApi.viewProfile(userId),
    { enabled: open, cacheKey: `user_profile_${userId}` }
  )

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps({ approvalState: ALL_APP_STATES_VALUE }),
    { enabled: open, cacheKey: "apps_list_for_manage_permissions_all" }
  )

  const { data: metaAdAccountOptionsResponse, loading: metaAdAccountOptionsLoading } = useApi(
    () => teamMembersApi.getMetaAdAccountPermissionOptions(),
    { enabled: open, cacheKey: "meta_ad_account_permission_options" }
  )

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
        approvalState: app.approvalState ?? null,
      })) || [],
    [appsResponse]
  )

  const metaAdAccountOptions = useMemo(
    () => metaAdAccountOptionsResponse?.data || [],
    [metaAdAccountOptionsResponse]
  )

  const admobAccountOptions = useMemo(() => {
    const ids = Array.from(new Set(apps.map((a) => a.publisherId).filter(Boolean))) as string[]
    return ids.sort()
  }, [apps])

  const [filterType, setFilterType] = useState<string>("all")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterAdmobAccount, setFilterAdmobAccount] = useState<string>(ALL_ADMOB_ACCOUNTS_VALUE)
  const [filterAppState, setFilterAppState] = useState<string>(DEFAULT_APP_STATE)

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const typeMatch = filterType === "all" || app.type === filterType
      const platformMatch = filterPlatform === "all" || app.platform?.toUpperCase() === filterPlatform
      const publisherMatch =
        filterAdmobAccount === ALL_ADMOB_ACCOUNTS_VALUE ||
        (app.publisherId && app.publisherId === filterAdmobAccount)
      const appStateMatch =
        filterAppState === ALL_APP_STATES_VALUE ||
        (app.approvalState?.toUpperCase() ?? "") === filterAppState
      return typeMatch && platformMatch && publisherMatch && appStateMatch
    })
  }, [apps, filterType, filterPlatform, filterAdmobAccount, filterAppState])

  const selectedMetaAdAccountIdSet = useMemo(() => new Set(metaAdAccountIds), [metaAdAccountIds])
  const initiallyAssignedMetaAdAccountIdSet = useMemo(
    () => new Set(userProfile?.data?.metaAdAccountIds ?? []),
    [userProfile?.data?.metaAdAccountIds]
  )

  const filteredMetaAdAccounts = useMemo(() => {
    const search = metaAdAccountSearch.trim().toLowerCase()
    const filteredOptions = !search
      ? metaAdAccountOptions
      : metaAdAccountOptions.filter((option) => {
          const haystack = [option.metaAdAccountId, option.name, option.integrationName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          return haystack.includes(search)
        })

    return [...filteredOptions].sort((left, right) => {
      const leftAssigned = initiallyAssignedMetaAdAccountIdSet.has(left.id)
      const rightAssigned = initiallyAssignedMetaAdAccountIdSet.has(right.id)

      if (leftAssigned === rightAssigned) return 0
      return leftAssigned ? -1 : 1
    })
  }, [metaAdAccountOptions, metaAdAccountSearch, initiallyAssignedMetaAdAccountIdSet])

  useEffect(() => {
    if (!open) {
      setAppPermissions({})
      setMetaAdAccountIds([])
      setMetaAdAccountSearch("")
      setRole(initialRole)
      setGiveAllApps(false)
      setError(null)
      setFilterType("all")
      setFilterPlatform("all")
      setFilterAdmobAccount(ALL_ADMOB_ACCOUNTS_VALUE)
      setFilterAppState(DEFAULT_APP_STATE)
      return
    }

    let permissionsToLoad: Record<string, string> | undefined
    if (initialPermissions) {
      permissionsToLoad = initialPermissions
    } else if (userProfile?.data?.permissions) {
      permissionsToLoad = userProfile.data.permissions
    }

    if (permissionsToLoad && Object.keys(permissionsToLoad).length > 0) {
      const normalized: Record<string, AppPermissionLevel> = {}
      Object.entries(permissionsToLoad).forEach(([appId, level]) => {
        normalized[appId] = normalizePermissionLevelUtil(level)
      })
      setAppPermissions(normalized)
    } else {
      setAppPermissions({})
    }

    setMetaAdAccountIds(userProfile?.data?.metaAdAccountIds ?? [])

    if (userProfile?.data) {
      const teamRole = teamId
        ? userProfile.data.teams.find((team) => team.id === teamId)?.role
        : undefined
      const effectiveRole = (teamRole || userProfile.data.role || initialRole).toLowerCase()
      if (effectiveRole === "admin" || effectiveRole === "editor" || effectiveRole === "viewer") {
        setRole(effectiveRole as "admin" | "editor" | "viewer")
      }
    }
  }, [open, initialPermissions, userProfile, teamId, initialRole])

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

  const toggleMetaAdAccount = (accountId: number) => {
    setMetaAdAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((value) => value !== accountId) : [...prev, accountId]
    )
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
        metaAdAccountIds: metaAdAccountIds.length > 0 ? metaAdAccountIds : undefined,
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

      toast({
        title: "Permissions updated",
        description: `Permissions for ${userName} have been updated successfully.`,
      })

      invalidateCache(`user_profile_${userId}`)
      invalidateCache(`ab-user-app-mapping-${userId}`)
      invalidateCache(`ab-user-app-mapping-modal-${userId}`)

      onSuccess?.()
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
      <DialogContent className="w-full" style={{ maxWidth: "min(75vw, 900px)" }}>
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Update role, app permissions, and Meta ad account visibility for <span className="font-semibold text-slate-900">{userName}</span> in this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RoleSelector
            value={role}
            onValueChange={(value) => setRole(value as "admin" | "editor" | "viewer")}
            label="Role in team"
            idPrefix="team"
            adminDescription="Full access to all features including user and permissions management for this team."
            editorDescription="Can view and edit apps and reports assigned to this team."
            viewerDescription="Read-only access to apps and reports for this team."
          />

          <Tabs defaultValue="app" className="border-t pt-4">
            <TabsList className="h-10 bg-slate-100 p-1">
              <TabsTrigger value="app" className="px-4 data-[state=active]:bg-white">
                App Permission
              </TabsTrigger>
              <TabsTrigger value="meta" className="px-4 data-[state=active]:bg-white">
                Meta Permission
              </TabsTrigger>
            </TabsList>

            <TabsContent value="app" className="mt-4">
              <div className="flex gap-4">
                <aside className="w-48 shrink-0 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
                  </div>
                  <div className="mt-3 space-y-2">
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
                  <div className="mt-3 space-y-2">
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
                  <div className="mt-3 space-y-2">
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
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs text-slate-600">App State</Label>
                    <Select value={filterAppState} onValueChange={setFilterAppState}>
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue placeholder="App State" />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_STATE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {filteredApps.length} of {apps.length} apps
                  </p>
                </aside>
                <div className="min-w-0 flex-1">
                  <AppPermissionsSelector
                    apps={filteredApps.map(({ id, name, icon, platform, appStoreId, approvalState }) => ({
                      id,
                      name,
                      icon,
                      platform,
                      appStoreId,
                      approvalState,
                    }))}
                    allAppsForDisplay={apps.map(({ id, name, icon, platform, appStoreId, approvalState }) => ({
                      id,
                      name,
                      icon,
                      platform,
                      appStoreId,
                      approvalState,
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
                  {appsLoading && <p className="mt-2 text-xs text-slate-500">Loading apps...</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="meta" className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-slate-500 text-xs uppercase tracking-wide">Meta Ad Account Access</Label>
                  <p className="mt-1 text-sm text-slate-600">Users only see assigned Meta ad accounts across Meta Ads screens.</p>
                </div>
                <div className="text-sm font-medium text-slate-700">{metaAdAccountIds.length} assigned</div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={metaAdAccountSearch}
                      onChange={(event) => setMetaAdAccountSearch(event.target.value)}
                      placeholder="Search Meta ad account ID, name, or integration"
                      className="pl-9"
                    />
                  </div>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2 p-3">
                    {metaAdAccountOptionsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading Meta ad accounts...
                      </div>
                    ) : filteredMetaAdAccounts.length === 0 ? (
                      <p className="text-sm text-slate-500">No Meta ad accounts assigned</p>
                    ) : (
                      filteredMetaAdAccounts.map((option) => {
                        const checked = selectedMetaAdAccountIdSet.has(option.id)
                        return (
                          <label
                            key={option.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                          >
                            <Checkbox checked={checked} onCheckedChange={() => toggleMetaAdAccount(option.id)} className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-sm text-blue-700">{option.metaAdAccountId}</div>
                              <div className="mt-1 text-sm font-medium text-slate-900">{option.name}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {option.integrationName || `Integration #${option.metaIntegrationId}`}
                                {!option.isActive ? "Disabled" : ""}
                              </div>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving || !teamId}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
