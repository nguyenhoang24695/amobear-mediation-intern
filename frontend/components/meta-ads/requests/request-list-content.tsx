"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Plus, Search, FileText, MoreHorizontal, Eye, CheckCircle, XCircle,
  PlayCircle, RefreshCw, ChevronRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type RequestStatus = "draft" | "pending_approval" | "approved" | "rejected" | "executing" | "completed" | "failed"

interface CampaignRequest {
  id: string
  requestId: string
  campaignName: string
  objective: string
  app: string
  adAccount: string
  status: RequestStatus
  requestedBy: string
  approvedBy: string
  createdAt: string
  submittedAt: string
  executedAt: string
  failureSummary: string
}

const mockRequests: CampaignRequest[] = [
  { id: "1", requestId: "REQ-0001", campaignName: "WeatherApp_US_Android_AppPromo_20260301", objective: "OUTCOME_APP_PROMOTION", app: "Weather Now (Android)", adAccount: "act_111222333", status: "completed", requestedBy: "john.doe", approvedBy: "jane.smith", createdAt: "2026-03-01", submittedAt: "2026-03-01", executedAt: "2026-03-02", failureSummary: "" },
  { id: "2", requestId: "REQ-0002", campaignName: "WordMaster_GB_iOS_Traffic_20260305", objective: "OUTCOME_TRAFFIC", app: "Word Master Pro (iOS)", adAccount: "act_444555666", status: "pending_approval", requestedBy: "alice.tan", approvedBy: "", createdAt: "2026-03-05", submittedAt: "2026-03-05", executedAt: "", failureSummary: "" },
  { id: "3", requestId: "REQ-0003", campaignName: "SpeedRacer_JP_Android_Awareness_20260310", objective: "OUTCOME_AWARENESS", app: "Speed Racer 3D (Android)", adAccount: "act_111222333", status: "approved", requestedBy: "bob.nguyen", approvedBy: "jane.smith", createdAt: "2026-03-10", submittedAt: "2026-03-10", executedAt: "", failureSummary: "" },
  { id: "4", requestId: "REQ-0004", campaignName: "BubblePop_DE_iOS_Sales_20260312", objective: "OUTCOME_SALES", app: "Bubble Pop Mania (iOS)", adAccount: "act_777888999", status: "failed", requestedBy: "carol.lee", approvedBy: "john.doe", createdAt: "2026-03-12", submittedAt: "2026-03-12", executedAt: "2026-03-13", failureSummary: "Campaign creation failed: Invalid ad account" },
  { id: "5", requestId: "REQ-0005", campaignName: "WeatherApp_SG_Android_Engagement_20260315", objective: "OUTCOME_ENGAGEMENT", app: "Weather Now (Android)", adAccount: "act_444555666", status: "draft", requestedBy: "john.doe", approvedBy: "", createdAt: "2026-03-15", submittedAt: "", executedAt: "", failureSummary: "" },
  { id: "6", requestId: "REQ-0006", campaignName: "WordMaster_US_iOS_AppPromo_20260318", objective: "OUTCOME_APP_PROMOTION", app: "Word Master Pro (iOS)", adAccount: "act_111222333", status: "rejected", requestedBy: "alice.tan", approvedBy: "jane.smith", createdAt: "2026-03-18", submittedAt: "2026-03-18", executedAt: "", failureSummary: "" },
  { id: "7", requestId: "REQ-0007", campaignName: "SpeedRacer_US_Android_Leads_20260320", objective: "OUTCOME_LEADS", app: "Speed Racer 3D (Android)", adAccount: "act_111222333", status: "executing", requestedBy: "bob.nguyen", approvedBy: "john.doe", createdAt: "2026-03-20", submittedAt: "2026-03-20", executedAt: "2026-03-21", failureSummary: "" },
]

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  executing: { label: "Executing", className: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
}

const rowColorClass: Record<RequestStatus, string> = {
  draft: "",
  pending_approval: "bg-amber-50/50",
  approved: "bg-blue-50/40",
  rejected: "bg-red-50/30",
  executing: "bg-purple-50/40",
  completed: "",
  failed: "bg-red-50/50",
}

