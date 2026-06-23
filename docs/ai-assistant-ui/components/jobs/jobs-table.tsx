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
  onToggle: (jobId: string) => void
  onClearFilters: () => void
  hasFilters: boolean
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
  onToggle,
  onClearFilters,
  hasFilters,
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
        if (
          !job.displayName.toLowerCase().includes(q) &&
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
      sorted.sort((a, b) => a.displayName.localeCompare(b.displayName))
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
          cmp = a.displayName.localeCompare(b.displayName)
          break
        case "status":
          cmp = Number(b.enabled) - Number(a.enabled)
          break
        case "schedule":
          cmp = a.cronExpression.localeCompare(b.cronExpression)
          break
        case "type":
          cmp = a.jobTypeName.localeCompare(b.jobTypeName)
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
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-600" />
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === paginatedJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(paginatedJobs.map((j) => j.id))
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
      const job = jobs.find((j) => j.id === id)
      if (job && !job.enabled) onToggle(id)
    }
    setSelectedJobs([])
  }

  const handleBulkDisable = () => {
    for (const id of selectedJobs) {
      const job = jobs.find((j) => j.id === id)
      if (job && job.enabled) onToggle(id)
    }
    setSelectedJobs([])
  }

  // Loading state (could be toggled by parent -- for now always false)
  const isLoading = false

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading jobs...</p>
        </CardContent>
      </Card>
    )
  }

  // Empty State
  if (filteredJobs.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No jobs found
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Try adjusting your search or filters
              </p>
              <Button
                variant="link"
                className="text-blue-600"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No jobs configured
              </h3>
              <p className="text-sm text-slate-500">
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
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
          <span className="text-sm font-medium text-blue-700">
            {selectedJobs.length} job{selectedJobs.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 bg-transparent"
              onClick={handleBulkEnable}
            >
              Enable Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-100 bg-transparent"
              onClick={handleBulkDisable}
            >
              Disable Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600"
              onClick={() => setSelectedJobs([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Desktop / Tablet Table */}
      <Card className="border-slate-200 hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
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
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("name")}
                    >
                      Job Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-24">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("status")}
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead className="w-48">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("schedule")}
                    >
                      Schedule
                      <SortIcon field="schedule" />
                    </button>
                  </TableHead>
                  <TableHead className="w-64">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("type")}
                    >
                      Type
                      <SortIcon field="type" />
                    </button>
                  </TableHead>
                  <TableHead className="w-40">
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
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
                    key={job.id}
                    className={`hover:bg-slate-50 transition-colors ${!job.enabled ? "opacity-60" : ""}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedJobs.includes(job.id)}
                        onCheckedChange={() => toggleSelectJob(job.id)}
                      />
                    </TableCell>

                    {/* Job Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-slate-100">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {job.displayName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {job.jobId}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {job.enabled ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>

                    {/* Schedule */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default">
                            <p className="text-sm font-mono text-slate-700">
                              {job.cronExpression}
                            </p>
                            <p className="text-xs text-slate-500">
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
                            <p className="text-sm text-slate-600 truncate max-w-56">
                              {job.jobTypeName}
                            </p>
                            <p className="text-xs text-slate-500 font-mono truncate max-w-56">
                              {job.jobMethodName}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="break-all">{job.jobTypeName}</p>
                          <p className="font-mono text-xs mt-1">
                            {job.jobMethodName}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell>
                      <p className="text-sm text-slate-500">
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
                          <DropdownMenuItem onClick={() => onEdit(job)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRunNow(job)}>
                            <Play className="w-4 h-4 mr-2" />
                            Run Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggle(job.id)}>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Info className="w-4 h-4 mr-2" />
                            View Details
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
            key={job.id}
            className={`border-slate-200 ${!job.enabled ? "opacity-60" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedJobs.includes(job.id)}
                    onCheckedChange={() => toggleSelectJob(job.id)}
                  />
                  <div className="p-1.5 rounded bg-slate-100">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {job.displayName}
                    </p>
                    <p className="text-xs text-slate-500">{job.jobId}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(job)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Schedule
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRunNow(job)}>
                      <Play className="w-4 h-4 mr-2" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggle(job.id)}>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Info className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 ml-12 grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  {job.enabled ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Schedule</p>
                  <p className="text-sm font-mono text-slate-700 mt-0.5">
                    {job.cronExpression}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Timezone</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {job.timeZoneId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Updated</p>
                  <p className="text-sm text-slate-500 mt-0.5">
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
