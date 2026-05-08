"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Search, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { commissionApi } from "@/lib/api/services"
import { Pagination } from "@/components/shared/pagination"
import { CommissionRateModal } from "./commission-rate-modal"
import type { CommissionRateDto } from "@/types/api"

const PAGE_SIZE = 20

function formatRate(rate: number | null): React.ReactNode {
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

export function CommissionConfigTab() {
  const [page, setPage] = useState(1)
  const [usernameFilter, setUsernameFilter] = useState("")
  const [appIdFilter, setAppIdFilter] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CommissionRateDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const cacheKey = `commission_rates_${page}_${PAGE_SIZE}_${usernameFilter}_${appIdFilter}`

  const { data, loading, refetch } = useApi(
    () =>
      commissionApi.getRates({
        username: usernameFilter || undefined,
        appId: appIdFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    { cacheKey },
  )

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
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Filter by username..."
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by App ID..."
            value={appIdFilter}
            onChange={(e) => setAppIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
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
                    <TableHead>Username</TableHead>
                    <TableHead>App ID</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Effective date</TableHead>
                    <TableHead>Expiry date</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.username}</TableCell>
                      <TableCell className="font-mono text-xs">{row.appId}</TableCell>
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
              Delete the commission rate for <strong>{deleteTarget?.username}</strong> —{" "}
              <strong>{deleteTarget?.appId}</strong> (from {formatDate(deleteTarget?.effectiveDate)})?
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
    </div>
  )
}
