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
import { getCampaignStatusAction, isCampaignStatusActionBlocked } from "@/components/meta-ads/campaigns/campaign-status-action"
import { saveCampaignStatusError, type CampaignStatusUpdateError } from "@/components/meta-ads/campaigns/campaign-status-error"
import { cn } from "@/lib/utils"
import type { MetaCampaignDuplicateReadinessResultDto, MetaCampaignListItemDto } from "@/types/meta-ads"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Megaphone,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
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
          className={cn("h-9 w-full justify-between bg-background text-sm font-normal hover:bg-muted/60 hover:text-foreground", className)}
        >
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
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
          className="h-9 w-full justify-between bg-background text-sm font-normal hover:bg-muted/60 hover:text-foreground"
        >
          {selectedOption?.value === "all" ? (
            <span className="truncate">All Apps</span>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-5 w-5 shrink-0 rounded">
                <AvatarImage src={selectedOption?.iconUri || "/placeholder.svg"} alt={selectedOption?.label ?? "App"} className="rounded object-cover" />
                <AvatarFallback className="rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                  {getInitials(selectedOption?.label)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 text-left">
                <span className="block truncate">{selectedOption?.label ?? "All Apps"}</span>
                {selectedMeta ? <span className="block truncate text-[11px] text-muted-foreground">{selectedMeta}</span> : null}
              </span>
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(360px,calc(100vw-2rem))] p-0" align="start">
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
                        <AvatarFallback className="rounded bg-muted text-xs font-semibold text-muted-foreground">
                          {getInitials(option.label)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col text-left">
                        <span className="truncate font-medium">{option.label}</span>
                        <span className="truncate text-xs text-muted-foreground">
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
  if (normalized === "ACTIVE") return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25"
  if (normalized.includes("PAUSED")) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
  if (issueStatuses.has(normalized)) return "bg-destructive/10 text-destructive border-destructive/25"
  if (normalized === "UNKNOWN") return "bg-muted text-muted-foreground border-border"
  return "bg-primary/10 text-primary border-primary/25"
}

function renderAppCell(item: MetaCampaignListItemDto) {
  if (item.isUnmapped || !item.appDisplayName) {
    return (
      <div className="space-y-1">
        <Badge className="border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">Unmapped Meta App</Badge>
        <p className="text-xs text-muted-foreground">Resolve app mapping to attach this campaign to a project app.</p>
      </div>
    )
  }

  const appHref = item.appId ? `/apps/${item.appId}` : undefined
  const title = (
    <div className="min-w-0">
      <div className="truncate font-medium text-foreground">{item.appDisplayName}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {item.platform ? <span>{toTitleCase(item.platform)}</span> : null}
        {item.appId ? <span className="font-mono">{item.appId}</span> : null}
      </div>
    </div>
  )


  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
        <AvatarImage src={item.appIconUri || "/placeholder.svg"} alt={item.appDisplayName} className="rounded-lg object-cover" />
        <AvatarFallback className="rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground">
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
      <div className="truncate font-medium text-foreground">{item.metaAdAccountName ?? item.metaAdAccountId}</div>
      <div className="truncate font-mono text-xs text-muted-foreground">{formatPrefixedIdentifier(item.metaAdAccountId, "act")}</div>
      {item.businessId ? <div className="truncate font-mono text-xs text-muted-foreground/70">{formatPrefixedIdentifier(item.businessId, "biz")}</div> : null}
    </div>
  )
}

