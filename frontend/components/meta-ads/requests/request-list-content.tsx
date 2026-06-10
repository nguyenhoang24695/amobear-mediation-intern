"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { metaReferenceApi, metaRequestsApi } from "@/lib/api/meta-ads"
import { formatMetaRequestId, formatUserGuidShort } from "@/lib/meta-ads/mappers"
import type { MetaCampaignRequestListItemDto, MetaRequestStatus } from "@/types/meta-ads"
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  PlayCircle,
  RefreshCw,
  ChevronRight,
  Loader2,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const SCREEN_META_REQUESTS = "s-meta-requests"

const statusConfig: Record<MetaRequestStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  executing: { label: "Executing", className: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
}

const rowColorClass: Record<MetaRequestStatus, string> = {
  draft: "",
  pending_approval: "bg-amber-50/50",
  approved: "bg-blue-50/40",
  rejected: "bg-red-50/30",
  executing: "bg-purple-50/40",
  completed: "",
  failed: "bg-red-50/50",
}

type ConfirmAction = "approve" | "reject" | "execute" | "retry"

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function getActionCopy(action: ConfirmAction) {
  switch (action) {
    case "approve":
      return {
        title: "Approve request?",
        description: "This request will move to Approved status and can be executed later.",
      }
    case "reject":
      return {
        title: "Reject request?",
        description: "This request will move to Rejected status. The requester can edit and submit it again later.",
      }
    case "execute":
      return {
        title: "Execute request?",
        description: "This will create Meta objects through the backend. Campaign starts PAUSED; Ad Set and Ads start ACTIVE.",
      }
    case "retry":
      return {
        title: "Retry request?",
        description: "This will retry the failed execution flow and reuse any objects already created successfully.",
      }
  }
}

