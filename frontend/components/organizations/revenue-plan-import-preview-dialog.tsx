"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  buildImportItemsFromPreview,
  countSelectedImportItems,
  summarizeSelectedImportPreview,
  type RevenuePlanImportCellStatus,
  type RevenuePlanImportPreview,
  type RevenuePlanImportRow,
} from "@/lib/revenue-plan/revenue-plan-import-parser"
import type { OrgTeam } from "@/lib/api/services"

const PAGE_SIZE_OPTIONS = [30, 100, "all"] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

type StatusFilterId = RevenuePlanImportCellStatus | "unmapped"
type PlatformFilter = "all" | "ANDROID" | "IOS" | "OTHER"

const STATUS_FILTER_OPTIONS: Array<{
  id: StatusFilterId
  label: string
  swatchClassName: string
}> = [
  { id: "changed", label: "Changed", swatchClassName: "border-amber-200 bg-amber-50" },
  { id: "new", label: "New", swatchClassName: "border-sky-200 bg-sky-50" },
  { id: "unchanged", label: "Unchanged", swatchClassName: "border-slate-200 bg-white" },
  { id: "empty", label: "Empty", swatchClassName: "border-slate-200 bg-slate-50/60" },
  { id: "unmapped", label: "Unmapped", swatchClassName: "border-rose-200 bg-rose-50" },
]

interface RevenuePlanImportPreviewDialogProps {
  open: boolean
  preview: RevenuePlanImportPreview | null
  importing?: boolean
  teams: OrgTeam[]
  teamAppStoreIdsByTeamId: Record<string, ReadonlySet<string>>
  initialTeamFilter?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (preview: RevenuePlanImportPreview) => void | Promise<void>
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—"
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getCellClassName(status: RevenuePlanImportCellStatus) {
  switch (status) {
    case "changed":
      return "bg-amber-50 text-amber-950"
    case "new":
      return "bg-sky-50 text-sky-950"
    case "unchanged":
      return "bg-white text-slate-700"
    default:
      return "bg-slate-50/60 text-slate-400"
  }
}

function getRowClassName(isMapped: boolean) {
  return isMapped ? undefined : "bg-rose-50/80 hover:bg-rose-50/80"
}

function normalizePlatform(platformValue?: string | null): PlatformFilter {
  const normalized = (platformValue ?? "").trim().toUpperCase()
  if (normalized === "ANDROID") return "ANDROID"
  if (normalized === "IOS") return "IOS"
  return "OTHER"
}

function rowMatchesSearch(row: RevenuePlanImportRow, query: string) {
  if (!query) return true
  return [row.appName, row.appStoreId]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query))
}

function rowMatchesTeam(
  row: RevenuePlanImportRow,
  teamFilter: string,
  teamAppStoreIdsByTeamId: Record<string, ReadonlySet<string>>,
) {
  if (teamFilter === "all") return true
  const teamSet = teamAppStoreIdsByTeamId[teamFilter]
  if (!teamSet) return false
  return teamSet.has(row.appStoreId.toLowerCase())
}

function rowMatchesPlatform(row: RevenuePlanImportRow, platformFilter: PlatformFilter) {
  if (platformFilter === "all") return true
  return normalizePlatform(row.platform) === platformFilter
}

function rowMatchesStatusFilters(
  row: RevenuePlanImportRow,
  statusFilters: ReadonlySet<StatusFilterId>,
  monthKeys: string[],
) {
  if (statusFilters.size === 0) return true

  if (statusFilters.has("unmapped") && !row.isMapped) return true

  for (const monthKey of monthKeys) {
    const status = row.cells[monthKey]?.status ?? "empty"
    if (statusFilters.has(status)) return true
  }

  return false
}

