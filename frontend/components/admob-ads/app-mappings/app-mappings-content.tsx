"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { admobAppMappingsApi } from "@/lib/api/admob-ads"
import { dataAccountsApi, structureApi, type AccountAppItem } from "@/lib/api/services"
import { cn } from "@/lib/utils"
import type { App } from "@/types/api"
import type { AdmobAppMappingDto, UpsertAdmobAppMappingRequestDto } from "@/types/admob-ads"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Edit,
  GitMerge,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react"

const SCREEN_ADMOB_APP_MAPPINGS = "s-admob-app-mappings"
const PAGE_SIZE_OPTIONS = [25, 50, 100]

type DataAccountLike = {
  id: number
  network?: string | null
  name?: string | null
  accountId?: string | null
}

export type MappingFormState = {
  appRowId: string
  admobAccountId: string
  externalAppId: string
  externalAppName: string
  platform: string
  packageName: string
  bundleId: string
  appStoreId: string
  downloadUrl: string
  deepLinkUrl: string
  storeUrlOverride: string
  isActive: boolean
}

export type BindingFormState = MappingFormState & {
  id?: number
  tempId: string
  original?: AdmobAppMappingDto
  removed?: boolean
}

export type AdmobAppMappingGroupStatus = "mapped" | "inactive" | "mixed" | "unmapped"

export type AdmobAppMappingGroup = {
  key: string
  appRowId?: number | null
  app?: App
  appRowIds: number[]
  apps: App[]
  bindings: AdmobAppMappingDto[]
  appLabel: string
  platform: string
  storeIdentifier: string
  latestUpdatedAt?: string | null
  status: AdmobAppMappingGroupStatus
}

type MappingFilters = {
  search: string
  platform: string
  status: string
}

const emptyForm: MappingFormState = {
  appRowId: "",
  admobAccountId: "",
  externalAppId: "",
  externalAppName: "",
  platform: "ANDROID",
  packageName: "",
  bundleId: "",
  appStoreId: "",
  downloadUrl: "",
  deepLinkUrl: "",
  storeUrlOverride: "",
  isActive: true,
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function formatAppIdDisplay(appId?: string | null) {
  if (!appId) return ""
  return appId.length <= 24 ? appId : `${appId.slice(0, 12)}...${appId.slice(-10)}`
}

function normalizePlatform(value?: string | null) {
  return value?.toUpperCase() ?? ""
}

function getPlatformBadgeClass(platform?: string | null) {
  switch (normalizePlatform(platform)) {
    case "IOS":
      return "bg-blue-100 text-blue-700"
    case "ANDROID":
      return "bg-green-100 text-green-700"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

function getStatusBadgeClass(status: AdmobAppMappingGroupStatus) {
  switch (status) {
    case "mapped":
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"
    case "mixed":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
    case "unmapped":
      return "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"
    default:
      return "bg-slate-100 text-slate-600 hover:bg-slate-100 border-none"
  }
}

function getStatusLabel(status: AdmobAppMappingGroupStatus) {
  switch (status) {
    case "mapped":
      return "Mapped"
    case "mixed":
      return "Mixed"
    case "unmapped":
      return "Unmapped"
    default:
      return "Inactive"
  }
}

function getAppLabel(app?: App | null, mapping?: AdmobAppMappingDto | null) {
  return mapping?.appDisplayName ?? app?.displayName ?? app?.name ?? mapping?.externalAppName ?? mapping?.appId ?? (mapping ? "Unlinked app" : "-")
}

function getStoreIdentifier(app?: App | null, mapping?: AdmobAppMappingDto | null) {
  const platform = normalizePlatform(mapping?.platform ?? app?.platform)
  if (platform === "ANDROID") return mapping?.packageName || mapping?.normalizedStoreIdentifier || ""
  if (platform === "IOS") return mapping?.bundleId || mapping?.appStoreId || app?.appStoreId || mapping?.normalizedStoreIdentifier || ""
  return mapping?.packageName || mapping?.bundleId || mapping?.appStoreId || mapping?.normalizedStoreIdentifier || app?.appStoreId || ""
}

function normalizeStoreKeyValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? ""
}

function getStoreGroupKey(app?: App | null, mapping?: AdmobAppMappingDto | null) {
  const platform = normalizePlatform(mapping?.platform ?? app?.platform) || "UNKNOWN"
  const storeIdentifier = getStoreIdentifier(app, mapping)
  const normalized = normalizeStoreKeyValue(storeIdentifier)
  return normalized ? `store:${platform}:${normalized}` : null
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => typeof value === "number"))).sort((a, b) => a - b)
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)))
}

