"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  ChevronRight, CheckCircle2, XCircle, Clock, PlayCircle,
  RefreshCw, AlertTriangle, ExternalLink, ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type RequestStatus = "draft" | "pending_approval" | "approved" | "rejected" | "executing" | "completed" | "failed"

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  executing: { label: "Executing", className: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
}

// Mock data for the detail view
const mockDetail = {
  id: "1",
  requestId: "REQ-0001",
  status: "completed" as RequestStatus,
  campaignName: "WeatherApp_US_Android_AppPromo_20260301",
  objective: "OUTCOME_APP_PROMOTION",
  app: "Weather Now (Android)",
  adAccount: "act_111222333",
  requestedBy: "john.doe",
  approvedBy: "jane.smith",
  createdAt: "2026-03-01 09:00",
  submittedAt: "2026-03-01 09:15",
  executedAt: "2026-03-02 10:00",
  // Payload summary
  buyingType: "AUCTION",
  countries: ["US", "CA"],
  ageRange: "18–65",
  gender: "ALL",
  placementMode: "AUTOMATIC",
  optimizationGoal: "APP_INSTALLS",
  budgetSummary: "$50/day campaign budget",
  creativeName: "WeatherApp_US_IMG_v1",
  facebookPageId: "123456789012345",
  headline: "Download Free Today",
  cta: "INSTALL_MOBILE_APP",
  adName: "WeatherApp_US_IMG_v1_Ad",
  // Created objects
  metaCampaignId: "23850000000000001",
  metaAdSetId: "23850000000000002",
  metaCreativeId: "23850000000000003",
  metaAdId: "23850000000000004",
  // Logs
  logs: [
    { step: "Validation", status: "success", attempt: 1, timestamp: "2026-03-02 09:58", error: "" },
    { step: "Campaign", status: "success", attempt: 1, timestamp: "2026-03-02 10:00", error: "" },
    { step: "Ad Set", status: "success", attempt: 1, timestamp: "2026-03-02 10:01", error: "" },
    { step: "Creative", status: "success", attempt: 1, timestamp: "2026-03-02 10:02", error: "" },
    { step: "Ad", status: "success", attempt: 1, timestamp: "2026-03-02 10:03", error: "" },
  ],
}

type LogStatus = "success" | "error" | "pending"

const logStatusIcon: Record<LogStatus, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  pending: <Clock className="w-4 h-4 text-slate-400" />,
}

interface Props { requestId: string }

