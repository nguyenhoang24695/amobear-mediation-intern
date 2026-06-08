"use client"

import { Construction } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { PlatformMaintenanceStatus } from "@/lib/api/platform-maintenance"

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

interface MaintenanceUpcomingAlertProps {
  status: PlatformMaintenanceStatus
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MaintenanceUpcomingAlert({ status, open, onOpenChange }: MaintenanceUpcomingAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Construction className="h-6 w-6 text-amber-600" />
          </div>
          <AlertDialogTitle className="text-center">Maintenance starting soon</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>
                System maintenance is scheduled to begin at{" "}
                <strong className="text-foreground">{formatDateTime(status.enabledAt)}</strong>.
              </p>
              <p>
                Please finish your current work quickly or wait until maintenance is complete to avoid
                errors or having to redo your work.
              </p>
              {status.estimatedEndAt && (
                <p className="text-xs text-slate-500">
                  Estimated completion: {formatDateTime(status.estimatedEndAt)}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={() => onOpenChange(false)}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
