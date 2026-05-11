"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Plus, Trash2, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { commissionApi } from "@/lib/api/services"
import { getApiErrorMessage } from "@/lib/api/get-api-error-message"
import { ApiErrorAlert } from "@/components/shared/api-error-alert"
import { Pagination } from "@/components/shared/pagination"
import { CommissionRateModal } from "./commission-rate-modal"
import type { CommissionRateDto } from "@/types/api"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

/** Tối đa số dòng lọc ngày có thể thêm (nút + ẩn khi đủ). */
const MAX_COMMISSION_DATE_RULE_ROWS = 4

type SortColumn = "user" | "app" | "effectiveDate" | "expiryDate"

type CommissionDateRuleField = "effective" | "expiry"
type CommissionDateRuleOp = "eq" | "lt" | "lte" | "gt" | "gte" | "between"

type CommissionDateRuleRow = {
  id: string
  field: CommissionDateRuleField
  op: CommissionDateRuleOp
  value: string
  valueTo: string
}

const OP_OPTIONS: CommissionDateRuleOp[] = ["eq", "lt", "lte", "gt", "gte", "between"]

const OP_LABELS: Record<CommissionDateRuleOp, string> = {
  eq: "is equal to",
  lt: "is less than",
  lte: "is less than or equal to",
  gt: "is greater than",
  gte: "is greater than or equal to",
  between: "is between",
}

function buildDateRulesPayload(rows: CommissionDateRuleRow[]) {
  const out: { field: CommissionDateRuleField; op: CommissionDateRuleOp; value: string; valueTo?: string }[] = []
  for (const r of rows) {
    if (r.op === "between") {
      if (!r.value || !r.valueTo) continue
      out.push({ field: r.field, op: "between", value: r.value, valueTo: r.valueTo })
    } else {
      if (!r.value) continue
      out.push({ field: r.field, op: r.op, value: r.value })
    }
  }
  return out
}

function newRuleId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function formatRate(rate: number | null): ReactNode {
  if (rate === null)
    return <Badge className="bg-red-100 text-red-700 border-0">No commission</Badge>
  if (rate === 0)
    return <Badge className="bg-amber-100 text-amber-700 border-0">0%</Badge>
  return <Badge className="bg-green-100 text-green-700 border-0">{rate}%</Badge>
}

function formatDate(d: string | null | undefined) {
  if (!d) return "No expiry"
  return d.slice(0, 10)
}

function getInitials(nameOrEmail: string): string {
  const s = (nameOrEmail || "").trim()
  if (!s) return "?"
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return s[0].toUpperCase()
}

