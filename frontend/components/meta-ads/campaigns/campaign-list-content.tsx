"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/shared/pagination"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { useDuplicateOperationPolling } from "@/hooks/use-duplicate-operation-polling"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { metaCampaignsApi, metaReferenceApi } from "@/lib/api/meta-ads"
import { structureApi } from "@/lib/api/services"
import { DuplicateOperationStatus } from "@/components/meta-ads/campaigns/duplicate-operation-status"
import { DuplicateReadinessStatus } from "@/components/meta-ads/campaigns/duplicate-readiness-status"
import { cn } from "@/lib/utils"
import type { MetaCampaignDuplicateReadinessResultDto, MetaCampaignListItemDto } from "@/types/meta-ads"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Megaphone,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react"

const SCREEN_META_CAMPAIGNS = "s-meta-campaigns"

type QuickFilter = "all" | "active" | "paused" | "issues"

const issueStatuses = new Set(["WITH_ISSUES", "DISAPPROVED", "ARCHIVED", "DELETED", "PENDING_BILLING_INFO"])

function toTitleCase(value?: string | null): string {
  if (!value) return "-"
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return "Not synced"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not synced"

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getInitials(value?: string | null): string {
  const input = (value ?? "App").trim()
  const parts = input.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "AP"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? "A"}${parts[1][0] ?? "P"}`.toUpperCase()
}

function getSourceLabel(source: string): string {
  return source === "created_from_request" ? "Created from Request" : "Synced from Meta"
}

function formatPrefixedIdentifier(value?: string | null, prefix?: string): string {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return "-"
  if (!prefix) return trimmed
  return trimmed.toLowerCase().startsWith(`${prefix.toLowerCase()}_`) ? trimmed : `${prefix}_${trimmed}`
}

function formatAppIdDisplay(appId?: string | null): string {
  if (!appId) return ""
  return appId.length <= 20 ? appId : `${appId.slice(0, 5)}...${appId.slice(-12)}`
}

function formatPlatformDisplay(platform?: string | null): string {
  if (!platform) return ""
  return platform.toUpperCase().slice(0, 3)
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

interface SearchableFilterComboboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  options: SearchableFilterOption[]
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  className?: string
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
  className,
}: SearchableFilterComboboxProps) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 w-full justify-between bg-white text-sm font-normal", className)}
        >
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.searchText ?? ""}`}
                  onSelect={() => {
                    onChange(option.value)
                    onOpenChange(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-col text-left">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.helperText ? <span className="truncate text-xs text-slate-500">{option.helperText}</span> : null}
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

interface AppFilterComboboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  options: AppFilterOption[]
}

function AppFilterCombobox({ open, onOpenChange, value, onChange, options }: AppFilterComboboxProps) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const selectedMeta = selectedOption?.value === "all"
    ? ""
    : [formatPlatformDisplay(selectedOption?.platform), formatAppIdDisplay(selectedOption?.appId)].filter(Boolean).join(" ")

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between bg-white text-sm font-normal"
        >
          {selectedOption?.value === "all" ? (
            <span className="truncate">All Apps</span>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-5 w-5 shrink-0 rounded">
                <AvatarImage src={selectedOption?.iconUri || "/placeholder.svg"} alt={selectedOption?.label ?? "App"} className="rounded object-cover" />
                <AvatarFallback className="rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                  {getInitials(selectedOption?.label)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 text-left">
                <span className="block truncate">{selectedOption?.label ?? "All Apps"}</span>
                {selectedMeta ? <span className="block truncate text-[11px] text-slate-500">{selectedMeta}</span> : null}
              </span>
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Search by app name or app ID..." />
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
                    <span className="font-medium">All Apps</span>
                  ) : (
                    <>
                      <Avatar className="h-8 w-8 shrink-0 rounded">
                        <AvatarImage src={option.iconUri || "/placeholder.svg"} alt={option.label} className="rounded object-cover" />
                        <AvatarFallback className="rounded bg-slate-100 text-xs font-semibold text-slate-600">
                          {getInitials(option.label)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col text-left">
                        <span className="truncate font-medium">{option.label}</span>
                        <span className="truncate text-xs text-slate-500">
                          {[formatPlatformDisplay(option.platform), formatAppIdDisplay(option.appId)].filter(Boolean).join(" ")}
                        </span>
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

function getStatusBadgeClass(value?: string | null): string {
  const normalized = (value ?? "UNKNOWN").trim().toUpperCase()
  if (normalized === "ACTIVE") return "bg-green-100 text-green-700 border-green-200"
  if (normalized.includes("PAUSED")) return "bg-amber-100 text-amber-700 border-amber-200"
  if (issueStatuses.has(normalized)) return "bg-red-100 text-red-700 border-red-200"
  if (normalized === "UNKNOWN") return "bg-slate-100 text-slate-600 border-slate-200"
  return "bg-blue-100 text-blue-700 border-blue-200"
}

function renderAppCell(item: MetaCampaignListItemDto) {
  if (item.isUnmapped || !item.appDisplayName) {
    return (
      <div className="space-y-1">
        <Badge className="border border-amber-200 bg-amber-50 text-amber-700">Unmapped Meta App</Badge>
        <p className="text-xs text-slate-500">Resolve app mapping to attach this campaign to a project app.</p>
      </div>
    )
  }

  const appHref = item.appId ? `/apps/${item.appId}` : undefined
  const title = (
    <div className="min-w-0">
      <div className="truncate font-medium text-slate-900">{item.appDisplayName}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {item.platform ? <span>{toTitleCase(item.platform)}</span> : null}
        {item.appId ? <span className="font-mono">{item.appId}</span> : null}
      </div>
    </div>
  )


  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
        <AvatarImage src={item.appIconUri || "/placeholder.svg"} alt={item.appDisplayName} className="rounded-lg object-cover" />
        <AvatarFallback className="rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">
          {getInitials(item.appDisplayName)}
        </AvatarFallback>
      </Avatar>
      {appHref ? (
        <Link href={appHref} className="min-w-0 hover:underline">
          {title}
        </Link>
      ) : title}
    </div>
  )
}

function renderAccountCell(item: MetaCampaignListItemDto) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="truncate font-medium text-slate-900">{item.metaAdAccountName ?? item.metaAdAccountId}</div>
      <div className="truncate font-mono text-xs text-slate-500">{formatPrefixedIdentifier(item.metaAdAccountId, "act")}</div>
      {item.businessId ? <div className="truncate font-mono text-xs text-slate-400">{formatPrefixedIdentifier(item.businessId, "biz")}</div> : null}
    </div>
  )
}

function SummaryCard({ title, value, tone = "default" }: { title: string; value: string | number; tone?: "default" | "good" | "warn" | "danger" }) {
  const toneClass = tone === "good"
    ? "border-green-200 bg-green-50"
    : tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : tone === "danger"
        ? "border-red-200 bg-red-50"
        : "border-slate-200 bg-white"

  return (
    <div className={cn("rounded-xl border px-4 py-3", toneClass)}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function extractReadinessFromApiError(apiError: unknown): MetaCampaignDuplicateReadinessResultDto | null {
  const readiness = (apiError as { response?: { data?: { readiness?: MetaCampaignDuplicateReadinessResultDto } } })?.response?.data?.readiness
  return readiness ?? null
}
export function CampaignListContent() {
  const { toast } = useToast()
  const router = useRouter()
  const canSync = hasScreenFunction(SCREEN_META_CAMPAIGNS, "edit")
  const canDuplicate = hasScreenFunction(SCREEN_META_CAMPAIGNS, "view")

  const [search, setSearch] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [appFilter, setAppFilter] = useState("all")
  const [objectiveFilter, setObjectiveFilter] = useState("all")
  const [effectiveStatusFilter, setEffectiveStatusFilter] = useState("all")
  const [syncFreshnessFilter, setSyncFreshnessFilter] = useState("all")
  const [accountFilterOpen, setAccountFilterOpen] = useState(false)
  const [appFilterOpen, setAppFilterOpen] = useState(false)
  const [objectiveFilterOpen, setObjectiveFilterOpen] = useState(false)
  const [effectiveStatusFilterOpen, setEffectiveStatusFilterOpen] = useState(false)
  const [syncFreshnessFilterOpen, setSyncFreshnessFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [syncing, setSyncing] = useState(false)
  const [listVersion, setListVersion] = useState(0)
  const [duplicateTarget, setDuplicateTarget] = useState<MetaCampaignListItemDto | null>(null)
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<number | null>(null)
  const [activeDuplicateOperationId, setActiveDuplicateOperationId] = useState<number | null>(null)
  const [handledDuplicateOperationId, setHandledDuplicateOperationId] = useState<number | null>(null)
  const [checkingReadinessCampaignId, setCheckingReadinessCampaignId] = useState<number | null>(null)
  const [activeReadinessCampaignId, setActiveReadinessCampaignId] = useState<number | null>(null)
  const [readinessByCampaignId, setReadinessByCampaignId] = useState<Record<number, MetaCampaignDuplicateReadinessResultDto>>({})

  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, accountFilter, appFilter, objectiveFilter, effectiveStatusFilter, quickFilter, syncFreshnessFilter])

  useEffect(() => {
    setReadinessByCampaignId({})
    setActiveReadinessCampaignId(null)
  }, [deferredSearch, accountFilter, appFilter, objectiveFilter, effectiveStatusFilter, quickFilter, syncFreshnessFilter, page, pageSize, listVersion])

  const { operation: duplicateOperation, isCompleted: duplicateCompleted, isFailed: duplicateFailed } = useDuplicateOperationPolling(
    activeDuplicateOperationId,
    activeDuplicateOperationId !== null,
  )

  const { data: referenceData } = useApi(
    () => metaReferenceApi.getCreateCampaignReference(),
    { cacheKey: "meta-reference:create-campaign" }
  )

  const { data: appsResponse } = useApi(
    () => structureApi.getApps(),
    { cacheKey: "structure:apps" }
  )

  const listCacheKey = [
    "meta-campaigns:list",
    deferredSearch,
    quickFilter,
    accountFilter,
    appFilter,
    objectiveFilter,
    effectiveStatusFilter,
    syncFreshnessFilter,
    page,
    pageSize,
    listVersion,
  ].join(":")

  const {
    data: response,
    loading,
    error,
    refetch,
  } = useApi(
    () => metaCampaignsApi.list({
      search: deferredSearch.trim() || undefined,
      metaAdAccountId: accountFilter === "all" ? undefined : Number(accountFilter),
      appRowId: appFilter === "all" ? undefined : Number(appFilter),
      objective: objectiveFilter === "all" ? undefined : objectiveFilter,
      effectiveStatus: effectiveStatusFilter === "all" ? undefined : effectiveStatusFilter,
      quickFilter: quickFilter === "all" ? undefined : quickFilter,
      syncFreshness: syncFreshnessFilter === "all" ? undefined : syncFreshnessFilter,
      page,
      pageSize,
    }),
    {
      cacheKey: listCacheKey,
      onSuccess: (result) => {
        if (result.page !== page) {
          setPage(result.page)
        }
      },
    }
  )

  const accountOptions = useMemo(
    () => [...(referenceData?.adAccounts ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [referenceData?.adAccounts]
  )

  const appsById = useMemo(() => {
    return new Map((appsResponse?.apps ?? []).map((app) => [app.id, app]))
  }, [appsResponse?.apps])

  const appOptions = useMemo<AppFilterOption[]>(() => {
    const uniqueOptions = new Map<string, AppFilterOption>()
    uniqueOptions.set("all", { value: "all", label: "All Apps", searchText: "all apps" })

    for (const mapping of referenceData?.appMappings ?? []) {
      if (mapping.appRowId == null) continue
      const value = mapping.appRowId.toString()
      if (uniqueOptions.has(value)) continue

      const app = appsById.get(mapping.appRowId)
      const label = app?.displayName || app?.name || mapping.appDisplayName || mapping.appId || `App ${mapping.appRowId}`
      uniqueOptions.set(value, {
        value,
        label,
        appId: app?.appId || mapping.appId,
        platform: app?.platform || mapping.platform,
        iconUri: app?.iconUri,
        searchText: `${label} ${app?.appId ?? mapping.appId ?? ""} ${app?.platform ?? mapping.platform ?? ""}`,
      })
    }

    return Array.from(uniqueOptions.values()).sort((left, right) => {
      if (left.value === "all") return -1
      if (right.value === "all") return 1
      return left.label.localeCompare(right.label)
    })
  }, [appsById, referenceData?.appMappings])

  const objectiveOptions = useMemo(
    () => Array.from(new Set((referenceData?.objectives ?? []).map((item) => item.key))).sort(),
    [referenceData?.objectives]
  )

  const effectiveStatusOptions = useMemo(() => {
    const values = new Set<string>(["ARCHIVED"])
    for (const item of response?.items ?? []) {
      if (item.effectiveStatus) values.add(item.effectiveStatus)
      if (item.status) values.add(item.status)
    }
    return Array.from(values).sort()
  }, [response?.items])

  const accountFilterOptions = useMemo<SearchableFilterOption[]>(() => [
    { value: "all", label: "All ad accounts", searchText: "all ad accounts" },
    ...accountOptions.map((account) => ({
      value: account.id.toString(),
      label: account.name,
      helperText: [formatPrefixedIdentifier(account.metaAdAccountId, "act"), account.businessName ?? account.currency ?? account.timeZoneName].filter(Boolean).join(" "),
      searchText: `${account.name} ${account.metaAdAccountId} ${account.businessName ?? ""} ${account.currency ?? ""} ${account.timeZoneName ?? ""}`,
    })),
  ], [accountOptions])

  const objectiveFilterOptions = useMemo<SearchableFilterOption[]>(() => [
    { value: "all", label: "All objectives", searchText: "all objectives" },
    ...objectiveOptions.map((objective) => ({
      value: objective,
      label: toTitleCase(objective),
      searchText: objective,
    })),
  ], [objectiveOptions])

  const effectiveStatusFilterOptions = useMemo<SearchableFilterOption[]>(() => [
    { value: "all", label: "All effective statuses", searchText: "all effective statuses" },
    ...effectiveStatusOptions.map((status) => ({
      value: status,
      label: toTitleCase(status),
      searchText: status,
    })),
  ], [effectiveStatusOptions])

  const syncFreshnessFilterOptions = useMemo<SearchableFilterOption[]>(() => [
    { value: "all", label: "All freshness", searchText: "all freshness" },
    { value: "fresh", label: "Fresh sync", helperText: "Recently synced campaigns", searchText: "fresh sync recent" },
    { value: "stale", label: "Stale sync", helperText: "Campaigns needing refresh", searchText: "stale sync old" },
  ], [])

  const summary = response?.summary
  const activeReadiness = activeReadinessCampaignId !== null ? readinessByCampaignId[activeReadinessCampaignId] ?? null : null
  const duplicateTargetReadiness = duplicateTarget ? readinessByCampaignId[duplicateTarget.id] ?? null : null

  const handleSync = async () => {
    try {
      setSyncing(true)
      const result = await metaCampaignsApi.sync({
        metaAdAccountIds: accountFilter === "all" ? undefined : [Number(accountFilter)],
      })

      invalidateCache(listCacheKey)
      setListVersion((previous) => previous + 1)
      await refetch()

      toast({
        title: "Meta campaigns synced",
        description: `${result.campaignsSynced} campaigns, ${result.adSetsSynced} ad sets, ${result.adsSynced} ads refreshed.`,
      })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Meta campaign sync failed."
      toast({ title: "Sync failed", description: message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleCheckDuplicateReadiness = async (campaign: MetaCampaignListItemDto) => {
    try {
      setCheckingReadinessCampaignId(campaign.id)
      const result = await metaCampaignsApi.checkDuplicateReadiness(campaign.id)
      setReadinessByCampaignId((previous) => ({ ...previous, [campaign.id]: result }))
      setActiveReadinessCampaignId(campaign.id)
      toast({
        title: result.isReady ? "Duplicate readiness passed" : "Duplicate readiness failed",
        description: result.summary,
        variant: result.isReady ? "default" : "destructive",
      })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Readiness check failed."
      toast({ title: "Readiness check failed", description: message, variant: "destructive" })
    } finally {
      setCheckingReadinessCampaignId(null)
    }
  }
  const handleDuplicate = async (campaign: MetaCampaignListItemDto) => {
    try {
      setDuplicatingCampaignId(campaign.id)
      const result = await metaCampaignsApi.duplicate(campaign.id, { deepCopy: true })
      setActiveDuplicateOperationId(result.operationId)
      setHandledDuplicateOperationId(null)
      setDuplicateTarget(null)
      toast({
        title: "Duplication started",
        description: `${campaign.name} is being duplicated on Meta. This can take a short while for large campaign trees.`
      })
    } catch (apiError) {
      const readiness = extractReadinessFromApiError(apiError)
      if (readiness) {
        setReadinessByCampaignId((previous) => ({ ...previous, [campaign.id]: readiness }))
        setActiveReadinessCampaignId(campaign.id)
      }

      const message = apiError instanceof Error ? apiError.message : "Meta campaign duplicate failed."
      toast({ title: "Duplicate failed", description: readiness?.summary ?? message, variant: "destructive" })
      setDuplicatingCampaignId(null)
      setActiveDuplicateOperationId(null)
    }
  }

  useEffect(() => {
    if (!duplicateOperation) return
    if (!duplicateCompleted && !duplicateFailed) return
    if (handledDuplicateOperationId === duplicateOperation.id) return

    setHandledDuplicateOperationId(duplicateOperation.id)
    setDuplicatingCampaignId(null)
    setActiveDuplicateOperationId(null)

    if (duplicateCompleted && duplicateOperation.newCampaignId) {
      invalidateCache(listCacheKey)
      invalidateCache(`meta-campaign:${duplicateOperation.sourceCampaignId}`)
      invalidateCache(`meta-campaign:${duplicateOperation.newCampaignId}`)
      setListVersion((previous) => previous + 1)
      void refetch()
      toast({
        title: "Campaign duplicated",
        description: "Meta finished duplicating the campaign and MediationPro synced the new campaign."
      })
      router.push(`/meta-ads/campaigns/${duplicateOperation.newCampaignId}`)
      return
    }

    if (duplicateFailed) {
      toast({
        title: "Duplicate failed",
        description: duplicateOperation.failureSummary ?? "Meta campaign duplicate failed.",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Duplicate completed",
      description: "Meta finished duplicating the campaign, but the new local campaign id is not available yet."
    })
  }, [duplicateCompleted, duplicateFailed, duplicateOperation, handledDuplicateOperationId, listCacheKey, refetch, router, toast])
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
            <span>Meta Ads</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900">Campaigns</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meta Campaigns</h1>
              <p className="text-sm text-slate-500">Monitor campaigns already known in Mediation Pro and drill into synced Meta structure.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500">
            <div className="font-medium text-slate-700">Last synced</div>
            <div>{summary?.lastSyncedAt ? `${formatRelativeTime(summary.lastSyncedAt)} (${formatDateTime(summary.lastSyncedAt)})` : "No campaign sync yet"}</div>
          </div>
          {canSync ? (
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync from Meta
            </Button>
          ) : null}
        </div>
      </div>

      {duplicateOperation ? <DuplicateOperationStatus operation={duplicateOperation} /> : null}
      {activeReadiness ? <DuplicateReadinessStatus readiness={activeReadiness} /> : null}

      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard title="Total" value={summary?.total ?? 0} />
        <SummaryCard title="Active" value={summary?.active ?? 0} tone="good" />
        <SummaryCard title="Paused" value={summary?.paused ?? 0} tone="warn" />
        <SummaryCard title="Issues" value={summary?.issues ?? 0} tone="danger" />
        <SummaryCard title="Stale Sync" value={summary?.staleSync ?? 0} tone="warn" />
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <CardTitle className="text-base font-semibold text-slate-900">Live Campaign Monitor</CardTitle>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "all", label: "All", count: summary?.total ?? 0 },
                  { key: "active", label: "Active", count: summary?.active ?? 0 },
                  { key: "paused", label: "Paused", count: summary?.paused ?? 0 },
                  { key: "issues", label: "Issues", count: summary?.issues ?? 0 },
                ] as const).map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 rounded-full border-slate-200 px-4 text-sm",
                      quickFilter === item.key ? "border-blue-200 bg-blue-50 text-blue-700" : "bg-white text-slate-600"
                    )}
                    onClick={() => setQuickFilter(item.key)}
                  >
                    {item.label}
                    <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500">{item.count}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search campaign or Meta Campaign ID..."
                  className="h-9 pl-9 text-sm"
                />
              </div>

              <SearchableFilterCombobox
                open={accountFilterOpen}
                onOpenChange={setAccountFilterOpen}
                value={accountFilter}
                onChange={setAccountFilter}
                options={accountFilterOptions}
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

              <SearchableFilterCombobox
                open={objectiveFilterOpen}
                onOpenChange={setObjectiveFilterOpen}
                value={objectiveFilter}
                onChange={setObjectiveFilter}
                options={objectiveFilterOptions}
                placeholder="Objective"
                searchPlaceholder="Search objective..."
                emptyLabel="No objective found."
              />

              <SearchableFilterCombobox
                open={effectiveStatusFilterOpen}
                onOpenChange={setEffectiveStatusFilterOpen}
                value={effectiveStatusFilter}
                onChange={setEffectiveStatusFilter}
                options={effectiveStatusFilterOptions}
                placeholder="Effective status"
                searchPlaceholder="Search effective status..."
                emptyLabel="No effective status found."
              />

              <SearchableFilterCombobox
                open={syncFreshnessFilterOpen}
                onOpenChange={setSyncFreshnessFilterOpen}
                value={syncFreshnessFilter}
                onChange={setSyncFreshnessFilter}
                options={syncFreshnessFilterOptions}
                placeholder="Sync freshness"
                searchPlaceholder="Search sync freshness..."
                emptyLabel="No freshness option found."
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[280px] text-xs font-medium text-slate-500">Campaign</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-slate-500">Meta Campaign ID</TableHead>
                  <TableHead className="w-[240px] text-xs font-medium text-slate-500">App</TableHead>
                  <TableHead className="w-[220px] text-xs font-medium text-slate-500">Ad Account</TableHead>
                  <TableHead className="w-[140px] text-xs font-medium text-slate-500">Objective</TableHead>
                  <TableHead className="w-[140px] text-xs font-medium text-slate-500">Effective Status</TableHead>
                  <TableHead className="w-[120px] text-xs font-medium text-slate-500">Status</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-slate-500">Source</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-slate-500">Last Synced</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-slate-500">Created</TableHead>
                  <TableHead className="w-[70px] text-right text-xs font-medium text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading campaigns...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-red-600">
                      {error.message}
                    </TableCell>
                  </TableRow>
                ) : (response?.items.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-slate-400">
                      No campaigns found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  response?.items.map((item) => {
                    const hasIssue = item.isUnmapped || item.isSyncStale || issueStatuses.has((item.status ?? "").toUpperCase()) || issueStatuses.has((item.effectiveStatus ?? "").toUpperCase())
                    const readiness = readinessByCampaignId[item.id]
                    const readinessPassed = readiness?.isReady === true
                    const readinessBusy = checkingReadinessCampaignId === item.id
                    return (
                      <TableRow key={item.id} className={cn(hasIssue && "bg-amber-50/40")}>
                        <TableCell>
                          <div className="space-y-1">
                            <Link href={`/meta-ads/campaigns/${item.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
                              {item.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{item.adSetCount} ad sets</span>
                              <span>{item.adCount} ads</span>
                              {hasIssue ? (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Attention
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm text-slate-700">{item.externalCampaignId}</div>
                        </TableCell>
                        <TableCell>{renderAppCell(item)}</TableCell>
                        <TableCell>{renderAccountCell(item)}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-slate-700">{toTitleCase(item.objective)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border", getStatusBadgeClass(item.effectiveStatus))}>{toTitleCase(item.effectiveStatus)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border", getStatusBadgeClass(item.status))}>{toTitleCase(item.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-slate-700">
                            <div>{getSourceLabel(item.source)}</div>
                            {item.createdFromRequestId ? (
                              <Link href={`/meta-ads/requests/${item.createdFromRequestId}`} className="text-xs text-blue-600 hover:underline">
                                Request #{item.createdFromRequestId}
                              </Link>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-slate-700">
                            <div className="font-medium">{formatRelativeTime(item.lastSyncedAt)}</div>
                            <div className="text-xs text-slate-500">{formatDateTime(item.lastSyncedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-slate-700">
                            <div className="font-medium">{formatRelativeTime(item.createdAt)}</div>
                            <div className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[70px] text-right">
                          {canDuplicate ? (
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={duplicatingCampaignId === item.id || readinessBusy}>
                                    {duplicatingCampaignId === item.id || readinessBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onSelect={(event) => {
                                      event.preventDefault()
                                      void handleCheckDuplicateReadiness(item)
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Check Duplicate Readiness
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2"
                                    disabled={!readinessPassed}
                                    onSelect={(event) => {
                                      event.preventDefault()
                                      if (!readinessPassed) {
                                        return
                                      }

                                      setDuplicateTarget(item)
                                      setActiveReadinessCampaignId(item.id)
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                    Duplicate Campaign
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {response && response.total > 0 ? (
            <Pagination
              currentPage={response.page}
              totalPages={Math.max(response.totalPages, 1)}
              totalItems={response.total}
              pageSize={response.pageSize}
              itemName="campaigns"
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(duplicateTarget)}
        onOpenChange={(open) => {
          if (!open && duplicatingCampaignId === null) {
            setDuplicateTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will create a direct PAUSED copy of <strong>{duplicateTarget?.name ?? "this campaign"}</strong> on Meta Ad Manager, including its synced ad sets and ads. Only campaigns that passed readiness check on this screen can be duplicated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicatingCampaignId !== null}>Cancel</AlertDialogCancel>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!duplicateTarget || duplicatingCampaignId !== null || duplicateTargetReadiness?.isReady !== true}
              onClick={() => {
                if (duplicateTarget) {
                  void handleDuplicate(duplicateTarget)
                }
              }}
            >
              {duplicatingCampaignId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              Duplicate Campaign
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

