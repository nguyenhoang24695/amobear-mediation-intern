"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Smartphone } from "lucide-react"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { teamMembersApi, structureApi } from "@/lib/api/services"
function formatMappingDate(value?: string | null) {
  if (value == null || value === "") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (iso == null || iso === "") return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fromDatetimeLocalToIso(local: string): string | null {
  const t = local.trim()
  if (!t) return null
  const ms = new Date(t).getTime()
  if (Number.isNaN(ms)) return null
  return new Date(t).toISOString()
}

export interface AbUserAppMappingEditorProps {
  userId: string
  /** Admin / super_admin hoặc quyền manage user tương đương */
  canBulkEdit: boolean
  /** Khóa cache useApi cho GET mapping (khớp modal vs user detail) */
  mappingCacheKey: string
  /** Khi false, không gọi API (ví dụ modal đóng). Mặc định true. */
  fetchEnabled?: boolean
}

export function AbUserAppMappingEditor({ userId, canBulkEdit, mappingCacheKey, fetchEnabled = true }: AbUserAppMappingEditorProps) {
  const { toast } = useToast()
  const load = fetchEnabled && !!userId
  const { data: mappingResp, loading: mappingLoading, refetch } = useApi(
    () => teamMembersApi.getAbUserAppMapping(userId),
    { enabled: load, cacheKey: mappingCacheKey }
  )
  const { data: appsResp } = useApi(() => structureApi.getApps(), {
    enabled: load,
    cacheKey: `${mappingCacheKey}-apps`,
  })

  const rows = mappingResp?.data ?? []
  const allApps = appsResp?.apps

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [patchStart, setPatchStart] = useState(false)
  const [patchEnd, setPatchEnd] = useState(false)
  const [clearEnd, setClearEnd] = useState(false)
  const [startLocal, setStartLocal] = useState("")
  const [endLocal, setEndLocal] = useState("")

  useEffect(() => {
    setSelectedIds(new Set())
  }, [userId])

  const selectableRows = useMemo(() => rows.filter((r) => (r.id ?? 0) > 0), [rows])
  const allSelectableSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r.id as number))
  const headerChecked: boolean | "indeterminate" =
    selectableRows.length === 0
      ? false
      : allSelectableSelected
        ? true
        : selectableRows.some((r) => selectedIds.has(r.id as number))
          ? "indeterminate"
          : false

  const someSelected = selectedIds.size > 0

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (selectableRows.length === 0) return new Set()
      if (selectableRows.every((r) => prev.has(r.id as number))) return new Set()
      return new Set(selectableRows.map((r) => r.id as number))
    })
  }, [selectableRows])

  const openBulkDialog = () => {
    if (!someSelected) return
    const first = rows.find((r) => selectedIds.has(r.id as number))
    setStartLocal(toDatetimeLocalValue(first?.startDate))
    setEndLocal(toDatetimeLocalValue(first?.endDate))
    setPatchStart(false)
    setPatchEnd(false)
    setClearEnd(false)
    setBulkOpen(true)
  }

  const onBulkSave = async () => {
    if (!patchStart && !patchEnd) {
      toast({ title: "Chọn trường cần cập nhật", description: "Bật ít nhất Start date hoặc End date.", variant: "destructive" })
      return
    }
    if (patchStart && startLocal.trim()) {
      const probe = fromDatetimeLocalToIso(startLocal)
      if (probe == null) {
        toast({ title: "Start date không hợp lệ", variant: "destructive" })
        return
      }
    }
    if (patchEnd && !clearEnd && !endLocal.trim()) {
      toast({ title: "Thiếu End date", description: "Nhập ngày kết thúc, hoặc chọn “Clear end date”.", variant: "destructive" })
      return
    }

    const startIso = patchStart ? (startLocal.trim() ? fromDatetimeLocalToIso(startLocal) : null) : undefined

    let endIso: string | null | undefined = undefined
    if (patchEnd) {
      endIso = clearEnd ? null : fromDatetimeLocalToIso(endLocal)
      if (!clearEnd && endIso == null) {
        toast({ title: "End date không hợp lệ", variant: "destructive" })
        return
      }
    }

    if (patchStart && patchEnd && !clearEnd && startIso != null && endIso) {
      if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
        toast({ title: "Khoảng thời gian không hợp lệ", description: "Start phải ≤ End.", variant: "destructive" })
        return
      }
    }

    const mappingIds = [...selectedIds]
    setBulkSaving(true)
    try {
      const res = await teamMembersApi.bulkUpdateAbUserAppMappingDates(userId, {
        mappingIds,
        patchStartDate: patchStart,
        startDate: patchStart ? startIso ?? null : null,
        patchEndDate: patchEnd,
        endDate: patchEnd ? endIso ?? null : null,
      })
      if (!res.success) {
        toast({
          title: "Cập nhật thất bại",
          description: (res as { message?: string }).message ?? "Unknown error",
          variant: "destructive",
        })
        return
      }
      const updated = res.updated ?? 0
      const requested = res.requested ?? mappingIds.length
      toast({
        title: "Đã cập nhật StarRocks",
        description:
          updated === requested
            ? `${updated} dòng (Start/End theo lựa chọn).`
            : `${updated}/${requested} dòng được cập nhật (một số id không khớp user/email).`,
      })
      invalidateCache(mappingCacheKey)
      invalidateCache(`ab-user-app-mapping-${userId}`)
      invalidateCache(`ab-user-app-mapping-modal-${userId}`)
      await refetch()
      setBulkOpen(false)
      setSelectedIds(new Set())
    } catch (e) {
      toast({
        title: "Lỗi mạng",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setBulkSaving(false)
    }
  }

  const colCount = canBulkEdit ? 5 : 4

  return (
    <>
      {canBulkEdit && !mappingLoading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Button type="button" variant="secondary" size="sm" disabled={!someSelected} onClick={openBulkDialog}>
            Edit dates ({selectedIds.size})
          </Button>
          {someSelected ? (
            <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          ) : null}
        </div>
      )}

      {mappingLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {canBulkEdit ? (
                <TableHead className="w-[44px] align-middle">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={() => toggleSelectAll()}
                    disabled={selectableRows.length === 0}
                    aria-label="Select all rows"
                  />
                </TableHead>
              ) : null}
              <TableHead className="min-w-[280px] w-[45%]">App</TableHead>
              <TableHead>Start date</TableHead>
              <TableHead>End date</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const matchedApp = allApps?.find((a) => a.appId === row.appId)
              const appLabel = matchedApp?.displayName || matchedApp?.name || "Unknown app"
              const storeId = matchedApp?.appStoreId?.trim()
              const active = row.endDate == null || row.endDate === ""
              const rid = row.id ?? 0
              const selectable = canBulkEdit && rid > 0
              return (
                <TableRow key={rid > 0 ? `id-${rid}` : `${row.appId}-${row.startDate ?? ""}-${row.endDate ?? ""}`}>
                  {canBulkEdit ? (
                    <TableCell className="align-top pt-3">
                      {selectable ? (
                        <Checkbox
                          checked={selectedIds.has(rid)}
                          onCheckedChange={() => toggleRow(rid)}
                          aria-label={`Select ${appLabel}`}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="h-9 w-9 rounded-lg shrink-0">
                        {matchedApp?.iconUri ? <AvatarImage src={matchedApp.iconUri} alt={appLabel} /> : null}
                        <AvatarFallback className="rounded-lg bg-slate-100">
                          <Smartphone className="w-4 h-4 text-slate-400" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-slate-900 leading-snug">{appLabel}</p>
                        <p className="text-xs text-slate-500 font-mono break-all">appId: {row.appId}</p>
                        <p className="text-xs text-slate-500 font-mono break-all">
                          app_store_id: {storeId && storeId.length > 0 ? storeId : "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700 align-top">{formatMappingDate(row.startDate)}</TableCell>
                  <TableCell className="text-sm text-slate-700 align-top">{formatMappingDate(row.endDate)}</TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant="outline"
                      className={
                        active
                          ? "border-green-200 bg-green-50 text-green-700 text-xs"
                          : "border-slate-200 bg-slate-50 text-slate-600 text-xs"
                      }
                    >
                      {active ? "Active" : "Ended"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-slate-500 py-10 text-sm">
                  No rows in StarRocks for this user, or StarRocks is not configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk edit Start / End date</DialogTitle>
            <DialogDescription>
              Áp dụng cho {selectedIds.size} dòng đã chọn (theo <span className="font-mono">id</span> trên StarRocks).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 space-y-0">
              <Checkbox id="patch-start" checked={patchStart} onCheckedChange={(v) => setPatchStart(v === true)} />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="patch-start">Cập nhật Start date</Label>
                <input
                  id="start-dt"
                  type="datetime-local"
                  className="border rounded-md px-3 py-2 text-sm w-full max-w-full bg-background"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  disabled={!patchStart}
                />
              </div>
            </div>
            <div className="flex items-start gap-3 space-y-0">
              <Checkbox id="patch-end" checked={patchEnd} onCheckedChange={(v) => setPatchEnd(v === true)} />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="patch-end">Cập nhật End date</Label>
                <input
                  id="end-dt"
                  type="datetime-local"
                  className="border rounded-md px-3 py-2 text-sm w-full max-w-full bg-background"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  disabled={!patchEnd || clearEnd}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="clear-end"
                    checked={clearEnd}
                    onCheckedChange={(v) => setClearEnd(v === true)}
                    disabled={!patchEnd}
                  />
                  <Label htmlFor="clear-end" className="text-sm font-normal cursor-pointer">
                    Clear end date (mapping active)
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onBulkSave()} disabled={bulkSaving}>
              {bulkSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save to StarRocks"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
