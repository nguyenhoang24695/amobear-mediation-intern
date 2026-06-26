"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Check, ChevronsUpDown, Loader2, RefreshCw, PlugZap, Play, CheckCircle2, XCircle, Send, Pencil, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/shared/pagination"
import { TikTokCampaignsContent } from "@/components/tiktok-ads/campaigns/tiktok-campaigns-content"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  tiktokAccountsApi,
  tiktokAuthApi,
  tiktokCampaignRequestsApi,
  tiktokReferenceApi,
} from "@/lib/api/tiktok-ads"
import { structureApi } from "@/lib/api/services"
import type { App } from "@/types/api"
import type {
  TikTokAdAccountDto,
  TikTokAdAccountPageDto,
  TikTokAppMappingAdmobBindingDto,
  TikTokAppMappingDto,
  TikTokCampaignRequestListItemDto,
  TikTokIntegrationDto,
  TikTokReferenceResponseDto,
} from "@/types/tiktok-ads"

function statusTone(value?: string) {
  const normalized = (value || "").toLowerCase()
  if (["valid", "active", "approved", "completed"].includes(normalized)) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (["disabled", "rejected", "failed", "invalid", "revoked"].includes(normalized)) return "bg-destructive/10 text-destructive"
  return "bg-muted text-muted-foreground"
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function normalizePlatform(value?: string | null) {
  return value?.toUpperCase() ?? ""
}

type TikTokMappingStatus = "mapped" | "unmapped"

type TikTokAppMappingGroup = {
  key: string
  primaryMapping: TikTokAppMappingDto
  mappings: TikTokAppMappingDto[]
  admobBindings: TikTokAppMappingAdmobBindingDto[]
  admobAccountCount: number
  app?: App
  appLabel: string
  platform: string
  storeIdentifier: string
  tikTokAppIds: string[]
  latestUpdatedAt?: string | null
  status: TikTokMappingStatus
}

function getPlatformBadgeClass(platform?: string | null) {
  switch (normalizePlatform(platform)) {
    case "IOS":
      return "bg-primary/10 text-primary"
    case "ANDROID":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function getTikTokMappingAppLabel(app?: App | null, mapping?: TikTokAppMappingDto | null) {
  return mapping?.appDisplayName ?? mapping?.externalAppName ?? app?.displayName ?? app?.name ?? mapping?.appId ?? mapping?.packageName ?? mapping?.normalizedStoreIdentifier ?? (mapping ? `Binding ${mapping.id}` : "-")
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim()) ?? null
}

function getTikTokMappingStoreIdentifier(app?: App | null, mapping?: TikTokAppMappingDto | null) {
  const platform = normalizePlatform(mapping?.appPlatform ?? mapping?.platform ?? app?.platform)
  if (platform === "ANDROID") return firstNonEmpty(mapping?.packageName, mapping?.normalizedStoreIdentifier)
  if (platform === "IOS") return firstNonEmpty(mapping?.appStoreId, app?.appStoreId, mapping?.normalizedStoreIdentifier)
  return firstNonEmpty(mapping?.packageName, mapping?.appStoreId, mapping?.normalizedStoreIdentifier, app?.appStoreId)
}

function getTikTokMappingPlatform(app?: App | null, mapping?: TikTokAppMappingDto | null) {
  return normalizePlatform(mapping?.appPlatform ?? mapping?.platform ?? app?.platform)
}

function getStatusBadgeClass(status: TikTokMappingStatus) {
  return status === "mapped"
    ? "border-none bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
    : "border-none bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
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
      return appStoreId && /^\d+$/.test(id) ? `https://apps.apple.com/app/id${appStoreId}` : null
    }
    default:
      return null
  }
}

function getTikTokMappingStoreUrl(mapping: TikTokAppMappingDto, group: Pick<TikTokAppMappingGroup, "platform" | "storeIdentifier">) {
  if (isHttpUrl(mapping.storeUrlOverride)) return mapping.storeUrlOverride!.trim()
  if (isHttpUrl(mapping.downloadUrl)) return mapping.downloadUrl.trim()
  return buildStoreUrl(group.platform, group.storeIdentifier)
}

