"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { metaAppMappingsApi } from "@/lib/api/meta-ads"
import { structureApi } from "@/lib/api/services"
import { cn } from "@/lib/utils"
import type { App } from "@/types/api"
import type {
  CreateMetaAppMappingRequestDto,
  MetaAppMappingAdmobBindingDto,
  MetaAppMappingDto,
  UpdateMetaAppMappingRequestDto,
} from "@/types/meta-ads"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Edit,
  GitMerge,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  Search,
} from "lucide-react"

const SCREEN_META_ACCOUNTS = "s-meta-accounts"
const PAGE_SIZE_OPTIONS = [25, 50, 100]

type MappingFormState = {
  appRowId: string
  metaApplicationId: string
  objectStoreUrl: string
  packageName: string
  bundleId: string
  appStoreId: string
  deepLinkUrlOverride: string
  storeUrlOverride: string
  isActive: boolean
}

type MetaMappingStatus = "mapped" | "unmapped"

type MetaAppMappingGroup = {
  key: string
  primaryMapping: MetaAppMappingDto
  mappings: MetaAppMappingDto[]
  admobBindings: MetaAppMappingAdmobBindingDto[]
  admobAccountCount: number
  app?: App
  appLabel: string
  platform: string
  storeIdentifier: string
  metaApplicationIds: string[]
  latestUpdatedAt?: string | null
  status: MetaMappingStatus
}

const emptyForm: MappingFormState = {
  appRowId: "",
  metaApplicationId: "",
  objectStoreUrl: "",
  packageName: "",
  bundleId: "",
  appStoreId: "",
  deepLinkUrlOverride: "",
  storeUrlOverride: "",
  isActive: true,
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function normalizePlatform(value?: string | null) {
  return value?.toUpperCase() ?? ""
}

function getPlatformBadgeClass(platform?: string | null) {
  switch (normalizePlatform(platform)) {
    case "IOS":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
    case "ANDROID":
      return "bg-green-100 text-green-700 hover:bg-green-100 border-none"
    default:
      return "bg-slate-100 text-slate-600 hover:bg-slate-100 border-none"
  }
}

function getStatusBadgeClass(status: MetaMappingStatus) {
  return status === "mapped"
    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"
    : "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim())?.trim() ?? null
}

function getDisplayAppName(app?: App | null) {
  return app?.displayName ?? app?.name ?? "-"
}

function getAppLabel(app?: App | null, mapping?: MetaAppMappingDto | null) {
  return mapping?.appDisplayName ?? mapping?.externalAppName ?? app?.displayName ?? app?.name ?? mapping?.appId ?? "Unlinked app"
}

function getStoreIdentifier(app?: App | null, mapping?: MetaAppMappingDto | null) {
  const platform = normalizePlatform(mapping?.platform ?? app?.platform)
  if (platform === "ANDROID") return firstNonEmpty(mapping?.normalizedStoreIdentifier, mapping?.packageName)
  if (platform === "IOS") return firstNonEmpty(mapping?.normalizedStoreIdentifier, mapping?.appStoreId, mapping?.bundleId, app?.appStoreId)
  return firstNonEmpty(mapping?.normalizedStoreIdentifier, mapping?.packageName, mapping?.appStoreId, mapping?.bundleId, app?.appStoreId)
}

function getPrimaryStoreUrl(mapping: MetaAppMappingDto) {
  return mapping.objectStoreUrl || mapping.storeUrlOverride || mapping.normalizedStoreIdentifier || "-"
}

function isHttpUrl(value?: string | null) {
  return /^https?:\/\//i.test(value?.trim() ?? "")
}

function buildStoreUrl(platform?: string | null, storeIdentifier?: string | null) {
  const id = storeIdentifier?.trim()
  if (!id) return null

  switch (normalizePlatform(platform)) {
    case "ANDROID":
      return `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}`
    case "IOS": {
      const appStoreId = id.replace(/\D/g, "")
      return appStoreId ? `https://apps.apple.com/app/id${appStoreId}` : null
    }
    default:
      return null
  }
}

function getMappingStoreUrl(mapping: MetaAppMappingDto, group: Pick<MetaAppMappingGroup, "platform" | "storeIdentifier">) {
  if (isHttpUrl(mapping.objectStoreUrl)) return mapping.objectStoreUrl!.trim()
  if (isHttpUrl(mapping.storeUrlOverride)) return mapping.storeUrlOverride!.trim()
  return buildStoreUrl(group.platform, group.storeIdentifier)
}

function getGroupKey(mapping: MetaAppMappingDto) {
  const normalizedStoreIdentifier = mapping.normalizedStoreIdentifier?.trim().toLowerCase()
  if (!normalizedStoreIdentifier) return `meta:${mapping.id}`

  return `store:${normalizePlatform(mapping.platform) || "UNKNOWN"}:${normalizedStoreIdentifier}`
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)))
}

