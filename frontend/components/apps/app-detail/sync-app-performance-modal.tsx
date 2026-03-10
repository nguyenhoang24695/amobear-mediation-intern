"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"
import { structureApi } from "@/lib/api/services"

interface SyncAppPerformanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  appName?: string | null
}

type ModalState = "confirm" | "loading" | "success" | "error"

export function SyncAppPerformanceModal({
  open,
  onOpenChange,
  appId,
  appName,
}: SyncAppPerformanceModalProps) {
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [errorMessage, setErrorMessage] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)

  const resetState = () => {
    setModalState("confirm")
    setErrorMessage("")
    setJobId(null)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onOpenChange(false)
      setTimeout(resetState, 200)
      return
    }

    onOpenChange(nextOpen)
  }

  const handleQueue = async () => {
    if (!appId) return

    setModalState("loading")
    setErrorMessage("")
    setJobId(null)

    try {
      const response = await structureApi.syncAppPerformance(appId)
      setJobId(response.jobId ?? null)
      setModalState("success")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setErrorMessage(message)
      setModalState("error")
    }
  }

  const displayName = appName || appId

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {modalState === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-slate-600" />
                Queue Performance Sync?
              </DialogTitle>
              <DialogDescription>
                This will start an AdMob performance sync for this app in the background.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">{displayName}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{appId}</div>
              </div>

              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">This action will:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-600">
                    <li>Queue a background performance sync job for this app</li>
                    <li>Return immediately without blocking this page</li>
                    <li>Write progress into Activity Logs when the worker starts and completes</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void handleQueue()}>
                Queue Sync
              </Button>
            </DialogFooter>
          </>
        )}

        {modalState === "loading" && (
          <div className="px-4 py-10">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex items-center justify-center gap-2 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Queueing Performance Sync...
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-slate-600">
              Sending the background job request. This should only take a moment.
            </p>
          </div>
        )}

        {modalState === "success" && (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="mb-2">Sync Queued</DialogTitle>
            <p className="mb-2 text-sm text-slate-600">
              Performance sync is now running in the background for this app.
            </p>
            {jobId && (
              <p className="mb-6 text-xs text-slate-500">
                Job ID: <span className="font-mono text-slate-700">{jobId}</span>
              </p>
            )}
            {!jobId && (
              <p className="mb-6 text-xs text-slate-500">Check Activity Logs for progress and completion status.</p>
            )}

            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        )}

        {modalState === "error" && (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="mb-2">Queue Failed</DialogTitle>
            <p className="mb-4 text-sm text-slate-600">Could not queue performance sync:</p>
            <div className="mx-auto mb-2 max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage || "Unknown error. Please try again."}
            </div>
            <p className="mb-6 text-xs text-slate-500">Check app permissions and background job service, then retry.</p>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => void handleQueue()}>
                Retry
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleClose(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
