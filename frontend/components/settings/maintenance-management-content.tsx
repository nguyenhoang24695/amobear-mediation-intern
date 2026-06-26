"use client"

import { useCallback, useEffect, useState } from "react"
import { Construction, History, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  datetimeLocalToIso,
  getAdminMaintenanceStatus,
  getMaintenanceHistory,
  setMaintenanceEnabled,
  toDatetimeLocalValue,
  type PlatformMaintenanceHistoryItem,
  type PlatformMaintenanceStatus,
} from "@/lib/api/platform-maintenance"

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadge(status: PlatformMaintenanceStatus | null) {
  if (!status?.enabled) return { label: "OFF", variant: "secondary" as const }
  if (status.isUpcoming) return { label: "SCHEDULED", variant: "outline" as const }
  return { label: "ON", variant: "destructive" as const }
}

function historyStatusBadge(item: PlatformMaintenanceHistoryItem) {
  if (item.isScheduled) return { label: "Scheduled", variant: "outline" as const }
  if (item.isActive) return { label: "In progress", variant: "destructive" as const }
  return { label: "Completed", variant: "secondary" as const }
}

export function MaintenanceManagementContent() {
  const { toast } = useToast()
  const [status, setStatus] = useState<PlatformMaintenanceStatus | null>(null)
  const [history, setHistory] = useState<PlatformMaintenanceHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false)
  const [scheduledStartLocal, setScheduledStartLocal] = useState(() => toDatetimeLocalValue(new Date()))

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    try {
      const data = await getMaintenanceHistory()
      setHistory(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load maintenance history"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsHistoryLoading(false)
    }
  }, [toast])

  const loadStatus = useCallback(async () => {
    try {
      const data = await getAdminMaintenanceStatus()
      setStatus(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load maintenance status"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadStatus()
    loadHistory()
  }, [loadStatus, loadHistory])

  const applyEnabled = async (enabled: boolean, scheduledStartAt?: string) => {
    setIsSaving(true)
    try {
      const data = await setMaintenanceEnabled(enabled, scheduledStartAt)
      setStatus(data)
      await loadHistory()
      toast({
        title: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
        description: enabled
          ? data.isUpcoming
            ? "Users can continue working until the scheduled start time. They will see a warning when navigating."
            : "Non–super admin users will be redirected to the maintenance notice page."
          : "The system is operating normally.",
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update maintenance status"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
      setConfirmEnableOpen(false)
    }
  }

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setScheduledStartLocal(toDatetimeLocalValue(new Date()))
      setConfirmEnableOpen(true)
    } else {
      applyEnabled(false)
    }
  }

  const badge = statusBadge(status)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold ">Maintenance Management</h1>
        <p className="mt-1 text-sm ">
          Schedule or enable maintenance mode to redirect users while the system is being upgraded.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Construction className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Maintenance Mode</CardTitle>
              <CardDescription>
                Users can keep working until the scheduled start. After that, non–super admins see
                the maintenance notice (~10 minutes ETA).
              </CardDescription>
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="maintenance-toggle" className="text-base font-medium">
                Enable maintenance mode
              </Label>
              <p className="text-sm text-slate-500">
                Super admins can still access this page to turn it off when finished.
              </p>
            </div>
            <Switch
              id="maintenance-toggle"
              checked={status?.enabled ?? false}
              onCheckedChange={handleToggle}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled start</p>
              <p className="mt-1 font-medium">{formatDateTime(status?.enabledAt ?? null)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated completion</p>
              <p className="mt-1 font-medium">{formatDateTime(status?.estimatedEndAt ?? null)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last updated</p>
              <p className="mt-1 font-medium">{formatDateTime(status?.updatedAt ?? null)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Updated by</p>
              <p className="mt-1 font-medium">{status?.updatedByEmail ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <History className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg">History</CardTitle>
              <CardDescription>Maintenance sessions (each ON → OFF cycle)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No maintenance history yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Status</TableHead>
                    <TableHead>Started at</TableHead>
                    <TableHead>Started by</TableHead>
                    <TableHead>Ended at</TableHead>
                    <TableHead>Ended by</TableHead>
                    <TableHead>Est. completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const itemBadge = historyStatusBadge(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={itemBadge.variant}>{itemBadge.label}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(item.startedAt)}</TableCell>
                        <TableCell>{item.startedByEmail ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.endedAt ? formatDateTime(item.endedAt) : "—"}
                        </TableCell>
                        <TableCell>{item.endedByEmail ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.isActive || item.isScheduled ? formatDateTime(item.estimatedEndAt) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmEnableOpen} onOpenChange={setConfirmEnableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable maintenance mode?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Set when maintenance should begin. Before that time, users can continue working
                  normally but will see a warning when navigating between pages.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="scheduled-start">Scheduled start</Label>
                  <Input
                    id="scheduled-start"
                    type="datetime-local"
                    value={scheduledStartLocal}
                    onChange={(e) => setScheduledStartLocal(e.target.value)}
                    disabled={isSaving}
                  />
                  <p className="text-xs">
                    Use the current time to start maintenance immediately. Estimated completion is
                    10 minutes after the scheduled start.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving || !scheduledStartLocal}
              onClick={(e) => {
                e.preventDefault()
                applyEnabled(true, datetimeLocalToIso(scheduledStartLocal))
              }}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable maintenance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