function getFormStoreIdentifier(form: Pick<MappingFormState, "platform" | "packageName" | "bundleId" | "appStoreId">) {
  const platform = normalizePlatform(form.platform)
  if (platform === "ANDROID") return form.packageName.trim() || form.appStoreId.trim()
  if (platform === "IOS") return form.appStoreId.trim() || form.bundleId.trim()
  return form.packageName.trim() || form.bundleId.trim() || form.appStoreId.trim()
}

export function getNormalizedBindingStoreIdentity(form: Pick<MappingFormState, "platform" | "packageName" | "bundleId" | "appStoreId">) {
  const platform = normalizePlatform(form.platform)
  const storeIdentifier = getFormStoreIdentifier(form)
  return {
    platform,
    storeIdentifier,
    key: platform && storeIdentifier ? `${platform}:${platform === "ANDROID" ? storeIdentifier.toLowerCase() : storeIdentifier}` : "",
  }
}

export function validateBindingStoreIdentity(forms: BindingFormState[]) {
  const visibleForms = forms.filter((form) => !form.removed)
  if (visibleForms.length === 0) {
    return { valid: false, message: "Add at least one AdMob binding." }
  }

  if (visibleForms.some((form) => !form.admobAccountId || !form.appRowId || !form.externalAppId.trim())) {
    return { valid: false, message: "Select an AdMob account and app for every binding." }
  }

  const identities = visibleForms.map(getNormalizedBindingStoreIdentity)
  if (identities.some((identity) => !identity.key)) {
    return { valid: false, message: "Selected AdMob apps must include platform and store identity." }
  }

  const firstKey = identities[0].key
  if (identities.some((identity) => identity.key !== firstKey)) {
    return { valid: false, message: "All AdMob bindings in one mapping must belong to the same store identity." }
  }

  return { valid: true, message: null }
}

