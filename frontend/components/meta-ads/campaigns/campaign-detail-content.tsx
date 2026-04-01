"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { metaCampaignsApi } from "@/lib/api/meta-ads"
import { cn } from "@/lib/utils"
import type {
  MetaCampaignAdSetSummaryDto,
  MetaCampaignAdSummaryDto,
  MetaCampaignCreativeSummaryDto,
  MetaCampaignCreativeUsageAdDto,
} from "@/types/meta-ads"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ChevronRight,
  Code2,
  ExternalLink,
  Layers3,
  Link2,
  Loader2,
  Palette,
  RefreshCw,
} from "lucide-react"

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

function formatRawValue(value?: string | null): string {
  const trimmed = (value ?? "").trim()
  return trimmed || "-"
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "-"
  return `${formatDateTime(start)} -> ${formatDateTime(end)}`
}

function formatList(values?: string[] | null): string {
  if (!values || values.length === 0) return "-"
  return values.map((value) => toTitleCase(value)).join(", ")
}

function getInitials(value?: string | null): string {
  const input = (value ?? "App").trim()
  const parts = input.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "AP"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? "A"}${parts[1][0] ?? "P"}`.toUpperCase()
}

function getStatusBadgeClass(value?: string | null): string {
  const normalized = (value ?? "UNKNOWN").trim().toUpperCase()
  if (normalized === "ACTIVE") return "bg-green-100 text-green-700 border-green-200"
  if (normalized.includes("PAUSED")) return "bg-amber-100 text-amber-700 border-amber-200"
  if (issueStatuses.has(normalized)) return "bg-red-100 text-red-700 border-red-200"
  if (normalized === "UNKNOWN") return "bg-slate-100 text-slate-600 border-slate-200"
  return "bg-blue-100 text-blue-700 border-blue-200"
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

function formatJson(value?: string | null): string {
  if (!value) return "{}"
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function extractObjectStorySpecJson(value?: string | null): string | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed?.object_story_spec) return null
    return JSON.stringify(parsed.object_story_spec, null, 2)
  } catch {
    return null
  }
}

function hasCreativeReviewFields(item: MetaCampaignCreativeSummaryDto): boolean {
  return Boolean(
    item.pageId ||
      item.instagramActorId ||
      item.headline ||
      item.message ||
      item.description ||
      item.callToActionType ||
      item.imageUrl ||
      item.thumbnailUrl ||
      item.linkUrl ||
      item.effectiveObjectStoryId,
  )
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("text-sm text-slate-900", mono && "font-mono")}>{value || "-"}</div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function AdSetTable({ items }: { items: MetaCampaignAdSetSummaryDto[] }) {
  if (items.length === 0) {
    return <EmptyState title="No ad sets synced" description="Run Sync from Meta on the campaigns list to load ad set structure." />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-xs font-medium text-slate-500">Ad Set</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Meta Ad Set ID</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Effective Status</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Meta App ID</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Store URL</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Last Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.appDisplayName ?? item.appId ?? "No app resolved"}</div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm text-slate-700">{item.externalAdSetId}</TableCell>
              <TableCell>
                <Badge className={cn("border", getStatusBadgeClass(item.effectiveStatus))}>{toTitleCase(item.effectiveStatus)}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm text-slate-700">{item.metaApplicationId ?? "-"}</TableCell>
              <TableCell>
                {item.objectStoreUrl ? (
                  <a href={item.objectStoreUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    {item.objectStoreUrl}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">{formatRelativeTime(item.lastSyncedAt)}</div>
                <div className="text-xs text-slate-500">{formatDateTime(item.lastSyncedAt)}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AdSetConfigurationTable({ items }: { items: MetaCampaignAdSetSummaryDto[] }) {
  if (items.length === 0) {
    return <EmptyState title="No ad set configuration synced" description="Sync this campaign again to load ad set configuration details from Meta." />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-xs font-medium text-slate-500">Ad Set</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Budget</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Budget Remaining</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Bid / Strategy</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Billing / Optimization</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Schedule</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Targeting</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Learning / Issues</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{item.externalAdSetId}</span>
                    <Badge className={cn("border", getStatusBadgeClass(item.effectiveStatus))}>{toTitleCase(item.effectiveStatus)}</Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm text-slate-700">
                  <div>Daily: {formatRawValue(item.dailyBudget)}</div>
                  <div>Lifetime: {formatRawValue(item.lifetimeBudget)}</div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-slate-700">{formatRawValue(item.budgetRemaining)}</TableCell>
              <TableCell>
                <div className="space-y-1 text-sm text-slate-700">
                  <div>Bid: {formatRawValue(item.bidAmount)}</div>
                  <div>Strategy: {item.bidStrategy ? toTitleCase(item.bidStrategy) : "-"}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm text-slate-700">
                  <div>Billing: {item.billingEvent ? toTitleCase(item.billingEvent) : "-"}</div>
                  <div>Optimization: {item.optimizationGoal ? toTitleCase(item.optimizationGoal) : "-"}</div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-slate-700">{formatDateRange(item.startTime, item.endTime)}</TableCell>
              <TableCell className="text-sm text-slate-700">{item.targetingSummary ?? "-"}</TableCell>
              <TableCell>
                <div className="space-y-1 text-sm text-slate-700">
                  <div>{item.learningStageInfoSummary ?? "-"}</div>
                  {item.issuesInfoSummary ? <div className="text-amber-700">{item.issuesInfoSummary}</div> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AdTable({ items }: { items: MetaCampaignAdSummaryDto[] }) {
  if (items.length === 0) {
    return <EmptyState title="No ads synced" description="This campaign has no synced ads yet, or the latest sync could not see child ads." />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-xs font-medium text-slate-500">Ad</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Meta Ad ID</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Ad Set</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Creative</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Effective Status</TableHead>
            <TableHead className="text-xs font-medium text-slate-500">Last Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.appDisplayName ?? item.appId ?? "No app resolved"}</div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm text-slate-700">{item.externalAdId}</TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">{item.adSetName ?? "-"}</div>
                <div className="font-mono text-xs text-slate-500">{item.externalAdSetId ?? "-"}</div>
              </TableCell>
              <TableCell>
                {item.externalCreativeId ? (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-900">{item.creativeName ?? item.externalCreativeId}</div>
                    <div className="font-mono text-xs text-slate-500">{item.externalCreativeId}</div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">No creative link</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={cn("border", getStatusBadgeClass(item.effectiveStatus))}>{toTitleCase(item.effectiveStatus)}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">{formatRelativeTime(item.lastSyncedAt)}</div>
                <div className="text-xs text-slate-500">{formatDateTime(item.lastSyncedAt)}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CreativeTable({ items, campaignId }: { items: MetaCampaignCreativeSummaryDto[]; campaignId: number }) {
  const { toast } = useToast()
  const [selectedCreative, setSelectedCreative] = useState<MetaCampaignCreativeSummaryDto | null>(null)
  const [previewTarget, setPreviewTarget] = useState<MetaCampaignCreativeSummaryDto | null>(null)
  const [previewingAdId, setPreviewingAdId] = useState<number | null>(null)
  const rawJson = useMemo(() => formatJson(selectedCreative?.configJson), [selectedCreative])
  const objectStorySpecJson = useMemo(() => extractObjectStorySpecJson(selectedCreative?.configJson), [selectedCreative])

  const openPreview = async (ad: MetaCampaignCreativeUsageAdDto) => {
    try {
      setPreviewingAdId(ad.id)
      const preview = await metaCampaignsApi.previewAd(campaignId, ad.id)
      const popup = window.open(preview.previewUrl, "_blank", "noopener,noreferrer")
      if (!popup) {
        toast({
          title: "Preview blocked",
          description: "Your browser blocked the preview tab. Allow pop-ups for this site and try again.",
          variant: "destructive",
        })
        return
      }

      setPreviewTarget(null)
      toast({
        title: "Preview opened",
        description: `${preview.adName || ad.adName} opened in a new tab using Meta's shareable preview.`,
      })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to open Meta preview."
      toast({ title: "Preview unavailable", description: message, variant: "destructive" })
    } finally {
      setPreviewingAdId(null)
    }
  }

  const handlePreview = async (item: MetaCampaignCreativeSummaryDto) => {
    if (item.usedByAds.length === 0) {
      toast({
        title: "Preview unavailable",
        description: "This creative is not currently linked to a synced ad, so Meta preview cannot be opened.",
        variant: "destructive",
      })
      return
    }

    if (item.usedByAds.length === 1) {
      await openPreview(item.usedByAds[0])
      return
    }

    setPreviewTarget(item)
  }

  if (items.length === 0) {
    return <EmptyState title="No creatives synced" description="Creatives will appear here after ads are synced with nested creative data from Meta." />
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-medium text-slate-500">Creative</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Meta Creative ID</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Used By</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Page / IG Actor</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Headline / CTA</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Destination</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Last Synced</TableHead>
              <TableHead className="text-right text-xs font-medium text-slate-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const previewImage = item.thumbnailUrl || item.imageUrl
              const rawOnly = !hasCreativeReviewFields(item) && Boolean(item.configJson)
              const previewBusy = item.usedByAds.some((ad) => ad.id === previewingAdId)
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {previewImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewImage} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Palette className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="text-left font-medium text-slate-900 transition hover:text-blue-700 disabled:cursor-default disabled:hover:text-slate-900"
                            onClick={() => void handlePreview(item)}
                            disabled={item.usedByAds.length === 0 || previewBusy}
                          >
                            {item.name}
                          </button>
                          {rawOnly ? <Badge className="border border-slate-200 bg-slate-50 text-slate-600">Raw only</Badge> : null}
                          {item.objectType ? <Badge className="border border-blue-200 bg-blue-50 text-blue-700">{toTitleCase(item.objectType)}</Badge> : null}
                        </div>
                        {item.message ? <p className="line-clamp-2 text-sm text-slate-600">{item.message}</p> : null}
                        {!item.message && item.description ? <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p> : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {item.effectiveObjectStoryId ? <span className="font-mono">Story {item.effectiveObjectStoryId}</span> : null}
                          {item.status ? <span>{toTitleCase(item.status)}</span> : null}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-700">{item.externalCreativeId}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900">{item.usedByAdCount} ad{item.usedByAdCount === 1 ? "" : "s"}</div>
                      <div className="space-y-0.5 text-xs text-slate-500">
                        {item.usedByAds.slice(0, 2).map((ad) => (
                          <div key={ad.id}>{ad.adName}</div>
                        ))}
                        {item.usedByAds.length > 2 ? <div>+{item.usedByAds.length - 2} more</div> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm text-slate-700">
                      <div>Page: <span className="font-mono text-xs">{item.pageId ?? "-"}</span></div>
                      <div>IG: <span className="font-mono text-xs">{item.instagramActorId ?? "-"}</span></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900">{item.headline ?? "-"}</div>
                      <div className="text-xs text-slate-500">CTA: {item.callToActionType ? toTitleCase(item.callToActionType) : "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.linkUrl ? (
                      <div className="space-y-1">
                        <a href={item.linkUrl} target="_blank" rel="noreferrer" className="line-clamp-2 break-all text-sm text-blue-600 hover:underline">
                          {item.linkUrl}
                        </a>
                        {item.imageUrl ? <div className="text-xs text-slate-500">Image ready</div> : null}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">{formatRelativeTime(item.lastSyncedAt)}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(item.lastSyncedAt)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => void handlePreview(item)} disabled={item.usedByAds.length === 0 || previewBusy}>
                        {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedCreative(item)}>
                        <Code2 className="h-4 w-4" />
                        View JSON
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(previewTarget)} onOpenChange={(open) => { if (!open) setPreviewTarget(null) }}>
        <DialogContent className="sm:!max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{previewTarget?.name ?? "Choose ad for preview"}</DialogTitle>
            <DialogDescription>Meta preview is rendered per ad. Choose which synced ad should be used to open the shareable preview.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {previewTarget?.usedByAds.map((ad) => {
              const busy = previewingAdId === ad.id
              return (
                <button
                  key={ad.id}
                  type="button"
                  className="flex w-full items-start justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  onClick={() => void openPreview(ad)}
                  disabled={busy}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{ad.adName}</div>
                    <div className="mt-1 font-mono text-xs text-slate-500">{ad.externalAdId}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    <span>Open preview</span>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedCreative)} onOpenChange={(open) => { if (!open) setSelectedCreative(null) }}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:!max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{selectedCreative?.name ?? "Creative JSON"}</DialogTitle>
            <DialogDescription>Read-only creative snapshot synced from Meta. Use this to inspect the current object story payload.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 overflow-y-auto pr-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Meta Creative ID</div>
                <div className="mt-1 font-mono text-sm text-slate-900">{selectedCreative?.externalCreativeId ?? "-"}</div>
                <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">Used By</div>
                <div className="mt-1 space-y-1 text-sm text-slate-700">
                  {selectedCreative?.usedByAds.map((ad) => (
                    <div key={ad.id}>{ad.adName}</div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="grid gap-3 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-900">Page:</span> <span className="font-mono text-xs">{selectedCreative?.pageId ?? "-"}</span></div>
                  <div><span className="font-medium text-slate-900">IG Actor:</span> <span className="font-mono text-xs">{selectedCreative?.instagramActorId ?? "-"}</span></div>
                  <div><span className="font-medium text-slate-900">Headline:</span> {selectedCreative?.headline ?? "-"}</div>
                  <div><span className="font-medium text-slate-900">CTA:</span> {selectedCreative?.callToActionType ? toTitleCase(selectedCreative.callToActionType) : "-"}</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 text-sm font-medium text-slate-900">Object Story Spec</div>
                <pre className="max-h-[240px] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{objectStorySpecJson ?? "No object_story_spec snapshot available."}</pre>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 text-sm font-medium text-slate-900">Raw Config JSON</div>
                <pre className="max-h-[320px] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{rawJson}</pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface Props {
  campaignId: string
}

export function CampaignDetailContent({ campaignId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const canSync = hasScreenFunction("s-meta-campaigns", "edit")
  const numericCampaignId = Number(campaignId)
  const [syncing, setSyncing] = useState(false)

  const { data: detail, loading, error, refetch } = useApi(
    () => metaCampaignsApi.getById(numericCampaignId),
    {
      enabled: Number.isFinite(numericCampaignId) && numericCampaignId > 0,
      cacheKey: `meta-campaign:${numericCampaignId}`,
    }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading campaign detail...
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="py-24 text-center text-sm text-red-600">
        {error?.message ?? "Meta campaign not found."}
      </div>
    )
  }

  const appHref = detail.appId ? `/apps/${detail.appId}` : undefined

  const handleSync = async () => {
    try {
      setSyncing(true)
      const result = await metaCampaignsApi.syncOne(numericCampaignId)
      invalidateCache(`meta-campaign:${numericCampaignId}`)
      await refetch()
      toast({
        title: "Campaign synced",
        description: `${result.campaignsSynced} campaign, ${result.adSetsSynced} ad sets, ${result.adsSynced} ads, ${result.creativesSynced} creatives refreshed.`,
      })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Campaign sync failed."
      toast({ title: "Sync failed", description: message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <nav className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
          <Link href="/meta-ads/campaigns" className="hover:text-slate-700">
            Meta Ads
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/meta-ads/campaigns" className="hover:text-slate-700">
            Campaigns
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-slate-900">{detail.externalCampaignId}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/meta-ads/campaigns")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold text-slate-900">{detail.name}</h1>
              <Badge className={cn("border", getStatusBadgeClass(detail.effectiveStatus))}>{toTitleCase(detail.effectiveStatus)}</Badge>
              <Badge className={cn("border", getStatusBadgeClass(detail.status))}>{toTitleCase(detail.status)}</Badge>
              {detail.isUnmapped ? <Badge className="border border-amber-200 bg-amber-50 text-amber-700">Unmapped Meta App</Badge> : null}
              {detail.isSyncStale ? <Badge className="border border-amber-200 bg-amber-50 text-amber-700">Stale Sync</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-4 pl-11 text-xs text-slate-500">
              <span>
                Meta Campaign ID: <strong className="font-mono text-slate-700">{detail.externalCampaignId}</strong>
              </span>
              <span>
                Source: <strong className="text-slate-700">{getSourceLabel(detail.source)}</strong>
              </span>
              <span>
                Ad Sets: <strong className="text-slate-700">{detail.adSets.length}</strong>
              </span>
              <span>
                Ads: <strong className="text-slate-700">{detail.ads.length}</strong>
              </span>
              <span>
                Creatives: <strong className="text-slate-700">{detail.creatives.length}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canSync ? (
              <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync This Campaign
              </Button>
            ) : null}
            {detail.createdFromRequestId ? (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/meta-ads/requests/${detail.createdFromRequestId}`}>
                  <Link2 className="h-4 w-4" />
                  Open Request
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {detail.isUnmapped ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">This campaign is not attached to an internal app mapping</p>
            <p className="text-sm text-amber-700">The campaign can still be monitored, but app-linked workflows will remain limited until mapping is resolved.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Campaign Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                <DetailField label="Campaign Name" value={detail.name} />
                <DetailField label="Meta Campaign ID" value={detail.externalCampaignId} mono />
                <DetailField label="Objective" value={toTitleCase(detail.objective)} />
                <DetailField label="Source" value={getSourceLabel(detail.source)} />
                <DetailField label="Status" value={toTitleCase(detail.status)} />
                <DetailField label="Effective Status" value={toTitleCase(detail.effectiveStatus)} />
                <DetailField label="Created" value={formatDateTime(detail.createdAt)} />
                <DetailField label="Updated" value={formatDateTime(detail.updatedAt)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Campaign Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                <DetailField label="Objective" value={toTitleCase(detail.objective)} />
                <DetailField label="Buying Type" value={toTitleCase(detail.buyingType)} />
                <DetailField label="Bid Strategy" value={toTitleCase(detail.bidStrategy)} />
                <DetailField label="Daily Budget" value={formatRawValue(detail.dailyBudget)} mono />
                <DetailField label="Lifetime Budget" value={formatRawValue(detail.lifetimeBudget)} mono />
                <DetailField label="Spend Cap" value={formatRawValue(detail.spendCap)} mono />
                <DetailField label="Start Time" value={formatDateTime(detail.startTime)} />
                <DetailField label="Stop Time" value={formatDateTime(detail.stopTime)} />
                <DetailField label="Special Ad Categories" value={formatList(detail.specialAdCategories)} />
                <DetailField label="Status" value={toTitleCase(detail.status)} />
                <DetailField label="Effective Status" value={toTitleCase(detail.effectiveStatus)} />
              </div>
            </CardContent>
          </Card>

          {detail.issuesInfoSummary || detail.recommendationsSummary ? (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Configuration Warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detail.issuesInfoSummary ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-amber-700">Issues Info</div>
                    <div className="mt-2 text-sm text-amber-900">{detail.issuesInfoSummary}</div>
                  </div>
                ) : null}
                {detail.recommendationsSummary ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-blue-700">Recommendations</div>
                    <div className="mt-2 text-sm text-blue-900">{detail.recommendationsSummary}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Ad Set Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <AdSetConfigurationTable items={detail.adSets} />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">App and Account Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">Resolved App</div>
                {detail.isUnmapped || !detail.appDisplayName ? (
                  <div className="text-sm text-slate-500">No internal app mapping resolved.</div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                      <AvatarImage src={detail.appIconUri || "/placeholder.svg"} alt={detail.appDisplayName} className="rounded-lg object-cover" />
                      <AvatarFallback className="rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {getInitials(detail.appDisplayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      {appHref ? (
                        <Link href={appHref} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
                          {detail.appDisplayName}
                        </Link>
                      ) : (
                        <div className="font-medium text-slate-900">{detail.appDisplayName}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {detail.platform ? <span>{toTitleCase(detail.platform)}</span> : null}
                        {detail.appId ? <span className="font-mono">{detail.appId}</span> : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                <DetailField label="Ad Account" value={detail.metaAdAccountName ?? detail.metaAdAccountId} />
                <DetailField label="Meta Ad Account ID" value={formatPrefixedIdentifier(detail.metaAdAccountId, "act")} mono />
                <DetailField label="Business ID" value={formatPrefixedIdentifier(detail.businessId, "biz")} mono />
                <DetailField label="Business Name" value={detail.businessName ?? "-"} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Sync Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Last Synced</div>
              <div className="mt-1 text-base font-semibold text-slate-900">{formatRelativeTime(detail.lastSyncedAt)}</div>
              <div className="mt-1 text-sm text-slate-500">{formatDateTime(detail.lastSyncedAt)}</div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Layers3 className="h-4 w-4 text-slate-500" />
                  Ad Sets
                </div>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{detail.adSets.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Boxes className="h-4 w-4 text-slate-500" />
                  Ads
                </div>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{detail.ads.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Palette className="h-4 w-4 text-slate-500" />
                  Creatives
                </div>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{detail.creatives.length}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900">Health</div>
              <div className="mt-1">{detail.isSyncStale ? "Campaign data is stale. Run a sync from the campaigns list." : "Campaign data is within the normal sync freshness window."}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900">Structure Drilldown</CardTitle>
            <div className="text-xs text-slate-500">Read-only view of synced child objects from Meta.</div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="adsets" className="space-y-4">
            <TabsList className="h-11 w-fit bg-slate-100 p-1">
              <TabsTrigger value="adsets" className="gap-2 px-4 data-[state=active]:bg-white">
                Ad Sets
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">{detail.adSets.length}</span>
              </TabsTrigger>
              <TabsTrigger value="ads" className="gap-2 px-4 data-[state=active]:bg-white">
                Ads
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">{detail.ads.length}</span>
              </TabsTrigger>
              <TabsTrigger value="creatives" className="gap-2 px-4 data-[state=active]:bg-white">
                Creatives
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">{detail.creatives.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="adsets" className="mt-0">
              <AdSetTable items={detail.adSets} />
            </TabsContent>
            <TabsContent value="ads" className="mt-0">
              <AdTable items={detail.ads} />
            </TabsContent>
            <TabsContent value="creatives" className="mt-0">
              <CreativeTable items={detail.creatives} campaignId={numericCampaignId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
