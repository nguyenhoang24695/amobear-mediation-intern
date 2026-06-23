"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Search,
  RefreshCw,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react"
import { JobsTable } from "./jobs-table"
import { EditJobDialog } from "./edit-job-dialog"
import { RunJobDialog } from "./run-job-dialog"

export interface Job {
  id: string
  jobId: string
  displayName: string
  enabled: boolean
  cronExpression: string
  timeZoneId: string
  jobTypeName: string
  jobMethodName: string
  updatedAt: string
  updatedAtLabel: string
  nextRun: string
}

const jobsData: Job[] = [
  {
    id: "1",
    jobId: "performance-sync",
    displayName: "Performance Sync",
    enabled: true,
    cronExpression: "0 */2 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.PerformanceSyncJob",
    jobMethodName: "ExecuteAsync",
    updatedAt: "2026-02-25T08:30:00Z",
    updatedAtLabel: "Today, 8:30 AM",
    nextRun: "Feb 25, 10:00 AM UTC",
  },
  {
    id: "2",
    jobId: "structure-sync",
    displayName: "Structure Sync",
    enabled: true,
    cronExpression: "0 0 * * *",
    timeZoneId: "Asia/Ho_Chi_Minh",
    jobTypeName: "MediationPro.Jobs.StructureSyncJob",
    jobMethodName: "ExecuteAsync",
    updatedAt: "2026-02-25T00:00:00Z",
    updatedAtLabel: "Today, 12:00 AM",
    nextRun: "Feb 26, 12:00 AM GMT+7",
  },
  {
    id: "3",
    jobId: "dashboard-cache",
    displayName: "Dashboard Cache",
    enabled: false,
    cronExpression: "0 */6 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.DashboardCacheJob",
    jobMethodName: "RefreshAsync",
    updatedAt: "2026-02-24T14:00:00Z",
    updatedAtLabel: "Yesterday, 2:00 PM",
    nextRun: "Disabled",
  },
  {
    id: "4",
    jobId: "revenue-aggregation",
    displayName: "Revenue Aggregation",
    enabled: true,
    cronExpression: "30 1 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.RevenueAggregationJob",
    jobMethodName: "ExecuteAsync",
    updatedAt: "2026-02-25T01:30:00Z",
    updatedAtLabel: "Today, 1:30 AM",
    nextRun: "Feb 26, 1:30 AM UTC",
  },
  {
    id: "5",
    jobId: "ad-network-health-check",
    displayName: "Ad Network Health Check",
    enabled: true,
    cronExpression: "*/15 * * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.AdNetworkHealthCheckJob",
    jobMethodName: "CheckAsync",
    updatedAt: "2026-02-25T09:45:00Z",
    updatedAtLabel: "Today, 9:45 AM",
    nextRun: "Feb 25, 10:00 AM UTC",
  },
  {
    id: "6",
    jobId: "user-activity-report",
    displayName: "User Activity Report",
    enabled: true,
    cronExpression: "0 6 * * 1",
    timeZoneId: "America/New_York",
    jobTypeName: "MediationPro.Jobs.UserActivityReportJob",
    jobMethodName: "GenerateAsync",
    updatedAt: "2026-02-24T06:00:00Z",
    updatedAtLabel: "Yesterday, 6:00 AM",
    nextRun: "Mar 3, 6:00 AM EST",
  },
  {
    id: "7",
    jobId: "mediation-waterfall-optimizer",
    displayName: "Waterfall Optimizer",
    enabled: true,
    cronExpression: "0 */4 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.WaterfallOptimizerJob",
    jobMethodName: "OptimizeAsync",
    updatedAt: "2026-02-25T08:00:00Z",
    updatedAtLabel: "Today, 8:00 AM",
    nextRun: "Feb 25, 12:00 PM UTC",
  },
  {
    id: "8",
    jobId: "stale-session-cleanup",
    displayName: "Stale Session Cleanup",
    enabled: false,
    cronExpression: "0 3 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.StaleSessionCleanupJob",
    jobMethodName: "CleanupAsync",
    updatedAt: "2026-02-20T03:00:00Z",
    updatedAtLabel: "Feb 20, 3:00 AM",
    nextRun: "Disabled",
  },
  {
    id: "9",
    jobId: "exchange-rate-sync",
    displayName: "Exchange Rate Sync",
    enabled: true,
    cronExpression: "0 8 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.ExchangeRateSyncJob",
    jobMethodName: "SyncAsync",
    updatedAt: "2026-02-25T08:00:00Z",
    updatedAtLabel: "Today, 8:00 AM",
    nextRun: "Feb 26, 8:00 AM UTC",
  },
  {
    id: "10",
    jobId: "alert-evaluation",
    displayName: "Alert Evaluation",
    enabled: true,
    cronExpression: "*/5 * * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.AlertEvaluationJob",
    jobMethodName: "EvaluateAsync",
    updatedAt: "2026-02-25T09:50:00Z",
    updatedAtLabel: "Today, 9:50 AM",
    nextRun: "Feb 25, 9:55 AM UTC",
  },
  {
    id: "11",
    jobId: "app-store-metadata-sync",
    displayName: "App Store Metadata Sync",
    enabled: true,
    cronExpression: "0 2 * * *",
    timeZoneId: "UTC",
    jobTypeName: "MediationPro.Jobs.AppStoreMetadataSyncJob",
    jobMethodName: "SyncAsync",
    updatedAt: "2026-02-25T02:00:00Z",
    updatedAtLabel: "Today, 2:00 AM",
    nextRun: "Feb 26, 2:00 AM UTC",
  },
  {
    id: "12",
    jobId: "backup-database",
    displayName: "Database Backup",
    enabled: true,
    cronExpression: "0 4 * * *",
    timeZoneId: "Asia/Ho_Chi_Minh",
    jobTypeName: "MediationPro.Jobs.DatabaseBackupJob",
    jobMethodName: "BackupAsync",
    updatedAt: "2026-02-25T04:00:00Z",
    updatedAtLabel: "Today, 4:00 AM",
    nextRun: "Feb 26, 4:00 AM GMT+7",
  },
]