function getLatestUpdatedAt(bindings: AdmobAppMappingDto[]) {
  return bindings
    .map((binding) => binding.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
}

export function getGroupStatus(group: Pick<AdmobAppMappingGroup, "appRowId" | "storeIdentifier" | "bindings">): AdmobAppMappingGroupStatus {
  if (!group.appRowId && !group.storeIdentifier) return "unmapped"
  if (group.bindings.length > 1) return "mixed"

  const activeCount = group.bindings.filter((binding) => binding.isActive).length
  if (activeCount === 0) return "inactive"
  return "mapped"
}

export function buildAdmobAppMappingGroups(
  mappings: AdmobAppMappingDto[],
  apps: App[],
  accountMap: Map<number, DataAccountLike>,
): AdmobAppMappingGroup[] {
  const appByRowId = new Map(apps.map((app) => [app.id, app]))
  const groups = new Map<string, AdmobAppMappingDto[]>()

  mappings.forEach((mapping) => {
    const app = mapping.appRowId ? appByRowId.get(mapping.appRowId) : undefined
    const key = getStoreGroupKey(app, mapping) ?? (mapping.appRowId ? `app:${mapping.appRowId}` : `unmapped:${mapping.id}`)
    const rows = groups.get(key) ?? []
    rows.push(mapping)
    groups.set(key, rows)
  })

  return Array.from(groups.entries())
    .map(([key, bindings]) => {
      const sortedBindings = bindings
        .slice()
        .sort((a, b) => {
          const accountA = a.admobAccountId ? accountMap.get(a.admobAccountId)?.name ?? "" : ""
          const accountB = b.admobAccountId ? accountMap.get(b.admobAccountId)?.name ?? "" : ""
          return accountA.localeCompare(accountB) || a.externalAppId.localeCompare(b.externalAppId)
        })
      const first = sortedBindings[0]
      const appRowIds = uniqueNumbers(bindings.map((binding) => binding.appRowId))
      const groupApps = appRowIds.map((appRowId) => appByRowId.get(appRowId)).filter((app): app is App => !!app)
      const app = groupApps[0] ?? (first.appRowId ? appByRowId.get(first.appRowId) : undefined)
      const storeIdentifier = getStoreIdentifier(app, first)
      const platform = normalizePlatform(first.platform ?? app?.platform) || "ANDROID"
      const group: AdmobAppMappingGroup = {
        key,
        appRowId: appRowIds[0] ?? first.appRowId,
        app,
        appRowIds,
        apps: groupApps,
        bindings: sortedBindings,
        appLabel: getAppLabel(app, first),
        platform,
        storeIdentifier,
        latestUpdatedAt: getLatestUpdatedAt(bindings),
        status: "inactive",
      }
      group.status = getGroupStatus(group)
      return group
    })
    .sort((a, b) => a.appLabel.localeCompare(b.appLabel) || a.key.localeCompare(b.key))
}

export function filterAdmobAppMappingGroups(
  groups: AdmobAppMappingGroup[],
  accountMap: Map<number, DataAccountLike>,
  filters: MappingFilters,
) {
  const query = filters.search.trim().toLowerCase()
  return groups.filter((group) => {
    if (filters.platform !== "all" && group.platform !== filters.platform) return false
    if (filters.status !== "all" && group.status !== filters.status) return false
    if (!query) return true

    const searchableValues = [
      group.appLabel,
      group.app?.appId ?? "",
      ...uniqueStrings(group.bindings.map((binding) => binding.appId)),
      group.storeIdentifier,
      ...group.bindings.flatMap((binding) => [
        binding.externalAppId,
        binding.externalAppName ?? "",
        binding.appId ?? "",
        binding.admobAccountId ? accountMap.get(binding.admobAccountId)?.name ?? "" : "",
        binding.admobAccountId ? accountMap.get(binding.admobAccountId)?.accountId ?? "" : "",
      ]),
    ]

    return searchableValues.some((value) => value.toLowerCase().includes(query))
  })
}

function createBindingForm(mapping: AdmobAppMappingDto): BindingFormState {
  return {
    tempId: `existing:${mapping.id}`,
    id: mapping.id,
    original: mapping,
    appRowId: mapping.appRowId?.toString() ?? "",
    admobAccountId: mapping.admobAccountId?.toString() ?? "",
    externalAppId: mapping.externalAppId,
    externalAppName: mapping.externalAppName ?? "",
    platform: mapping.platform ?? "ANDROID",
    packageName: mapping.packageName ?? "",
    bundleId: mapping.bundleId ?? "",
    appStoreId: mapping.appStoreId ?? "",
    downloadUrl: mapping.downloadUrl ?? "",
    deepLinkUrl: mapping.deepLinkUrl ?? "",
    storeUrlOverride: mapping.storeUrlOverride ?? "",
    isActive: mapping.isActive,
  }
}

function createNewBindingForm(accountId?: number | null): BindingFormState {
  return {
    ...emptyForm,
    tempId: `new:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    admobAccountId: accountId?.toString() ?? "",
  }
}

export function applyAdmobAccountAppToBindingForm(form: BindingFormState, app: AccountAppItem): BindingFormState {
  const platform = normalizePlatform(app.platform) || "ANDROID"
  const storeIdentifier = app.appStoreId?.trim() ?? ""
  return {
    ...form,
    appRowId: app.id.toString(),
    externalAppId: app.appId,
    externalAppName: app.displayName ?? app.name ?? "",
    platform,
    packageName: platform === "ANDROID" ? storeIdentifier : "",
    bundleId: platform === "IOS" && form.bundleId ? form.bundleId : "",
    appStoreId: platform === "IOS" ? storeIdentifier : "",
  }
}

function createFallbackAccountApp(form: BindingFormState): AccountAppItem | null {
  if (!form.appRowId || !form.externalAppId.trim()) return null
  return {
    id: Number(form.appRowId),
    name: form.externalAppName || form.externalAppId,
    appId: form.externalAppId,
    platform: form.platform,
    displayName: form.externalAppName || form.externalAppId,
    appStoreId: getFormStoreIdentifier(form),
    createdAt: form.original?.createdAt ?? "",
    updatedAt: form.original?.updatedAt ?? "",
  }
}

function buildPayload(form: BindingFormState): UpsertAdmobAppMappingRequestDto {
  return {
    externalAppId: form.externalAppId.trim(),
    externalAppName: form.externalAppName.trim() || null,
    admobAccountId: form.admobAccountId ? Number(form.admobAccountId) : null,
    appRowId: form.appRowId ? Number(form.appRowId) : null,
    platform: form.platform || null,
    packageName: form.packageName.trim() || null,
    bundleId: form.bundleId.trim() || null,
    appStoreId: form.appStoreId.trim() || null,
    downloadUrl: form.downloadUrl.trim() || null,
    deepLinkUrl: form.deepLinkUrl.trim() || null,
    storeUrlOverride: form.storeUrlOverride.trim() || null,
    isActive: form.isActive,
  }
}

export function AdmobAppMappingsContent() {
  const { toast } = useToast()
  const canCreate = hasScreenFunction(SCREEN_ADMOB_APP_MAPPINGS, "create")
  const canEdit = hasScreenFunction(SCREEN_ADMOB_APP_MAPPINGS, "edit")
  const canDisableEnable = hasScreenFunction(SCREEN_ADMOB_APP_MAPPINGS, "disable-enable")

  const {
    data: mappings,
    loading: mappingsLoading,
    error: mappingsError,
    refetch,
  } = useApi(() => admobAppMappingsApi.list(), { cacheKey: "admob-app-mappings:list" })

  const {
    data: appsResponse,
    loading: appsLoading,
    error: appsError,
  } = useApi(() => structureApi.getApps(), { cacheKey: "structure-apps:list" })

  const {
    data: dataAccounts,
    loading: accountsLoading,
    error: accountsError,
  } = useApi(() => dataAccountsApi.getAll(), { cacheKey: "data-accounts:list" })

  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerGroup, setDrawerGroup] = useState<AdmobAppMappingGroup | null>(null)
  const [bindingForms, setBindingForms] = useState<BindingFormState[]>([])
  const [accountAppsById, setAccountAppsById] = useState<Record<number, AccountAppItem[]>>({})
  const [accountAppsLoadingById, setAccountAppsLoadingById] = useState<Record<number, boolean>>({})
  const [accountAppsErrorById, setAccountAppsErrorById] = useState<Record<number, string | null>>({})
  const [appPickerOpenId, setAppPickerOpenId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [rowActionLoadingId, setRowActionLoadingId] = useState<string | null>(null)

  const apps = appsResponse?.apps ?? []

  const appByRowId = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps])

  const admobAccounts = useMemo(() => {
    return ((dataAccounts ?? []) as DataAccountLike[]).filter((acc) => acc.network === "admob")
  }, [dataAccounts])

  const accountMap = useMemo(() => new Map(admobAccounts.map((acc) => [acc.id, acc])), [admobAccounts])

  const groups = useMemo(() => {
    return buildAdmobAppMappingGroups(mappings ?? [], apps, accountMap)
  }, [mappings, apps, accountMap])

  const filtered = useMemo(() => {
    return filterAdmobAppMappingGroups(groups, accountMap, {
      search,
      platform: platformFilter,
      status: statusFilter,
    })
  }, [groups, accountMap, search, platformFilter, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, filtered.length)
  const pagedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const visibleBindingForms = bindingForms.filter((form) => !form.removed)

  useEffect(() => {
    setPage(1)
  }, [search, platformFilter, statusFilter, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const loadAccountApps = useCallback(async (accountId: number) => {
    if (!accountId || accountAppsById[accountId] || accountAppsLoadingById[accountId]) return

    setAccountAppsLoadingById((current) => ({ ...current, [accountId]: true }))
    setAccountAppsErrorById((current) => ({ ...current, [accountId]: null }))
    try {
      const response = await dataAccountsApi.getApps(accountId)
      setAccountAppsById((current) => ({ ...current, [accountId]: response.apps ?? [] }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load AdMob apps."
      setAccountAppsErrorById((current) => ({ ...current, [accountId]: message }))
    } finally {
      setAccountAppsLoadingById((current) => ({ ...current, [accountId]: false }))
    }
  }, [accountAppsById, accountAppsLoadingById])

  useEffect(() => {
    if (!drawerOpen) return
    uniqueNumbers(visibleBindingForms.map((form) => (form.admobAccountId ? Number(form.admobAccountId) : null)))
      .forEach((accountId) => {
        void loadAccountApps(accountId)
      })
  }, [drawerOpen, loadAccountApps, visibleBindingForms])

  const openCreate = () => {
    const accountId = admobAccounts[0]?.id ?? null
    setDrawerGroup(null)
    setBindingForms([createNewBindingForm(accountId)])
    if (accountId) void loadAccountApps(accountId)
    setDrawerOpen(true)
  }

  const openEdit = (group: AdmobAppMappingGroup) => {
    setDrawerGroup(group)
    setBindingForms(group.bindings.map(createBindingForm))
    uniqueNumbers(group.bindings.map((binding) => binding.admobAccountId)).forEach((accountId) => {
      void loadAccountApps(accountId)
    })
    setDrawerOpen(true)
  }

  const updateBindingForm = (tempId: string, patch: Partial<BindingFormState>) => {
    setBindingForms((current) => current.map((form) => (form.tempId === tempId ? { ...form, ...patch } : form)))
  }

  const handleAccountChange = (tempId: string, value: string) => {
    setBindingForms((current) => current.map((form) => (form.tempId === tempId
      ? {
          ...form,
          admobAccountId: value,
          appRowId: "",
          externalAppId: "",
          externalAppName: "",
          platform: "ANDROID",
          packageName: "",
          bundleId: "",
          appStoreId: "",
          downloadUrl: "",
          deepLinkUrl: "",
          storeUrlOverride: "",
        }
      : form)))
    if (value) void loadAccountApps(Number(value))
  }

  const handleAccountAppChange = (form: BindingFormState, value: string) => {
    const accountId = form.admobAccountId ? Number(form.admobAccountId) : null
    const fallbackApp = createFallbackAccountApp(form)
    const selected = accountId
      ? accountAppsById[accountId]?.find((app) => app.id.toString() === value) ?? (fallbackApp?.id.toString() === value ? fallbackApp : null)
      : null
    if (!selected) return
    setBindingForms((current) => current.map((item) => (item.tempId === form.tempId ? applyAdmobAccountAppToBindingForm(item, selected) : item)))
  }

  const addBindingForm = () => {
    setBindingForms((current) => [
      ...current,
      createNewBindingForm(admobAccounts[0]?.id ?? null),
    ])
    if (admobAccounts[0]?.id) void loadAccountApps(admobAccounts[0].id)
  }

  const removeBindingForm = (form: BindingFormState) => {
    if (form.id) {
      setBindingForms((current) => current.map((item) => (item.tempId === form.tempId ? { ...item, isActive: false } : item)))
      return
    }

    setBindingForms((current) => current.filter((item) => item.tempId !== form.tempId))
  }

  const handleSubmit = async () => {
    const activeForms = bindingForms.filter((form) => !form.removed)
    const validation = validateBindingStoreIdentity(activeForms)
    if (!validation.valid) {
      toast({ title: "Invalid AdMob bindings", description: validation.message ?? "Unable to save app mappings.", variant: "destructive" })
      return
    }

    try {
      setSubmitting(true)

      for (const form of bindingForms) {
        if (form.removed) {
          if (form.id && form.original?.isActive) {
            await admobAppMappingsApi.disable(form.id)
          }
          continue
        }

        const payload = buildPayload(form)
        if (form.id) {
          await admobAppMappingsApi.update(form.id, payload)
        } else {
          await admobAppMappingsApi.create(payload)
        }
      }

      invalidateCache("admob-app-mappings:list")
      await refetch()
      setDrawerOpen(false)
      toast({ title: drawerGroup ? "App mappings updated" : "App mapping created" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to save app mappings."
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleGroupActive = async (group: AdmobAppMappingGroup) => {
    try {
      setRowActionLoadingId(group.key)
      const shouldEnable = group.bindings.every((binding) => !binding.isActive)
      for (const binding of group.bindings) {
        if (shouldEnable && !binding.isActive) await admobAppMappingsApi.enable(binding.id)
        if (!shouldEnable && binding.isActive) await admobAppMappingsApi.disable(binding.id)
      }

      invalidateCache("admob-app-mappings:list")
      await refetch()
      toast({ title: shouldEnable ? "App mappings enabled" : "App mappings disabled" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to update app mappings."
      toast({ title: "Update failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <span>AdMob Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">App Mappings</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <GitMerge className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AdMob App Mappings</h1>
              <p className="text-sm text-slate-500">Gom nhiều AdMob App ID theo cùng store identity và AdMob account.</p>
            </div>
          </div>
        </div>
        <div>
          {canCreate && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add App Mapping
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by app, app ID, AdMob account..."
            className="h-9 text-sm pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-9 w-36 text-sm bg-white">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ANDROID">Android</SelectItem>
            <SelectItem value="IOS">iOS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 text-sm bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="mapped">Mapped</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
            <SelectItem value="unmapped">Unmapped</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} app{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium">App</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Platform</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Store Identity</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">AdMob Bindings</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-28">Status</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-32">Updated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingsLoading || appsLoading || accountsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading app mappings...
                  </div>
                </TableCell>
              </TableRow>
            ) : mappingsError || appsError || accountsError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-sm text-red-600">
                  {mappingsError?.message ?? appsError?.message ?? accountsError?.message}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-sm text-slate-400">
                  No app mappings found.
                </TableCell>
              </TableRow>
            ) : (
              pagedGroups.map((group) => {
                const isBusy = rowActionLoadingId === group.key
                const groupShouldEnable = group.bindings.every((binding) => !binding.isActive)
                const linkedAppIds = uniqueStrings(group.bindings.map((binding) => binding.appId))
                const appMetaLabel = linkedAppIds.length > 1 ? `${linkedAppIds.length} linked app IDs` : linkedAppIds[0] ?? group.storeIdentifier
                return (
                  <TableRow key={group.key} className="text-sm hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {group.app?.iconUri ? (
                          <img src={group.app.iconUri} alt="" className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                            {group.appLabel.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                          {group.app?.appId ? (
                            <Link href={`/apps/${encodeURIComponent(group.app.appId)}`} className="block font-medium text-slate-900 transition-colors hover:text-blue-600 hover:underline">
                              {group.appLabel}
                            </Link>
                          ) : (
                            <p className="font-medium text-slate-900">{group.appLabel}</p>
                          )}
                          {appMetaLabel ? <p className="truncate font-mono text-[11px] text-slate-400">{appMetaLabel}</p> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[11px] ${getPlatformBadgeClass(group.platform)}`}>{group.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="truncate max-w-[220px] block font-mono text-xs text-slate-600">{group.storeIdentifier || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        {group.bindings.map((binding) => {
                          const account = binding.admobAccountId ? accountMap.get(binding.admobAccountId) : undefined
                          return (
                            <div key={binding.id} className="flex min-w-0 items-center gap-2 text-xs">
                              <Badge className={binding.isActive ? "bg-emerald-50 text-emerald-700 border-none" : "bg-slate-100 text-slate-500 border-none"}>
                                {binding.isActive ? "On" : "Off"}
                              </Badge>
                              <span className="font-medium text-slate-700">{account?.name ?? "No account"}</span>
                              <span className="truncate font-mono text-blue-700">{binding.externalAppId}</span>
                            </div>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(group.status)}>{getStatusLabel(group.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(group.latestUpdatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => openEdit(group)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit bindings
                            </DropdownMenuItem>
                          )}
                          {canDisableEnable && group.status !== "unmapped" && (
                            <DropdownMenuItem onClick={() => void handleToggleGroupActive(group)}>
                              <Power className="w-4 h-4 mr-2" />
                              {groupShouldEnable ? "Enable all" : "Disable all"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {!mappingsLoading && !appsLoading && !accountsLoading && !mappingsError && !appsError && !accountsError && filtered.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-8 w-20 bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span>
                {pageStart}-{pageEnd} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-16 text-center">{currentPage} / {pageCount}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="w-full max-w-[860px] p-0 gap-0 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {drawerGroup ? "Edit App Mapping" : "Add App Mapping"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
            {drawerGroup?.storeIdentifier ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Store identity</p>
                <p className="truncate font-mono text-sm text-slate-800">{drawerGroup.storeIdentifier}</p>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium text-slate-700">AdMob bindings</Label>
                  <p className="text-xs text-slate-400">Manage all AdMob account/app-id mappings for this app.</p>
                </div>
                {canCreate && (
                  <Button type="button" variant="outline" size="sm" onClick={addBindingForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add binding
                  </Button>
                )}
              </div>

              {visibleBindingForms.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                  No AdMob bindings. Add one to save this app mapping.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleBindingForms.map((form, index) => {
                    const accountId = form.admobAccountId ? Number(form.admobAccountId) : null
                    const loadedApps = accountId ? accountAppsById[accountId] ?? [] : []
                    const fallbackApp = createFallbackAccountApp(form)
                    const appOptions = fallbackApp && !loadedApps.some((app) => app.id === fallbackApp.id)
                      ? [fallbackApp, ...loadedApps]
                      : loadedApps
                    const selectedAccountApp = form.appRowId ? appOptions.find((app) => app.id.toString() === form.appRowId) : null
                    const accountAppsLoading = accountId ? accountAppsLoadingById[accountId] : false
                    const accountAppsError = accountId ? accountAppsErrorById[accountId] : null

                    return (
                      <div key={form.tempId} className="rounded-lg border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-900">Binding {index + 1}</div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch checked={form.isActive} onCheckedChange={(value) => updateBindingForm(form.tempId, { isActive: value })} disabled={!canDisableEnable && !!form.id} />
                              <span className="text-xs text-slate-500">Enabled</span>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => removeBindingForm(form)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700">AdMob Account</Label>
                            <Select value={form.admobAccountId} onValueChange={(value) => handleAccountChange(form.tempId, value)}>
                              <SelectTrigger className="h-9 w-full text-sm">
                                <SelectValue placeholder="Select AdMob Account..." />
                              </SelectTrigger>
                              <SelectContent>
                                {admobAccounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>
                                    {acc.name} ({acc.accountId})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-slate-700">AdMob App</Label>
                            <Popover open={appPickerOpenId === form.tempId} onOpenChange={(open) => setAppPickerOpenId(open ? form.tempId : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={appPickerOpenId === form.tempId}
                                  className="h-auto min-h-11 w-full justify-between bg-white px-3 py-2 text-left font-normal"
                                  disabled={!accountId || accountAppsLoading}
                                >
                                  {selectedAccountApp ? (
                                    <span className="flex min-w-0 items-center gap-2">
                                      {selectedAccountApp.iconUri ? (
                                        <img src={selectedAccountApp.iconUri} alt="" className="h-7 w-7 rounded shrink-0" />
                                      ) : (
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-medium text-slate-500">
                                          {(selectedAccountApp.displayName ?? selectedAccountApp.name ?? "?").charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm text-slate-900">{selectedAccountApp.displayName ?? selectedAccountApp.name}</span>
                                        <span className="block truncate font-mono text-xs text-slate-500">{formatAppIdDisplay(selectedAccountApp.appId)}</span>
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="truncate text-slate-500">
                                      {!accountId ? "Select AdMob account first" : accountAppsLoading ? "Loading apps..." : "Select AdMob App..."}
                                    </span>
                                  )}
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
                                <Command shouldFilter={true}>
                                  <CommandInput placeholder="Search by app name, app ID, or store identity..." />
                                  <CommandList>
                                    <CommandEmpty>No synced AdMob apps for this account.</CommandEmpty>
                                    <CommandGroup>
                                      {appOptions.map((app) => {
                                        const label = app.displayName ?? app.name
                                        const platform = normalizePlatform(app.platform) || "APP"
                                        const storeIdentity = app.appStoreId ?? ""
                                        return (
                                          <CommandItem
                                            key={app.id}
                                            value={`${label} ${app.appId} ${storeIdentity} ${platform}`}
                                            onSelect={() => {
                                              handleAccountAppChange(form, app.id.toString())
                                              setAppPickerOpenId(null)
                                            }}
                                          >
                                            <Check className={cn("mr-2 h-4 w-4 shrink-0", form.appRowId === app.id.toString() ? "opacity-100" : "opacity-0")} />
                                            {app.iconUri ? (
                                              <img src={app.iconUri} alt="" className="h-8 w-8 rounded shrink-0" />
                                            ) : (
                                              <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback className="text-xs">{(label || "?").charAt(0).toUpperCase()}</AvatarFallback>
                                              </Avatar>
                                            )}
                                            <div className="flex min-w-0 flex-col text-left">
                                              <span className="truncate font-medium">{label}</span>
                                              <span className="truncate text-xs text-slate-500">
                                                {[platform, formatAppIdDisplay(app.appId)].filter(Boolean).join(" - ")}
                                              </span>
                                              {storeIdentity ? <span className="truncate font-mono text-[11px] text-slate-400">{storeIdentity}</span> : null}
                                            </div>
                                          </CommandItem>
                                        )
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {accountAppsError ? <p className="text-xs text-red-500">{accountAppsError}</p> : null}
                          </div>
                        </div>

                        {selectedAccountApp ? (
                          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                            <div className="flex items-start gap-3">
                              {selectedAccountApp.iconUri ? (
                                <img src={selectedAccountApp.iconUri} alt="" className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-cover shrink-0" />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                                  {(selectedAccountApp.displayName ?? selectedAccountApp.name ?? "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-2">
                                <div>
                                  <p className="truncate text-sm font-medium text-slate-900">{selectedAccountApp.displayName ?? selectedAccountApp.name}</p>
                                  <p className="truncate font-mono text-xs text-blue-700">{selectedAccountApp.appId}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <p className="text-slate-400">OS</p>
                                    <Badge className={`mt-1 text-[10px] ${getPlatformBadgeClass(form.platform)}`}>{normalizePlatform(form.platform) || "APP"}</Badge>
                                  </div>
                                  <div className="min-w-0 col-span-2">
                                    <p className="text-slate-400">Store identity</p>
                                    <p className="truncate font-mono text-slate-700">{getFormStoreIdentifier(form) || "-"}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                            Select an AdMob app to preview its store identity.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleSubmit()} disabled={submitting || visibleBindingForms.length === 0}>
              {submitting ? "Saving..." : drawerGroup ? "Save Changes" : "Add App Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