function getTikTokGroupKey(mapping: TikTokAppMappingDto) {
  const normalizedStoreIdentifier = mapping.normalizedStoreIdentifier?.trim().toLowerCase()
  if (!normalizedStoreIdentifier) return `tiktok:${mapping.id}`

  return `store:${normalizePlatform(mapping.platform ?? mapping.appPlatform) || "UNKNOWN"}:${normalizedStoreIdentifier}`
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)))
}

function getLatestUpdatedAt(mappings: TikTokAppMappingDto[]) {
  return mappings
    .map((mapping) => mapping.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
}

function dedupeTikTokAdmobBindings(mappings: TikTokAppMappingDto[]) {
  const byId = new Map<number, TikTokAppMappingAdmobBindingDto>()
  mappings.forEach((mapping) => {
    ;(mapping.admobBindings ?? []).forEach((binding) => byId.set(binding.bindingId, binding))
  })

  return Array.from(byId.values()).sort((a, b) => {
    const accountA = a.admobAccountName ?? ""
    const accountB = b.admobAccountName ?? ""
    return accountA.localeCompare(accountB) || a.externalAppId.localeCompare(b.externalAppId)
  })
}

function buildTikTokAppMappingGroups(mappings: TikTokAppMappingDto[], apps: App[]): TikTokAppMappingGroup[] {
  const appByRowId = new Map(apps.map((app) => [app.id, app]))
  const rowsByKey = new Map<string, TikTokAppMappingDto[]>()

  mappings.forEach((mapping) => {
    const key = getTikTokGroupKey(mapping)
    const rows = rowsByKey.get(key) ?? []
    rows.push(mapping)
    rowsByKey.set(key, rows)
  })

  return Array.from(rowsByKey.entries())
    .map(([key, rows]) => {
      const sortedRows = rows.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const primaryMapping = sortedRows[0]
      const app = primaryMapping.appRowId ? appByRowId.get(primaryMapping.appRowId) : undefined
      const admobBindings = dedupeTikTokAdmobBindings(sortedRows)
      const admobAccountCount = new Set(
        admobBindings
          .map((binding) => binding.admobAccountId)
          .filter((value): value is number => typeof value === "number"),
      ).size
      const status: TikTokMappingStatus = admobAccountCount > 0 ? "mapped" : "unmapped"

      return {
        key,
        primaryMapping,
        mappings: sortedRows,
        admobBindings,
        admobAccountCount,
        app,
        appLabel: getTikTokMappingAppLabel(app, primaryMapping),
        platform: getTikTokMappingPlatform(app, primaryMapping) || "UNKNOWN",
        storeIdentifier: getTikTokMappingStoreIdentifier(app, primaryMapping) ?? "",
        tikTokAppIds: uniqueStrings(sortedRows.map((mapping) => mapping.tikTokAppId)),
        latestUpdatedAt: getLatestUpdatedAt(sortedRows),
        status,
      }
    })
    .sort((a, b) => a.appLabel.localeCompare(b.appLabel) || a.storeIdentifier.localeCompare(b.storeIdentifier) || a.key.localeCompare(b.key))
}

function filterTikTokAppMappingGroups(groups: TikTokAppMappingGroup[], filters: { search: string; platform: string; status: string }) {
  const query = filters.search.trim().toLowerCase()
  return groups.filter((group) => {
    if (filters.platform !== "all" && group.platform !== filters.platform) return false
    if (filters.status !== "all" && group.status !== filters.status) return false
    if (!query) return true

    const searchableValues = [
      group.appLabel,
      group.app?.appId ?? "",
      group.storeIdentifier,
      ...group.tikTokAppIds,
      ...group.mappings.flatMap((mapping) => [
        mapping.externalAppName ?? "",
        mapping.downloadUrl ?? "",
        mapping.packageName ?? "",
        mapping.appStoreId ?? "",
        mapping.storeUrlOverride ?? "",
        ...(mapping.advertiserIds ?? []),
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

function getDisplayAppName(app?: App | null) {
  return app?.displayName ?? app?.name ?? "-"
}

function PageShell({ title, subtitle, children, action }: { title: string; subtitle: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null
  return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</div>
}

function SearchableAdAccountFilterSelect({
  value,
  placeholder,
  searchPlaceholder,
  allLabel,
  emptyMessage,
  className,
  loadOptions,
  onChange,
}: {
  value: string
  placeholder: string
  searchPlaceholder: string
  allLabel: string
  emptyMessage: string
  className?: string
  loadOptions: (search: string) => Promise<string[]>
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    if (!open) {
      setSearch("")
      return
    }

    let cancelled = false
    setLoading(true)
    loadOptions(deferredSearch)
      .then((items) => {
        if (!cancelled) setOptions(value && !items.includes(value) ? [value, ...items] : items)
      })
      .catch(() => {
        if (!cancelled) setOptions(value ? [value] : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [deferredSearch, loadOptions, open, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 justify-between bg-background px-3 text-left font-normal", className)}
        >
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          {loading ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
            </CommandGroup>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : options.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", option === value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type IntegrationFormState = {
  displayName: string
  tikTokAppId: string
  appSecret: string
  accessToken: string
  scopes: string
  isDefault: boolean
  isEnabled: boolean
  clearAppSecret: boolean
  clearAccessToken: boolean
}

const emptyIntegrationForm: IntegrationFormState = {
  displayName: "",
  tikTokAppId: "",
  appSecret: "",
  accessToken: "",
  scopes: "3,4,7",
  isDefault: false,
  isEnabled: true,
  clearAppSecret: false,
  clearAccessToken: false,
}

function parseScopes(value: string) {
  return value.split(",").map((x) => x.trim()).filter(Boolean)
}

export function TikTokIntegrationsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokIntegrationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState<IntegrationFormState>(emptyIntegrationForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try { setItems(await tiktokAccountsApi.getIntegrations()) }
    catch (ex: any) { setError(ex.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyIntegrationForm)
  }

  const startEdit = (item: TikTokIntegrationDto) => {
    setEditingId(item.id)
    setForm({
      displayName: item.displayName,
      tikTokAppId: item.tikTokAppId,
      appSecret: "",
      accessToken: "",
      scopes: item.scopes.join(","),
      isDefault: item.isDefault,
      isEnabled: item.isEnabled,
      clearAppSecret: false,
      clearAccessToken: false,
    })
  }

  const save = async () => {
    setSubmitting(true)
    try {
      if (editingId) {
        await tiktokAccountsApi.updateIntegration(editingId, {
          displayName: form.displayName,
          tikTokAppId: form.tikTokAppId,
          appSecret: form.appSecret || undefined,
          accessToken: form.accessToken || undefined,
          clearAppSecret: form.clearAppSecret,
          clearAccessToken: form.clearAccessToken,
          scopes: parseScopes(form.scopes),
          isSandbox: false,
          isDefault: form.isDefault,
          isEnabled: form.isEnabled,
        })
      } else {
        await tiktokAccountsApi.createIntegration({
          displayName: form.displayName,
          tikTokAppId: form.tikTokAppId,
          appSecret: form.appSecret || undefined,
          accessToken: form.accessToken || undefined,
          scopes: parseScopes(form.scopes),
          isSandbox: false,
          isDefault: form.isDefault,
          isEnabled: form.isEnabled,
        })
      }
      resetForm()
      await load()
      toast({ title: editingId ? "TikTok integration updated" : "TikTok integration created" })
    } catch (ex: any) {
      toast({ title: editingId ? "Update failed" : "Create failed", description: ex.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEnabled = async (item: TikTokIntegrationDto) => {
    try {
      if (item.isEnabled) await tiktokAccountsApi.disableIntegration(item.id)
      else await tiktokAccountsApi.enableIntegration(item.id)
      await load()
      toast({ title: item.isEnabled ? "TikTok integration disabled" : "TikTok integration enabled" })
    } catch (ex: any) {
      toast({ title: "Status update failed", description: ex.message, variant: "destructive" })
    }
  }

  const test = async (id: number) => {
    try {
      await tiktokAuthApi.testSaved(id)
      await load()
      toast({ title: "TikTok token test completed" })
    } catch (ex: any) {
      toast({ title: "Token test failed", description: ex.message, variant: "destructive" })
    }
  }

  const sync = async (id: number) => {
    try {
      await tiktokAccountsApi.syncAdAccounts(id)
      await load()
      toast({ title: "TikTok ad accounts synced" })
    } catch (ex: any) {
      toast({ title: "Sync failed", description: ex.message, variant: "destructive" })
    }
  }

  const oauth = async (id: number) => {
    try {
      const redirectUri = `${window.location.origin}/tiktok-ads/integrations/callback`
      const result = await tiktokAuthApi.getAuthorizeUrl(id, redirectUri, String(id))
      window.location.href = result.authorizationUrl
    } catch (ex: any) {
      toast({ title: "OAuth URL failed", description: ex.message, variant: "destructive" })
    }
  }

  return (
    <PageShell
      title="TikTok Integrations"
      subtitle="OAuth app, masked secrets, token status, and advertiser sync."
      action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
    >
      <ErrorBox message={error} />
      <div className="rounded-md border bg-card p-4 text-card-foreground">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{editingId ? "Edit integration" : "Create integration"}</h2>
            <p className="text-sm text-muted-foreground">
              {editingId ? "Leave secret/token empty to keep the saved encrypted values." : "Add app credentials before OAuth or paste an existing access token."}
            </p>
          </div>
          {editingId && <Button variant="outline" size="sm" onClick={resetForm}><X className="mr-2 h-4 w-4" />Cancel edit</Button>}
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div><Label>Name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><Label>Developer App ID</Label><Input value={form.tikTokAppId} onChange={(e) => setForm({ ...form, tikTokAppId: e.target.value })} /></div>
          <div><Label>{editingId ? "New Secret" : "Secret"}</Label><Input type="password" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value, clearAppSecret: false })} /></div>
          <div><Label>{editingId ? "New Access Token" : "Access Token"}</Label><Input type="password" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value, clearAccessToken: false })} /></div>
          <div><Label>Scopes</Label><Input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked === true })} />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={form.isDefault} onCheckedChange={(checked) => setForm({ ...form, isDefault: checked === true })} />
            Default
          </label>
          {editingId && (
            <>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={form.clearAppSecret} onCheckedChange={(checked) => setForm({ ...form, clearAppSecret: checked === true, appSecret: checked ? "" : form.appSecret })} />
                Clear secret
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={form.clearAccessToken} onCheckedChange={(checked) => setForm({ ...form, clearAccessToken: checked === true, accessToken: checked ? "" : form.accessToken })} />
                Clear token
              </label>
            </>
          )}
        </div>
        <Button className="mt-4" onClick={save} disabled={submitting}>
          <PlugZap className="mr-2 h-4 w-4" />
          {editingId ? "Update" : "Create"}
        </Button>
      </div>
      <div className="rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Developer App ID</TableHead><TableHead>Secret</TableHead><TableHead>Token</TableHead><TableHead>Status</TableHead><TableHead>Enabled</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow> : items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.displayName}</TableCell>
                <TableCell>{item.tikTokAppId}</TableCell>
                <TableCell>{item.hasAppSecret ? item.appSecretHint : "No"}</TableCell>
                <TableCell>{item.hasAccessToken ? item.accessTokenHint : "No"}</TableCell>
                <TableCell><Badge className={statusTone(item.tokenStatus)}>{item.tokenStatus}</Badge></TableCell>
                <TableCell><Badge className={statusTone(item.isEnabled ? "active" : "disabled")}>{item.isEnabled ? "enabled" : "disabled"}</Badge></TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleEnabled(item)}>{item.isEnabled ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="outline" onClick={() => oauth(item.id)}>OAuth</Button>
                  <Button size="sm" variant="outline" onClick={() => test(item.id)}>Test</Button>
                  <Button size="sm" onClick={() => sync(item.id)}>Sync</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  )
}

export function TikTokAdAccountsPage() {
  const [data, setData] = useState<TikTokAdAccountPageDto>({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [nameFilter, setNameFilter] = useState("")
  const [advertiserIdFilter, setAdvertiserIdFilter] = useState("")
  const [countryFilter, setCountryFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await tiktokAccountsApi.getAdAccounts({
        page: currentPage,
        pageSize,
        name: nameFilter.trim() || undefined,
        advertiserId: advertiserIdFilter.trim() || undefined,
        country: countryFilter.trim() || undefined,
      }))
    }
    catch (ex: any) { setError(ex.message) }
    finally { setLoading(false) }
  }, [advertiserIdFilter, countryFilter, currentPage, nameFilter, pageSize])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [nameFilter, advertiserIdFilter, countryFilter])

  const loadNameOptions = useCallback(async (search: string) => {
    const options = await tiktokAccountsApi.getAdAccountFilterOptions({ search: search || undefined })
    return options.names
  }, [])

  const loadAdvertiserIdOptions = useCallback(async (search: string) => {
    const options = await tiktokAccountsApi.getAdAccountFilterOptions({ search: search || undefined })
    return options.advertiserIds
  }, [])

  const loadCountryOptions = useCallback(async (search: string) => {
    const options = await tiktokAccountsApi.getAdAccountFilterOptions({ search: search || undefined })
    return options.countries
  }, [])

  return (
    <PageShell title="TikTok Ad Accounts" subtitle="Advertiser accounts synced from OAuth integrations." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="flex flex-wrap gap-3">
        <SearchableAdAccountFilterSelect
          className="w-72"
          placeholder="Filter by account name..."
          searchPlaceholder="Search account name..."
          allLabel="All account names"
          emptyMessage="No account names found."
          value={nameFilter}
          loadOptions={loadNameOptions}
          onChange={setNameFilter}
        />
        <SearchableAdAccountFilterSelect
          className="w-64 font-mono"
          placeholder="Filter by advertiser ID..."
          searchPlaceholder="Search advertiser ID..."
          allLabel="All advertiser IDs"
          emptyMessage="No advertiser IDs found."
          value={advertiserIdFilter}
          loadOptions={loadAdvertiserIdOptions}
          onChange={setAdvertiserIdFilter}
        />
        <SearchableAdAccountFilterSelect
          className="w-48 uppercase"
          placeholder="Filter by country..."
          searchPlaceholder="Search country..."
          allLabel="All countries"
          emptyMessage="No countries found."
          value={countryFilter}
          loadOptions={loadCountryOptions}
          onChange={setCountryFilter}
        />
      </div>
      <div className="overflow-x-auto rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Advertiser ID</TableHead><TableHead>Country</TableHead><TableHead>Currency</TableHead><TableHead>Timezone</TableHead><TableHead>Balance</TableHead><TableHead>Grant Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Loading ad accounts...</TableCell></TableRow>
            ) : data.items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No ad accounts found.</TableCell></TableRow>
            ) : data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-xs text-primary">{item.advertiserId}</TableCell>
                <TableCell>{item.country ?? "-"}</TableCell>
                <TableCell>{item.currency ?? "-"}</TableCell>
                <TableCell>{item.timezone ?? "-"}</TableCell>
                <TableCell>{item.balance ?? "-"}</TableCell>
                <TableCell>{item.grantBalance ?? "-"}</TableCell>
                <TableCell><Badge className={statusTone(item.isActive ? "active" : "disabled")}>{item.isActive ? "active" : "disabled"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.total > 0 ? (
          <Pagination
            currentPage={data.page}
            totalPages={data.totalPages}
            totalItems={data.total}
            pageSize={data.pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
            }}
            itemName="ad accounts"
          />
        ) : null}
      </div>
    </PageShell>
  )
}

export function TikTokAppMappingsPage() {
  const [items, setItems] = useState<TikTokAppMappingDto[]>([])
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mappingSearch, setMappingSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [mappingPage, setMappingPage] = useState(1)
  const [mappingPageSize, setMappingPageSize] = useState(10)

  const appByRowId = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps])

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [mappings, appsResponse] = await Promise.all([
        tiktokAccountsApi.getAppMappings(),
        structureApi.getApps(),
      ])
      setItems(mappings)
      setApps(appsResponse.apps)
    }
    catch (ex: any) { setError(ex.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const groups = useMemo(() => buildTikTokAppMappingGroups(items, apps), [apps, items])
  const filteredMappings = useMemo(() => {
    return filterTikTokAppMappingGroups(groups, {
      search: mappingSearch,
      platform: platformFilter,
      status: statusFilter,
    })
  }, [groups, mappingSearch, platformFilter, statusFilter])

  useEffect(() => {
    setMappingPage(1)
  }, [mappingSearch, platformFilter, statusFilter])

  const mappingTotalPages = Math.max(1, Math.ceil(filteredMappings.length / mappingPageSize))

  useEffect(() => {
    if (mappingPage > mappingTotalPages) setMappingPage(mappingTotalPages)
  }, [mappingPage, mappingTotalPages])

  const paginatedMappings = useMemo(() => {
    const start = (mappingPage - 1) * mappingPageSize
    return filteredMappings.slice(start, start + mappingPageSize)
  }, [filteredMappings, mappingPage, mappingPageSize])

  return (
    <PageShell title="TikTok App Mappings" subtitle="Track TikTok store identities and whether each one is mapped with AdMob." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8 text-sm"
            placeholder="Search by app, store ID, TikTok or AdMob app ID..."
            value={mappingSearch}
            onChange={(e) => setMappingSearch(e.target.value)}
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-9 w-36 bg-background text-sm">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All OS</SelectItem>
            <SelectItem value="ANDROID">Android</SelectItem>
            <SelectItem value="IOS">iOS</SelectItem>
            <SelectItem value="UNKNOWN">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 bg-background text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="mapped">Mapped</SelectItem>
            <SelectItem value="unmapped">Unmapped</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredMappings.length} store app{filteredMappings.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-medium text-muted-foreground">App</TableHead>
              <TableHead className="w-32 text-xs font-medium text-muted-foreground">Platform</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Store Identity</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">TikTok App ID</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">AdMob Mapping</TableHead>
              <TableHead className="w-28 text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="w-36 text-xs font-medium text-muted-foreground">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading app mappings...</TableCell></TableRow>
            ) : filteredMappings.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No app mappings found.</TableCell></TableRow>
            ) : paginatedMappings.map((group) => {
              const mapping = group.primaryMapping
              const firstAdmobBinding = group.admobBindings[0]
              const mappedIconUri = firstAdmobBinding?.appRowId ? appByRowId.get(firstAdmobBinding.appRowId)?.iconUri : undefined
              const appIconUri = mappedIconUri ?? group.app?.iconUri ?? undefined
              const appRouteId = group.app?.appId ?? mapping.appId ?? null
              const storeUrl = getTikTokMappingStoreUrl(mapping, group)

              return (
                <TableRow key={group.key} className="text-sm hover:bg-muted/40">
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      {appIconUri ? (
                        <img src={appIconUri} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold text-muted-foreground">
                          {group.appLabel.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="max-w-[240px] truncate font-medium text-foreground">{group.appLabel}</p>
                        {storeUrl ? (
                          <a
                            href={storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-[240px] truncate font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline"
                          >
                            {storeUrl}
                          </a>
                        ) : appRouteId ? (
                          <Link
                            href={`/apps/${encodeURIComponent(appRouteId)}`}
                            className="block max-w-[240px] truncate font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline"
                          >
                            {appRouteId}
                          </Link>
                        ) : (
                          <p className="max-w-[240px] truncate font-mono text-[11px] text-muted-foreground">-</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] ${getPlatformBadgeClass(group.platform)}`}>{group.platform || "UNKNOWN"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[220px] truncate font-mono text-xs text-muted-foreground">{group.storeIdentifier || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {group.tikTokAppIds.map((id) => (
                        <p key={id} className="max-w-[180px] truncate font-mono text-xs text-primary">{id}</p>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {group.admobAccountCount > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground">
                          {group.admobAccountCount} AdMob account{group.admobAccountCount === 1 ? "" : "s"}
                        </p>
                        <div className="space-y-1">
                          {group.admobBindings.map((binding) => {
                            const bindingAppId = binding.appId ?? binding.externalAppId
                            return (
                              <div key={binding.bindingId} className="flex min-w-0 items-center gap-2 text-xs">
                                <Badge className={binding.isActive ? "border-none bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-none bg-muted text-muted-foreground"}>
                                  {binding.isActive ? "On" : "Off"}
                                </Badge>
                                <span className="truncate font-medium text-foreground">{binding.admobAccountName ?? "No account"}</span>
                                <Link
                                  href={`/apps/${encodeURIComponent(bindingAppId)}`}
                                  className="truncate font-mono text-primary hover:underline"
                                >
                                  {binding.externalAppId}
                                </Link>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(group.status)}>{group.status === "mapped" ? "Mapped" : "Unmapped"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(group.latestUpdatedAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {filteredMappings.length > 0 ? (
          <Pagination
            currentPage={mappingPage}
            totalPages={mappingTotalPages}
            totalItems={filteredMappings.length}
            pageSize={mappingPageSize}
            onPageChange={setMappingPage}
            onPageSizeChange={(size) => {
              setMappingPageSize(size)
              setMappingPage(1)
            }}
            itemName="store apps"
          />
        ) : null}
      </div>
    </PageShell>
  )
}
export function TikTokRequestsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokCampaignRequestListItemDto[]>([])
  const [reference, setReference] = useState<TikTokReferenceResponseDto | null>(null)
  const [error, setError] = useState("")
  const [draftJson, setDraftJson] = useState("")

  const defaultDraft = useMemo(() => ({
    tikTokAdAccountRowId: reference?.adAccounts[0]?.id ?? 0,
    appRowId: reference?.appMappings[0]?.appRowId ?? 0,
    campaign: { campaignName: "", objectiveType: "APP_PROMOTION", budget: 50, budgetMode: "BUDGET_MODE_DAY" },
    adGroup: { adGroupName: "", placementType: "PLACEMENT_TYPE_AUTOMATIC", placements: [], budget: 50, budgetMode: "BUDGET_MODE_DAY", scheduleType: "SCHEDULE_FROM_NOW", optimizationGoal: "INSTALL", bidType: "BID_TYPE_NO_BID", billingEvent: "OCPM", appId: reference?.appMappings[0]?.tikTokAppId, appDownloadUrl: reference?.appMappings[0]?.downloadUrl, operatingSystems: [], locationIds: ["6252001"], ageGroups: [], gender: "GENDER_UNLIMITED", languages: [] },
    ad: { adName: "", adFormat: "SINGLE_VIDEO", videoId: "", imageIds: [], imageAssetIds: [] },
    ads: [{ adName: "", adFormat: "SINGLE_VIDEO", videoId: "", imageIds: [], imageAssetIds: [] }],
  }), [reference])

  const load = async () => {
    setError("")
    try {
      const [list, ref] = await Promise.all([tiktokCampaignRequestsApi.getRequests(), tiktokReferenceApi.getCreateCampaign()])
      setItems(list)
      setReference(ref)
    } catch (ex: any) {
      setError(ex.message)
    }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (reference && !draftJson) setDraftJson(JSON.stringify(defaultDraft, null, 2)) }, [reference, defaultDraft, draftJson])

  const create = async () => {
    try {
      await tiktokCampaignRequestsApi.create(JSON.parse(draftJson))
      await load()
      toast({ title: "TikTok request draft created" })
    } catch (ex: any) {
      toast({ title: "Create failed", description: ex.message, variant: "destructive" })
    }
  }
  const run = async (id: number, action: "submit" | "approve" | "reject" | "execute" | "retry") => {
    try {
      if (action === "submit") await tiktokCampaignRequestsApi.submit(id)
      if (action === "approve") await tiktokCampaignRequestsApi.approve(id)
      if (action === "reject") await tiktokCampaignRequestsApi.reject(id, "Rejected from UI")
      if (action === "execute") await tiktokCampaignRequestsApi.execute(id, true)
      if (action === "retry") await tiktokCampaignRequestsApi.retry(id, true)
      await load()
      toast({ title: `TikTok request ${action} completed` })
    } catch (ex: any) {
      toast({ title: `${action} failed`, description: ex.message, variant: "destructive" })
    }
  }

  return (
    <PageShell title="TikTok Requests" subtitle="Create, approve, and dry-run campaign execution requests." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="rounded-md border bg-card p-4 text-card-foreground">
        <Label>Request JSON</Label>
        <Textarea className="mt-2 min-h-72 font-mono text-xs" value={draftJson} onChange={(e) => setDraftJson(e.target.value)} />
        <Button className="mt-4" onClick={create}><Send className="mr-2 h-4 w-4" />Create Draft</Button>
      </div>
      <div className="rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Account</TableHead><TableHead>App</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.campaignName}</TableCell><TableCell>{item.tikTokAdAccountName}</TableCell><TableCell>{item.appDisplayName ?? item.appId}</TableCell><TableCell><Badge className={statusTone(item.status)}>{item.status}</Badge></TableCell><TableCell className="space-x-2 text-right"><Button size="sm" variant="outline" onClick={() => run(item.id, "submit")}><Send className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => run(item.id, "approve")}><CheckCircle2 className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => run(item.id, "reject")}><XCircle className="h-4 w-4" /></Button><Button size="sm" onClick={() => run(item.id, item.status === "failed" ? "retry" : "execute")}><Play className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </PageShell>
  )
}

export function TikTokCampaignsPage() {
  return <TikTokCampaignsContent />
}
