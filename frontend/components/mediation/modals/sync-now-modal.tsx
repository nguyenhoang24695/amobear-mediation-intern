"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { waterfallManagementApi } from "@/lib/api/services"

interface SyncNowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** AdMob mediation group id (bắt buộc để gọi API sync). */
  mediationGroupId: string
  /** Gọi sau khi sync thành công (để refetch group detail / cache). */
  onSuccess?: () => void
}

type ModalState = "confirm" | "loading" | "success" | "error"

function formatTimestamp(iso?: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

export function SyncNowModal({ open, onOpenChange, mediationGroupId, onSuccess }: SyncNowModalProps) {
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const handleSync = async () => {
    if (!mediationGroupId) return
    setModalState("loading")
    setErrorMessage("")
    setUpdatedAt(null)

    try {
      const res = await waterfallManagementApi.sync(mediationGroupId)
      if (!res.success) {
        setErrorMessage(res.error ?? "Sync failed")
        setModalState("error")
        return
      }
      setUpdatedAt(res.updatedAt ?? null)
      setModalState("success")
      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      setModalState("error")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setModalState("confirm")
      setErrorMessage("")
      setUpdatedAt(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {/* Confirm */}
        {modalState === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-slate-600" />
                Sync from AdMob?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600">
                This will reload the mediation group and waterfall configuration from AdMob into this app. Use this after
                you have made changes in AdMob or to refresh the current configuration.
              </p>

              <div className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">This action will:</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside mt-1 space-y-0.5">
                    <li>Fetch the latest mediation group and waterfall from AdMob</li>
                    <li>Update the data shown in this page</li>
                    <li>Not apply any new waterfall — only sync existing data</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void handleSync()}>
                Sync Now
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading */}
        {modalState === "loading" && (
          <div className="py-10 px-4">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                Syncing from AdMob...
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-slate-600">
              Loading mediation group and waterfall configuration. Please wait.
            </p>
          </div>
        )}

        {/* Success */}
        {modalState === "success" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="mb-2">Sync Complete</DialogTitle>
            <p className="text-sm text-slate-600 mb-2">Mediation group has been synced from AdMob.</p>
            {updatedAt && (
              <p className="text-xs text-slate-500 mb-6">
                Last updated: <span className="font-medium text-slate-700">{formatTimestamp(updatedAt)}</span>
              </p>
            )}
            {!updatedAt && <p className="text-xs text-slate-500 mb-6">The page data will refresh.</p>}

            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {/* Error */}
        {modalState === "error" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="mb-2">Sync Failed</DialogTitle>
            <p className="text-sm text-slate-600 mb-4">Could not sync from AdMob:</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-sm mx-auto mb-2">
              {errorMessage || "Unknown error. Please try again."}
            </div>
            <p className="text-xs text-slate-500 mb-6">Check AdMob token and network, then retry.</p>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => void handleSync()}>
                Retry
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