export function RequestDetailContent({ requestId }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  // Guard: "create" is a static route — should never land here
  if (requestId === "create") {
    router.replace("/meta-ads/requests/create")
    return null
  }

  const [status, setStatus] = useState<RequestStatus>(mockDetail.status)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const handleAction = async (action: string) => {
    setConfirmAction(null)
    await new Promise(r => setTimeout(r, 1000))
    const map: Record<string, RequestStatus> = { approve: "approved", reject: "rejected", execute: "executing", retry: "executing" }
    setStatus(map[action] || status)
    const labels: Record<string, string> = { approve: "Request approved", reject: "Request rejected", execute: "Execution started", retry: "Retry initiated" }
    toast({ title: labels[action] })
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb + title */}
      <div>
        <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          <Link href="/meta-ads/requests" className="hover:text-slate-700">Meta Ads</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/meta-ads/requests" className="hover:text-slate-700">Requests</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 font-medium">{mockDetail.requestId}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/meta-ads/requests")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-bold text-slate-900">{mockDetail.requestId}</h1>
              <Badge className={`text-xs ${statusConfig[status].className}`}>{statusConfig[status].label}</Badge>
            </div>
            <p className="text-sm text-slate-600 pl-11">{mockDetail.campaignName}</p>
            <div className="flex items-center gap-4 pl-11 text-xs text-slate-500">
              <span>App: <strong className="text-slate-700">{mockDetail.app}</strong></span>
              <span>Account: <strong className="text-slate-700 font-mono">{mockDetail.adAccount}</strong></span>
              <span>By: <strong className="text-slate-700">{mockDetail.requestedBy}</strong></span>
              <span>Created: <strong className="text-slate-700">{mockDetail.createdAt}</strong></span>
            </div>
          </div>
          {/* Action buttons based on status */}
          <div className="flex items-center gap-2">
            {status === "pending_approval" && (
              <>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmAction("reject")}>
                  <XCircle className="w-4 h-4 mr-2" />Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setConfirmAction("approve")}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Approve
                </Button>
              </>
            )}
            {status === "approved" && (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setConfirmAction("execute")}>
                <PlayCircle className="w-4 h-4 mr-2" />Execute Request
              </Button>
            )}
            {status === "failed" && (
              <Button variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => setConfirmAction("retry")}>
                <RefreshCw className="w-4 h-4 mr-2" />Retry
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Failure banner */}
      {status === "failed" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Request execution failed</p>
            <p className="text-xs text-red-600 mt-0.5">Campaign creation failed: Invalid ad account permissions. Please verify integration token and retry.</p>
          </div>
        </div>
      )}

      {/* Completed success state */}
      {status === "completed" && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">All Meta objects created successfully. They start in <strong>PAUSED</strong> state on Meta.</p>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-[1fr_320px] gap-5">
        {/* Left: payload summary */}
        <div className="space-y-4">
          {/* Request payload */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Request Payload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <DetailRow label="Objective" value={mockDetail.objective} mono />
                <DetailRow label="Buying Type" value={mockDetail.buyingType} mono />
                <DetailRow label="Countries" value={mockDetail.countries.join(", ")} />
                <DetailRow label="Age Range" value={mockDetail.ageRange} />
                <DetailRow label="Gender" value={mockDetail.gender} />
                <DetailRow label="Placement" value={mockDetail.placementMode} />
                <DetailRow label="Optimization Goal" value={mockDetail.optimizationGoal} mono />
                <DetailRow label="Budget" value={mockDetail.budgetSummary} />
                <DetailRow label="Creative Name" value={mockDetail.creativeName} />
                <DetailRow label="Facebook Page ID" value={mockDetail.facebookPageId} mono />
                <DetailRow label="Headline" value={mockDetail.headline} />
                <DetailRow label="CTA" value={mockDetail.cta} mono />
                <DetailRow label="Ad Name" value={mockDetail.adName} />
              </div>
            </CardContent>
          </Card>

          {/* Operation logs */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Operation Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-4">
                  {mockDetail.logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 relative">
                      <div className="relative z-10 flex-shrink-0 bg-white">
                        {logStatusIcon[log.status as LogStatus]}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{log.step}</p>
                          <span className="text-xs text-slate-400">{log.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-500">Attempt #{log.attempt}</p>
                        {log.error && <p className="text-xs text-red-600 mt-1">{log.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: lifecycle + objects */}
        <div className="space-y-4">
          {/* Lifecycle card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <TimelineEntry label="Created" value={mockDetail.createdAt} done />
              <TimelineEntry label="Submitted" value={mockDetail.submittedAt} done />
              <TimelineEntry label="Approved" value="2026-03-01 14:00" done />
              <TimelineEntry label="Executed" value={mockDetail.executedAt} done />
              <TimelineEntry label="Completed" value="2026-03-02 10:03" done={status === "completed"} />
            </CardContent>
          </Card>

          {/* Created objects */}
          {status === "completed" && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Created Meta Objects</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ObjectRow label="Campaign" metaId={mockDetail.metaCampaignId} localId="camp_local_001" />
                <ObjectRow label="Ad Set" metaId={mockDetail.metaAdSetId} localId="adset_local_001" />
                <ObjectRow label="Creative" metaId={mockDetail.metaCreativeId} localId="cre_local_001" />
                <ObjectRow label="Ad" metaId={mockDetail.metaAdId} localId="ad_local_001" />
                <p className="text-[11px] text-slate-400 pt-1">All objects are in <strong>PAUSED</strong> state on Meta.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <AlertDialog open onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="capitalize">{confirmAction} request?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction === "execute" && "This will create Meta objects (campaign, ad set, creative, ad) via the backend. All objects will start in PAUSED state."}
                {confirmAction === "approve" && "Approve this request so it can be executed later."}
                {confirmAction === "reject" && "Reject this request. The requester will be notified."}
                {confirmAction === "retry" && "Retry execution of this request."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleAction(confirmAction)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="col-span-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm text-slate-900 font-medium mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  )
}

function TimelineEntry({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Clock className="w-3.5 h-3.5 text-slate-300" />}
        <span className={done ? "text-slate-700" : "text-slate-400"}>{label}</span>
      </div>
      <span className={done ? "text-slate-500" : "text-slate-300"}>{value}</span>
    </div>
  )
}

function ObjectRow({ label, metaId, localId }: { label: string; metaId: string; localId: string }) {
  return (
    <div className="border border-slate-200 rounded-md px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <ExternalLink className="w-3 h-3 text-slate-400" />
      </div>
      <p className="text-[11px] font-mono text-blue-700 mt-0.5">Meta ID: {metaId}</p>
      <p className="text-[11px] font-mono text-slate-400">Local ID: {localId}</p>
    </div>
  )
}
