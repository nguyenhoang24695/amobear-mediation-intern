"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
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
}

export function MaintenanceUpcomingAlert({ status }: MaintenanceUpcomingAlertProps) {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!status.isUpcoming) return

    if (previousPathRef.current !== null && previousPathRef.current !== pathname) {
      setOpen(true)
    }

    previousPathRef.current = pathname
  }, [pathname, status.isUpcoming])

  if (!status.isUpcoming) return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Construction className="h-6 w-6 text-amber-600" />
          </div>
          <AlertDialogTitle className="text-center">Maintenance starting soon</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-center">
            <span className="block">
              System maintenance is scheduled to begin at{" "}
              <strong>{formatDateTime(status.enabledAt)}</strong>.
            </span>
            <span className="block">
              Please finish your current work quickly or wait until maintenance is complete to avoid
              errors or having to redo your work.
            </span>
            {status.estimatedEndAt && (
              <span className="block text-xs text-slate-500">
                Estimated completion: {formatDateTime(status.estimatedEndAt)}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={() => setOpen(false)}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