export function RequestListContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [appFilter, setAppFilter] = useState("all")
  const [requests, setRequests] = useState(mockRequests)
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null)

  const filtered = requests.filter(r => {
    const matchSearch = !search || r.campaignName.toLowerCase().includes(search.toLowerCase()) || r.requestId.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || r.status === statusFilter
    const matchApp = appFilter === "all" || r.app.includes(appFilter)
    return matchSearch && matchStatus && matchApp
  })

  const executeAction = async (type: string, id: string) => {
    setConfirmAction(null)
    const labels: Record<string, string> = { approve: "Approved", reject: "Rejected", execute: "Execution started", retry: "Retry initiated" }
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r
      const newStatus: RequestStatus = type === "approve" ? "approved" : type === "reject" ? "rejected" : type === "execute" ? "executing" : "executing"
      return { ...r, status: newStatus }
    }))
    toast({ title: labels[type], description: `Request ${id} status updated.` })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <span>Meta Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">Requests</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meta Campaign Requests</h1>
              <p className="text-sm text-slate-500">Manage internal Meta campaign requests and approvals</p>
            </div>
          </div>
        </div>
        <Link href="/meta-ads/requests/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search requests..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={appFilter} onValueChange={setAppFilter}>
          <SelectTrigger className="h-9 w-48 text-sm">
            <SelectValue placeholder="App" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Apps</SelectItem>
            <SelectItem value="Weather Now">Weather Now</SelectItem>
            <SelectItem value="Word Master">Word Master Pro</SelectItem>
            <SelectItem value="Speed Racer">Speed Racer 3D</SelectItem>
            <SelectItem value="Bubble Pop">Bubble Pop Mania</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium w-28">Request ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Campaign Name</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-36">Objective</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-40">App</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-36">Ad Account</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-36">Status</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Requested By</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Approved By</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Created</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                  No requests found. <Link href="/meta-ads/requests/create" className="text-blue-600 hover:underline">Create one</Link>.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(req => (
                <TableRow key={req.id} className={`text-sm cursor-pointer hover:bg-slate-50 ${rowColorClass[req.status]}`} onClick={() => router.push(`/meta-ads/requests/${req.id}`)}>
                  <TableCell className="font-mono text-xs text-slate-500">{req.requestId}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900 text-xs truncate max-w-xs">{req.campaignName}</p>
                      {req.failureSummary && <p className="text-[11px] text-red-600 truncate max-w-xs">{req.failureSummary}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">{req.objective.replace("OUTCOME_", "")}</TableCell>
                  <TableCell className="text-xs text-slate-600">{req.app}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">{req.adAccount}</TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] ${statusConfig[req.status].className}`}>{statusConfig[req.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{req.requestedBy}</TableCell>
                  <TableCell className="text-xs text-slate-600">{req.approvedBy || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-500">{req.createdAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => router.push(`/meta-ads/requests/${req.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />View Detail
                        </DropdownMenuItem>
                        {req.status === "pending_approval" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-green-700" onClick={e => { e.stopPropagation(); setConfirmAction({ type: "approve", id: req.id, label: "Approve" }) }}>
                              <CheckCircle className="w-4 h-4 mr-2" />Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={e => { e.stopPropagation(); setConfirmAction({ type: "reject", id: req.id, label: "Reject" }) }}>
                              <XCircle className="w-4 h-4 mr-2" />Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {req.status === "approved" && (
                          <DropdownMenuItem className="text-blue-700" onClick={e => { e.stopPropagation(); setConfirmAction({ type: "execute", id: req.id, label: "Execute" }) }}>
                            <PlayCircle className="w-4 h-4 mr-2" />Execute
                          </DropdownMenuItem>
                        )}
                        {req.status === "failed" && (
                          <DropdownMenuItem className="text-amber-700" onClick={e => { e.stopPropagation(); setConfirmAction({ type: "retry", id: req.id, label: "Retry" }) }}>
                            <RefreshCw className="w-4 h-4 mr-2" />Retry
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm action dialog */}
      {confirmAction && (
        <AlertDialog open onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmAction.label} request?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {confirmAction.label.toLowerCase()} this request? This action will update the request status immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => executeAction(confirmAction.type, confirmAction.id)}
              >
                {confirmAction.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
