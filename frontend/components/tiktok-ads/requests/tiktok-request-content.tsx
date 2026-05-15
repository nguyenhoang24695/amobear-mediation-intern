"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Braces, Bug, CheckCircle2, ChevronDown, Clock, Copy, Loader2, Play, RefreshCw, Send, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { tiktokCampaignRequestsApi, tiktokReferenceApi } from "@/lib/api/tiktok-ads"
import { copyTextToClipboard } from "@/lib/utils"
import { CreateTikTokRequestContent } from "@/components/tiktok-ads/create-request/create-request-content"
import type { TikTokCampaignRequestDetailDto, TikTokCampaignRequestListItemDto, TikTokOperationLogDto, TikTokReferenceResponseDto } from "@/types/tiktok-ads"
import { createDefaultTikTokRequestForm, normalizeTikTokRequestPayloadShape, sanitizeTikTokRequestForm, type TikTokRequestFormState } from "@/components/tiktok-ads/create-request/types"

const SCREEN = "s-tiktok-requests"

function tone(status?: string) {
  const value = (status ?? "").toLowerCase()
  if (["completed", "approved"].includes(value)) return "bg-emerald-50 text-emerald-700"
  if (["failed", "rejected"].includes(value)) return "bg-rose-50 text-rose-700"
  if (["pending_approval", "executing"].includes(value)) return "bg-amber-50 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

function canEditRequestStatus(status?: string | null) {
  return ["draft", "failed", "rejected"].includes((status ?? "").toLowerCase())
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString()
}

function formatOperationAction(log: TikTokOperationLogDto): string {
  const raw = (log.action ?? log.step ?? "operation").trim()
  if (!raw) return "Operation"
  return raw
    .replaceAll("_", " ")
    .replaceAll("/", " / ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatStepLabel(step?: string | null): string {
  if (!step?.trim()) return "-"
  return step.replaceAll("_", " ").toUpperCase()
}

function formatLogStatusLabel(status?: string | null): string {
  switch (status) {
    case "succeeded":
      return "Succeeded"
    case "failed":
      return "Failed"
    case "skipped":
      return "Skipped"
    default:
      return status ? status.replaceAll("_", " ") : "Started"
  }
}

function getLogStatusClasses(status?: string | null): string {
  if (status === "succeeded") return "bg-green-100 text-green-700"
  if (status === "failed") return "bg-red-100 text-red-700"
  if (status === "skipped") return "bg-slate-100 text-slate-600"
  return "bg-amber-100 text-amber-700"
}

function getLogStatusIcon(status?: string | null) {
  if (status === "succeeded") return <CheckCircle2 className="h-4 w-4 text-green-600" />
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />
  return <Clock className="h-4 w-4 text-slate-400" />
}

function tryFormatJson(value?: string | null): string {
  if (!value?.trim()) return ""
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value.trim()
  }
}

function buildOperationSummary(log: TikTokOperationLogDto): string {
  const parts = [
    log.summaryMessage?.trim(),
    log.errorMessage?.trim(),
    log.tikTokErrorCode ? `TikTok error: ${log.tikTokErrorCode}` : null,
  ].filter((part): part is string => !!part)
  return parts.length > 0 ? parts.join("\n") : ""
}

function hasLogDebugPayload(log: TikTokOperationLogDto): boolean {
  return !!(log.requestJson?.trim() || log.responseJson?.trim() || log.errorMessage?.trim())
}

function parseRequestPayload(detail: TikTokCampaignRequestDetailDto | null): TikTokRequestFormState | null {
  if (!detail) return null
  const fallback = createDefaultTikTokRequestForm(null)

  try {
    const parsed = normalizeTikTokRequestPayloadShape(JSON.parse(detail.payloadJson || "{}"))
    return sanitizeTikTokRequestForm({
      ...fallback,
      ...parsed,
      idempotencyKey: parsed.idempotencyKey ?? detail.idempotencyKey ?? fallback.idempotencyKey,
      campaign: { ...fallback.campaign, ...parsed.campaign },
      adGroup: { ...fallback.adGroup, ...parsed.adGroup },
      ad: { ...fallback.ad, ...(parsed.ads?.[0] ?? parsed.ad) },
      ads: parsed.ads?.length ? parsed.ads.map((ad) => ({ ...fallback.ad, ...ad })) : [{ ...fallback.ad, ...parsed.ad }],
    })
  } catch {
    return sanitizeTikTokRequestForm({
      ...fallback,
      idempotencyKey: detail.idempotencyKey ?? fallback.idempotencyKey,
    })
  }
}

function getMediaLabel(payload: TikTokRequestFormState): string {
  const ads = payload.ads.length ? payload.ads : [payload.ad]
  if (ads.length > 1) return `${ads.length} video creatives`
  const ad = ads[0]
  const imageLabel = ad.imageAssetIds.length
    ? `cover image asset #${ad.imageAssetIds.join(", ")}`
    : ad.imageIds.length
      ? `cover image ${ad.imageIds.join(", ")}`
      : null
  if (ad.videoAssetId) return imageLabel ? `Uploaded video asset #${ad.videoAssetId} + ${imageLabel}` : `Uploaded video asset #${ad.videoAssetId}`
  if (ad.videoId) return imageLabel ? `TikTok video ${ad.videoId} + ${imageLabel}` : `TikTok video ${ad.videoId}`
  if (ad.imageAssetIds.length) return `Uploaded image asset #${ad.imageAssetIds.join(", ")}`
  if (ad.imageIds.length) return `TikTok images ${ad.imageIds.join(", ")}`
  return "No creative media"
}

export function TikTokRequestListContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokCampaignRequestListItemDto[]>([])
  const [reference, setReference] = useState<TikTokReferenceResponseDto | null>(null)
  const [status, setStatus] = useState("all")
  const [accountId, setAccountId] = useState("all")
  const [appRowId, setAppRowId] = useState("all")
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirm, setConfirm] = useState<{ action: "approve" | "reject" | "execute" | "retry"; item: TikTokCampaignRequestListItemDto } | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const canCreate = hasScreenFunction(SCREEN, "create")
  const canApprove = hasScreenFunction(SCREEN, "approve")
  const canExecute = hasScreenFunction(SCREEN, "execute")
  const canRetry = hasScreenFunction(SCREEN, "retry")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        status: status === "all" ? undefined : status,
        tiktokAdAccountId: accountId === "all" ? undefined : Number(accountId),
        appRowId: appRowId === "all" ? undefined : Number(appRowId),
      }
      const [list, ref] = await Promise.all([tiktokCampaignRequestsApi.getRequests(params), tiktokReferenceApi.getCreateCampaign()])
      setItems(list)
      setReference(ref)
    } catch (ex: any) {
      toast({ title: "Load TikTok requests failed", description: ex.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [accountId, appRowId, status, toast])

  useEffect(() => { void load() }, [load])

  const run = async () => {
    if (!confirm || actionLoading) return
    setActionLoading(true)
    try {
      if (confirm.action === "approve") await tiktokCampaignRequestsApi.approve(confirm.item.id, "Approved from TikTok request list.")
      if (confirm.action === "reject") await tiktokCampaignRequestsApi.reject(confirm.item.id, rejectReason || "Rejected from TikTok request list.")
      if (confirm.action === "execute" || confirm.action === "retry") {
        const result = confirm.action === "execute"
          ? await tiktokCampaignRequestsApi.execute(confirm.item.id, false)
          : await tiktokCampaignRequestsApi.retry(confirm.item.id, false)
        toast({
          title: result.success ? `TikTok request ${confirm.action} completed` : `TikTok request ${confirm.action} failed`,
          description: result.message ?? undefined,
          variant: result.success ? "default" : "destructive",
        })
      } else {
        toast({ title: `TikTok request ${confirm.action} completed` })
      }
      setConfirm(null)
      setRejectReason("")
      await load()
    } catch (ex: any) {
      toast({ title: `${confirm.action} failed`, description: ex.message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">TikTok Requests</h1>
          <p className="text-sm text-slate-500">Create, approve, and execute TikTok campaign requests.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          {canCreate ? <Button onClick={() => router.push("/tiktok-ads/requests/create")}><Send className="mr-2 h-4 w-4" />New Request</Button> : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-white p-3 md:grid-cols-3">
        <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{["all", "draft", "pending_approval", "approved", "executing", "completed", "failed", "rejected"].map(x => <SelectItem key={x} value={x}>{x === "all" ? "All statuses" : x}</SelectItem>)}</SelectContent></Select>
        <Select value={accountId} onValueChange={setAccountId}><SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem>{reference?.adAccounts.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name ?? x.advertiserId}</SelectItem>)}</SelectContent></Select>
        <Select value={appRowId} onValueChange={setAppRowId}><SelectTrigger><SelectValue placeholder="App" /></SelectTrigger><SelectContent><SelectItem value="all">All apps</SelectItem>{reference?.appMappings.map(x => <SelectItem key={x.appRowId} value={String(x.appRowId)}>{x.appDisplayName ?? x.appId ?? x.tikTokAppId}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Account</TableHead><TableHead>App</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">Loading requests...</TableCell></TableRow> : null}
            {!loading && items.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">No TikTok requests found.</TableCell></TableRow> : null}
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell><Link className="font-medium text-blue-700 hover:underline" href={`/tiktok-ads/requests/${item.id}`}>{item.campaignName || `Request #${item.id}`}</Link><p className="text-xs text-slate-500">{item.objective}</p></TableCell>
                <TableCell>{item.tikTokAdAccountName ?? item.tikTokAdAccountRowId}</TableCell>
                <TableCell>{item.appDisplayName ?? item.appId ?? item.appRowId}</TableCell>
                <TableCell><Badge className={tone(item.status)}>{item.status}</Badge></TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell className="space-x-2 text-right">
                  {canEditRequestStatus(item.status) && canCreate ? <Button size="sm" variant="outline" onClick={() => router.push(`/tiktok-ads/requests/${item.id}/edit`)}>Edit</Button> : null}
                  {item.status === "pending_approval" && canApprove ? <Button size="sm" variant="outline" onClick={() => setConfirm({ action: "approve", item })}><CheckCircle2 className="h-4 w-4" /></Button> : null}
                  {item.status === "pending_approval" && canApprove ? <Button size="sm" variant="outline" onClick={() => setConfirm({ action: "reject", item })}><XCircle className="h-4 w-4" /></Button> : null}
                  {item.status === "approved" && canExecute ? <Button size="sm" onClick={() => setConfirm({ action: "execute", item })}><Play className="h-4 w-4" /></Button> : null}
                  {item.status === "failed" && canRetry ? <Button size="sm" onClick={() => setConfirm({ action: "retry", item })}>Retry</Button> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && !actionLoading && setConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm {confirm?.action}</DialogTitle></DialogHeader>
          {confirm?.action === "reject" ? <div className="space-y-2"><Label>Reject reason</Label><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div> : <p className="text-sm text-slate-600">Apply this action to {confirm?.item.campaignName}?</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={actionLoading}>Cancel</Button>
            <Button onClick={() => void run()} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {actionLoading && confirm?.action === "execute" ? "Executing..." : actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TikTokRequestFormContent({ requestId }: { requestId?: number }) {
  return <CreateTikTokRequestContent requestId={requestId} />
}

export function TikTokRequestDetailContent({ requestId }: { requestId: number }) {
  const { toast } = useToast()
  const router = useRouter()
  const [detail, setDetail] = useState<TikTokCampaignRequestDetailDto | null>(null)
  const [confirm, setConfirm] = useState<"approve" | "reject" | "execute" | "retry" | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({})
  const payload = useMemo(() => parseRequestPayload(detail), [detail])
  const canApprove = hasScreenFunction(SCREEN, "approve")
  const canExecute = hasScreenFunction(SCREEN, "execute")
  const canRetry = hasScreenFunction(SCREEN, "retry")
  const canCreate = hasScreenFunction(SCREEN, "create")

  const load = useCallback(async () => {
    try { setDetail(await tiktokCampaignRequestsApi.getRequest(requestId)) }
    catch (ex: any) { toast({ title: "Load request failed", description: ex.message, variant: "destructive" }) }
  }, [requestId, toast])
  useEffect(() => { void load() }, [load])

  async function validate() {
    try {
      const result = await tiktokCampaignRequestsApi.validate(requestId)
      toast({ title: result.isValid ? "Validation passed" : "Validation failed", description: result.errors.join("; ") || undefined, variant: result.isValid ? "default" : "destructive" })
      await load()
    } catch (ex: any) { toast({ title: "Validate failed", description: ex.message, variant: "destructive" }) }
  }

  async function run() {
    if (!confirm || actionLoading) return
    setActionLoading(true)
    try {
      if (confirm === "approve") await tiktokCampaignRequestsApi.approve(requestId, "Approved from TikTok request detail.")
      if (confirm === "reject") await tiktokCampaignRequestsApi.reject(requestId, rejectReason || "Rejected from TikTok request detail.")
      if (confirm === "execute" || confirm === "retry") {
        const result = confirm === "execute"
          ? await tiktokCampaignRequestsApi.execute(requestId, false)
          : await tiktokCampaignRequestsApi.retry(requestId, false)
        toast({
          title: result.success ? `Request ${confirm} completed` : `Request ${confirm} failed`,
          description: result.message ?? undefined,
          variant: result.success ? "default" : "destructive",
        })
      } else {
        toast({ title: `Request ${confirm} completed` })
      }
      setConfirm(null)
      await load()
    } catch (ex: any) { toast({ title: `${confirm} failed`, description: ex.message, variant: "destructive" }) }
    finally { setActionLoading(false) }
  }

  async function handleCopy(label: string, value?: string | null) {
    if (!value?.trim()) {
      toast({ title: `${label} is empty`, variant: "destructive" })
      return
    }
    const copied = await copyTextToClipboard(value)
    toast({ title: copied ? `${label} copied` : `Copy ${label.toLowerCase()} failed`, variant: copied ? "default" : "destructive" })
  }

  if (!detail || !payload) return <div className="py-10 text-center text-sm text-slate-500">Loading request...</div>
  const mediaLabel = getMediaLabel(payload)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-900">{detail.campaignName || `Request #${detail.id}`}</h1><p className="text-sm text-slate-500">TikTok request detail and execution logs.</p></div>
        <div className="flex gap-2">
          {canEditRequestStatus(detail.status) && canCreate ? <Button variant="outline" onClick={() => router.push(`/tiktok-ads/requests/${detail.id}/edit`)}>Edit</Button> : null}
          {canCreate ? <Button variant="outline" onClick={() => void validate()}>Validate</Button> : null}
          {detail.status === "pending_approval" && canApprove ? <Button onClick={() => setConfirm("approve")}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button> : null}
          {detail.status === "pending_approval" && canApprove ? <Button variant="outline" onClick={() => setConfirm("reject")}><XCircle className="mr-2 h-4 w-4" />Reject</Button> : null}
          {detail.status === "approved" && canExecute ? <Button onClick={() => setConfirm("execute")}><Play className="mr-2 h-4 w-4" />Execute</Button> : null}
          {detail.status === "failed" && canRetry ? <Button onClick={() => setConfirm("retry")}>Retry</Button> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-md border bg-white p-4 lg:col-span-2"><h2 className="mb-3 font-semibold">Request Summary</h2><div className="grid gap-3 text-sm md:grid-cols-2"><Info label="Status" value={<Badge className={tone(detail.status)}>{detail.status}</Badge>} /><Info label="Account" value={detail.tikTokAdAccountName ?? detail.tikTokAdAccountRowId} /><Info label="App" value={detail.appDisplayName ?? detail.appId ?? detail.appRowId} /><Info label="Created" value={formatDate(detail.createdAt)} /><Info label="Campaign budget" value={payload.campaign.budget ?? "-"} /><Info label="Ad group budget" value={payload.adGroup.budget ?? "-"} /><Info label="Creative" value={mediaLabel} /><Info label="Ad text" value={payload.ads.length > 1 ? `${payload.ads.length} creative texts` : payload.ad.adText ?? "-"} /></div></section>
        <section className="rounded-md border bg-white p-4"><h2 className="mb-3 font-semibold">Lifecycle</h2><div className="space-y-2 text-sm"><Info label="Submitted" value={formatDate(detail.submittedAt)} /><Info label="Approved" value={formatDate(detail.approvedAt)} /><Info label="Executed" value={formatDate(detail.executedAt)} /><Info label="Failed" value={formatDate(detail.failedAt)} /></div></section>
      </div>

      {detail.validationErrors.length > 0 ? <section className="rounded-md border border-rose-200 bg-rose-50 p-4"><h2 className="mb-2 font-semibold text-rose-800">Validation Errors</h2><ul className="list-disc pl-5 text-sm text-rose-700">{detail.validationErrors.map((x, i) => <li key={i}>{x}</li>)}</ul></section> : null}

      <section className="rounded-md border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Operation Logs</h2>
          <Badge variant="outline" className="font-mono text-[10px] text-slate-500">{detail.operationLogs.length} step{detail.operationLogs.length === 1 ? "" : "s"}</Badge>
        </div>
        {detail.operationLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No logs yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute bottom-2 left-[13px] top-2 w-px bg-slate-200" />
            <div className="space-y-4">
              {detail.operationLogs.map((log) => {
                const expanded = !!expandedLogs[log.id]
                const formattedRequest = tryFormatJson(log.requestJson)
                const formattedResponse = tryFormatJson(log.responseJson)
                const formattedSummary = buildOperationSummary(log)

                return (
                  <div key={log.id} className="relative flex items-start gap-3">
                    <div className="relative z-10 flex-shrink-0 bg-white">{getLogStatusIcon(log.status)}</div>
                    <div className="min-w-0 flex-1 pb-1">
                      <Collapsible open={expanded} onOpenChange={(open) => setExpandedLogs((current) => ({ ...current, [log.id]: open }))}>
                        <div className={`rounded-md border px-4 py-3 ${log.status === "failed" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"}`}>
                          <CollapsibleTrigger className="w-full text-left">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{formatOperationAction(log)}</p>
                                  <Badge variant="outline" className="border-slate-300 font-mono text-[10px] text-slate-600">{formatStepLabel(log.step)}</Badge>
                                  <Badge className={`text-[10px] ${getLogStatusClasses(log.status)}`}>{formatLogStatusLabel(log.status)}</Badge>
                                  {log.httpStatusCode ? <Badge variant="outline" className="border-slate-300 font-mono text-[10px] text-slate-600">HTTP {log.httpStatusCode}</Badge> : null}
                                  {log.tikTokErrorCode ? <Badge variant="outline" className="border-slate-300 font-mono text-[10px] text-slate-600">TikTok {log.tikTokErrorCode}</Badge> : null}
                                </div>
                                <p className="text-xs text-slate-500">{log.summaryMessage ?? log.errorMessage ?? "No summary available."}</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                  <span>{formatDate(log.startedAt)}</span>
                                  <span>Attempt #{log.attemptNumber}</span>
                                  {log.resourcePath ? <span className="font-mono text-slate-500">{log.resourcePath}</span> : null}
                                  {log.correlationId ? <span className="font-mono">Correlation: {log.correlationId}</span> : null}
                                </div>
                              </div>
                              <ChevronDown className={`mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="pt-4">
                            <div className="grid gap-3 lg:grid-cols-3">
                              <OperationLogPanel
                                title="Request to TikTok"
                                icon={<Braces className="h-3.5 w-3.5" />}
                                value={formattedRequest}
                                emptyLabel="No request payload captured."
                                onCopy={() => void handleCopy("Request payload", formattedRequest)}
                              />
                              <OperationLogPanel
                                title="Response from TikTok"
                                icon={<Braces className="h-3.5 w-3.5" />}
                                value={formattedResponse}
                                emptyLabel={log.status === "failed" && log.errorMessage ? "Raw TikTok response was not captured for this failure." : "No response payload captured."}
                                onCopy={() => void handleCopy("Response payload", formattedResponse)}
                              />
                              <OperationLogPanel
                                title="Summary"
                                icon={<Bug className="h-3.5 w-3.5" />}
                                value={formattedSummary}
                                emptyLabel="No summary available."
                                onCopy={() => void handleCopy("Summary", formattedSummary)}
                                footer={
                                  <div className="space-y-1 text-[11px] text-slate-500">
                                    {log.tikTokErrorCode ? <p>Error code: <span className="font-mono text-slate-700">{log.tikTokErrorCode}</span></p> : null}
                                    {log.resourcePath ? <p>Endpoint: <span className="break-all font-mono text-slate-700">{log.resourcePath}</span></p> : null}
                                  </div>
                                }
                              />
                            </div>
                            {!hasLogDebugPayload(log) ? <p className="mt-3 text-[11px] text-slate-400">This operation log only contains minimal lifecycle data.</p> : null}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-white p-4"><h2 className="mb-3 font-semibold">Payload</h2><pre className="max-h-96 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(payload, null, 2)}</pre></section>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && !actionLoading && setConfirm(null)}>
        <DialogContent><DialogHeader><DialogTitle>Confirm {confirm}</DialogTitle></DialogHeader>{confirm === "reject" ? <div className="space-y-2"><Label>Reject reason</Label><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div> : <p className="text-sm text-slate-600">Apply this action to the request?</p>}<DialogFooter><Button variant="outline" onClick={() => setConfirm(null)} disabled={actionLoading}>Cancel</Button><Button onClick={() => void run()} disabled={actionLoading}>{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{actionLoading && confirm === "execute" ? "Executing..." : actionLoading ? "Processing..." : "Confirm"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}

function OperationLogPanel({
  title,
  icon,
  value,
  emptyLabel,
  onCopy,
  footer,
}: {
  title: string
  icon: ReactNode
  value?: string
  emptyLabel: string
  onCopy: () => void
  footer?: ReactNode
}) {
  const hasValue = !!value?.trim()

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-600">
          {icon}
          <span>{title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500" onClick={onCopy}>
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      <div className="space-y-3 p-3">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-100">
          {hasValue ? value : emptyLabel}
        </pre>
        {footer}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div><p className="text-xs font-medium uppercase text-slate-500">{label}</p><div className="mt-1 break-words text-slate-900">{value}</div></div>
}
