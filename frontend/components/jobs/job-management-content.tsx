"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
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
import {
  Search,
  RefreshCw,
  Briefcase,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Loader2,
} from "lucide-react"
import { JobsTable } from "./jobs-table"
import { EditJobDialog } from "./edit-job-dialog"
import { RunJobDialog } from "./run-job-dialog"
import { JobDetailsDialog } from "./job-details-dialog"
import { useApi } from "@/hooks/use-api"
import { jobSchedulesApi } from "@/lib/api/services"
import { buildActivityLogsHref } from "@/lib/activity-logs"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import type { HangfireJobSchedule } from "@/types/api"
import { formatDistanceToNow } from "date-fns"

const SCREEN_JOBS = "s-jobs"
const FN_VIEW = "view"
const FN_EDIT = "edit"
const FN_RUN = "run"
const FN_ENABLE_DISABLE = "enable-disable"
const FN_RELOAD = "reload"

export interface Job extends HangfireJobSchedule {
  updatedAtLabel: string
  nextRun: string
}

export function JobManagementContent() {
  const canView = hasScreenFunction(SCREEN_JOBS, FN_VIEW)
  const canEdit = hasScreenFunction(SCREEN_JOBS, FN_EDIT)
  const canRun = hasScreenFunction(SCREEN_JOBS, FN_RUN)
  const canEnableDisable = hasScreenFunction(SCREEN_JOBS, FN_ENABLE_DISABLE)
  const canReload = hasScreenFunction(SCREEN_JOBS, FN_RELOAD)

  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const q = searchParams.get("search")
    if (q) setSearchQuery(q)
  }, [searchParams])
  const [sortBy, setSortBy] = useState("default")
  const [reloadOpen, setReloadOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [runJob, setRunJob] = useState<Job | null>(null)
  const [detailsJob, setDetailsJob] = useState<Job | null>(null)
  const [lastReloadTime, setLastReloadTime] = useState<Date | null>(null)
  const { toast } = useToast()

  if (!canView) {
    return <NoPermissionView />
  }

  // Fetch job schedules from API
  const { data: jobSchedules, loading, refetch } = useApi(
    () => jobSchedulesApi.list(),
    {
      enabled: true,
      cacheKey: "job_schedules_list",
    }
  )

  // Transform API data to Job format
  const jobs: Job[] = useMemo(() => {
    if (!jobSchedules) return []

    return jobSchedules.map((schedule) => {
      const updatedAt = new Date(schedule.updatedAt)
      const updatedAtLabel = formatDistanceToNow(updatedAt, { addSuffix: true })
      
      // Calculate next run (simplified - in real app, use cron parser)
      const nextRun = schedule.enabled 
        ? "Next run calculated from cron" 
        : "Disabled"

      return {
        ...schedule,
        updatedAtLabel,
        nextRun,
      }
    })
  }, [jobSchedules])

  const enabledCount = jobs.filter((j) => j.enabled).length
  const disabledCount = jobs.filter((j) => !j.enabled).length

  const handleReload = async () => {
    setReloading(true)
    try {
      await jobSchedulesApi.reload()
      setLastReloadTime(new Date())
      toast({
        title: "Schedules reloaded",
        description: "Job schedules have been applied to Hangfire successfully.",
      })
      setReloadOpen(false)
      // Refresh the list
      refetch()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to reload schedules",
        variant: "destructive",
      })
    } finally {
      setReloading(false)
    }
  }

  const handleRefresh = () => {
    refetch()
    toast({
      title: "Refreshed",
      description: "Job list has been refreshed.",
    })
  }

  const handleToggleJob = async (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId)
    if (!job) return

    try {
      await jobSchedulesApi.update(jobId, { enabled: !job.enabled })
      toast({
        title: job.enabled ? "Job disabled" : "Job enabled",
        description: `${job.displayName || job.jobId} has been ${job.enabled ? "disabled" : "enabled"}.`,
      })
      refetch()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update job",
        variant: "destructive",
      })
    }
  }

  const handleSaveJob = async (
    jobId: string,
    data: { displayName: string; cronExpression: string; timeZoneId: string; enabled: boolean }
  ) => {
    try {
      await jobSchedulesApi.update(jobId, data)
      toast({
        title: "Job updated",
        description: "Job schedule has been updated successfully.",
      })
      setEditJob(null)
      refetch()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update job",
        variant: "destructive",
      })
      throw error // Re-throw so dialog can handle it
    }
  }

  const lastReloadLabel = lastReloadTime
    ? formatDistanceToNow(lastReloadTime, { addSuffix: true })
    : "Never"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            <Briefcase className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl">
              Job Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage Hangfire recurring jobs and schedules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" asChild>
            <Link href={buildActivityLogsHref({ domain: "job" })}>
              <Activity className="w-4 h-4" />
              View Activity
            </Link>
          </Button>
          {canReload && (
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setReloadOpen(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Schedules
            </Button>
          )}
          <Button variant="ghost" className="text-slate-600" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Jobs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : jobs.length}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <Briefcase className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Enabled</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {loading ? "..." : enabledCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Disabled</p>
                <p className="text-2xl font-bold text-slate-600 mt-1">
                  {loading ? "..." : disabledCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <XCircle className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Last Reload</p>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  {lastReloadLabel}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <Clock className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search jobs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Sort Order</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading jobs...</p>
          </CardContent>
        </Card>
      ) : (
        <JobsTable
          jobs={jobs}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          sortBy={sortBy}
          onEdit={(job) => setEditJob(job)}
          onRunNow={(job) => setRunJob(job)}
          onToggle={handleToggleJob}
          onViewDetails={(job) => setDetailsJob(job)}
          onClearFilters={() => {
            setSearchQuery("")
            setStatusFilter("all")
            setSortBy("default")
          }}
          hasFilters={
            searchQuery !== "" || statusFilter !== "all" || sortBy !== "default"
          }
          canEdit={canEdit}
          canRun={canRun}
          canEnableDisable={canEnableDisable}
        />
      )}

      {/* Edit Job Dialog */}
      {editJob && (
        <EditJobDialog
          open={!!editJob}
          onOpenChange={(open) => {
            if (!open) setEditJob(null)
          }}
          job={editJob}
          onSave={async (data) => {
            await handleSaveJob(editJob.jobId, data)
          }}
        />
      )}

      {/* Run Job Dialog */}
      {runJob && (
        <RunJobDialog
          open={!!runJob}
          onOpenChange={(open) => {
            if (!open) setRunJob(null)
          }}
          job={runJob}
          onSuccess={() => {
            refetch()
          }}
        />
      )}

      {/* Reload Dialog */}
      <AlertDialog open={reloadOpen} onOpenChange={setReloadOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reload Job Schedules?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply all schedule changes from the database to Hangfire.
              This may take a few seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reloading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => {
                e.preventDefault()
                handleReload()
              }}
              disabled={reloading}
            >
              {reloading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reloading...
                </>
              ) : (
                "Reload"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job Details Dialog */}
      <JobDetailsDialog
        open={!!detailsJob}
        onOpenChange={(open) => {
          if (!open) setDetailsJob(null)
        }}
        job={detailsJob}
      />
    </div>
  )
}

