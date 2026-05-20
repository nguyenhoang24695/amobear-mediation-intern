"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, FilePlus2, ImageIcon, Loader2, Megaphone, PlayCircle, RefreshCw, XCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { tiktokCampaignsApi } from "@/lib/api/tiktok-ads"
import type { TikTokCampaignAdGroupSummaryDto, TikTokCampaignAdSummaryDto, TikTokCampaignDetailDto, TikTokCampaignDuplicateReadinessResultDto } from "@/types/tiktok-ads"

function statusTone(value?: string | null) {
  const normalized = (value || "").toUpperCase()
  if (["ENABLE", "ACTIVE", "COMPLETED"].includes(normalized)) return "bg-emerald-50 text-emerald-700"
  if (["DISABLE", "PAUSED"].includes(normalized)) return "bg-amber-50 text-amber-700"
  if (["FAILED", "DELETED", "ARCHIVED", "DISAPPROVED", "WITH_ISSUES"].includes(normalized)) return "bg-rose-50 text-rose-700"
  return "bg-slate-100 text-slate-700"
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

function toTitleCase(value?: string | null) {
  if (!value) return "-"
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

function formatNumber(value?: number | null) {
  return typeof value === "number" ? value.toLocaleString() : "-"
}

function formatMoney(value?: number | null) {
  return typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : "-"
}

function formatPercent(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "-"
}

function buildTikTokCampaignUrl(advertiserId?: string | null, campaignId?: string | null): string | null {
  const adv = advertiserId?.trim()
  const campaign = campaignId?.trim()
  if (!adv || !campaign) return null
  return `https://ads.tiktok.com/i18n/perf/campaign?aadvid=${encodeURIComponent(adv)}&campaign_id=${encodeURIComponent(campaign)}`
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 break-words">{value ?? "-"}</p>
    </div>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

function AppCell({ appDisplayName, appId, platform, appIconUri }: { appDisplayName?: string | null; appId?: string | null; platform?: string | null; appIconUri?: string | null }) {
  if (!appDisplayName && !appId) return <Badge className="bg-amber-50 text-amber-700">Unmapped</Badge>
  const title = (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-slate-900">{appDisplayName ?? appId}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {platform ? <span>{toTitleCase(platform)}</span> : null}
        {appId ? <span className="font-mono">{appId}</span> : null}
      </div>
    </div>
  )
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
        <AvatarImage src={appIconUri || "/placeholder.svg"} alt={appDisplayName ?? appId ?? "App"} className="rounded-lg object-cover" />
        <AvatarFallback className="rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">{getInitials(appDisplayName ?? appId)}</AvatarFallback>
      </Avatar>
      {appId ? <Link href={`/apps/${encodeURIComponent(appId)}`} className="min-w-0 hover:underline">{title}</Link> : title}
    </div>
  )
}

function AdGroupTextList({ texts }: { texts?: string[] | null }) {
  const rows = (texts ?? []).map((item) => item.trim()).filter(Boolean)
  if (rows.length === 0) return <span className="text-sm text-slate-400">No ad texts synced</span>
  return (
    <div className="space-y-1">
      {rows.map((text, index) => (
        <div key={`${index}-${text}`} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
          <span className="mr-1 font-semibold text-slate-500">#{index + 1}</span>{text}
        </div>
      ))}
    </div>
  )
}
function AdGroupsTable({ rows }: { rows: TikTokCampaignAdGroupSummaryDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead>Name</TableHead>
          <TableHead>Ad Group ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ad Texts</TableHead>
          <TableHead>Budget</TableHead>
          <TableHead>Optimization</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>App</TableHead>
          <TableHead>Last Synced</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-slate-500">No ad groups synced for this campaign.</TableCell></TableRow>
        ) : rows.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium text-slate-900">{item.name || item.tikTokAdGroupId}</TableCell>
            <TableCell className="font-mono text-xs text-slate-500">{item.tikTokAdGroupId}</TableCell>
            <TableCell><Badge className={statusTone(item.status)}>{item.status || "UNKNOWN"}</Badge></TableCell>
            <TableCell className="min-w-[280px]"><AdGroupTextList texts={item.adTexts} /></TableCell>
            <TableCell>
              <div className="text-sm text-slate-700">{formatMoney(item.budget)}</div>
              <div className="text-xs text-slate-500">{item.budgetMode ?? "-"}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm text-slate-700">{item.optimizationGoal ?? "-"}</div>
              <div className="text-xs text-slate-500">{[item.bidType, item.bid ? formatMoney(item.bid) : null, item.billingEvent].filter(Boolean).join(" / ")}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm text-slate-700">{item.scheduleType ?? "-"}</div>
              <div className="text-xs text-slate-500">{[formatDateTime(item.scheduleStartTime), formatDateTime(item.scheduleEndTime)].filter((value) => value !== "-").join(" -> ") || "-"}</div>
            </TableCell>
            <TableCell><AppCell appDisplayName={item.appDisplayName} appId={item.appId} platform={item.platform} /></TableCell>
            <TableCell className="text-sm text-slate-600">{formatDateTime(item.lastSyncedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function formatDimensions(width?: number | null, height?: number | null) {
  return width && height ? `${width}x${height}` : ""
}

function formatDuration(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(1)}s` : ""
}

function CreativePreview({ item, onPreviewVideo }: { item: TikTokCampaignAdSummaryDto; onPreviewVideo: (item: TikTokCampaignAdSummaryDto) => void }) {
  const image = item.creativeMedia?.images?.[0]
  const video = item.creativeMedia?.videos?.[0]
  const hasIds = (item.videoIds?.length ?? 0) > 0 || Boolean(item.videoId) || item.imageIds.length > 0

  if (!image && !video && !hasIds) return <span className="text-sm text-slate-400">No media</span>

  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        {video?.videoCoverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.videoCoverUrl} alt={video.fileName || item.name} className="h-full w-full object-cover" />
        ) : image?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.imageUrl} alt={image.fileName || item.name} className="h-full w-full object-cover" />
        ) : video ? (
          <PlayCircle className="h-5 w-5 text-slate-400" />
        ) : (
          <ImageIcon className="h-5 w-5 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.adFormat ? <Badge variant="outline" className="text-[10px]">{item.adFormat}</Badge> : null}
          {video?.displayable === false || image?.displayable === false ? <Badge className="bg-amber-50 text-amber-700">Not displayable</Badge> : null}
        </div>
        <div className="truncate text-sm font-medium text-slate-900">{video?.fileName || image?.fileName || item.videoIds?.[0] || item.videoId || item.imageIds[0] || "-"}</div>
        <div className="truncate font-mono text-xs text-slate-500">{video?.videoId || image?.imageId || item.videoIds?.[0] || item.videoId || item.imageIds[0]}</div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {video ? <span>{formatDuration(video.duration)}</span> : null}
          <span>{formatDimensions(video?.width ?? image?.width, video?.height ?? image?.height)}</span>
          {item.callToAction ? <span>{item.callToAction}</span> : null}
        </div>
        {item.creativeMedia?.errorMessage ? <div className="text-xs text-amber-700">{item.creativeMedia.errorMessage}</div> : null}
        <div className="flex flex-wrap gap-2">
          {video?.previewUrl ? (
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onPreviewVideo(item)}>
              <PlayCircle className="mr-1 h-3.5 w-3.5" />Preview video
            </Button>
          ) : null}
          {image?.imageUrl ? (
            <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
              <a href={image.imageUrl} target="_blank" rel="noreferrer noopener"><ExternalLink className="mr-1 h-3.5 w-3.5" />Open image</a>
            </Button>
          ) : null}
          {item.landingPageUrl ? (
            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
              <a href={item.landingPageUrl} target="_blank" rel="noreferrer noopener">Landing page</a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AdsTable({ rows, adGroups }: { rows: TikTokCampaignAdSummaryDto[]; adGroups: TikTokCampaignAdGroupSummaryDto[] }) {
  const [previewAd, setPreviewAd] = useState<TikTokCampaignAdSummaryDto | null>(null)
  const previewVideo = previewAd?.creativeMedia?.videos?.[0]
  const adsByAdGroup = rows.reduce<Record<number, TikTokCampaignAdSummaryDto[]>>((acc, item) => {
    acc[item.tikTokAdGroupRowId] ??= []
    acc[item.tikTokAdGroupRowId].push(item)
    return acc
  }, {})
  const adGroupsWithAds = adGroups.filter((group) => (adsByAdGroup[group.id]?.length ?? 0) > 0)

  return (
    <>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">No ads synced for this campaign.</div>
      ) : (
        <div className="space-y-4 p-4">
          {adGroupsWithAds.map((group) => {
            const groupAds = adsByAdGroup[group.id] ?? []
            return (
              <Card key={group.id} className="border-slate-200 shadow-sm">
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{group.name || group.tikTokAdGroupId}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge className={statusTone(group.status)}>{group.status || "UNKNOWN"}</Badge>
                        <span className="font-mono">{group.tikTokAdGroupId}</span>
                        <span>{groupAds.length} video/image assets</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{group.optimizationGoal ?? "-"}</div>
                      <div>{[group.bidType, group.billingEvent].filter(Boolean).join(" / ") || "-"}</div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ad texts shared by this ad set</p>
                    <AdGroupTextList texts={group.adTexts} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead>Video / Image Asset</TableHead>
                        <TableHead>Ad ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>App</TableHead>
                        <TableHead>Last Synced</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupAds.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{item.name || item.tikTokAdId}</div>
                              <CreativePreview item={item} onPreviewVideo={setPreviewAd} />
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{item.tikTokAdId}</TableCell>
                          <TableCell><Badge className={statusTone(item.status)}>{item.status || "UNKNOWN"}</Badge></TableCell>
                          <TableCell><AppCell appDisplayName={item.appDisplayName} appId={item.appId} platform={item.platform} /></TableCell>
                          <TableCell className="text-sm text-slate-600">{formatDateTime(item.lastSyncedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(previewVideo?.previewUrl)} onOpenChange={(open) => { if (!open) setPreviewAd(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.fileName || previewAd?.name || "TikTok video preview"}</DialogTitle>
            <DialogDescription>
              {previewVideo?.previewUrlExpireTime ? `Preview URL expires at ${formatDateTime(previewVideo.previewUrlExpireTime)}.` : "Temporary TikTok preview URL."}
            </DialogDescription>
          </DialogHeader>
          {previewVideo?.previewUrl ? (
            <video src={previewVideo.previewUrl} poster={previewVideo.videoCoverUrl ?? undefined} controls className="max-h-[70vh] w-full rounded-md bg-black" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function TikTokCampaignDetailContent({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const canSync = hasScreenFunction("s-tiktok-campaigns", "edit")
  const canDuplicate = hasScreenFunction("s-tiktok-campaigns", "edit")
  const numericCampaignId = Number(campaignId)
  const [detail, setDetail] = useState<TikTokCampaignDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [checkingReadiness, setCheckingReadiness] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [duplicatingToRequest, setDuplicatingToRequest] = useState(false)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const [readiness, setReadiness] = useState<TikTokCampaignDuplicateReadinessResultDto | null>(null)
  const [duplicateError, setDuplicateError] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const nextDetail = await tiktokCampaignsApi.getById(numericCampaignId)
      setDetail(nextDetail)
    } catch (ex: any) {
      setError(ex.message ?? "Failed to load TikTok campaign.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(numericCampaignId)) {
      setError("Invalid TikTok campaign id.")
      setLoading(false)
      return
    }
    setReadiness(null)
    setDuplicateError("")
    setDuplicateConfirmOpen(false)
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericCampaignId])

  const sync = async () => {
    if (!detail) return
    try {
      setSyncing(true)
      const result = await tiktokCampaignsApi.sync({ tikTokAdAccountIds: [detail.tikTokAdAccountRowId] })
      await load()
      toast({
        title: "TikTok account synced",
        description: `${result.accountsScanned} account(s), ${result.rowsWritten} row(s), ${result.failedAccounts} failed.`,
        variant: result.failedAccounts > 0 ? "destructive" : "default",
      })
    } catch (ex: any) {
      toast({ title: "Sync failed", description: ex.message ?? "TikTok campaign sync failed.", variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const checkDuplicateReadiness = async () => {
    if (!detail) return
    try {
      setCheckingReadiness(true)
      setDuplicateError("")
      const result = await tiktokCampaignsApi.checkDuplicateReadiness(numericCampaignId)
      setReadiness(result)
      toast({
        title: result.isReady ? "Ready to duplicate" : "Duplicate readiness failed",
        description: result.summary,
        variant: result.isReady ? "default" : "destructive",
      })
    } catch (ex: any) {
      toast({ title: "Readiness check failed", description: ex.message ?? "Failed to check TikTok duplicate readiness.", variant: "destructive" })
      setReadiness(null)
    } finally {
      setCheckingReadiness(false)
    }
  }

  const duplicate = async () => {
    if (!detail || readiness?.isReady !== true) return
    try {
      setDuplicating(true)
      setDuplicateError("")
      const result = await tiktokCampaignsApi.duplicate(numericCampaignId)
      if (!result.success) {
        const message = result.message || "TikTok campaign duplicate failed."
        setDuplicateError(message)
        toast({ title: "Duplicate failed", description: message, variant: "destructive" })
        return
      }
      toast({
        title: "Campaign duplicated",
        description: `${result.createdAdGroupCount} ad group(s), ${result.createdAdCount} ad(s) created as disabled.`,
      })
      setDuplicateConfirmOpen(false)
      if (result.newLocalCampaignId) {
        router.push(`/tiktok-ads/campaigns/${result.newLocalCampaignId}`)
      } else {
        await load()
      }
    } catch (ex: any) {
      const message = ex.message ?? "TikTok campaign duplicate failed."
      setDuplicateError(message)
      toast({ title: "Duplicate failed", description: message, variant: "destructive" })
    } finally {
      setDuplicating(false)
    }
  }
  const duplicateToRequest = async () => {
    if (!detail) return
    try {
      setDuplicatingToRequest(true)
      const result = await tiktokCampaignsApi.duplicateToRequest(numericCampaignId)
      if (!result.success) {
        toast({ title: "Create request failed", description: result.message || "TikTok campaign duplicate to request failed.", variant: "destructive" })
        return
      }
      toast({
        title: "Request draft created",
        description: `${result.copiedAdGroupCount} adset(s), ${result.copiedAdCount} ad(s) copied to request #${result.requestId}.`,
      })
      router.push(result.requestUrl || `/tiktok-ads/requests/${result.requestId}/edit`)
    } catch (ex: any) {
      toast({ title: "Create request failed", description: ex.message ?? "TikTok campaign duplicate to request failed.", variant: "destructive" })
    } finally {
      setDuplicatingToRequest(false)
    }
  }

  const tiktokUrl = detail ? buildTikTokCampaignUrl(detail.advertiserId, detail.tikTokCampaignId) : null

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading TikTok campaign...</div>
  if (error || !detail) return <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error || "TikTok campaign not found."}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0 text-slate-600">
            <Link href="/tiktok-ads/campaigns"><ArrowLeft className="mr-2 h-4 w-4" />Back to campaigns</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-50 p-2">
              <Megaphone className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{detail.name || detail.tikTokCampaignId}</h1>
              <p className="font-mono text-xs text-slate-500">{detail.tikTokCampaignId}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className={statusTone(detail.status)}>{detail.status || "UNKNOWN"}</Badge>
                {detail.secondaryStatus ? <Badge className="bg-slate-100 text-slate-700">{detail.secondaryStatus}</Badge> : null}
                {detail.isUnmapped ? <Badge className="bg-amber-50 text-amber-700">Unmapped</Badge> : null}
                {detail.isSyncStale ? <Badge className="bg-amber-50 text-amber-700">Stale sync</Badge> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tiktokUrl ? (
            <Button asChild variant="outline">
              <a href={tiktokUrl} target="_blank" rel="noreferrer noopener"><ExternalLink className="mr-2 h-4 w-4" />Open in TikTok</a>
            </Button>
          ) : null}
          {canDuplicate ? (
            <>
              <Button variant="outline" onClick={() => void checkDuplicateReadiness()} disabled={checkingReadiness || duplicating || syncing}>
                {checkingReadiness ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Check Duplicate Readiness
              </Button>
              <Button variant="outline" onClick={() => void duplicateToRequest()} disabled={duplicatingToRequest || duplicating || syncing}>
                {duplicatingToRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                Duplicate To Request
              </Button>
              <Button variant="outline" onClick={() => setDuplicateConfirmOpen(true)} disabled={duplicating || syncing || readiness?.isReady !== true}>
                {duplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                Duplicate Campaign
              </Button>
            </>
          ) : null}
          {canSync ? (
            <Button className="bg-cyan-600 text-white hover:bg-cyan-700" onClick={sync} disabled={syncing || duplicating}>
              {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync Account
            </Button>
          ) : null}
        </div>
      </div>

      {readiness ? (
        <Card className={readiness.isReady ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              {readiness.isReady ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <XCircle className="h-4 w-4 text-rose-700" />}
              Duplicate Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{readiness.summary}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {readiness.checks.map((check) => (
                <div key={check.key} className="flex items-start gap-2 rounded-md border border-white/70 bg-white/70 p-2 text-sm">
                  {check.isReady ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />}
                  <div>
                    <div className="font-medium text-slate-900">{check.label}</div>
                    <div className="text-xs text-slate-600">{check.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Campaign Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="Name" value={detail.name} />
              <InfoItem label="TikTok Campaign ID" value={detail.tikTokCampaignId} />
              <InfoItem label="Objective" value={detail.objective} />
              <InfoItem label="Status" value={detail.status || "UNKNOWN"} />
              <InfoItem label="Secondary Status" value={detail.secondaryStatus} />
              <InfoItem label="Source" value={detail.source === "request" ? "Request" : "Sync"} />
              <InfoItem label="TikTok Created" value={formatDateTime(detail.tikTokCreatedAt)} />
              <InfoItem label="TikTok Modified" value={formatDateTime(detail.tikTokModifiedAt)} />
              <InfoItem label="Last Synced" value={formatDateTime(detail.lastSyncedAt)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Sync Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <InfoItem label="Ad Groups" value={detail.adGroupCount} />
              <InfoItem label="Ads" value={detail.adCount} />
              <InfoItem label="Request ID" value={detail.createdFromRequestId ? `#${detail.createdFromRequestId}` : "-"} />
              <InfoItem label="Local Updated" value={formatDateTime(detail.updatedAt)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Campaign Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <InfoItem label="Budget" value={formatMoney(detail.budget)} />
              <InfoItem label="Budget Mode" value={detail.budgetMode} />
              <InfoItem label="App Promotion Type" value={detail.appPromotionType} />
              <InfoItem label="Operation Status" value={detail.status} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">App & Account Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">App</p>
                <AppCell appDisplayName={detail.appDisplayName} appId={detail.appId} platform={detail.platform} appIconUri={detail.appIconUri} />
              </div>
              <div className="grid gap-4">
                <InfoItem label="Ad Account" value={detail.tikTokAdAccountName ?? detail.advertiserId} />
                <InfoItem label="Advertiser ID" value={detail.advertiserId} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Performance ({formatDateTime(detail.performanceStartDate)} - {formatDateTime(detail.performanceEndDate)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Spend" value={formatMoney(detail.performance?.spend)} />
            <MetricCard label="Impressions" value={formatNumber(detail.performance?.impressions)} />
            <MetricCard label="Clicks" value={formatNumber(detail.performance?.clicks)} />
            <MetricCard label="Conversions" value={formatNumber(detail.performance?.conversions)} />
            <MetricCard label="MMP Installs" value={formatNumber(detail.performance?.mmpInstalls)} />
            <MetricCard label="TikTok Installs" value={formatNumber(detail.performance?.tikTokReportedInstalls)} />
            <MetricCard label="CPI" value={formatMoney(detail.performance?.cpi)} />
            <MetricCard label="CPC" value={formatMoney(detail.performance?.cpc)} />
            <MetricCard label="CPM" value={formatMoney(detail.performance?.cpm)} />
            <MetricCard label="CTR" value={formatPercent(detail.performance?.ctr)} />
            <MetricCard label="Cost / Conversion" value={formatMoney(detail.performance?.costPerConversion)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="adgroups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="adgroups">Ad Groups ({detail.adGroups.length})</TabsTrigger>
          <TabsTrigger value="ads">Ads ({detail.ads.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="adgroups" className="rounded-md border bg-white">
          <AdGroupsTable rows={detail.adGroups} />
        </TabsContent>
        <TabsContent value="ads" className="rounded-md border bg-white">
          <AdsTable rows={detail.ads} adGroups={detail.adGroups} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate TikTok Campaign?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>This will create a disabled copy of this campaign in TikTok, including synced ad groups and ads.</p>
                <div className="min-w-0 max-w-full overflow-hidden rounded-md bg-slate-50 px-3 py-2">
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Campaign name</span>
                  <span className="block max-h-20 max-w-full overflow-auto break-all font-semibold text-slate-700">{detail.name}</span>
                </div>
                <p>Only campaigns that passed readiness check can be duplicated.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {readiness ? <p className="min-w-0 break-words text-sm text-slate-600">{readiness.summary}</p> : null}
          {duplicateError ? <div className="min-w-0 break-words rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{duplicateError}</div> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={duplicating || readiness?.isReady !== true} onClick={(event) => { event.preventDefault(); void duplicate() }}>
              {duplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              Duplicate Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}












