"use client"

import { useCallback, useEffect, useState } from "react"
import { Construction, History, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  getAdminMaintenanceStatus,
  getMaintenanceHistory,
  setMaintenanceEnabled,
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

export function MaintenanceManagementContent() {
  const { toast } = useToast()
  const [status, setStatus] = useState<PlatformMaintenanceStatus | null>(null)
  const [history, setHistory] = useState<PlatformMaintenanceHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false)

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

  const applyEnabled = async (enabled: boolean) => {
    setIsSaving(true)
    try {
      const data = await setMaintenanceEnabled(enabled)
      setStatus(data)
      await loadHistory()
      toast({
        title: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
        description: enabled
          ? "Non–super admin users will be redirected to the maintenance notice page."
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
      setConfirmEnableOpen(true)
    } else {
      applyEnabled(false)
    }
  }

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
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enable maintenance mode to redirect users while the system is being upgraded.
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
                When enabled, non–super admin users see a maintenance notice (~10 minutes ETA).
              </CardDescription>
            </div>
            <Badge variant={status?.enabled ? "destructive" : "secondary"}>
              {status?.enabled ? "ON" : "OFF"}
            </Badge>
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
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Started at</p>
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
              <CardDescription>Recent maintenance mode changes</CardDescription>
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
                    <TableHead>Action</TableHead>
                    <TableHead>Changed at</TableHead>
                    <TableHead>Changed by</TableHead>
                    <TableHead>Maintenance started</TableHead>
                    <TableHead>Est. completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant={item.enabled ? "destructive" : "secondary"}>
                          {item.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(item.changedAt)}</TableCell>
                      <TableCell>{item.changedByEmail ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(item.maintenanceStartedAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.enabled ? formatDateTime(item.estimatedEndAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
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
            <AlertDialogDescription>
              All users except super admins will be redirected to the maintenance notice page.
              Estimated completion is within 10 minutes from the time maintenance is enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(e) => {
                e.preventDefault()
                applyEnabled(true)
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