function getLatestUpdatedAt(mappings: MetaAppMappingDto[]) {
  return mappings
    .map((mapping) => mapping.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
}

function dedupeAdmobBindings(mappings: MetaAppMappingDto[]) {
  const byId = new Map<number, MetaAppMappingAdmobBindingDto>()
  mappings.forEach((mapping) => {
    ;(mapping.admobBindings ?? []).forEach((binding) => byId.set(binding.bindingId, binding))
  })

  return Array.from(byId.values()).sort((a, b) => {
    const accountA = a.admobAccountName ?? ""
    const accountB = b.admobAccountName ?? ""
    return accountA.localeCompare(accountB) || a.externalAppId.localeCompare(b.externalAppId)
  })
}

export function buildMetaAppMappingGroups(mappings: MetaAppMappingDto[], apps: App[]): MetaAppMappingGroup[] {
  const appByRowId = new Map(apps.map((app) => [app.id, app]))
  const rowsByKey = new Map<string, MetaAppMappingDto[]>()

  mappings.forEach((mapping) => {
    const key = getGroupKey(mapping)
    const rows = rowsByKey.get(key) ?? []
    rows.push(mapping)
    rowsByKey.set(key, rows)
  })

  return Array.from(rowsByKey.entries())
    .map(([key, rows]) => {
      const sortedRows = rows.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const primaryMapping = sortedRows[0]
      const app = primaryMapping.appRowId ? appByRowId.get(primaryMapping.appRowId) : undefined
      const admobBindings = dedupeAdmobBindings(sortedRows)
      const admobAccountCount = new Set(
        admobBindings
          .map((binding) => binding.admobAccountId)
          .filter((value): value is number => typeof value === "number"),
      ).size
      const status: MetaMappingStatus = admobAccountCount > 0 ? "mapped" : "unmapped"

      return {
        key,
        primaryMapping,
        mappings: sortedRows,
        admobBindings,
        admobAccountCount,
        app,
        appLabel: getAppLabel(app, primaryMapping),
        platform: normalizePlatform(primaryMapping.platform ?? app?.platform) || "UNKNOWN",
        storeIdentifier: getStoreIdentifier(app, primaryMapping) ?? "",
        metaApplicationIds: uniqueStrings(sortedRows.map((mapping) => mapping.metaApplicationId)),
        latestUpdatedAt: getLatestUpdatedAt(sortedRows),
        status,
      }
    })
    .sort((a, b) => a.appLabel.localeCompare(b.appLabel) || a.storeIdentifier.localeCompare(b.storeIdentifier) || a.key.localeCompare(b.key))
}

export function filterMetaAppMappingGroups(
  groups: MetaAppMappingGroup[],
  filters: { search: string; platform: string; status: string },
) {
  const query = filters.search.trim().toLowerCase()
  return groups.filter((group) => {
    if (filters.platform !== "all" && group.platform !== filters.platform) return false
    if (filters.status !== "all" && group.status !== filters.status) return false
    if (!query) return true

    const searchableValues = [
      group.appLabel,
      group.app?.appId ?? "",
      group.storeIdentifier,
      ...group.metaApplicationIds,
      ...group.mappings.flatMap((mapping) => [
        mapping.externalAppName ?? "",
        mapping.objectStoreUrl ?? "",
        mapping.packageName ?? "",
        mapping.appStoreId ?? "",
      ]),
      ...group.admobBindings.flatMap((binding) => [
        binding.admobAccountName ?? "",
        binding.admobAccountExternalId ?? "",
        binding.externalAppId,
        binding.appId ?? "",
        binding.appDisplayName ?? "",
      ]),
    ]

    return searchableValues.some((value) => value.toLowerCase().includes(query))
  })
}

export function AppMappingsContent() {
  const { toast } = useToast()
  const canCreate = hasScreenFunction(SCREEN_META_ACCOUNTS, "create")
  const canEdit = hasScreenFunction(SCREEN_META_ACCOUNTS, "edit")
  const canDisableEnable = hasScreenFunction(SCREEN_META_ACCOUNTS, "disable-enable")

  const {
    data: mappings,
    loading: mappingsLoading,
    error: mappingsError,
    refetch,
  } = useApi(() => metaAppMappingsApi.list(), { cacheKey: "meta-app-mappings:list" })

  const {
    data: appsResponse,
    loading: appsLoading,
    error: appsError,
  } = useApi(() => structureApi.getApps(), { cacheKey: "structure-apps:list" })

  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [appSelectOpen, setAppSelectOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MetaAppMappingDto | null>(null)
  const [form, setForm] = useState<MappingFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(null)

  const apps = appsResponse?.apps ?? []

  const appByRowId = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps])

  const groups = useMemo(() => buildMetaAppMappingGroups(mappings ?? [], apps), [mappings, apps])

  const filtered = useMemo(() => {
    return filterMetaAppMappingGroups(groups, {
      search,
      platform: platformFilter,
      status: statusFilter,
    })
  }, [groups, platformFilter, search, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, filtered.length)
  const pagedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const selectedFormApp = form.appRowId ? appByRowId.get(Number(form.appRowId)) ?? null : null

  useEffect(() => {
    setPage(1)
  }, [search, platformFilter, statusFilter, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setAppSelectOpen(false)
    setDrawerOpen(true)
  }

  const openEdit = (mapping: MetaAppMappingDto) => {
    setEditTarget(mapping)
    setForm({
      appRowId: mapping.appRowId?.toString() ?? "",
      metaApplicationId: mapping.metaApplicationId,
      objectStoreUrl: mapping.objectStoreUrl ?? "",
      packageName: mapping.packageName ?? mapping.packageNameOverride ?? "",
      bundleId: mapping.bundleId ?? mapping.bundleIdOverride ?? "",
      appStoreId: mapping.appStoreId ?? "",
      deepLinkUrlOverride: mapping.deepLinkUrlOverride ?? "",
      storeUrlOverride: mapping.storeUrlOverride ?? "",
      isActive: mapping.isActive,
    })
    setAppSelectOpen(false)
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      if (editTarget) {
        const request: UpdateMetaAppMappingRequestDto = {
          appRowId: form.appRowId ? Number(form.appRowId) : null,
          linkedAppRowId: form.appRowId ? Number(form.appRowId) : null,
          metaApplicationId: form.metaApplicationId.trim() || null,
          objectStoreUrl: form.objectStoreUrl.trim() || null,
          packageName: form.packageName.trim() || null,
          bundleId: form.bundleId.trim() || null,
          appStoreId: form.appStoreId.trim() || null,
          deepLinkUrlOverride: form.deepLinkUrlOverride.trim() || null,
          storeUrlOverride: form.storeUrlOverride.trim() || null,
          isActive: form.isActive,
        }
        await metaAppMappingsApi.update(editTarget.id, request)
      } else {
        const request: CreateMetaAppMappingRequestDto = {
          appRowId: form.appRowId ? Number(form.appRowId) : null,
          linkedAppRowId: form.appRowId ? Number(form.appRowId) : null,
          metaApplicationId: form.metaApplicationId.trim(),
          objectStoreUrl: form.objectStoreUrl.trim() || null,
          packageName: form.packageName.trim() || null,
          bundleId: form.bundleId.trim() || null,
          appStoreId: form.appStoreId.trim() || null,
          deepLinkUrlOverride: form.deepLinkUrlOverride.trim() || null,
          storeUrlOverride: form.storeUrlOverride.trim() || null,
          isActive: form.isActive,
        }
        await metaAppMappingsApi.create(request)
      }

      invalidateCache("meta-app-mappings:list")
      invalidateCache("meta-reference:create-campaign")
      await refetch()
      setDrawerOpen(false)
      toast({ title: editTarget ? "Store mapping updated" : "Store mapping created" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to save app mapping."
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (mapping: MetaAppMappingDto) => {
    try {
      setRowActionLoadingId(mapping.id)
      if (mapping.isActive) {
        await metaAppMappingsApi.disable(mapping.id)
      } else {
        await metaAppMappingsApi.enable(mapping.id)
      }

      invalidateCache("meta-app-mappings:list")
      invalidateCache("meta-reference:create-campaign")
      await refetch()
      toast({ title: mapping.isActive ? "Store mapping disabled" : "Store mapping enabled" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to update app mapping."
      toast({ title: "Update failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const isLoading = mappingsLoading || appsLoading
  const hasError = mappingsError || appsError
  const canSave = Boolean(form.metaApplicationId.trim() && (form.objectStoreUrl.trim() || form.packageName.trim() || form.appStoreId.trim()))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Meta Store Mappings</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Each store app shows whether it is mapped to one or more AdMob accounts.
          </p>
        </div>
        {canCreate ? (
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Store Mapping
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder="Search app, store identity, Meta app ID, AdMob account, or AdMob app ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-9 w-full bg-white text-sm lg:w-40">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="ANDROID">Android</SelectItem>
              <SelectItem value="IOS">iOS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full bg-white text-sm lg:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-slate-500 lg:min-w-28 lg:text-right">{filtered.length} apps</div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Store Identity</TableHead>
              <TableHead>Meta App ID</TableHead>
              <TableHead>AdMob Mapping</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-sm text-slate-500">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-slate-400" />
                  Loading Meta store mappings...
                </TableCell>
              </TableRow>
            ) : hasError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-sm text-red-600">
                  Unable to load Meta store mappings.
                </TableCell>
              </TableRow>
            ) : pagedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-sm text-slate-500">
                  No Meta store mappings found.
                </TableCell>
              </TableRow>
            ) : (
              pagedGroups.map((group) => {
                const mapping = group.primaryMapping
                const isBusy = rowActionLoadingId === mapping.id
                const firstAdmobBinding = group.admobBindings[0]
                const mappedIconUri = firstAdmobBinding?.appRowId ? appByRowId.get(firstAdmobBinding.appRowId)?.iconUri : undefined
                const appIconUri = mappedIconUri ?? group.app?.iconUri ?? undefined
                const appRouteId = group.app?.appId ?? mapping.appId ?? null
                const appStoreUrl = getMappingStoreUrl(mapping, group)
                return (
                  <TableRow key={group.key}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        {appIconUri ? (
                          <img
                            src={appIconUri}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                            {group.appLabel.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                          <p className="max-w-[240px] truncate font-medium text-slate-900">{group.appLabel}</p>
                          {appRouteId && appStoreUrl ? (
                            <a
                              href={appStoreUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block max-w-[240px] truncate font-mono text-[11px] text-slate-400 hover:text-blue-600 hover:underline"
                            >
                              {appStoreUrl}
                            </a>
                          ) : appRouteId ? (
                            <Link
                              href={`/apps/${encodeURIComponent(appRouteId)}`}
                              className="block max-w-[240px] truncate font-mono text-[11px] text-slate-400 hover:text-blue-600 hover:underline"
                            >
                              {appRouteId}
                            </Link>
                          ) : (
                            <p className="max-w-[240px] truncate font-mono text-[11px] text-slate-400">-</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[11px] ${getPlatformBadgeClass(group.platform)}`}>{group.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[220px] truncate font-mono text-xs text-slate-600">{group.storeIdentifier || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {group.metaApplicationIds.map((id) => (
                          <p key={id} className="max-w-[180px] truncate font-mono text-xs text-slate-700">{id}</p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.admobAccountCount > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-slate-700">
                            {group.admobAccountCount} AdMob account{group.admobAccountCount === 1 ? "" : "s"}
                          </p>
                          <div className="space-y-1">
                            {group.admobBindings.map((binding) => {
                              const bindingAppId = binding.appId ?? binding.externalAppId
                              return (
                                <div key={binding.bindingId} className="flex min-w-0 items-center gap-2 text-xs">
                                  <Badge className={binding.isActive ? "bg-emerald-50 text-emerald-700 border-none" : "bg-slate-100 text-slate-500 border-none"}>
                                    {binding.isActive ? "On" : "Off"}
                                  </Badge>
                                  <span className="truncate font-medium text-slate-700">{binding.admobAccountName ?? "No account"}</span>
                                  <Link
                                    href={`/apps/${encodeURIComponent(bindingAppId)}`}
                                    className="truncate font-mono text-blue-700 hover:underline"
                                  >
                                    {binding.externalAppId}
                                  </Link>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(group.status)}>{group.status === "mapped" ? "Mapped" : "Unmapped"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(group.latestUpdatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => openEdit(mapping)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit mapping
                            </DropdownMenuItem>
                          ) : null}
                          {canDisableEnable ? (
                            <DropdownMenuItem onClick={() => void handleToggleActive(mapping)}>
                              <Power className="mr-2 h-4 w-4" />
                              {mapping.isActive ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {!isLoading && !hasError && filtered.length > 0 ? (
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
        ) : null}
      </div>

      <Dialog
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setAppSelectOpen(false)
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-xl p-0 gap-0">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {editTarget ? "Edit Store Mapping" : "Add Store Mapping"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Linked App</Label>
              <Popover open={appSelectOpen} onOpenChange={setAppSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={appSelectOpen}
                    className="h-auto min-h-14 w-full justify-between px-3 py-2 text-left font-normal"
                  >
                    {selectedFormApp ? (
                      <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                        {selectedFormApp.iconUri ? (
                          <img src={selectedFormApp.iconUri} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                            {getDisplayAppName(selectedFormApp).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-slate-900">{getDisplayAppName(selectedFormApp)}</span>
                            <Badge className={`text-[10px] ${getPlatformBadgeClass(selectedFormApp.platform)}`}>
                              {normalizePlatform(selectedFormApp.platform) || "APP"}
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-xs text-slate-500">AdMob App ID - {selectedFormApp.appId}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Search and select app...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter className="flex max-h-[360px] flex-col">
                    <CommandInput placeholder="Search by app name, AdMob App ID, or store ID..." />
                    <CommandList className="min-h-0 max-h-[320px] overscroll-contain">
                      <CommandEmpty>No app found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="clear linked app"
                          onSelect={() => {
                            setForm((current) => ({ ...current, appRowId: "" }))
                            setAppSelectOpen(false)
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4 shrink-0", form.appRowId ? "opacity-0" : "opacity-100")} />
                          <span className="text-sm text-slate-600">No linked app</span>
                        </CommandItem>
                        {apps.map((app) => {
                          const isSelected = form.appRowId === app.id.toString()
                          return (
                            <CommandItem
                              key={app.id}
                              value={`${getDisplayAppName(app)} ${app.appId} ${app.appStoreId ?? ""} ${normalizePlatform(app.platform)}`}
                              onSelect={() => {
                                setForm((current) => ({ ...current, appRowId: app.id.toString() }))
                                setAppSelectOpen(false)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                              <div className="flex min-w-0 items-center gap-3 py-0.5">
                                {app.iconUri ? (
                                  <img src={app.iconUri} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover" />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                                    {getDisplayAppName(app).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium text-slate-900">{getDisplayAppName(app)}</span>
                                    <Badge className={`text-[10px] ${getPlatformBadgeClass(app.platform)}`}>
                                      {normalizePlatform(app.platform) || "APP"}
                                    </Badge>
                                  </div>
                                  <p className="truncate font-mono text-xs text-slate-500">AdMob App ID - {app.appId}</p>
                                  <p className="truncate text-[11px] text-slate-400">Store ID - {app.appStoreId || "-"}</p>
                                </div>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Meta Application ID <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 font-mono text-sm"
                value={form.metaApplicationId}
                onChange={(event) => setForm((current) => ({ ...current, metaApplicationId: event.target.value }))}
                placeholder="e.g. 6453210987654321"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Object Store URL</Label>
              <Input
                className="h-9 text-sm"
                value={form.objectStoreUrl}
                onChange={(event) => setForm((current) => ({ ...current, objectStoreUrl: event.target.value }))}
                placeholder="https://play.google.com/store/apps/details?id=..."
              />
              <p className="text-[11px] text-slate-400">Preferred source for package/store identity. If empty, provide package or app store ID below.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Package Name</Label>
                <Input
                  className="h-9 text-sm"
                  value={form.packageName}
                  onChange={(event) => setForm((current) => ({ ...current, packageName: event.target.value }))}
                  placeholder="com.example.app"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Bundle ID</Label>
                <Input
                  className="h-9 text-sm"
                  value={form.bundleId}
                  onChange={(event) => setForm((current) => ({ ...current, bundleId: event.target.value }))}
                  placeholder="com.example.ios"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">App Store ID</Label>
              <Input
                className="h-9 text-sm"
                value={form.appStoreId}
                onChange={(event) => setForm((current) => ({ ...current, appStoreId: event.target.value }))}
                placeholder="1234567890"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Legacy Deep Link URL Override</Label>
                <Input
                  className="h-9 text-sm"
                  value={form.deepLinkUrlOverride}
                  onChange={(event) => setForm((current) => ({ ...current, deepLinkUrlOverride: event.target.value }))}
                  placeholder="myapp://open"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Store URL Override</Label>
                <Input
                  className="h-9 text-sm"
                  value={form.storeUrlOverride}
                  onChange={(event) => setForm((current) => ({ ...current, storeUrlOverride: event.target.value }))}
                  placeholder="https://apps.apple.com/app/id..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(value) => setForm((current) => ({ ...current, isActive: value }))} />
              <Label className="cursor-pointer text-sm text-slate-700">Enabled</Label>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => void handleSubmit()}
              disabled={submitting || !canSave}
            >
              {submitting ? "Saving..." : editTarget ? "Save Changes" : "Add Store Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
