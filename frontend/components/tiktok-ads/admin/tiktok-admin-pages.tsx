"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Check, ChevronsUpDown, Loader2, RefreshCw, ShieldCheck, PlugZap, Play, CheckCircle2, XCircle, Send, Pencil, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  TikTokAppMappingCandidateDto,
  TikTokAppMappingDto,
  TikTokCampaignRequestListItemDto,
  TikTokIntegrationDto,
  TikTokReferenceResponseDto,
  ResolveTikTokAppMappingCandidateRequestDto,
} from "@/types/tiktok-ads"

function statusTone(value?: string) {
  const normalized = (value || "").toLowerCase()
  if (["valid", "active", "approved", "completed"].includes(normalized)) return "bg-emerald-50 text-emerald-700"
  if (["disabled", "rejected", "failed", "invalid", "revoked"].includes(normalized)) return "bg-rose-50 text-rose-700"
  return "bg-slate-100 text-slate-700"
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function formatCandidateLabel(value?: string | null) {
  if (!value) return "-"
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}

function getCandidateSuggestion(candidate: TikTokAppMappingCandidateDto) {
  if (candidate.resolvedApp?.appDisplayName) return candidate.resolvedApp.appDisplayName
  if (candidate.recommendedApp?.appDisplayName) return candidate.recommendedApp.appDisplayName
  if (candidate.suggestedApps.length === 1) return candidate.suggestedApps[0].appDisplayName ?? candidate.suggestedApps[0].appId ?? "-"
  if (candidate.suggestedApps.length > 1) return `${candidate.suggestedApps.length} candidate apps`
  return "Manual review"
}

function getCandidateDefaultAppRowId(candidate: TikTokAppMappingCandidateDto) {
  return candidate.resolvedAppRowId ?? candidate.recommendedAppRowId ?? candidate.suggestedApps[0]?.appRowId ?? null
}

function getCandidatePlatforms(candidate: TikTokAppMappingCandidateDto) {
  const platforms = [
    candidate.resolvedApp?.platform,
    candidate.recommendedApp?.platform,
    ...candidate.suggestedApps.map((app) => app.platform),
  ].map(normalizePlatform).filter(Boolean)

  return platforms.length > 0 ? Array.from(new Set(platforms)) : ["UNKNOWN"]
}

function getCandidateStoreIdentifier(candidate: TikTokAppMappingCandidateDto) {
  if (candidate.packageName) return { value: candidate.packageName, label: "Package name" }
  if (candidate.bundleId) return { value: candidate.bundleId, label: "Bundle ID" }
  if (candidate.identifiers.length > 0) return { value: candidate.identifiers[0], label: "Identifier" }
  return { value: "-", label: "No store identifier" }
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

function getTikTokMappingAppLabel(app?: App | null, mapping?: TikTokAppMappingDto | null) {
  return mapping?.appDisplayName ?? mapping?.externalAppName ?? app?.displayName ?? app?.name ?? mapping?.appId ?? mapping?.packageName ?? mapping?.normalizedStoreIdentifier ?? (mapping ? `Binding ${mapping.id}` : "-")
}

function getTikTokMappingAdMobId(app?: App | null, mapping?: TikTokAppMappingDto | null) {
  return mapping?.appId ?? app?.appId ?? null
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

function getDisplayAppName(app?: App | null) {
  return app?.displayName ?? app?.name ?? "-"
}

function getResolveSelectableApps(apps: App[], mappedAppRows: Set<number>, resolutionType: string) {
  switch (resolutionType) {
    case "update_mapping":
      return apps.filter((app) => mappedAppRows.has(app.id))
    case "create_mapping":
      return apps.filter((app) => !mappedAppRows.has(app.id))
    default:
      return apps
  }
}

function PageShell({ title, subtitle, children, action }: { title: string; subtitle: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>
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
          className={cn("h-9 justify-between bg-white px-3 text-left font-normal", className)}
        >
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-slate-500")}>{value || placeholder}</span>
          {loading ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-slate-400" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
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
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : options.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-slate-500">{emptyMessage}</div>
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
      <div className="rounded-md border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{editingId ? "Edit integration" : "Create integration"}</h2>
            <p className="text-sm text-slate-500">
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked === true })} />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={form.isDefault} onCheckedChange={(checked) => setForm({ ...form, isDefault: checked === true })} />
            Default
          </label>
          {editingId && (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.clearAppSecret} onCheckedChange={(checked) => setForm({ ...form, clearAppSecret: checked === true, appSecret: checked ? "" : form.appSecret })} />
                Clear secret
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
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
      <div className="rounded-md border bg-white">
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
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Advertiser ID</TableHead><TableHead>Country</TableHead><TableHead>Currency</TableHead><TableHead>Timezone</TableHead><TableHead>Balance</TableHead><TableHead>Grant Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">Loading ad accounts...</TableCell></TableRow>
            ) : data.items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">No ad accounts found.</TableCell></TableRow>
            ) : data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-xs text-blue-700">{item.advertiserId}</TableCell>
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
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokAppMappingDto[]>([])
  const [candidates, setCandidates] = useState<TikTokAppMappingCandidateDto[]>([])
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"mappings" | "candidates">("mappings")
  const [mappingSearch, setMappingSearch] = useState("")
  const [mappingPage, setMappingPage] = useState(1)
  const [mappingPageSize, setMappingPageSize] = useState(10)
  const [candidateSearch, setCandidateSearch] = useState("")
  const [candidateMatchFilter, setCandidateMatchFilter] = useState("all")
  const [candidateOsFilter, setCandidateOsFilter] = useState("all")
  const [candidatePage, setCandidatePage] = useState(1)
  const [candidatePageSize, setCandidatePageSize] = useState(10)
  const [resolveTarget, setResolveTarget] = useState<TikTokAppMappingCandidateDto | null>(null)
  const [resolveForm, setResolveForm] = useState({ resolutionType: "create_mapping", appRowId: "", resolutionNote: "" })
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolveAppSelectOpen, setResolveAppSelectOpen] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const mappedAppRows = useMemo(() => new Set(items.map((item) => item.appRowId).filter((value): value is number => typeof value === "number")), [items])
  const appByRowId = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps])
  const resolveSelectableApps = useMemo(
    () => getResolveSelectableApps(apps, mappedAppRows, resolveForm.resolutionType),
    [apps, mappedAppRows, resolveForm.resolutionType]
  )
  const selectedResolveApp = resolveForm.appRowId ? appByRowId.get(Number(resolveForm.appRowId)) ?? null : null

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [mappings, candidateRows, appsResponse] = await Promise.all([
        tiktokAccountsApi.getAppMappings(),
        tiktokAccountsApi.listAppMappingCandidates(),
        structureApi.getApps(),
      ])
      setItems(mappings)
      setCandidates(candidateRows)
      setApps(appsResponse.apps)
    }
    catch (ex: any) { setError(ex.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filteredMappings = useMemo(() => {
    const search = mappingSearch.trim().toLowerCase()
    return items.filter((item) => {
      const app = item.appRowId ? appByRowId.get(item.appRowId) : undefined
      const platform = getTikTokMappingPlatform(app, item)

      if (!search) return true

      return [
        getTikTokMappingAppLabel(app, item),
        getTikTokMappingAdMobId(app, item),
        platform,
        item.tikTokAppId,
        item.downloadUrl,
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(search))
    })
  }, [appByRowId, items, mappingSearch])

  const filteredCandidates = useMemo(() => {
    const search = candidateSearch.trim().toLowerCase()
    return candidates.filter((candidate) => {
      const platforms = getCandidatePlatforms(candidate)
      if (candidateMatchFilter !== "all" && candidate.matchQuality !== candidateMatchFilter) return false
      if (candidateOsFilter !== "all" && !platforms.includes(candidateOsFilter)) return false
      if (!search) return true
      return [
        candidate.tikTokAppId,
        candidate.source,
        candidate.matchQuality,
        candidate.reviewStatus,
        ...platforms,
        candidate.downloadUrl,
        candidate.packageName,
        candidate.bundleId,
        candidate.storeUrl,
        candidate.sampleCampaignId,
        candidate.sampleAdGroupId,
        candidate.recommendedApp?.appDisplayName,
        candidate.recommendedApp?.appId,
        ...candidate.sourceAdvertiserIds,
        ...candidate.identifiers,
        ...candidate.suggestedApps.flatMap((app) => [app.appDisplayName, app.appId]),
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(search))
    })
  }, [candidateMatchFilter, candidateOsFilter, candidateSearch, candidates])

  useEffect(() => {
    setMappingPage(1)
  }, [mappingSearch])

  useEffect(() => {
    setCandidatePage(1)
  }, [candidateMatchFilter, candidateOsFilter, candidateSearch])

  const mappingTotalPages = Math.max(1, Math.ceil(filteredMappings.length / mappingPageSize))
  const candidateTotalPages = Math.max(1, Math.ceil(filteredCandidates.length / candidatePageSize))

  useEffect(() => {
    if (mappingPage > mappingTotalPages) setMappingPage(mappingTotalPages)
  }, [mappingPage, mappingTotalPages])

  useEffect(() => {
    if (candidatePage > candidateTotalPages) setCandidatePage(candidateTotalPages)
  }, [candidatePage, candidateTotalPages])

  const paginatedMappings = useMemo(() => {
    const start = (mappingPage - 1) * mappingPageSize
    return filteredMappings.slice(start, start + mappingPageSize)
  }, [filteredMappings, mappingPage, mappingPageSize])

  const paginatedCandidates = useMemo(() => {
    const start = (candidatePage - 1) * candidatePageSize
    return filteredCandidates.slice(start, start + candidatePageSize)
  }, [candidatePage, candidatePageSize, filteredCandidates])

  const openResolve = (candidate: TikTokAppMappingCandidateDto) => {
    const appRowId = getCandidateDefaultAppRowId(candidate)
    const resolutionType = appRowId && mappedAppRows.has(appRowId) ? "update_mapping" : "create_mapping"
    setResolveTarget(candidate)
    setResolveForm({
      resolutionType,
      appRowId: appRowId?.toString() ?? "",
      resolutionNote: "",
    })
    setResolveAppSelectOpen(false)
    setResolveDialogOpen(true)
  }

  const handleResolveDialogOpenChange = (open: boolean) => {
    setResolveDialogOpen(open)
    if (!open) {
      setResolveAppSelectOpen(false)
      setResolveTarget(null)
      setResolveForm({ resolutionType: "create_mapping", appRowId: "", resolutionNote: "" })
    }
  }

  const handleResolveResolutionTypeChange = (value: string) => {
    setResolveAppSelectOpen(false)
    setResolveForm((current) => {
      const nextSelectableApps = getResolveSelectableApps(apps, mappedAppRows, value)
      const hasCurrentSelection = current.appRowId
        ? nextSelectableApps.some((app) => app.id === Number(current.appRowId))
        : false

      return {
        ...current,
        resolutionType: value,
        appRowId: value === "dismiss"
          ? current.appRowId
          : hasCurrentSelection
            ? current.appRowId
            : nextSelectableApps[0]?.id.toString() ?? "",
      }
    })
  }

  const resolveCandidate = async () => {
    if (!resolveTarget) return
    try {
      setResolvingId(resolveTarget.id)
      const payload: ResolveTikTokAppMappingCandidateRequestDto = {
        resolutionType: resolveForm.resolutionType,
        appRowId: resolveForm.resolutionType === "dismiss" ? null : Number(resolveForm.appRowId),
        resolutionNote: resolveForm.resolutionNote.trim() || null,
      }
      await tiktokAccountsApi.resolveAppMappingCandidate(resolveTarget.id, payload)
      handleResolveDialogOpenChange(false)
      await load()
      toast({ title: "TikTok mapping candidate resolved" })
    } catch (ex: any) {
      toast({ title: "Resolve failed", description: ex.message, variant: "destructive" })
    } finally {
      setResolvingId(null)
    }
  }

  const dismissCandidate = async (candidate: TikTokAppMappingCandidateDto) => {
    try {
      setResolvingId(candidate.id)
      await tiktokAccountsApi.resolveAppMappingCandidate(candidate.id, { resolutionType: "dismiss" })
      await load()
      toast({ title: "TikTok mapping candidate dismissed" })
    } catch (ex: any) {
      toast({ title: "Dismiss failed", description: ex.message, variant: "destructive" })
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <PageShell title="TikTok App Mappings" subtitle="Map internal apps to TikTok mobile app IDs and store URLs." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="inline-flex rounded-md bg-slate-100 p-1">
        <Button size="sm" variant={activeTab === "mappings" ? "default" : "ghost"} onClick={() => setActiveTab("mappings")}>
          App Mappings
          <Badge className="ml-2 bg-white text-slate-700">{filteredMappings.length}</Badge>
        </Button>
        <Button size="sm" variant={activeTab === "candidates" ? "default" : "ghost"} onClick={() => setActiveTab("candidates")}>
          Mapping Candidates
          <Badge className="ml-2 bg-white text-slate-700">{filteredCandidates.length}</Badge>
        </Button>
      </div>
      {activeTab === "mappings" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder="Search by app, store ID, TikTok mobile app ID..."
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
              />
            </div>
            <span className="ml-auto text-xs text-slate-400">
              {filteredMappings.length} mapping{filteredMappings.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-medium text-slate-500">App</TableHead>
                  <TableHead className="w-36 text-xs font-medium text-slate-500">Operation System</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">TikTok Mobile App ID</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Download URL</TableHead>
                  <TableHead className="w-24 text-xs font-medium text-slate-500">Enabled</TableHead>
                  <TableHead className="w-36 text-xs font-medium text-slate-500">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">Loading app mappings...</TableCell></TableRow>
                ) : filteredMappings.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">No app mappings found.</TableCell></TableRow>
                ) : paginatedMappings.map((item) => {
                  const app = item.appRowId ? appByRowId.get(item.appRowId) : undefined
                  const appLabel = getTikTokMappingAppLabel(app, item)
                  const admobId = getTikTokMappingAdMobId(app, item)
                  const storeIdentifier = getTikTokMappingStoreIdentifier(app, item)
                  const platform = getTikTokMappingPlatform(app, item)

                  return (
                    <TableRow key={item.id} className="text-sm hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {app?.iconUri ? (
                            <img src={app.iconUri} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                              {appLabel.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 space-y-0.5">
                            {admobId ? (
                              <Link href={`/apps/${encodeURIComponent(admobId)}`} className="block truncate font-medium text-slate-900 transition-colors hover:text-blue-600 hover:underline">
                                {appLabel}
                              </Link>
                            ) : (
                              <p className="truncate font-medium text-slate-900">{appLabel}</p>
                            )}
                            {storeIdentifier ? (
                              <p className="truncate font-mono text-[11px] text-slate-400">{storeIdentifier}</p>
                            ) : null}
                            {admobId ? (
                              <p className="truncate font-mono text-[11px] text-slate-400">{admobId}</p>
                            ) : !storeIdentifier ? (
                              <p className="truncate font-mono text-[11px] text-slate-400">{item.normalizedStoreIdentifier ?? `binding:${item.id}`}</p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${getPlatformBadgeClass(platform)}`}>{platform || "UNKNOWN"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-700">{item.tikTokAppId}</TableCell>
                      <TableCell>
                        <span className="block max-w-[320px] truncate text-xs text-slate-600">{item.downloadUrl || "-"}</span>
                      </TableCell>
                      <TableCell><Badge className={statusTone(item.isActive ? "active" : "disabled")}>{item.isActive ? "active" : "disabled"}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(item.updatedAt)}</TableCell>
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
                itemName="mappings"
              />
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder="Search by app, TikTok mobile app ID, status..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />
            </div>
            <Select value={candidateMatchFilter} onValueChange={setCandidateMatchFilter}>
              <SelectTrigger className="h-9 w-44 bg-white text-sm">
                <SelectValue placeholder="Match status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Match Statuses</SelectItem>
                <SelectItem value="exact">Exact</SelectItem>
                <SelectItem value="already_mapped">Already Mapped</SelectItem>
                <SelectItem value="ambiguous">Ambiguous</SelectItem>
                <SelectItem value="conflict">Conflict</SelectItem>
                <SelectItem value="none">Unmapped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={candidateOsFilter} onValueChange={setCandidateOsFilter}>
              <SelectTrigger className="h-9 w-36 bg-white text-sm">
                <SelectValue placeholder="OS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OS</SelectItem>
                <SelectItem value="ANDROID">Android</SelectItem>
                <SelectItem value="IOS">iOS</SelectItem>
                <SelectItem value="UNKNOWN">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-slate-400">
              {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader><TableRow><TableHead>TikTok App</TableHead><TableHead>Store Identifier</TableHead><TableHead>Suggested App</TableHead><TableHead>Match</TableHead><TableHead>Status</TableHead><TableHead>Evidence</TableHead><TableHead>Last Seen</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">Loading mapping candidates...</TableCell></TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">No mapping candidates found.</TableCell></TableRow>
                ) : paginatedCandidates.map((candidate) => {
                  const isBusy = resolvingId === candidate.id
                  const storeIdentifier = getCandidateStoreIdentifier(candidate)
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="font-mono text-xs text-blue-700">{candidate.tikTokAppId || "-"}</div>
                        <div className="text-xs text-slate-500">{candidate.source}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[240px] truncate font-mono text-xs text-slate-700">{storeIdentifier.value}</div>
                        <div className="text-xs text-slate-400">{storeIdentifier.label}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getCandidateSuggestion(candidate)}</div>
                        <div className="text-xs text-slate-500">{candidate.suggestedApps.length > 1 ? "Multiple internal app matches" : candidate.recommendedApp?.appId ?? candidate.resolvedApp?.appId ?? "No exact match"}</div>
                      </TableCell>
                      <TableCell><Badge className={statusTone(candidate.matchQuality)}>{formatCandidateLabel(candidate.matchQuality)}</Badge></TableCell>
                      <TableCell><Badge className={statusTone(candidate.reviewStatus)}>{formatCandidateLabel(candidate.reviewStatus)}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{candidate.sourceAdvertiserCount} adv / {candidate.sourceAdGroupCount} adgroups</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(candidate.lastDiscoveredAt)}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => openResolve(candidate)} disabled={isBusy}>{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolve"}</Button>
                        {candidate.reviewStatus !== "dismissed" ? <Button size="sm" variant="ghost" onClick={() => dismissCandidate(candidate)} disabled={isBusy}>Dismiss</Button> : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filteredCandidates.length > 0 ? (
              <Pagination
                currentPage={candidatePage}
                totalPages={candidateTotalPages}
                totalItems={filteredCandidates.length}
                pageSize={candidatePageSize}
                onPageChange={setCandidatePage}
                onPageSizeChange={(size) => {
                  setCandidatePageSize(size)
                  setCandidatePage(1)
                }}
                itemName="candidates"
              />
            ) : null}
          </div>
        </>
      )}
      <Dialog open={resolveDialogOpen} onOpenChange={handleResolveDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-[640px] flex-col gap-0 overflow-hidden rounded-xl p-0">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6">
            <DialogTitle className="text-base font-semibold text-slate-900">Resolve Mapping Candidate</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {resolveTarget ? (
              <>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`text-[11px] ${statusTone(resolveTarget.matchQuality)}`}>
                      {formatCandidateLabel(resolveTarget.matchQuality)}
                    </Badge>
                    <Badge className={`text-[11px] ${statusTone(resolveTarget.reviewStatus)}`}>
                      {formatCandidateLabel(resolveTarget.reviewStatus)}
                    </Badge>
                    {(() => {
                      const suggestedPlatform = resolveTarget.resolvedApp?.platform ?? resolveTarget.recommendedApp?.platform ?? resolveTarget.suggestedApps[0]?.platform
                      return suggestedPlatform ? (
                        <Badge className={`text-[11px] ${getPlatformBadgeClass(suggestedPlatform)}`}>
                          {normalizePlatform(suggestedPlatform)}
                        </Badge>
                      ) : null
                    })()}
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p><span className="font-medium">TikTok Mobile App ID:</span> <span className="font-mono">{resolveTarget.tikTokAppId || "-"}</span></p>
                    <p><span className="font-medium">Download URL:</span> {resolveTarget.downloadUrl || resolveTarget.storeUrl || "-"}</p>
                    <p><span className="font-medium">Suggested App:</span> {getCandidateSuggestion(resolveTarget)}</p>
                    <p><span className="font-medium">Evidence:</span> {resolveTarget.sourceAdvertiserCount} advertiser(s), {resolveTarget.sourceAdGroupCount} ad group(s)</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Resolution</Label>
                  <Select value={resolveForm.resolutionType} onValueChange={handleResolveResolutionTypeChange}>
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Select resolution..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_mapping">Create Mapping</SelectItem>
                      <SelectItem value="update_mapping">Update Existing Mapping</SelectItem>
                      <SelectItem value="dismiss">Dismiss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {resolveForm.resolutionType !== "dismiss" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">
                      App <span className="text-red-500">*</span>
                    </Label>
                    <Popover open={resolveAppSelectOpen} onOpenChange={setResolveAppSelectOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={resolveAppSelectOpen}
                          className="h-auto min-h-14 w-full justify-between px-3 py-2 font-normal"
                        >
                          {selectedResolveApp ? (
                            <div className="flex min-w-0 flex-1 items-center gap-3 pr-2 text-left">
                              {selectedResolveApp.iconUri ? (
                                <img
                                  src={selectedResolveApp.iconUri}
                                  alt={getDisplayAppName(selectedResolveApp)}
                                  className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                                  {getDisplayAppName(selectedResolveApp).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-medium text-slate-900">{getDisplayAppName(selectedResolveApp)}</span>
                                  <Badge className={`text-[10px] ${getPlatformBadgeClass(selectedResolveApp.platform)}`}>
                                    {normalizePlatform(selectedResolveApp.platform) || "APP"}
                                  </Badge>
                                </div>
                                <p className="truncate font-mono text-xs text-slate-500">AdMob App ID - {selectedResolveApp.appId}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">Search and select app...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onWheel={(event) => event.stopPropagation()}>
                        <Command shouldFilter className="flex max-h-[360px] flex-col">
                          <CommandInput placeholder="Search by app name, AdMob App ID, store ID..." />
                          <CommandList className="min-h-0 max-h-[320px] overscroll-contain">
                            <CommandEmpty>
                              {resolveForm.resolutionType === "update_mapping"
                                ? "No mapped app found."
                                : "No unmapped app found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {resolveSelectableApps.map((app) => {
                                const isSelected = resolveForm.appRowId === app.id.toString()
                                return (
                                  <CommandItem
                                    key={app.id}
                                    value={`${getDisplayAppName(app)} ${app.appId} ${app.appStoreId ?? ""} ${normalizePlatform(app.platform)}`}
                                    onSelect={() => {
                                      setResolveForm((current) => ({ ...current, appRowId: app.id.toString() }))
                                      setResolveAppSelectOpen(false)
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                                    <div className="flex min-w-0 items-center gap-3 py-0.5">
                                      {app.iconUri ? (
                                        <img
                                          src={app.iconUri}
                                          alt={getDisplayAppName(app)}
                                          className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                                        />
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
                    {resolveSelectableApps.length === 0 ? (
                      <p className="text-[11px] text-amber-700">
                        {resolveForm.resolutionType === "update_mapping"
                          ? "No accessible app with an existing TikTok mapping is available for update."
                          : "All accessible apps already have a TikTok app mapping."}
                      </p>
                    ) : null}
                    {selectedResolveApp ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Selected App</p>
                        <div className="flex items-center gap-3">
                          {selectedResolveApp.iconUri ? (
                            <img
                              src={selectedResolveApp.iconUri}
                              alt={getDisplayAppName(selectedResolveApp)}
                              className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                              {getDisplayAppName(selectedResolveApp).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-slate-900">{getDisplayAppName(selectedResolveApp)}</span>
                              <Badge className={`text-[10px] ${getPlatformBadgeClass(selectedResolveApp.platform)}`}>
                                {normalizePlatform(selectedResolveApp.platform) || "APP"}
                              </Badge>
                            </div>
                            <p className="truncate font-mono text-xs text-slate-500">AdMob App ID - {selectedResolveApp.appId}</p>
                            <p className="truncate text-xs text-slate-500">App Store ID - {selectedResolveApp.appStoreId || "-"}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Resolution Note</Label>
                  <Textarea
                    className="min-h-[88px] text-sm"
                    value={resolveForm.resolutionNote}
                    onChange={(event) => setResolveForm((current) => ({ ...current, resolutionNote: event.target.value }))}
                    placeholder="Optional note for operations context"
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter className="flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button
              variant="ghost"
              className="text-slate-600"
              onClick={() => handleResolveDialogOpenChange(false)}
              disabled={resolvingId !== null}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => void resolveCandidate()}
              disabled={
                resolvingId !== null ||
                !resolveTarget ||
                (resolveForm.resolutionType !== "dismiss" && !resolveForm.appRowId)
              }
            >
              {resolvingId !== null ? "Saving..." : "Apply Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <div className="rounded-md border bg-white p-4">
        <Label>Request JSON</Label>
        <Textarea className="mt-2 min-h-72 font-mono text-xs" value={draftJson} onChange={(e) => setDraftJson(e.target.value)} />
        <Button className="mt-4" onClick={create}><Send className="mr-2 h-4 w-4" />Create Draft</Button>
      </div>
      <div className="rounded-md border bg-white">
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
