"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { Check, ChevronsUpDown, Loader2, RefreshCw, ShieldCheck, PlugZap, Play, CheckCircle2, XCircle, Send, Pencil, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/shared/pagination"
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
          <div><Label>App ID</Label><Input value={form.tikTokAppId} onChange={(e) => setForm({ ...form, tikTokAppId: e.target.value })} /></div>
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
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>App ID</TableHead><TableHead>Secret</TableHead><TableHead>Token</TableHead><TableHead>Status</TableHead><TableHead>Enabled</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
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
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Advertiser ID</TableHead><TableHead>Country</TableHead><TableHead>Currency</TableHead><TableHead>Timezone</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">Loading ad accounts...</TableCell></TableRow>
            ) : data.items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">No ad accounts found.</TableCell></TableRow>
            ) : data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-xs text-blue-700">{item.advertiserId}</TableCell>
                <TableCell>{item.country ?? "-"}</TableCell>
                <TableCell>{item.currency ?? "-"}</TableCell>
                <TableCell>{item.timezone ?? "-"}</TableCell>
                <TableCell>{item.balance ?? "-"}</TableCell>
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
  const [candidateSearch, setCandidateSearch] = useState("")
  const [candidateStatus, setCandidateStatus] = useState("open")
  const [candidateMatch, setCandidateMatch] = useState("all")
  const [form, setForm] = useState({ appRowId: "", tikTokAppId: "", downloadUrl: "" })
  const [resolveTarget, setResolveTarget] = useState<TikTokAppMappingCandidateDto | null>(null)
  const [resolveForm, setResolveForm] = useState({ resolutionType: "create_mapping", appRowId: "", resolutionNote: "" })
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const mappedAppRows = useMemo(() => new Set(items.map((item) => item.appRowId)), [items])

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

  const filteredCandidates = useMemo(() => {
    const search = candidateSearch.trim().toLowerCase()
    return candidates.filter((candidate) => {
      if (candidateStatus !== "all" && candidate.reviewStatus !== candidateStatus) return false
      if (candidateMatch !== "all" && candidate.matchQuality !== candidateMatch) return false
      if (!search) return true
      return [
        candidate.tikTokAppId,
        candidate.source,
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
  }, [candidateMatch, candidateSearch, candidateStatus, candidates])

  const create = async () => {
    try {
      await tiktokAccountsApi.createAppMapping({ appRowId: Number(form.appRowId), tikTokAppId: form.tikTokAppId, downloadUrl: form.downloadUrl, isActive: true })
      setForm({ appRowId: "", tikTokAppId: "", downloadUrl: "" })
      await load()
      toast({ title: "TikTok app mapping created" })
    } catch (ex: any) {
      toast({ title: "Create failed", description: ex.message, variant: "destructive" })
    }
  }

  const openResolve = (candidate: TikTokAppMappingCandidateDto) => {
    const appRowId = getCandidateDefaultAppRowId(candidate)
    const resolutionType = appRowId && mappedAppRows.has(appRowId) ? "update_mapping" : "create_mapping"
    setResolveTarget(candidate)
    setResolveForm({
      resolutionType,
      appRowId: appRowId?.toString() ?? "",
      resolutionNote: "",
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
      setResolveTarget(null)
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
    <PageShell title="TikTok App Mappings" subtitle="Map internal apps to TikTok App IDs and store URLs." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="inline-flex rounded-md bg-slate-100 p-1">
        <Button size="sm" variant={activeTab === "mappings" ? "default" : "ghost"} onClick={() => setActiveTab("mappings")}>
          App Mappings
          <Badge className="ml-2 bg-white text-slate-700">{items.length}</Badge>
        </Button>
        <Button size="sm" variant={activeTab === "candidates" ? "default" : "ghost"} onClick={() => setActiveTab("candidates")}>
          Mapping Candidates
          <Badge className="ml-2 bg-white text-slate-700">{filteredCandidates.length}</Badge>
        </Button>
      </div>
      {activeTab === "mappings" ? (
        <>
          <div className="rounded-md border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>App</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.appRowId} onChange={(e) => setForm({ ...form, appRowId: e.target.value })}>
                  <option value="">Select app...</option>
                  {apps.map((app) => <option key={app.id} value={app.id}>{app.displayName ?? app.name} ({app.appId})</option>)}
                </select>
              </div>
              <div><Label>TikTok App ID</Label><Input value={form.tikTokAppId} onChange={(e) => setForm({ ...form, tikTokAppId: e.target.value })} /></div>
              <div><Label>Download URL</Label><Input value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} /></div>
            </div>
            <Button className="mt-4" onClick={create} disabled={!form.appRowId || !form.tikTokAppId || !form.downloadUrl}>Create</Button>
          </div>
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader><TableRow><TableHead>App</TableHead><TableHead>App Row ID</TableHead><TableHead>TikTok App ID</TableHead><TableHead>Download URL</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">Loading app mappings...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">No app mappings found.</TableCell></TableRow>
                ) : items.map((item) => <TableRow key={item.id}><TableCell>{item.appDisplayName ?? item.appId}</TableCell><TableCell>{item.appRowId}</TableCell><TableCell>{item.tikTokAppId}</TableCell><TableCell className="max-w-md truncate">{item.downloadUrl}</TableCell><TableCell><Badge className={statusTone(item.isActive ? "active" : "disabled")}>{item.isActive ? "active" : "disabled"}</Badge></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          {resolveTarget ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Resolve TikTok App {resolveTarget.tikTokAppId}</h3>
                  <p className="text-sm text-slate-600">Suggested app: {getCandidateSuggestion(resolveTarget)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setResolveTarget(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Resolution</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={resolveForm.resolutionType} onChange={(e) => setResolveForm({ ...resolveForm, resolutionType: e.target.value })}>
                    <option value="create_mapping">Create Mapping</option>
                    <option value="update_mapping">Update Existing Mapping</option>
                    <option value="dismiss">Dismiss</option>
                  </select>
                </div>
                {resolveForm.resolutionType !== "dismiss" ? (
                  <div>
                    <Label>App</Label>
                    <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={resolveForm.appRowId} onChange={(e) => setResolveForm({ ...resolveForm, appRowId: e.target.value })}>
                      <option value="">Select app...</option>
                      {apps
                        .filter((app) => resolveForm.resolutionType === "update_mapping" ? mappedAppRows.has(app.id) : !mappedAppRows.has(app.id))
                        .map((app) => <option key={app.id} value={app.id}>{app.displayName ?? app.name} ({app.appId})</option>)}
                    </select>
                  </div>
                ) : null}
                <div><Label>Note</Label><Input value={resolveForm.resolutionNote} onChange={(e) => setResolveForm({ ...resolveForm, resolutionNote: e.target.value })} /></div>
              </div>
              <Button className="mt-4" onClick={resolveCandidate} disabled={resolvingId === resolveTarget.id || (resolveForm.resolutionType !== "dismiss" && !resolveForm.appRowId)}>
                {resolvingId === resolveTarget.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Resolve Candidate
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Input className="w-72" placeholder="Search TikTok app, advertiser, internal app..." value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={candidateStatus} onChange={(e) => setCandidateStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="auto_created">Auto Created</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="stale">Stale</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={candidateMatch} onChange={(e) => setCandidateMatch(e.target.value)}>
              <option value="all">All Matches</option>
              <option value="exact">Exact</option>
              <option value="already_mapped">Already Mapped</option>
              <option value="conflict">Conflict</option>
              <option value="ambiguous">Ambiguous</option>
              <option value="none">No Match</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader><TableRow><TableHead>TikTok App</TableHead><TableHead>Suggested App</TableHead><TableHead>Match</TableHead><TableHead>Status</TableHead><TableHead>Evidence</TableHead><TableHead>Last Seen</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">Loading mapping candidates...</TableCell></TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">No mapping candidates found.</TableCell></TableRow>
                ) : filteredCandidates.map((candidate) => {
                  const isBusy = resolvingId === candidate.id
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="font-mono text-xs text-blue-700">{candidate.tikTokAppId || "-"}</div>
                        <div className="text-xs text-slate-500">{candidate.source}</div>
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
          </div>
        </>
      )}
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
  return (
    <PageShell title="TikTok Campaigns" subtitle="Local mirror campaigns from sync and approved execution flow.">
      <div className="rounded-md border bg-white p-6 text-sm text-slate-600">
        Campaign mirror detail uses the Phase 1 dashboard data today. Request-created objects appear on each request detail through backend `createdObjects`; a richer campaign detail view can now be layered on top of the same mirror tables.
      </div>
    </PageShell>
  )
}