export function JobManagementContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("default")
  const [reloadOpen, setReloadOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [runJob, setRunJob] = useState<Job | null>(null)
  const [jobs, setJobs] = useState(jobsData)

  const enabledCount = jobs.filter((j) => j.enabled).length
  const disabledCount = jobs.filter((j) => !j.enabled).length
  const lastReloadTime = "Feb 25, 9:50 AM"

  const handleReload = () => {
    setReloading(true)
    setTimeout(() => {
      setReloading(false)
      setReloadOpen(false)
    }, 2000)
  }

  const handleToggleJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, enabled: !j.enabled } : j))
    )
  }

  const handleSaveJob = (
    jobId: string,
    data: { displayName: string; cronExpression: string; timeZoneId: string; enabled: boolean }
  ) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              displayName: data.displayName,
              cronExpression: data.cronExpression,
              timeZoneId: data.timeZoneId,
              enabled: data.enabled,
            }
          : j
      )
    )
  }

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
          <Button
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => setReloadOpen(true)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Schedules
          </Button>
          <Button variant="ghost" className="text-slate-600">
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
                  {jobs.length}
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
                  {enabledCount}
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
                  {disabledCount}
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
                  {lastReloadTime}
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
      <JobsTable
        jobs={jobs}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        sortBy={sortBy}
        onEdit={(job) => setEditJob(job)}
        onRunNow={(job) => setRunJob(job)}
        onToggle={handleToggleJob}
        onClearFilters={() => {
          setSearchQuery("")
          setStatusFilter("all")
          setSortBy("default")
        }}
        hasFilters={
          searchQuery !== "" || statusFilter !== "all" || sortBy !== "default"
        }
      />

      {/* Edit Job Dialog */}
      {editJob && (
        <EditJobDialog
          open={!!editJob}
          onOpenChange={(open) => {
            if (!open) setEditJob(null)
          }}
          job={editJob}
          onSave={(data) => {
            handleSaveJob(editJob.id, data)
            setEditJob(null)
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
    </div>
  )
}