function SummaryCard({ title, value, tone = "default" }: { title: string; value: string | number; tone?: "default" | "good" | "warn" | "danger" }) {
  const toneClass = tone === "good"
    ? "border-green-500/25 bg-green-500/10"
    : tone === "warn"
      ? "border-amber-500/25 bg-amber-500/10"
      : tone === "danger"
        ? "border-destructive/25 bg-destructive/10"
        : "border-border bg-background"

  return (
    <div className={cn("rounded-xl border px-4 py-3", toneClass)}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
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
  const [duplicateQuantity, setDuplicateQuantity] = useState("1")
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<number | null>(null)
  const [activeDuplicateOperationId, setActiveDuplicateOperationId] = useState<number | null>(null)
  const [handledDuplicateOperationId, setHandledDuplicateOperationId] = useState<number | null>(null)
  const [checkingReadinessCampaignId, setCheckingReadinessCampaignId] = useState<number | null>(null)
  const [activeReadinessCampaignId, setActiveReadinessCampaignId] = useState<number | null>(null)
  const [readinessByCampaignId, setReadinessByCampaignId] = useState<Record<number, MetaCampaignDuplicateReadinessResultDto>>({})
  const [statusTarget, setStatusTarget] = useState<MetaCampaignListItemDto | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null)
  const [statusUpdateError, setStatusUpdateError] = useState<CampaignStatusUpdateError | null>(null)

  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, accountFilter, appFilter, objectiveFilter, effectiveStatusFilter, quickFilter, syncFreshnessFilter])

  useEffect(() => {
    setReadinessByCampaignId({})
    setActiveReadinessCampaignId(null)
  }, [deferredSearch, accountFilter, appFilter, objectiveFilter, effectiveStatusFilter, quickFilter, syncFreshnessFilter, page, pageSize, listVersion])

  useEffect(() => {
    if (duplicateTarget) {
      setDuplicateQuantity("1")
    }
  }, [duplicateTarget])

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
  const duplicateQuantityValue = Number(duplicateQuantity)
  const duplicateQuantityValid = Number.isInteger(duplicateQuantityValue) && duplicateQuantityValue >= 1 && duplicateQuantityValue <= 10

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
    if (!duplicateQuantityValid) return

    try {
      setDuplicatingCampaignId(campaign.id)
      const result = await metaCampaignsApi.duplicate(campaign.id, { deepCopy: true, quantity: duplicateQuantityValue })
      setActiveDuplicateOperationId(result.operationId)
      setHandledDuplicateOperationId(null)
      setDuplicateTarget(null)
      toast({
        title: "Duplication started",
        description: `${campaign.name} is being duplicated into ${duplicateQuantityValue} paused copy/copies on Meta.`
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

  const handleStatusUpdate = async (campaign: MetaCampaignListItemDto) => {
    const statusAction = getCampaignStatusAction(campaign)
    if (!statusAction) return

    try {
      setStatusUpdatingId(campaign.id)
      const result = statusAction.action === "pause"
        ? await metaCampaignsApi.pause(campaign.id)
        : await metaCampaignsApi.resume(campaign.id)

      invalidateCache(listCacheKey)
      invalidateCache(`meta-campaign:${campaign.id}`)
      setListVersion((previous) => previous + 1)
      await refetch()
      setStatusTarget(null)

      toast({
        title: statusAction.action === "pause" ? "Campaign paused" : "Campaign resumed",
        description: result.message,
      })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Meta campaign status update failed."
      const updateError: CampaignStatusUpdateError = {
        campaignId: campaign.id,
        campaignName: campaign.name,
        action: statusAction.action,
        message,
        occurredAt: new Date().toISOString(),
      }
      saveCampaignStatusError(updateError)
      setStatusUpdateError(updateError)
      setStatusTarget(null)
    } finally {
      setStatusUpdatingId(null)
    }
  }

  useEffect(() => {
    if (!duplicateOperation) return
    if (!duplicateCompleted && !duplicateFailed) return
    if (handledDuplicateOperationId === duplicateOperation.id) return

    setHandledDuplicateOperationId(duplicateOperation.id)
    setDuplicatingCampaignId(null)
    setActiveDuplicateOperationId(null)

    if (duplicateCompleted) {
      const successfulItems = (duplicateOperation.items ?? []).filter((item) => item.campaignId)
      const fallbackCampaignId = successfulItems.length === 0 ? duplicateOperation.newCampaignId : null
      invalidateCache(listCacheKey)
      invalidateCache(`meta-campaign:${duplicateOperation.sourceCampaignId}`)
      for (const item of successfulItems) {
        if (item.campaignId) invalidateCache(`meta-campaign:${item.campaignId}`)
      }
      if (fallbackCampaignId) invalidateCache(`meta-campaign:${fallbackCampaignId}`)
      setListVersion((previous) => previous + 1)
      void refetch()

      const successfulCount = successfulItems.length || (fallbackCampaignId ? 1 : 0)
      toast({
        title: duplicateOperation.failedCopies > 0 ? "Campaign duplicates completed with errors" : "Campaign duplicated",
        description: successfulCount > 0
          ? `Meta finished ${successfulCount} campaign copy/copies. ${duplicateOperation.failedCopies > 0 ? `${duplicateOperation.failedCopies} failed.` : ""}`.trim()
          : duplicateOperation.failureSummary ?? "Meta finished the duplicate operation, but no new local campaign id is available yet."
      })
      if (successfulCount === 1) {
        router.push(`/meta-ads/campaigns/${successfulItems[0]?.campaignId ?? fallbackCampaignId}`)
      }
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

  const statusTargetAction = statusTarget ? getCampaignStatusAction(statusTarget) : null

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Meta Ads</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">Campaigns</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Meta Campaigns</h1>
              <p className="text-sm text-muted-foreground">Monitor campaigns already known in Mediation Pro and drill into synced Meta structure.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Last synced</div>
            <div>{summary?.lastSyncedAt ? `${formatRelativeTime(summary.lastSyncedAt)} (${formatDateTime(summary.lastSyncedAt)})` : "No campaign sync yet"}</div>
          </div>
          {canSync ? (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSync} disabled={syncing}>
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

      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <CardTitle className="text-base font-semibold text-foreground">Live Campaign Monitor</CardTitle>
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
                      "h-9 rounded-full border-border px-4 text-sm transition-colors",
                      quickFilter === item.key
                        ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                        : "bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                    onClick={() => setQuickFilter(item.key)}
                  >
                    {item.label}
                    <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">{item.count}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
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
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[280px] text-xs font-medium text-muted-foreground">Campaign</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-muted-foreground">Meta Campaign ID</TableHead>
                  <TableHead className="w-[240px] text-xs font-medium text-muted-foreground">App</TableHead>
                  <TableHead className="w-[220px] text-xs font-medium text-muted-foreground">Ad Account</TableHead>
                  <TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Objective</TableHead>
                  <TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Effective Status</TableHead>
                  <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-muted-foreground">Source</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-muted-foreground">Last Synced</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-muted-foreground">Created</TableHead>
                  <TableHead className="w-[70px] text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading campaigns...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-destructive">
                      {error.message}
                    </TableCell>
                  </TableRow>
                ) : (response?.items.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-muted-foreground/70">
                      No campaigns found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  response?.items.map((item) => {
                    const hasIssue = item.isUnmapped || item.isSyncStale || issueStatuses.has((item.status ?? "").toUpperCase()) || issueStatuses.has((item.effectiveStatus ?? "").toUpperCase())
                    const readiness = readinessByCampaignId[item.id]
                    const readinessPassed = readiness?.isReady === true
                    const readinessBusy = checkingReadinessCampaignId === item.id
                    const statusAction = getCampaignStatusAction(item)
                    const statusActionBlocked = isCampaignStatusActionBlocked(item)
                    const statusBusy = statusUpdatingId === item.id
                    const menuBusy = duplicatingCampaignId === item.id || readinessBusy || statusBusy
                    return (
                      <TableRow key={item.id} className={cn(hasIssue ? "bg-amber-500/10 hover:bg-amber-500/15" : "hover:bg-muted/40")}>
                        <TableCell>
                          <div className="space-y-1">
                            <Link href={`/meta-ads/campaigns/${item.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                              {item.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.adSetCount} ad sets</span>
                              <span>{item.adCount} ads</span>
                              {hasIssue ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Attention
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm text-foreground">{item.externalCampaignId}</div>
                        </TableCell>
                        <TableCell>{renderAppCell(item)}</TableCell>
                        <TableCell>{renderAccountCell(item)}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{toTitleCase(item.objective)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border", getStatusBadgeClass(item.effectiveStatus))}>{toTitleCase(item.effectiveStatus)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("border", getStatusBadgeClass(item.status))}>{toTitleCase(item.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-foreground">
                            <div>{getSourceLabel(item.source)}</div>
                            {item.createdFromRequestId ? (
                              <Link href={`/meta-ads/requests/${item.createdFromRequestId}`} className="text-xs text-primary hover:underline">
                                Request #{item.createdFromRequestId}
                              </Link>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-foreground">
                            <div className="font-medium">{formatRelativeTime(item.lastSyncedAt)}</div>
                            <div className="text-xs text-muted-foreground">{formatDateTime(item.lastSyncedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-foreground">
                            <div className="font-medium">{formatRelativeTime(item.createdAt)}</div>
                            <div className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[70px] text-right">
                          {(canDuplicate || canSync) ? (
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={menuBusy}>
                                    {menuBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canSync && statusAction ? (
                                    <DropdownMenuItem
                                      className="gap-2"
                                      disabled={statusActionBlocked}
                                      onSelect={(event) => {
                                        event.preventDefault()
                                        if (statusActionBlocked) return
                                        setStatusTarget(item)
                                      }}
                                    >
                                      {statusAction.action === "pause" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                                      {statusAction.label}
                                    </DropdownMenuItem>
                                  ) : null}
                                  {canDuplicate ? (
                                    <>
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

                                          setDuplicateQuantity("1")
                                          setDuplicateTarget(item)
                                          setActiveReadinessCampaignId(item.id)
                                        }}
                                      >
                                        <Copy className="h-4 w-4" />
                                        Duplicate Campaign
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
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
        open={Boolean(statusUpdateError)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusUpdateError(null)
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusUpdateError?.action === "pause" ? "Pause" : "Resume"} Campaign Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 break-words">
              <span className="block rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                {statusUpdateError?.message ?? "Meta campaign status update failed."}
              </span>
              <span className="block text-xs text-muted-foreground">
                Campaign: <span className="font-medium text-foreground">{statusUpdateError?.campaignName ?? "Selected campaign"}</span>
                {statusUpdateError ? ` - ID: ${statusUpdateError.campaignId} - ${formatDateTime(statusUpdateError.occurredAt)}` : null}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap">
            <AlertDialogCancel>Close</AlertDialogCancel>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (!statusUpdateError) return
                router.push(`/meta-ads/campaigns/${statusUpdateError.campaignId}`)
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Campaign Detail
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open && statusUpdatingId === null) {
            setStatusTarget(null)
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTargetAction?.confirmTitle ?? "Update Campaign Status?"}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 break-words">
              <span className="block">
                {statusTargetAction?.confirmDescription ?? "This will update the campaign status on Meta."}
              </span>
              <span className="block rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="block break-all font-medium text-foreground">{statusTarget?.name ?? "Selected campaign"}</span>
                <span className="mt-1 block">Status: {toTitleCase(statusTarget?.status)} · Effective: {toTitleCase(statusTarget?.effectiveStatus)} · Target: {toTitleCase(statusTargetAction?.targetStatus)}</span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap">
            <AlertDialogCancel disabled={statusUpdatingId !== null}>Cancel</AlertDialogCancel>
            <Button
              className={statusTargetAction?.action === "pause" ? "bg-amber-600 text-primary-foreground hover:bg-amber-700" : "bg-green-600 text-primary-foreground hover:bg-green-700"}
              disabled={!statusTarget || !statusTargetAction || statusUpdatingId !== null}
              onClick={() => {
                if (statusTarget) {
                  void handleStatusUpdate(statusTarget)
                }
              }}
            >
              {statusUpdatingId !== null
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : statusTargetAction?.action === "pause"
                  ? <PauseCircle className="mr-2 h-4 w-4" />
                  : <PlayCircle className="mr-2 h-4 w-4" />}
              {statusTargetAction?.label ?? "Update Status"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(duplicateTarget)}
        onOpenChange={(open) => {
          if (!open && duplicatingCampaignId === null) {
            setDuplicateTarget(null)
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              This action will create paused campaign copies of <strong className="break-all">{duplicateTarget?.name ?? "this campaign"}</strong> on Meta Ad Manager, including its synced ad sets and ads. Only campaigns that passed readiness check on this screen can be duplicated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Number of copies</div>
            <Input
              type="number"
              min={1}
              max={10}
              value={duplicateQuantity}
              onChange={(event) => setDuplicateQuantity(event.target.value)}
              disabled={duplicatingCampaignId !== null}
            />
            <div className={cn("text-xs", duplicateQuantityValid ? "text-muted-foreground" : "text-destructive")}>Create between 1 and 10 paused campaign copies.</div>
          </div>
          <AlertDialogFooter className="flex-wrap">
            <AlertDialogCancel disabled={duplicatingCampaignId !== null}>Cancel</AlertDialogCancel>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!duplicateTarget || duplicatingCampaignId !== null || duplicateTargetReadiness?.isReady !== true || !duplicateQuantityValid}
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