function UserCell({ row }: { row: CommissionRateDto }) {
  const email = row.userEmail ?? row.username
  const nameLine = row.userDisplayName?.trim() || email
  const showEmailSub = Boolean(row.userDisplayName?.trim() && email && nameLine !== email)
  return (
    <div className="flex min-w-0 max-w-[280px] items-center gap-2">
      <Avatar className="h-9 w-9 shrink-0">
        {(row.userAvatarUrl ?? "").trim() ? (
          <AvatarImage src={row.userAvatarUrl!.trim()} alt="" className="object-cover" />
        ) : null}
        <AvatarFallback className="text-xs">{getInitials(nameLine)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{nameLine}</div>
        {showEmailSub ? <div className="truncate font-mono text-xs text-slate-500">{email}</div> : null}
      </div>
    </div>
  )
}

function AppCell({ row }: { row: CommissionRateDto }) {
  const title = (row.appDisplayName ?? "").trim() || row.appId
  return (
    <div className="flex min-w-0 max-w-[300px] items-center gap-2">
      <Avatar className="h-9 w-9 shrink-0 rounded-md">
        {(row.appIconUri ?? "").trim() ? (
          <AvatarImage src={row.appIconUri!.trim()} alt="" className="object-cover" />
        ) : null}
        <AvatarFallback className="rounded-md text-xs">{getInitials(title)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate font-mono text-[11px] text-slate-500">{row.appId}</div>
        {row.appStoreId ? (
          <div className="truncate font-mono text-[11px] text-slate-500">Store: {row.appStoreId}</div>
        ) : null}
      </div>
    </div>
  )
}

export function CommissionConfigTab() {
  const [page, setPage] = useState(1)
  const [usernameFilter, setUsernameFilter] = useState("")
  const [appIdFilter, setAppIdFilter] = useState("")
  const [dateRuleRows, setDateRuleRows] = useState<CommissionDateRuleRow[]>([])
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CommissionRateDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteErrorOpen, setDeleteErrorOpen] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("")

  const dateRulesPayload = useMemo(() => buildDateRulesPayload(dateRuleRows), [dateRuleRows])
  const dateRulesJson = useMemo(
    () => (dateRulesPayload.length > 0 ? JSON.stringify(dateRulesPayload) : ""),
    [dateRulesPayload],
  )

  const cacheKey = `commission_rates_${page}_${PAGE_SIZE}_${usernameFilter}_${appIdFilter}_${dateRulesJson}_${sortColumn ?? ""}_${sortDirection}`

  const { data, loading, refetch } = useApi(
    () =>
      commissionApi.getRates({
        username: usernameFilter || undefined,
        appId: appIdFilter || undefined,
        ...(dateRulesJson ? { dateRules: dateRulesJson } : {}),
        page,
        pageSize: PAGE_SIZE,
        ...(sortColumn
          ? { sortBy: sortColumn, sortDir: sortDirection }
          : {}),
      }),
    { cacheKey },
  )

  function addDateRuleRow() {
    setDateRuleRows((rows) => {
      if (rows.length >= MAX_COMMISSION_DATE_RULE_ROWS) return rows
      return [
        ...rows,
        { id: newRuleId(), field: "effective", op: "eq", value: "", valueTo: "" },
      ]
    })
  }

  function updateDateRuleRow(id: string, patch: Partial<Omit<CommissionDateRuleRow, "id">>) {
    setDateRuleRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeDateRuleRow(id: string) {
    setDateRuleRows((rows) => rows.filter((r) => r.id !== id))
  }

  function handleSort(column: SortColumn) {
    setPage(1)
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc")
      else {
        setSortColumn(null)
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 shrink-0 text-blue-600" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 shrink-0 text-blue-600" />
    )
  }

  function handleSearch() {
    setPage(1)
    invalidateCache(cacheKey)
    void refetch()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await commissionApi.deleteRate(deleteTarget.id)
      toast({ title: "Commission rate deleted" })
      invalidateCache(cacheKey)
      await refetch()
    } catch (err: unknown) {
      setDeleteErrorMessage(getApiErrorMessage(err))
      setDeleteErrorOpen(true)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const rows = data?.data ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by name or email..."
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-xs"
            />
            <Input
              placeholder="Search by app name, App ID, or Store ID..."
              value={appIdFilter}
              onChange={(e) => setAppIdFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-xs"
            />
            {dateRuleRows.length < MAX_COMMISSION_DATE_RULE_ROWS ? (
              <Button variant="outline" onClick={addDateRuleRow} size="icon" title="Add date filter">
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleSearch} size="icon" title="Apply filters">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {dateRuleRows.length > 0 ? (
            <div className="flex flex-col gap-2">
              {dateRuleRows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-x-2 gap-y-2 border border-slate-100 rounded-md bg-slate-50/50 px-2 py-2">
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-sm font-medium text-blue-800 hover:bg-blue-100/80",
                    )}
                    onClick={() =>
                      updateDateRuleRow(row.id, {
                        field: row.field === "effective" ? "expiry" : "effective",
                      })
                    }
                  >
                    {row.field === "effective" ? "Effective Date" : "Expiry Date"}
                  </button>
                  <Select
                    value={row.op}
                    onValueChange={(v) =>
                      updateDateRuleRow(row.id, { op: v as CommissionDateRuleOp })
                    }
                  >
                    <SelectTrigger
                      className="h-9 w-[min(18rem,calc(100vw-8rem))] min-w-[12rem] shrink-0 text-left text-sm"
                      aria-label="Comparison operator"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[min(24rem,70vh)]">
                      {OP_OPTIONS.map((op) => (
                        <SelectItem key={op} value={op}>
                          {OP_LABELS[op]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    className="w-[140px] min-w-0"
                    value={row.value}
                    onChange={(e) => updateDateRuleRow(row.id, { value: e.target.value })}
                    aria-label={row.field === "effective" ? "Effective date value" : "Expiry date value"}
                  />
                  {row.op === "between" ? (
                    <>
                      <span className="text-slate-400 text-sm">–</span>
                      <Input
                        type="date"
                        className="w-[140px] min-w-0"
                        value={row.valueTo}
                        onChange={(e) => updateDateRuleRow(row.id, { valueTo: e.target.value })}
                        aria-label="End of between range"
                      />
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-600"
                    title="Remove date filter"
                    onClick={() => removeDateRuleRow(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No commission rates found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center font-medium text-left hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("user")}
                      >
                        User
                        <SortIcon column="user" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center font-medium text-left hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("app")}
                      >
                        App
                        <SortIcon column="app" />
                      </button>
                    </TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center font-medium text-left hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("effectiveDate")}
                      >
                        Effective date
                        <SortIcon column="effectiveDate" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center font-medium text-left hover:text-blue-600 transition-colors"
                        onClick={() => handleSort("expiryDate")}
                      >
                        Expiry date
                        <SortIcon column="expiryDate" />
                      </button>
                    </TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="align-top">
                        <UserCell row={row} />
                      </TableCell>
                      <TableCell className="align-top">
                        <AppCell row={row} />
                      </TableCell>
                      <TableCell>{formatRate(row.commissionRate)}</TableCell>
                      <TableCell>{formatDate(row.effectiveDate)}</TableCell>
                      <TableCell>{formatDate(row.expiryDate)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalCount > 0 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
              itemName="periods"
            />
          )}
        </CardContent>
      </Card>

      {/* Add modal */}
      <CommissionRateModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => {
          invalidateCache(cacheKey)
          void refetch()
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the commission rate for{" "}
              <strong>{deleteTarget?.userDisplayName?.trim() || deleteTarget?.userEmail || deleteTarget?.username}</strong>
              {" — "}
              <strong>{deleteTarget?.appDisplayName?.trim() || deleteTarget?.appId}</strong> (from{" "}
              {formatDate(deleteTarget?.effectiveDate)})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApiErrorAlert
        open={deleteErrorOpen}
        onOpenChange={setDeleteErrorOpen}
        message={deleteErrorMessage}
        title="Không xóa được commission rate"
      />
    </div>
  )
}
