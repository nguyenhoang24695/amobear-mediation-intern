"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MoreHorizontal,
  Briefcase,
  Edit,
  Play,
  ToggleLeft,
  ToggleRight,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Loader2,
  Settings2,
  History,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import type { Job } from "./job-management-content"

interface JobsTableProps {
  jobs: Job[]
  searchQuery: string
  statusFilter: string
  sortBy: string
  onEdit: (job: Job) => void
  onRunNow: (job: Job) => void
  onManualRunSettings?: (job: Job) => void
  onToggle: (jobId: string) => void
  onViewDetails: (job: Job) => void
  onViewHistory: (job: Job) => void
  onClearFilters: () => void
  hasFilters: boolean
  canEdit?: boolean
  canRun?: boolean
  canEnableDisable?: boolean
}

type SortField = "name" | "status" | "schedule" | "type" | "updatedAt"
type SortDir = "asc" | "desc"

export function JobsTable({
  jobs,
  searchQuery,
  statusFilter,
  sortBy,
  onEdit,
  onRunNow,
  onManualRunSettings,
  onToggle,
  onViewDetails,
  onViewHistory,
  onClearFilters,
  hasFilters,
  canEdit = true,
  canRun = true,
  canEnableDisable = true,
}: JobsTableProps) {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const displayName = (job.displayName || job.jobId).toLowerCase()
        if (
          !displayName.includes(q) &&
          !job.jobId.toLowerCase().includes(q)
        )
          return false
      }
      if (statusFilter === "enabled" && !job.enabled) return false
      if (statusFilter === "disabled" && job.enabled) return false
      return true
    })
  }, [jobs, searchQuery, statusFilter])

  // Sort
  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs]

    // Apply external sort if specified
    if (sortBy === "name") {
      sorted.sort((a, b) => (a.displayName || a.jobId).localeCompare(b.displayName || b.jobId))
      return sorted
    }
    if (sortBy === "updatedAt") {
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      return sorted
    }

    // Otherwise use column sort
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = (a.displayName || a.jobId).localeCompare(b.displayName || b.jobId)
          break
        case "status":
          cmp = Number(b.enabled) - Number(a.enabled)
          break
        case "schedule":
          cmp = a.cronExpression.localeCompare(b.cronExpression)
          break
        case "type":
          cmp = (a.jobTypeName || "").localeCompare(b.jobTypeName || "")
          break
        case "updatedAt":
          cmp = a.updatedAt.localeCompare(b.updatedAt)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredJobs, sortField, sortDir, sortBy])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize))
  const paginatedJobs = sortedJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === paginatedJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(paginatedJobs.map((j) => j.jobId))
    }
  }

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    )
  }

  const handleBulkEnable = () => {
    for (const id of selectedJobs) {
      const job = jobs.find((j) => j.jobId === id)
      if (job && !job.enabled) onToggle(id)
    }
    setSelectedJobs([])
  }

  const handleBulkDisable = () => {
    for (const id of selectedJobs) {
      const job = jobs.find((j) => j.jobId === id)
      if (job && job.enabled) onToggle(id)
    }
    setSelectedJobs([])
  }

  // Empty State
  if (filteredJobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                No jobs found
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
              <Button
                variant="link"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                No jobs configured
              </h3>
              <p className="text-sm text-muted-foreground">
                No Hangfire recurring jobs have been set up yet
              </p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* Bulk Actions Bar */}
      {selectedJobs.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-4 py-2.5">
          <span className="text-sm font-medium text-primary">
            {selectedJobs.length} job{selectedJobs.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 bg-transparent text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-300"
              onClick={handleBulkEnable}
            >
              Enable Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent text-muted-foreground hover:bg-muted"
              onClick={handleBulkDisable}
            >
              Disable Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSelectedJobs([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Desktop / Tablet Table */}
      <Card className="hidden overflow-hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedJobs.length === paginatedJobs.length &&
                        paginatedJobs.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      Job Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-24">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort("status")}
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead className="w-48">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort("schedule")}
                    >
                      Schedule
                      <SortIcon field="schedule" />
                    </button>
                  </TableHead>
                  <TableHead className="w-64">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort("type")}
                    >
                      Type
                      <SortIcon field="type" />
                    </button>
                  </TableHead>
                  <TableHead className="w-40">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSort("updatedAt")}
                    >
                      Last Updated
                      <SortIcon field="updatedAt" />
                    </button>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedJobs.map((job) => (
                  <TableRow
                    key={job.jobId}
                    className={`transition-colors hover:bg-muted/40 ${!job.enabled ? "opacity-60" : ""}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedJobs.includes(job.jobId)}
                        onCheckedChange={() => toggleSelectJob(job.jobId)}
                      />
                    </TableCell>

                    {/* Job Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-muted p-1.5">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {job.displayName || job.jobId}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {job.jobId}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {job.enabled ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground hover:bg-muted">
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>

                    {/* Schedule */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default">
                            <p className="font-mono text-sm text-foreground">
                              {job.cronExpression}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {job.timeZoneId}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Next run: {job.nextRun}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="min-w-0 cursor-default">
                            <p className="max-w-56 truncate text-sm text-muted-foreground">
                              {job.jobTypeName || "N/A"}
                            </p>
                            <p className="max-w-56 truncate font-mono text-xs text-muted-foreground">
                              {job.jobMethodName || "N/A"}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="break-all">{job.jobTypeName || "N/A"}</p>
                          <p className="font-mono text-xs mt-1">
                            {job.jobMethodName || "N/A"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {job.updatedAtLabel}
                      </p>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => onEdit(job)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Schedule
                            </DropdownMenuItem>
                          )}
                          {canRun && (
                            <DropdownMenuItem onClick={() => onRunNow(job)}>
                              <Play className="w-4 h-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                          )}
                          {canEdit && onManualRunSettings && (
                            <DropdownMenuItem
                              onClick={() => onManualRunSettings(job)}
                            >
                              <Settings2 className="w-4 h-4 mr-2" />
                              Param Setting
                            </DropdownMenuItem>
                          )}
                          {canEnableDisable && (
                            <DropdownMenuItem onClick={() => onToggle(job.jobId)}>
                              {job.enabled ? (
                                <>
                                  <ToggleLeft className="w-4 h-4 mr-2" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4 mr-2" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {(canEdit || canRun || canEnableDisable) && <DropdownMenuSeparator />}
                          <DropdownMenuItem onClick={() => onViewDetails(job)}>
                            <Info className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onViewHistory(job)}>
                            <History className="w-4 h-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedJobs.length}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page)
              setSelectedJobs([])
            }}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
              setSelectedJobs([])
            }}
            itemName="jobs"
          />
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedJobs.map((job) => (
          <Card
            key={job.jobId}
            className={!job.enabled ? "opacity-60" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedJobs.includes(job.jobId)}
                    onCheckedChange={() => toggleSelectJob(job.jobId)}
                  />
                  <div className="rounded bg-muted p-1.5">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {job.displayName || job.jobId}
                    </p>
                    <p className="text-xs text-muted-foreground">{job.jobId}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(job)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Schedule
                      </DropdownMenuItem>
                    )}
                    {canRun && (
                      <DropdownMenuItem onClick={() => onRunNow(job)}>
                        <Play className="w-4 h-4 mr-2" />
                        Run Now
                      </DropdownMenuItem>
                    )}
                    {canEdit && onManualRunSettings && (
                      <DropdownMenuItem onClick={() => onManualRunSettings(job)}>
                        <Settings2 className="w-4 h-4 mr-2" />
                        Param Setting
                      </DropdownMenuItem>
                    )}
                    {canEnableDisable && (
                      <DropdownMenuItem onClick={() => onToggle(job.jobId)}>
                        {job.enabled ? (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4 mr-2" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {(canEdit || canRun || canEnableDisable) && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => onViewDetails(job)}>
                      <Info className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 ml-12 grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {job.enabled ? (
                    <Badge className="mt-0.5 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="mt-0.5 bg-muted text-muted-foreground hover:bg-muted">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="mt-0.5 font-mono text-sm text-foreground">
                    {job.cronExpression}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Timezone</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {job.timeZoneId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {job.updatedAtLabel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Mobile Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedJobs.length}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page)
            setSelectedJobs([])
          }}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
            setSelectedJobs([])
          }}
          itemName="jobs"
        />
      </div>
    </TooltipProvider>
  )
}