export function RequestListContent() {
  const router = useRouter()
  const { toast } = useToast()

  const canCreate = hasScreenFunction(SCREEN_META_REQUESTS, "create")
  const canApprove = hasScreenFunction(SCREEN_META_REQUESTS, "approve")
  const canExecute = hasScreenFunction(SCREEN_META_REQUESTS, "execute")
  const canRetry = hasScreenFunction(SCREEN_META_REQUESTS, "retry")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [appFilter, setAppFilter] = useState("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [confirmAction, setConfirmAction] = useState<{ type: ConfirmAction; request: MetaCampaignRequestListItemDto } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    data: requests,
    loading,
    error,
    refetch,
  } = useApi<MetaCampaignRequestListItemDto[]>(
    () =>
      metaRequestsApi.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        appRowId: appFilter === "all" ? undefined : Number(appFilter),
        metaAdAccountId: accountFilter === "all" ? undefined : Number(accountFilter),
      }),
    {
      cacheKey: `meta-requests:list:${statusFilter}:${appFilter}:${accountFilter}`,
    }
  )

  const { data: referenceData } = useApi(
    () => metaReferenceApi.getCreateCampaignReference(),
    { cacheKey: "meta-reference:create-campaign" }
  )

  const filtered = useMemo(() => {
    const list = requests ?? []
    const query = search.trim().toLowerCase()
    if (!query) return list
    return list.filter((request) => {
      const requestId = formatMetaRequestId(request.id).toLowerCase()
      return [
        requestId,
        request.campaignName.toLowerCase(),
        request.objective.toLowerCase(),
        request.appDisplayName?.toLowerCase() ?? "",
        request.appId?.toLowerCase() ?? "",
        request.metaAdAccountName?.toLowerCase() ?? "",
        request.metaAdAccountId.toString(),
      ].some((value) => value.includes(query))
    })
  }, [requests, search])

  const handleAction = async (action: ConfirmAction, request: MetaCampaignRequestListItemDto) => {
    try {
      setActionLoading(true)
      if (action === "approve") {
        await metaRequestsApi.approve(request.id, { comment: "Approved from request list." })
      } else if (action === "reject") {
        await metaRequestsApi.reject(request.id, { reason: "Rejected from request list." })
      } else if (action === "execute") {
        await metaRequestsApi.execute(request.id, {})
      } else {
        await metaRequestsApi.retry(request.id, {})
      }

      invalidateCache(`meta-request:${request.id}`)
      invalidateCache(`meta-requests:list:${statusFilter}:${appFilter}:${accountFilter}`)
      await refetch()
      toast({
        title:
          action === "approve"
            ? "Request approved"
            : action === "reject"
              ? "Request rejected"
              : action === "execute"
                ? "Execution started"
                : "Retry started",
      })
      setConfirmAction(null)
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Request action failed."
      toast({ title: "Action failed", description: message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
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
        {canCreate ? (
          <Link href="/meta-ads/requests/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Request
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search requests..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={appFilter} onValueChange={setAppFilter}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue placeholder="App" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Apps</SelectItem>
            {(referenceData?.appMappings ?? []).filter((mapping) => mapping.appRowId != null).map((mapping) => (
              <SelectItem key={mapping.id} value={mapping.appRowId!.toString()}>
                {mapping.appDisplayName ?? mapping.appId ?? `App ${mapping.appRowId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="h-9 w-52 text-sm">
            <SelectValue placeholder="Ad Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {(referenceData?.adAccounts ?? []).map((account) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              <TableHead className="text-xs text-slate-500 font-medium w-28">Requested By</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-28">Approved By</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-28">Created</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading requests...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-sm text-red-600">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                  No requests found.
                  {canCreate ? (
                    <>
                      {" "}
                      <Link href="/meta-ads/requests/create" className="text-blue-600 hover:underline">
                        Create one
                      </Link>
                      .
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((request) => (
                <TableRow
                  key={request.id}
                  className={`text-sm cursor-pointer hover:bg-slate-50 ${rowColorClass[request.status]}`}
                  onClick={() => router.push(`/meta-ads/requests/${request.id}`)}
                >
                  <TableCell className="font-mono text-xs text-slate-500">{formatMetaRequestId(request.id)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900 text-xs truncate max-w-xs">{request.campaignName}</p>
                      {request.failureSummary ? (
                        <p className="text-[11px] text-red-600 truncate max-w-xs">{request.failureSummary}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">{request.objective.replace("OUTCOME_", "")}</TableCell>
                  <TableCell className="text-xs text-slate-600">{request.appDisplayName ?? request.appId ?? "-"}</TableCell>
                  <TableCell className="text-[11px] text-slate-500">
                    <div className="space-y-0.5">
                      <p className="text-slate-700">{request.metaAdAccountName ?? "-"}</p>
                      <p className="font-mono">{request.metaAdAccountId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] ${statusConfig[request.status].className}`}>
                      {statusConfig[request.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{formatUserGuidShort(request.requestedBy)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{formatUserGuidShort(request.approvedBy)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDateTime(request.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => router.push(`/meta-ads/requests/${request.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Detail
                        </DropdownMenuItem>
                        {canCreate && request.status !== "executing" ? (
                          <DropdownMenuItem onClick={() => router.push(`/meta-ads/requests/${request.id}/edit`)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Request
                          </DropdownMenuItem>
                        ) : null}

                        {request.status === "approved" && canExecute ? (
                          <DropdownMenuItem
                            className="text-blue-700"
                            onClick={(event) => {
                              event.stopPropagation()
                              setConfirmAction({ type: "execute", request })
                            }}
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Execute
                          </DropdownMenuItem>
                        ) : null}
                        {request.status === "failed" && canRetry ? (
                          <DropdownMenuItem
                            className="text-amber-700"
                            onClick={(event) => {
                              event.stopPropagation()
                              setConfirmAction({ type: "retry", request })
                            }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {confirmAction ? (
        <AlertDialog open onOpenChange={() => !actionLoading && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getActionCopy(confirmAction.type).title}</AlertDialogTitle>
              <AlertDialogDescription>{getActionCopy(confirmAction.type).description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={actionLoading}
                onClick={(event) => {
                  event.preventDefault()
                  void handleAction(confirmAction.type, confirmAction.request)
                }}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}