export function RevenuePlanImportPreviewDialog({
  open,
  preview,
  importing = false,
  teams,
  teamAppStoreIdsByTeamId,
  initialTeamFilter = "all",
  onOpenChange,
  onConfirm,
}: RevenuePlanImportPreviewDialogProps) {
  const [draft, setDraft] = useState<RevenuePlanImportPreview | null>(preview)
  const [teamFilter, setTeamFilter] = useState(initialTeamFilter)
  const [searchQuery, setSearchQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all")
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilterId>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSizeOption, setPageSizeOption] = useState<PageSizeOption>(100)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open && preview) {
      setDraft(preview)
      setTeamFilter(initialTeamFilter)
      setSearchQuery("")
      setPlatformFilter("all")
      setStatusFilters(new Set())
      setCurrentPage(1)
      setPageSizeOption(100)
    }
  }, [open, preview, initialTeamFilter])

  const activePreview = draft ?? preview
  const monthKeys = useMemo(
    () => activePreview?.months.map((month) => month.monthKey) ?? [],
    [activePreview?.months],
  )

  const selectedCount = useMemo(
    () => (activePreview ? countSelectedImportItems(activePreview) : 0),
    [activePreview],
  )

  const importSummary = useMemo(
    () => (activePreview ? summarizeSelectedImportPreview(activePreview) : null),
    [activePreview],
  )

  const filteredRows = useMemo(() => {
    if (!activePreview) return []

    const query = searchQuery.trim().toLowerCase()
    return activePreview.rows.filter(
      (row) =>
        rowMatchesSearch(row, query) &&
        rowMatchesTeam(row, teamFilter, teamAppStoreIdsByTeamId) &&
        rowMatchesPlatform(row, platformFilter) &&
        rowMatchesStatusFilters(row, statusFilters, monthKeys),
    )
  }, [
    activePreview,
    monthKeys,
    platformFilter,
    searchQuery,
    statusFilters,
    teamAppStoreIdsByTeamId,
    teamFilter,
  ])

  const effectivePageSize =
    pageSizeOption === "all" ? Math.max(filteredRows.length, 1) : pageSizeOption
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / effectivePageSize))
  const pageStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1
  const pageEnd = Math.min(currentPage * effectivePageSize, filteredRows.length)
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * effectivePageSize
    return filteredRows.slice(startIndex, startIndex + effectivePageSize)
  }, [currentPage, effectivePageSize, filteredRows])

  useEffect(() => {
    setCurrentPage(1)
  }, [teamFilter, searchQuery, platformFilter, statusFilters, pageSizeOption])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const mappedRowCount = activePreview?.rows.filter((row) => row.isMapped).length ?? 0
  const unmappedRowCount = activePreview?.rows.filter((row) => !row.isMapped).length ?? 0
  const changedCellCount =
    activePreview?.rows.reduce(
      (count, row) =>
        count +
        Object.values(row.cells).filter((cell) => cell.status === "changed" || cell.status === "new")
          .length,
      0,
    ) ?? 0

  const filteredMappedRows = filteredRows.filter((row) => row.isMapped)
  const allFilteredRowsSelected =
    filteredMappedRows.length > 0 && filteredMappedRows.every((row) => row.selected)

  const toggleStatusFilter = (filterId: StatusFilterId, checked: boolean) => {
    setStatusFilters((current) => {
      const next = new Set(current)
      if (checked) next.add(filterId)
      else next.delete(filterId)
      return next
    })
  }

  const toggleAllFilteredRows = (checked: boolean) => {
    if (!activePreview) return
    const filteredRowIndexes = new Set(filteredMappedRows.map((row) => row.rowIndex))
    setDraft({
      ...activePreview,
      rows: activePreview.rows.map((row) => ({
        ...row,
        selected: row.isMapped && filteredRowIndexes.has(row.rowIndex) ? checked : row.selected,
      })),
    })
  }

  const toggleRow = (rowIndex: number, checked: boolean) => {
    if (!activePreview) return
    setDraft({
      ...activePreview,
      rows: activePreview.rows.map((row) =>
        row.rowIndex === rowIndex ? { ...row, selected: checked } : row,
      ),
    })
  }

  const toggleMonth = (monthKey: string, checked: boolean) => {
    if (!activePreview) return
    setDraft({
      ...activePreview,
      months: activePreview.months.map((month) =>
        month.monthKey === monthKey ? { ...month, selected: checked } : month,
      ),
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDraft(null)
      setConfirmOpen(false)
    } else if (preview) {
      setDraft(preview)
    }
    onOpenChange(nextOpen)
  }

  const handleConfirmImport = () => {
    if (!activePreview) return
    void onConfirm(activePreview)
    setConfirmOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-[min(98vw,2400px)]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Review import</DialogTitle>
          <DialogDescription>
            Preview planned revenue changes before importing. Filter rows, then select months and apps to apply.
          </DialogDescription>
        </DialogHeader>

        {activePreview ? (
          <>
            <div className="space-y-4 border-b px-6 py-4">
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span>{activePreview.fileName}</span>
                <span>{mappedRowCount} mapped app(s)</span>
                {unmappedRowCount > 0 ? (
                  <span className="text-rose-700">{unmappedRowCount} unmapped app row(s)</span>
                ) : null}
                <span>{changedCellCount} changed/new value(s)</span>
                <span>{selectedCount} cell(s) selected for import</span>
                <span>
                  Showing {filteredRows.length} of {activePreview.rows.length} row(s)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,160px)] xl:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="import-preview-team">Team</Label>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger id="import-preview-team" className="bg-white">
                      <SelectValue placeholder="All teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teams</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="import-preview-search">Search app</Label>
                  <Input
                    id="import-preview-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="App name or App Store ID"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="import-preview-platform">Platform</Label>
                  <Select
                    value={platformFilter}
                    onValueChange={(value) => setPlatformFilter(value as PlatformFilter)}
                  >
                    <SelectTrigger id="import-preview-platform" className="bg-white">
                      <SelectValue placeholder="All platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      <SelectItem value="ANDROID">Android</SelectItem>
                      <SelectItem value="IOS">iOS</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                        statusFilters.has(option.id)
                          ? "border-slate-400 bg-slate-100 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      <Checkbox
                        checked={statusFilters.has(option.id)}
                        onCheckedChange={(value) => toggleStatusFilter(option.id, value === true)}
                        aria-label={`Filter ${option.label}`}
                      />
                      <span className={cn("h-3 w-6 rounded border", option.swatchClassName)} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {activePreview.errors.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {activePreview.errors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
              <div className="rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/95 hover:bg-slate-50/95">
                      <TableHead className="sticky left-0 z-20 w-10 bg-slate-50/95">
                        <Checkbox
                          checked={allFilteredRowsSelected}
                          onCheckedChange={(value) => toggleAllFilteredRows(value === true)}
                          aria-label="Select all filtered mapped rows"
                        />
                      </TableHead>
                      <TableHead className="min-w-[180px]">App Store ID</TableHead>
                      <TableHead className="min-w-[160px]">App Name</TableHead>
                      <TableHead className="min-w-[100px]">Platform</TableHead>
                      {activePreview.months.map((month) => (
                        <TableHead key={month.monthKey} className="min-w-[128px] text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Checkbox
                              checked={month.selected}
                              onCheckedChange={(value) => toggleMonth(month.monthKey, value === true)}
                              aria-label={`Select month ${month.headerLabel}`}
                            />
                            <span>{month.headerLabel}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4 + activePreview.months.length}
                          className="py-8 text-center text-sm text-slate-500"
                        >
                          No rows match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row) => (
                        <TableRow key={row.rowIndex} className={getRowClassName(row.isMapped)}>
                          <TableCell className="sticky left-0 z-10 bg-inherit">
                            <Checkbox
                              checked={row.selected}
                              disabled={!row.isMapped}
                              onCheckedChange={(value) => toggleRow(row.rowIndex, value === true)}
                              aria-label={`Select row ${row.appStoreId}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{row.appStoreId}</TableCell>
                          <TableCell className="text-sm">{row.appName || "—"}</TableCell>
                          <TableCell className="text-sm">{row.platform || "—"}</TableCell>
                          {activePreview.months.map((month) => {
                            const cell = row.cells[month.monthKey]
                            const status = cell?.status ?? "empty"
                            return (
                              <TableCell
                                key={`${row.rowIndex}-${month.monthKey}`}
                                className={cn("text-right text-sm tabular-nums", getCellClassName(status))}
                              >
                                <div>{formatCurrency(cell?.importedValue)}</div>
                                {cell?.currentValue != null && status === "changed" ? (
                                  <div className="text-[10px] text-slate-500">
                                    was {formatCurrency(cell.currentValue)}
                                  </div>
                                ) : null}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {filteredRows.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <Select
                    value={pageSizeOption === "all" ? "all" : String(pageSizeOption)}
                    onValueChange={(value) => {
                      setPageSizeOption(value === "all" ? "all" : (Number(value) as 30 | 100))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-8 w-20 bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option === "all" ? "All" : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span>
                    {pageStart}-{pageEnd} of {filteredRows.length}
                  </span>
                  {pageSizeOption !== "all" && totalPages > 1 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-white"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage <= 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-16 text-center">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-white"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage >= totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={importing || !activePreview || selectedCount === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import {selectedCount > 0 ? `${selectedCount} value(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[60] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Import revenue plan for{" "}
                  <span className="font-medium text-slate-900">
                    {importSummary?.monthCount ?? 0} selected month
                    {(importSummary?.monthCount ?? 0) === 1 ? "" : "s"}
                  </span>{" "}
                  across{" "}
                  <span className="font-medium text-slate-900">
                    {importSummary?.appCount ?? 0} app
                    {(importSummary?.appCount ?? 0) === 1 ? "" : "s"}
                  </span>
                  .
                </p>
                <p>
                  This will write{" "}
                  <span className="font-medium text-slate-900">
                    {importSummary?.valueCount ?? 0} planned revenue value
                    {(importSummary?.valueCount ?? 0) === 1 ? "" : "s"}
                  </span>
                  .
                </p>
                {importSummary && importSummary.months.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-slate-700">Months</p>
                    <ul className="space-y-0.5">
                      {importSummary.months.map((month) => (
                        <li
                          key={month.monthKey}
                          className={cn(!month.selected && "text-slate-400 line-through")}
                        >
                          {month.headerLabel}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={importing} onClick={handleConfirmImport}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export { buildImportItemsFromPreview }
