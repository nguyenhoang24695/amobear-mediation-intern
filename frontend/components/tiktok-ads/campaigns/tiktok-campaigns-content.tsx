"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, ChevronRight, Eye, Loader2, Megaphone, RefreshCw, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/shared/pagination"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { structureApi } from "@/lib/api/services"
import { tiktokAccountsApi, tiktokCampaignsApi } from "@/lib/api/tiktok-ads"
import { cn } from "@/lib/utils"
import type { App } from "@/types/api"
import type { TikTokAdAccountDto, TikTokAppMappingDto, TikTokCampaignListItemDto, TikTokCampaignListResponseDto } from "@/types/tiktok-ads"

function statusTone(value?: string | null) {
  const normalized = (value || "").toUpperCase()
  if (["ENABLE", "ACTIVE", "COMPLETED"].includes(normalized)) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (["DISABLE", "PAUSED"].includes(normalized)) return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
  if (["FAILED", "DELETED", "ARCHIVED", "DISAPPROVED", "WITH_ISSUES"].includes(normalized)) return "bg-destructive/10 text-destructive"
  return "bg-muted text-muted-foreground"
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "never"
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function normalizePlatform(value?: string | null) {
  return value?.toUpperCase() ?? ""
}

function toTitleCase(value?: string | null) {
  if (!value) return ""
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getInitials(value?: string | null) {
  const input = (value ?? "App").trim()
  const parts = input.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "AP"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? "A"}${parts[1][0] ?? "P"}`.toUpperCase()
}

function formatAppIdDisplay(value?: string | null) {
  if (!value) return ""
  return value.length <= 22 ? value : `${value.slice(0, 6)}...${value.slice(-12)}`
}

function appLabel(mapping: TikTokAppMappingDto) {
  return mapping.appDisplayName ?? mapping.appId ?? mapping.packageName ?? mapping.normalizedStoreIdentifier ?? mapping.tikTokAppId
}

interface SearchableFilterOption {
  value: string
  label: string
  helperText?: string
  searchText?: string
}

interface AppFilterOption {
  value: string
  label: string
  appId?: string | null
  platform?: string | null
  iconUri?: string | null
  searchText?: string
}

function SearchableFilterCombobox({
  open,
  onOpenChange,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  options: SearchableFilterOption[]
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-9 w-full justify-between bg-background text-sm font-normal">
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-[320px]" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.helperText ?? ""} ${option.searchText ?? ""}`}
                  onSelect={() => {
                    onChange(option.value)
                    onOpenChange(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-col text-left">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.helperText ? <span className="truncate text-xs text-muted-foreground">{option.helperText}</span> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function AppFilterCombobox({
  open,
  onOpenChange,
  value,
  onChange,
  options,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  options: AppFilterOption[]
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const selectedMeta = selectedOption?.value === "all"
    ? ""
    : [normalizePlatform(selectedOption?.platform), formatAppIdDisplay(selectedOption?.appId)].filter(Boolean).join(" ")

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-9 w-full justify-between bg-background text-sm font-normal">
          {selectedOption?.value === "all" ? (
            <span className="truncate">All apps</span>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-5 w-5 shrink-0 rounded">
                <AvatarImage src={selectedOption?.iconUri || "/placeholder.svg"} alt={selectedOption?.label ?? "App"} className="rounded object-cover" />
                <AvatarFallback className="rounded bg-muted text-[10px] font-semibold text-muted-foreground">{getInitials(selectedOption?.label)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 text-left">
                <span className="block truncate">{selectedOption?.label ?? "All apps"}</span>
                {selectedMeta ? <span className="block truncate text-[11px] text-muted-foreground">{selectedMeta}</span> : null}
              </span>
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-[360px]" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search app name or app ID..." />
          <CommandList>
            <CommandEmpty>No app found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value === "all" ? "all apps" : `${option.label} ${option.appId ?? ""} ${option.platform ?? ""} ${option.searchText ?? ""}`}
                  onSelect={() => {
                    onChange(option.value)
                    onOpenChange(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.value === "all" ? (
                    <span className="font-medium">All apps</span>
                  ) : (
                    <>
                      <Avatar className="h-8 w-8 shrink-0 rounded">
                        <AvatarImage src={option.iconUri || "/placeholder.svg"} alt={option.label} className="rounded object-cover" />
                        <AvatarFallback className="rounded bg-muted text-xs font-semibold text-muted-foreground">{getInitials(option.label)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col text-left">
                        <span className="truncate font-medium">{option.label}</span>
                        <span className="truncate text-xs text-muted-foreground">{[normalizePlatform(option.platform), formatAppIdDisplay(option.appId)].filter(Boolean).join(" ")}</span>
                      </div>
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function renderAppCell(item: TikTokCampaignListItemDto) {
  if (item.isUnmapped || (!item.appDisplayName && !item.appId)) {
    return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">Unmapped</Badge>
  }

  const title = (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-foreground">{item.appDisplayName ?? item.appId}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {item.platform ? <span>{toTitleCase(item.platform)}</span> : null}
        {item.appId ? <span className="font-mono">{item.appId}</span> : null}
      </div>
    </div>
  )

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
        <AvatarImage src={item.appIconUri || "/placeholder.svg"} alt={item.appDisplayName ?? item.appId ?? "App"} className="rounded-lg object-cover" />
        <AvatarFallback className="rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground">{getInitials(item.appDisplayName ?? item.appId)}</AvatarFallback>
      </Avatar>
      {item.appId ? <Link href={`/apps/${encodeURIComponent(item.appId)}`} className="min-w-0 hover:underline">{title}</Link> : title}
    </div>
  )
}

function SummaryCard({ title, value, tone = "default" }: { title: string; value: number; tone?: "default" | "good" | "warn" | "danger" }) {
  const toneClass = tone === "good" ? "text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "text-amber-700 dark:text-amber-300" : tone === "danger" ? "text-destructive" : "text-foreground"
  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

export function TikTokCampaignsContent() {
  const { toast } = useToast()
  const canSync = hasScreenFunction("s-tiktok-campaigns", "edit")
  const [data, setData] = useState<TikTokCampaignListResponseDto | null>(null)
  const [accounts, setAccounts] = useState<TikTokAdAccountDto[]>([])
  const [appMappings, setAppMappings] = useState<TikTokAppMappingDto[]>([])
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [accountFilter, setAccountFilter] = useState("all")
  const [appFilter, setAppFilter] = useState("all")
  const [objectiveFilter, setObjectiveFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [accountFilterOpen, setAccountFilterOpen] = useState(false)
  const [appFilterOpen, setAppFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const deferredSearch = useDeferredValue(search)

  const loadReferences = useCallback(async () => {
    const [accountPage, mappings, appsResponse] = await Promise.all([
      tiktokAccountsApi.getAdAccounts({ page: 1, pageSize: 200 }),
      tiktokAccountsApi.getAppMappings(),
      structureApi.getApps(),
    ])
    setAccounts(accountPage.items)
    setAppMappings(mappings)
    setApps(appsResponse.apps)
  }, [])

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await tiktokCampaignsApi.list({
        search: deferredSearch.trim() || undefined,
        tiktokAdAccountId: accountFilter === "all" ? undefined : Number(accountFilter),
        appRowId: appFilter === "all" ? undefined : Number(appFilter),
        objective: objectiveFilter === "all" ? undefined : objectiveFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        pageSize,
      })
      setData(result)
      if (result.page !== page) setPage(result.page)
    } catch (ex: any) {
      setError(ex.message ?? "Failed to load TikTok campaigns.")
    } finally {
      setLoading(false)
    }
  }, [accountFilter, appFilter, deferredSearch, objectiveFilter, page, pageSize, statusFilter])

  useEffect(() => {
    void loadReferences().catch((ex: any) => setError(ex.message ?? "Failed to load TikTok references."))
  }, [loadReferences])

  useEffect(() => {
    void loadCampaigns()
  }, [loadCampaigns])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, accountFilter, appFilter, objectiveFilter, statusFilter])

  const objectiveOptions = useMemo(() => {
    const values = new Set<string>()
    for (const item of data?.items ?? []) if (item.objective) values.add(item.objective)
    return Array.from(values).sort()
  }, [data?.items])

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const item of data?.items ?? []) if (item.status) values.add(item.status)
    return Array.from(values).sort()
  }, [data?.items])

  const accountOptions = useMemo<SearchableFilterOption[]>(() => [
    { value: "all", label: "All ad accounts", searchText: "all" },
    ...accounts.map((account) => ({
      value: account.id.toString(),
      label: account.name || account.advertiserId,
      helperText: [account.advertiserId, account.currency, account.country, account.timezone].filter(Boolean).join(" · "),
      searchText: [account.name, account.advertiserId, account.currency, account.country, account.timezone, account.bcName].filter(Boolean).join(" "),
    })),
  ], [accounts])

  const appOptions = useMemo<AppFilterOption[]>(() => {
    const appsByRowId = new Map(apps.map((app) => [app.id, app]))
    return [
      { value: "all", label: "All apps", searchText: "all" },
      ...appMappings.flatMap((mapping) => {
        if (mapping.appRowId == null) return []
        const appRowId = mapping.appRowId
        const app = appsByRowId.get(appRowId)
        const label = app?.displayName ?? app?.name ?? appLabel(mapping)
        const appId = app?.appId ?? mapping.appId
        const platform = app?.platform ?? mapping.appPlatform
        return [{
          value: appRowId.toString(),
          label,
          appId,
          platform,
          iconUri: app?.iconUri,
          searchText: [label, appId, platform, mapping.tikTokAppId].filter(Boolean).join(" "),
        }]
      }),
    ]
  }, [appMappings, apps])

  const sync = async () => {
    try {
      setSyncing(true)
      const result = await tiktokCampaignsApi.sync({
        tikTokAdAccountIds: accountFilter === "all" ? undefined : [Number(accountFilter)],
      })
      await loadCampaigns()
      toast({
        title: "TikTok campaigns synced",
        description: `${result.accountsScanned} account(s), ${result.rowsWritten} row(s), ${result.failedAccounts} failed.`,
        variant: result.failedAccounts > 0 ? "destructive" : "default",
      })
    } catch (ex: any) {
      toast({ title: "Sync failed", description: ex.message ?? "TikTok campaign sync failed.", variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const rows = data?.items ?? []
  const summary = data?.summary

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span>TikTok Ads</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">Campaigns</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TikTok Campaigns</h1>
              <p className="text-sm text-muted-foreground">Monitor synced TikTok campaign structure and drill into ad groups and ads.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Last synced</div>
            <div>{summary?.lastSyncedAt ? `${formatRelativeTime(summary.lastSyncedAt)} (${formatDateTime(summary.lastSyncedAt)})` : "No campaign sync yet"}</div>
          </div>
          {canSync ? (
            <Button onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync from TikTok
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Total" value={summary?.total ?? 0} />
        <SummaryCard title="Active" value={summary?.active ?? 0} tone="good" />
        <SummaryCard title="Paused" value={summary?.paused ?? 0} tone="warn" />
        <SummaryCard title="Issues" value={summary?.issues ?? 0} tone="danger" />
        <SummaryCard title="Unmapped" value={summary?.unmapped ?? 0} tone="warn" />
        <SummaryCard title="Stale Sync" value={summary?.staleSync ?? 0} tone="warn" />
      </div>

      <Card className="border-border bg-card text-card-foreground">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Campaign Mirror</CardTitle>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaign or ID" className="h-9 pl-9 text-sm" />
              </div>
              <SearchableFilterCombobox
                open={accountFilterOpen}
                onOpenChange={setAccountFilterOpen}
                value={accountFilter}
                onChange={setAccountFilter}
                options={accountOptions}
                placeholder="Ad account"
                searchPlaceholder="Search ad account..."
                emptyLabel="No ad account found."
              />
              <AppFilterCombobox
                open={appFilterOpen}
                onOpenChange={setAppFilterOpen}
                value={appFilter}
                onChange={setAppFilter}
                options={appOptions}
              />
              <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Objective" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All objectives</SelectItem>
                  {objectiveOptions.map((objective) => <SelectItem key={objective} value={objective}>{objective}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4">Campaign</TableHead>
                  <TableHead className="px-4">Account</TableHead>
                  <TableHead className="px-4">App</TableHead>
                  <TableHead className="px-4">Objective</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-right">Ad Groups</TableHead>
                  <TableHead className="px-4 text-right">Ads</TableHead>
                  <TableHead className="px-4">Last Synced</TableHead>
                  <TableHead className="px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading TikTok campaigns...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No TikTok campaigns found.</TableCell></TableRow>
                ) : rows.map((item: TikTokCampaignListItemDto) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 py-3">
                      <Link href={`/tiktok-ads/campaigns/${item.id}`} className="block group">
                        <div className="font-medium text-foreground group-hover:underline">{item.name || item.tikTokCampaignId}</div>
                        <div className="font-mono text-xs text-muted-foreground">{item.tikTokCampaignId}</div>
                        {item.createdFromRequestId ? <div className="mt-0.5 text-xs text-primary">Request #{item.createdFromRequestId}</div> : null}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm text-foreground">{item.tikTokAdAccountName || item.advertiserId}</div>
                      <div className="font-mono text-xs text-muted-foreground">{item.advertiserId}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3">{renderAppCell(item)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{item.objective || "-"}</TableCell>
                    <TableCell className="px-4 py-3"><Badge className={statusTone(item.status)}>{item.status || "UNKNOWN"}</Badge></TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-foreground">{item.adGroupCount}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-foreground">{item.adCount}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      <div>{formatRelativeTime(item.lastSyncedAt)}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(item.lastSyncedAt)}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/tiktok-ads/campaigns/${item.id}`}><Eye className="mr-2 h-4 w-4" />Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border px-4 py-3">
            <Pagination
              currentPage={data?.page ?? page}
              totalPages={data?.totalPages ?? 1}
              totalItems={data?.total ?? 0}
              pageSize={pageSize}
              itemName="campaigns"
              onPageChange={setPage}
              onPageSizeChange={(value) => { setPageSize(value); setPage(1) }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
