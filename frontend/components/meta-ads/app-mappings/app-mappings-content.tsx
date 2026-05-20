"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { metaAppMappingsApi } from "@/lib/api/meta-ads"
import { structureApi } from "@/lib/api/services"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { App } from "@/types/api"
import type {
  CreateMetaAppMappingRequestDto,
  MetaAppMappingCandidateDto,
  MetaAppMappingDiscoveryResultDto,
  MetaAppMappingDto,
  ResolveMetaAppMappingCandidateRequestDto,
  UpdateMetaAppMappingRequestDto,
} from "@/types/meta-ads"
import {
  Plus,
  MoreHorizontal,
  Edit,
  ChevronRight,
  GitMerge,
  Search,
  Loader2,
  Link2,
  Power,
  RefreshCcw,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Check,
  ChevronsUpDown,
} from "lucide-react"

const SCREEN_META_ACCOUNTS = "s-meta-accounts"

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

type ResolveCandidateFormState = {
  resolutionType: string
  appRowId: string
  resolutionNote: string
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

const emptyResolveForm: ResolveCandidateFormState = {
  resolutionType: "create_mapping",
  appRowId: "",
  resolutionNote: "",
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
      return "bg-blue-100 text-blue-700"
    case "ANDROID":
      return "bg-green-100 text-green-700"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

function getAppLabel(app?: App | null, mapping?: MetaAppMappingDto | null) {
  return mapping?.appDisplayName ?? app?.displayName ?? app?.name ?? mapping?.appId ?? (mapping ? "Unlinked app" : "-")
}

function getAppKey(app?: App | null, mapping?: MetaAppMappingDto | null) {
  return mapping?.appId ?? app?.appId ?? mapping?.normalizedStoreIdentifier ?? "-"
}

function getAppRouteId(app?: App | null, mapping?: MetaAppMappingDto | null) {
  return app?.appId ?? mapping?.appId ?? null
}

function getPrimaryStoreUrl(mapping: MetaAppMappingDto) {
  return mapping.objectStoreUrl || mapping.storeUrlOverride || mapping.normalizedStoreIdentifier || mapping.deepLinkUrlOverride || "-"
}

function getCandidateMatchBadgeClass(value?: string | null) {
  switch ((value ?? "").toLowerCase()) {
    case "exact":
      return "bg-emerald-100 text-emerald-700"
    case "already_mapped":
      return "bg-blue-100 text-blue-700"
    case "conflict":
      return "bg-rose-100 text-rose-700"
    case "ambiguous":
      return "bg-amber-100 text-amber-700"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

function getCandidateStatusBadgeClass(value?: string | null) {
  switch ((value ?? "").toLowerCase()) {
    case "auto_created":
      return "bg-emerald-100 text-emerald-700"
    case "resolved":
      return "bg-blue-100 text-blue-700"
    case "dismissed":
      return "bg-slate-200 text-slate-700"
    case "stale":
      return "bg-orange-100 text-orange-700"
    default:
      return "bg-amber-100 text-amber-700"
  }
}

function formatCandidateLabel(value?: string | null) {
  if (!value) return "-"
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getCandidateStoreLabel(candidate: MetaAppMappingCandidateDto) {
  return candidate.normalizedStoreIdentifier || candidate.objectStoreUrl || "-"
}

function getSuggestedAppLabel(candidate: MetaAppMappingCandidateDto) {
  if (candidate.resolvedApp?.appDisplayName) return candidate.resolvedApp.appDisplayName
  if (candidate.recommendedApp?.appDisplayName) return candidate.recommendedApp.appDisplayName
  if (candidate.suggestedApps.length === 1) return candidate.suggestedApps[0].appDisplayName ?? candidate.suggestedApps[0].appId ?? "-"
  if (candidate.suggestedApps.length > 1) return `${candidate.suggestedApps.length} candidate apps`
  return "Manual review"
}

function getCandidateActionAppRowId(candidate: MetaAppMappingCandidateDto) {
  return candidate.resolvedAppRowId ?? candidate.recommendedAppRowId ?? null
}

function getDefaultResolutionType(candidate: MetaAppMappingCandidateDto, mappedAppRowIds: Set<number>) {
  const appRowId = getCandidateActionAppRowId(candidate)
  if (!appRowId) return "create_mapping"
  return mappedAppRowIds.has(appRowId) ? "update_mapping" : "create_mapping"
}

function getDisplayAppName(app?: App | null) {
  return app?.displayName ?? app?.name ?? "-"
}

function getResolveSelectableApps(apps: App[], mappedAppRowIds: Set<number>, resolutionType: string) {
  switch (resolutionType) {
    case "update_mapping":
      return apps.filter((app) => mappedAppRowIds.has(app.id))
    case "create_mapping":
      return apps.filter((app) => !mappedAppRowIds.has(app.id))
    default:
      return apps
  }
}

export function AppMappingsContent() {
  const { toast } = useToast()
  const canCreate = hasScreenFunction(SCREEN_META_ACCOUNTS, "create")
  const canEdit = hasScreenFunction(SCREEN_META_ACCOUNTS, "edit")
  const canDisableEnable = hasScreenFunction(SCREEN_META_ACCOUNTS, "disable-enable")
  const canResolveCandidates = canCreate || canEdit

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

  const {
    data: candidates,
    loading: candidatesLoading,
    error: candidatesError,
    refetch: refetchCandidates,
  } = useApi(() => metaAppMappingsApi.listCandidates(), { cacheKey: "meta-app-mapping-candidates:list" })

  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [candidateSearch, setCandidateSearch] = useState("")
  const [candidatePlatformFilter, setCandidatePlatformFilter] = useState("all")
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("all")
  const [candidateMatchFilter, setCandidateMatchFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("mappings")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MetaAppMappingDto | null>(null)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolveAppSelectOpen, setResolveAppSelectOpen] = useState(false)
  const [resolveTarget, setResolveTarget] = useState<MetaAppMappingCandidateDto | null>(null)
  const [form, setForm] = useState<MappingFormState>(emptyForm)
  const [resolveForm, setResolveForm] = useState<ResolveCandidateFormState>(emptyResolveForm)
  const [submitting, setSubmitting] = useState(false)
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(null)
  const [resolvingCandidateId, setResolvingCandidateId] = useState<number | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [lastDiscoveryResult, setLastDiscoveryResult] = useState<MetaAppMappingDiscoveryResultDto | null>(null)

  const apps = appsResponse?.apps ?? []

  const appByRowId = useMemo(() => {
    return new Map(apps.map((app) => [app.id, app]))
  }, [apps])

  const mappedAppRowIds = useMemo(() => {
    return new Set((mappings ?? []).map((mapping) => mapping.appRowId).filter((value): value is number => typeof value === "number"))
  }, [mappings])

  const selectableApps = useMemo(() => {
    if (editTarget) {
      return editTarget.appRowId ? apps.filter((app) => app.id === editTarget.appRowId) : apps
    }

    return apps
  }, [apps, editTarget, mappedAppRowIds])

  const resolveSelectableApps = useMemo(() => {
    return getResolveSelectableApps(apps, mappedAppRowIds, resolveForm.resolutionType)
  }, [apps, mappedAppRowIds, resolveForm.resolutionType])

  const filteredCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase()
    return (candidates ?? []).filter((candidate) => {
      const platform = normalizePlatform(candidate.platform)

      if (candidatePlatformFilter !== "all" && platform !== candidatePlatformFilter) {
        return false
      }

      if (candidateStatusFilter !== "all" && candidate.reviewStatus !== candidateStatusFilter) {
        return false
      }

      if (candidateMatchFilter !== "all" && candidate.matchQuality !== candidateMatchFilter) {
        return false
      }

      if (!query) return true

      return [
        candidate.metaApplicationId,
        candidate.objectStoreUrl,
        candidate.normalizedStoreIdentifier,
        candidate.sampleAdSetName,
        candidate.sampleAdSetId,
        candidate.recommendedApp?.appDisplayName,
        candidate.recommendedApp?.appId,
        candidate.resolvedApp?.appDisplayName,
        candidate.resolvedApp?.appId,
        ...candidate.suggestedApps.flatMap((app) => [app.appDisplayName, app.appId]),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    })
  }, [candidateMatchFilter, candidatePlatformFilter, candidateSearch, candidateStatusFilter, candidates])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (mappings ?? []).filter((mapping) => {
      const app = mapping.appRowId ? appByRowId.get(mapping.appRowId) : undefined
      const platform = normalizePlatform(mapping.platform ?? app?.platform)

      if (platformFilter !== "all" && platform !== platformFilter) {
        return false
      }

      if (!query) return true

      return [
        getAppLabel(app, mapping).toLowerCase(),
        getAppKey(app, mapping).toLowerCase(),
        mapping.metaApplicationId.toLowerCase(),
        getPrimaryStoreUrl(mapping).toLowerCase(),
      ].some((value) => value.includes(query))
    })
  }, [appByRowId, mappings, platformFilter, search])

  const selectedFormApp = form.appRowId ? appByRowId.get(Number(form.appRowId)) ?? null : null
  const selectedResolveApp = resolveForm.appRowId ? appByRowId.get(Number(resolveForm.appRowId)) ?? null : null

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDrawerOpen(true)
  }

  const openResolve = (candidate: MetaAppMappingCandidateDto) => {
    const actionAppRowId = getCandidateActionAppRowId(candidate)
    const hasLinkedMapping = actionAppRowId ? mappedAppRowIds.has(actionAppRowId) : false
    let resolutionType = getDefaultResolutionType(candidate, mappedAppRowIds)
    if (resolutionType === "create_mapping" && !canCreate) {
      resolutionType = hasLinkedMapping && canEdit ? "update_mapping" : "dismiss"
    }
    if (resolutionType === "update_mapping" && !canEdit) {
      resolutionType = canCreate ? "create_mapping" : "dismiss"
    }

    setResolveTarget(candidate)
    const defaultAppRowId =
      resolutionType === "create_mapping" && hasLinkedMapping
        ? candidate.suggestedApps.find((app) => !mappedAppRowIds.has(app.appRowId))?.appRowId?.toString() ?? ""
        : actionAppRowId
          ? actionAppRowId.toString()
          : candidate.suggestedApps[0]?.appRowId?.toString() ?? ""
    setResolveForm({
      resolutionType,
      appRowId: defaultAppRowId,
      resolutionNote: "",
    })
    setResolveAppSelectOpen(false)
    setResolveDialogOpen(true)
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
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      if (editTarget) {
        const request: UpdateMetaAppMappingRequestDto = {
          appRowId: form.appRowId ? Number(form.appRowId) : null,
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

  const handleResolveResolutionTypeChange = (value: string) => {
    setResolveAppSelectOpen(false)
    setResolveForm((current) => {
      const nextSelectableApps = getResolveSelectableApps(apps, mappedAppRowIds, value)
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

  const handleDiscover = async () => {
    try {
      setDiscovering(true)
      const result = await metaAppMappingsApi.discover({})
      setLastDiscoveryResult(result)
      invalidateCache("meta-app-mappings:list")
      invalidateCache("meta-app-mapping-candidates:list")
      invalidateCache("meta-reference:create-campaign")
      await Promise.all([refetch(), refetchCandidates()])
      toast({
        title: "Discovery completed",
        description: `${result.externalAppsDiscovered} external apps found, ${result.mappingsAutoCreated} mapping${result.mappingsAutoCreated !== 1 ? "s" : ""} auto-created.`,
      })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to discover Meta app mappings."
      toast({ title: "Discovery failed", description: message, variant: "destructive" })
    } finally {
      setDiscovering(false)
    }
  }

  const handleOpenMapping = (candidate: MetaAppMappingCandidateDto) => {
    const appRowId = getCandidateActionAppRowId(candidate)
    if (!appRowId) return
    const mapping = (mappings ?? []).find((item) => item.appRowId === appRowId)
    if (mapping) {
      openEdit(mapping)
    }
  }

  const handleResolveSubmit = async () => {
    if (!resolveTarget) return

    try {
      setResolvingCandidateId(resolveTarget.id)
      const payload: ResolveMetaAppMappingCandidateRequestDto = {
        resolutionType: resolveForm.resolutionType,
        appRowId: resolveForm.resolutionType === "dismiss" ? null : Number(resolveForm.appRowId),
        resolutionNote: resolveForm.resolutionNote.trim() || null,
      }

      await metaAppMappingsApi.resolveCandidate(resolveTarget.id, payload)
      invalidateCache("meta-app-mappings:list")
      invalidateCache("meta-app-mapping-candidates:list")
      invalidateCache("meta-reference:create-campaign")
      await Promise.all([refetch(), refetchCandidates()])
      setResolveDialogOpen(false)
      setResolveAppSelectOpen(false)
      setResolveTarget(null)
      setResolveForm(emptyResolveForm)
      toast({ title: "Candidate resolved" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to resolve candidate."
      toast({ title: "Resolve failed", description: message, variant: "destructive" })
    } finally {
      setResolvingCandidateId(null)
    }
  }

  const handleDismissCandidate = async (candidate: MetaAppMappingCandidateDto) => {
    try {
      setResolvingCandidateId(candidate.id)
      await metaAppMappingsApi.resolveCandidate(candidate.id, {
        resolutionType: "dismiss",
      })
      invalidateCache("meta-app-mappings:list")
      invalidateCache("meta-app-mapping-candidates:list")
      await refetchCandidates()
      toast({ title: "Candidate dismissed" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to dismiss candidate."
      toast({ title: "Dismiss failed", description: message, variant: "destructive" })
    } finally {
      setResolvingCandidateId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <span>Meta Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">Store Mappings</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <GitMerge className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meta Store Mappings</h1>
              <p className="text-sm text-slate-500">Map Meta application IDs to package/store identities, with optional internal app links</p>
            </div>
          </div>
      </div>
      <div className="flex items-center gap-2">
          {canCreate && activeTab === "candidates" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleDiscover()}
              disabled={discovering}
            >
              {discovering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              Discover from Synced Accounts
            </Button>
          ) : null}
          {canCreate && activeTab === "mappings" ? (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Store Mapping
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-11 bg-slate-100 p-1 w-fit">
          <TabsTrigger value="mappings" className="px-4 data-[state=active]:bg-white gap-2">
            <span>Store Mappings</span>
            <Badge className="bg-white text-slate-700 border border-slate-200">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="candidates" className="px-4 data-[state=active]:bg-white gap-2">
            <span>Discovery Candidates</span>
            <Badge className="bg-white text-slate-700 border border-slate-200">{filteredCandidates.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="mt-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by app, app ID, Meta app ID..."
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
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} mapping{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium">App</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Platform</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Meta App ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Promoted Object URL</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Overrides</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Enabled</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-32">Updated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingsLoading || appsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading app mappings...
                  </div>
                </TableCell>
              </TableRow>
            ) : mappingsError || appsError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-sm text-red-600">
                  {mappingsError?.message ?? appsError?.message}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-sm text-slate-400">
                  No app mappings found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((mapping) => {
                const app = mapping.appRowId ? appByRowId.get(mapping.appRowId) : undefined
                const platform = normalizePlatform(mapping.platform ?? app?.platform) || "APP"
                const overrideCount = [
                  mapping.packageName,
                  mapping.bundleId,
                  mapping.appStoreId,
                  mapping.deepLinkUrlOverride,
                  mapping.storeUrlOverride,
                ].filter(Boolean).length
                const isBusy = rowActionLoadingId === mapping.id

                return (
                  <TableRow key={mapping.id} className="text-sm hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {app?.iconUri ? (
                          <img src={app.iconUri} alt="" className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                            {getAppLabel(app, mapping).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                          {getAppRouteId(app, mapping) ? (
                            <Link href={`/apps/${encodeURIComponent(getAppRouteId(app, mapping)!)}`} className="block font-medium text-slate-900 transition-colors hover:text-blue-600 hover:underline">
                              {getAppLabel(app, mapping)}
                            </Link>
                          ) : (
                            <p className="font-medium text-slate-900">{getAppLabel(app, mapping)}</p>
                          )}
                          <p className="text-[11px] text-slate-400 font-mono">{getAppKey(app, mapping)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[11px] ${getPlatformBadgeClass(platform)}`}>{platform}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-700">{mapping.metaApplicationId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Link2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[240px]">{getPrimaryStoreUrl(mapping)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {overrideCount > 0 ? `${overrideCount} override${overrideCount > 1 ? "s" : ""}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={mapping.isActive}
                        onCheckedChange={() => canDisableEnable && void handleToggleActive(mapping)}
                        disabled={!canDisableEnable || isBusy}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(mapping.updatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => openEdit(mapping)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canDisableEnable ? (
                            <DropdownMenuItem onClick={() => void handleToggleActive(mapping)}>
                              <Power className="w-4 h-4 mr-2" />
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
      </div>
        </TabsContent>

        <TabsContent value="candidates" className="mt-0 space-y-4">
      {lastDiscoveryResult ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Last discovery summary</span>
            </div>
            <Badge className="bg-white text-slate-700 border border-slate-200">{lastDiscoveryResult.accountsScanned} accounts</Badge>
            <Badge className="bg-white text-slate-700 border border-slate-200">{lastDiscoveryResult.adSetsScanned} ad sets</Badge>
            <Badge className="bg-emerald-100 text-emerald-700">{lastDiscoveryResult.mappingsAutoCreated} auto-created</Badge>
            <Badge className="bg-rose-100 text-rose-700">{lastDiscoveryResult.conflictsFound} conflicts</Badge>
            {lastDiscoveryResult.accountsPartiallyScanned > 0 ? (
              <Badge className="bg-amber-100 text-amber-700">{lastDiscoveryResult.accountsPartiallyScanned} partial scans</Badge>
            ) : null}
          </div>
          {lastDiscoveryResult.messages.length > 0 ? (
            <div className="mt-2 space-y-1">
              {lastDiscoveryResult.messages.slice(0, 4).map((message) => (
                <p key={message} className="text-xs text-slate-500">
                  {message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Discovery Candidates</h2>
            <p className="text-sm text-slate-500">Review Meta app signals found from synced ad accounts before mapping them into Mediation Pro.</p>
          </div>
          <span className="text-xs text-slate-400">
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Search by Meta app ID, ad set, app..."
              className="h-9 text-sm pl-8"
              value={candidateSearch}
              onChange={(event) => setCandidateSearch(event.target.value)}
            />
          </div>
          <Select value={candidatePlatformFilter} onValueChange={setCandidatePlatformFilter}>
            <SelectTrigger className="h-9 w-36 text-sm bg-white">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="ANDROID">Android</SelectItem>
              <SelectItem value="IOS">iOS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={candidateStatusFilter} onValueChange={setCandidateStatusFilter}>
            <SelectTrigger className="h-9 w-40 text-sm bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="auto_created">Auto Created</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="stale">Stale</SelectItem>
            </SelectContent>
          </Select>
          <Select value={candidateMatchFilter} onValueChange={setCandidateMatchFilter}>
            <SelectTrigger className="h-9 w-40 text-sm bg-white">
              <SelectValue placeholder="Match" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Matches</SelectItem>
              <SelectItem value="exact">Exact</SelectItem>
              <SelectItem value="already_mapped">Already Mapped</SelectItem>
              <SelectItem value="conflict">Conflict</SelectItem>
              <SelectItem value="ambiguous">Ambiguous</SelectItem>
              <SelectItem value="none">No Match</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs text-slate-500 font-medium w-24">Platform</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Meta App ID</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Store Identifier</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Suggested App</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Match</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Status</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Evidence</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium">Last Seen</TableHead>
                <TableHead className="text-xs text-slate-500 font-medium w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidatesLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading discovery candidates...
                    </div>
                  </TableCell>
                </TableRow>
              ) : candidatesError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-sm text-red-600">
                    {candidatesError.message}
                  </TableCell>
                </TableRow>
              ) : filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-sm text-slate-400">
                    No discovery candidates found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => {
                  const actionAppRowId = getCandidateActionAppRowId(candidate)
                  const linkedMapping = actionAppRowId ? (mappings ?? []).find((item) => item.appRowId === actionAppRowId) ?? null : null
                  const isBusy = resolvingCandidateId === candidate.id

                  return (
                    <TableRow key={candidate.id} className="text-sm hover:bg-slate-50">
                      <TableCell>
                        <Badge className={`text-[11px] ${getPlatformBadgeClass(candidate.platform)}`}>{normalizePlatform(candidate.platform) || "UNKNOWN"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-mono text-xs text-blue-700">{candidate.metaApplicationId}</p>
                          <p className="text-[11px] text-slate-400">{candidate.sampleAdSetName || candidate.sampleAdSetId || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-700 truncate max-w-[220px]">{getCandidateStoreLabel(candidate)}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{candidate.objectStoreUrl || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900">{getSuggestedAppLabel(candidate)}</p>
                          <p className="text-[11px] text-slate-400">
                            {candidate.recommendedApp?.appId || candidate.resolvedApp?.appId || (candidate.suggestedApps.length > 1 ? "Multiple matches" : "No exact match")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${getCandidateMatchBadgeClass(candidate.matchQuality)}`}>
                          {formatCandidateLabel(candidate.matchQuality)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${getCandidateStatusBadgeClass(candidate.reviewStatus)}`}>
                          {formatCandidateLabel(candidate.reviewStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {candidate.sourceAdAccountCount} account{candidate.sourceAdAccountCount !== 1 ? "s" : ""} / {candidate.sourceAdSetCount} ad set{candidate.sourceAdSetCount !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDateTime(candidate.lastDiscoveredAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canResolveCandidates ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => openResolve(candidate)}
                              disabled={isBusy}
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
                              Resolve
                            </Button>
                          ) : null}
                          {canEdit && linkedMapping ? (
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => handleOpenMapping(candidate)} disabled={isBusy}>
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Open Mapping
                            </Button>
                          ) : null}
                          {canEdit && candidate.reviewStatus !== "dismissed" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-slate-500"
                              onClick={() => void handleDismissCandidate(candidate)}
                              disabled={isBusy}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                              Dismiss
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
        </TabsContent>
      </Tabs>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="w-full max-w-[640px] p-0 gap-0 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {editTarget ? "Edit Store Mapping" : "Add Store Mapping"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {editTarget ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Linked Internal App</Label>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{getAppLabel(editTarget.appRowId ? appByRowId.get(editTarget.appRowId) : null, editTarget)}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{getAppKey(editTarget.appRowId ? appByRowId.get(editTarget.appRowId) : null, editTarget)}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Linked Internal App</Label>
                <Select value={form.appRowId} onValueChange={(value) => setForm((current) => ({ ...current, appRowId: value }))}>
                  <SelectTrigger className="h-auto min-h-14 py-2 text-sm">
                    {selectedFormApp ? (
                      <div className="flex w-full items-center gap-3 pr-2 text-left">
                        {selectedFormApp.iconUri ? (
                          <img src={selectedFormApp.iconUri} alt="" className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                            {(selectedFormApp.displayName ?? selectedFormApp.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-slate-900">{selectedFormApp.displayName ?? selectedFormApp.name}</span>
                            <Badge className={`text-[10px] ${getPlatformBadgeClass(selectedFormApp.platform)}`}>
                              {normalizePlatform(selectedFormApp.platform) || "APP"}
                            </Badge>
                          </div>
                          <p className="truncate font-mono text-xs text-slate-500">AdMob App ID - {selectedFormApp.appId}</p>
                        </div>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select app..." />
                    )}
                  </SelectTrigger>
                  <SelectContent className="max-h-[340px]">
                    {selectableApps.map((app) => (
                      <SelectItem key={app.id} value={app.id.toString()}>
                        <div className="flex items-center gap-3 py-0.5">
                          {app.iconUri ? (
                            <img src={app.iconUri} alt="" className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0" />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                              {(app.displayName ?? app.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-slate-900">{app.displayName ?? app.name}</span>
                              <Badge className={`text-[10px] ${getPlatformBadgeClass(app.platform)}`}>
                                {normalizePlatform(app.platform) || "APP"}
                              </Badge>
                            </div>
                            <p className="truncate font-mono text-xs text-slate-500">AdMob App ID - {app.appId}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectableApps.length === 0 ? (
                  <p className="text-[11px] text-amber-700">All accessible apps already have a Meta app mapping.</p>
                ) : null}
              </div>
            )}

            {selectedFormApp ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Selected App</p>
                <div className="flex items-center gap-3">
                  {selectedFormApp.iconUri ? (
                    <img src={selectedFormApp.iconUri} alt="" className="h-11 w-11 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500">
                      {(selectedFormApp.displayName ?? selectedFormApp.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{selectedFormApp.displayName ?? selectedFormApp.name}</span>
                      <Badge className={`text-[10px] ${getPlatformBadgeClass(selectedFormApp.platform)}`}>
                        {normalizePlatform(selectedFormApp.platform) || "APP"}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-slate-500">AdMob App ID - {selectedFormApp.appId}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Meta Application ID <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 text-sm font-mono"
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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Deep Link URL Override</Label>
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
              <Label className="text-sm text-slate-700 cursor-pointer">Enabled</Label>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void handleSubmit()}
              disabled={submitting || !form.metaApplicationId.trim() || (!form.objectStoreUrl.trim() && !form.packageName.trim() && !form.appStoreId.trim())}
            >
              {submitting ? "Saving..." : editTarget ? "Save Changes" : "Add Store Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resolveDialogOpen}
        onOpenChange={(open) => {
          setResolveDialogOpen(open)
          if (!open) {
            setResolveAppSelectOpen(false)
            setResolveTarget(null)
            setResolveForm(emptyResolveForm)
          }
        }}
      >
        <DialogContent className="w-full max-w-[640px] p-0 gap-0 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-base font-semibold text-slate-900">Resolve Discovery Candidate</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {resolveTarget ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[11px] ${getPlatformBadgeClass(resolveTarget.platform)}`}>
                      {normalizePlatform(resolveTarget.platform) || "UNKNOWN"}
                    </Badge>
                    <Badge className={`text-[11px] ${getCandidateMatchBadgeClass(resolveTarget.matchQuality)}`}>
                      {formatCandidateLabel(resolveTarget.matchQuality)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p><span className="font-medium">Meta App ID:</span> <span className="font-mono">{resolveTarget.metaApplicationId}</span></p>
                    <p><span className="font-medium">Store URL:</span> {resolveTarget.objectStoreUrl || "-"}</p>
                    <p><span className="font-medium">Suggested App:</span> {getSuggestedAppLabel(resolveTarget)}</p>
                    <p><span className="font-medium">Evidence:</span> {resolveTarget.sourceAdAccountCount} account(s), {resolveTarget.sourceAdSetCount} ad set(s)</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Resolution</Label>
                  <Select
                    value={resolveForm.resolutionType}
                    onValueChange={handleResolveResolutionTypeChange}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select resolution..." />
                    </SelectTrigger>
                    <SelectContent>
                      {canCreate ? <SelectItem value="create_mapping">Create Mapping</SelectItem> : null}
                      {canEdit ? <SelectItem value="update_mapping">Update Existing Mapping</SelectItem> : null}
                      {canEdit ? <SelectItem value="dismiss">Dismiss</SelectItem> : null}
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
                                  className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0"
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
                                          className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0"
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
                          ? "No accessible app with an existing Meta mapping is available for update."
                          : "All accessible apps already have a Meta app mapping."}
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
                              className="h-11 w-11 rounded-lg border border-slate-200 bg-slate-100 object-cover shrink-0"
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
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <Button
              variant="ghost"
              className="text-slate-600"
              onClick={() => {
                setResolveDialogOpen(false)
                setResolveAppSelectOpen(false)
                setResolveTarget(null)
                setResolveForm(emptyResolveForm)
              }}
              disabled={resolvingCandidateId !== null}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void handleResolveSubmit()}
              disabled={
                resolvingCandidateId !== null ||
                !resolveTarget ||
                (resolveForm.resolutionType !== "dismiss" && !resolveForm.appRowId)
              }
            >
              {resolvingCandidateId !== null ? "Saving..." : "Apply Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

