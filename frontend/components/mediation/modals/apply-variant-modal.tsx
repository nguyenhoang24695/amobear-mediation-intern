"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Check, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import { waterfallManagementApi } from "@/lib/api/services"

/** Dữ liệu thay đổi khi Apply Direct / Apply Winner — dùng dữ liệu thật từ waterfall optimization */
export interface ApplyDirectChanges {
  floorsModified: Array<{ name: string; lineId: string; oldValue: number; newValue: number }>
  /** adSourceId bắt buộc để backend tạo waterfall unit + mapping (ví dụ "admob" cho AdMob Network). */
  sourcesAdded: Array<{ name: string; floor: number; adSourceId: string }>
  sourcesRemoved: Array<{ name: string; lineId: string }>
}

interface ApplyVariantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "direct" | "test-winner"
  /** AdMob mediation group id (bắt buộc khi mode = direct để gọi API apply). */
  mediationGroupId?: string
  changes?: ApplyDirectChanges
  /** Gọi sau khi toàn bộ tiến trình xong (apply + sync) — đóng modal và refetch trang. */
  onSuccess?: () => void
}

type ModalState = "confirm" | "loading" | "success" | "error"

const PROCESS_STEPS = [
  { label: "Apply waterfall to AdMob", description: "Applying all changes in one request" },
  { label: "Sync from AdMob", description: "Reloading mediation group configuration" },
] as const

const emptyChanges: ApplyDirectChanges = {
  floorsModified: [],
  sourcesAdded: [],
  sourcesRemoved: [],
}

export function ApplyVariantModal({ open, onOpenChange, mode, mediationGroupId, changes, onSuccess }: ApplyVariantModalProps) {
  const effectiveChanges = changes ?? emptyChanges
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [processStep, setProcessStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const totalChangeCount =
    effectiveChanges.floorsModified.length +
    effectiveChanges.sourcesAdded.length +
    effectiveChanges.sourcesRemoved.length

  const canApplyDirect = mode === "direct" ? !!mediationGroupId && totalChangeCount > 0 : totalChangeCount > 0

  const handleApply = async () => {
    if (mode === "direct" && !mediationGroupId) return
    setModalState("loading")
    setProcessStep(0)
    setErrorMessage("")

    try {
      if (mode === "direct") {
        // Bước 1: Apply waterfall một lần cho toàn bộ thay đổi
        setProcessStep(0)
        const res = await waterfallManagementApi.apply({
          mediationGroupId: mediationGroupId!,
          floorsModified: effectiveChanges.floorsModified,
          sourcesAdded: effectiveChanges.sourcesAdded,
          sourcesRemoved: effectiveChanges.sourcesRemoved,
        })
        if (!res.success) {
          setErrorMessage(res.errorMessage ?? res.message ?? "Apply failed")
          setModalState("error")
          return
        }

        // Bước 2: Sync từ AdMob để load lại cấu hình
        setProcessStep(1)
        const syncRes = await waterfallManagementApi.sync(mediationGroupId!)
        if (!syncRes.success) {
          setErrorMessage(syncRes.error ?? "Sync failed after apply. You can use Sync Now later.")
          setModalState("error")
          return
        }

        // Kết thúc: đóng modal và reload trang
        onSuccess?.()
      } else {
        setModalState("success")
        onSuccess?.()
      }
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
      setProcessStep(0)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {/* Confirm State */}
        {modalState === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Apply Optimized Waterfall?</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600">You are about to apply the following changes to AdMob:</p>

              {/* Changes Summary Card */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                <h4 className="font-medium text-slate-900">Changes Summary</h4>

                {/* eCPM Floors Modified */}
                {effectiveChanges.floorsModified.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                      {effectiveChanges.floorsModified.length} eCPM floors will be updated:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      {effectiveChanges.floorsModified.slice(0, 5).map((change) => (
                        <li key={change.name} className="flex items-center gap-1">
                          <span className="text-slate-500">{change.name}:</span>
                          <span className="text-slate-400">${change.oldValue.toFixed(2)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-900">${change.newValue.toFixed(2)}</span>
                        </li>
                      ))}
                      {effectiveChanges.floorsModified.length > 5 && (
                        <li className="text-slate-500 italic">
                          ...and {effectiveChanges.floorsModified.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Sources Added — backend gọi AdMob batchCreate + batchCreateAdUnitMappings + patch (theo Dolphin) */}
                {effectiveChanges.sourcesAdded.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700">
                      {effectiveChanges.sourcesAdded.length} sources will be added:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      {effectiveChanges.sourcesAdded.map((source) => (
                        <li key={source.name} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span>{source.name}</span>
                          <span className="text-slate-400">at ${source.floor.toFixed(2)} floor</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sources Removed */}
                {effectiveChanges.sourcesRemoved.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-700">
                      {effectiveChanges.sourcesRemoved.length} sources will be removed:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      {effectiveChanges.sourcesRemoved.map((source) => (
                        <li key={source.name} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="line-through">{source.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {effectiveChanges.floorsModified.length === 0 &&
                  effectiveChanges.sourcesAdded.length === 0 &&
                  effectiveChanges.sourcesRemoved.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No changes to apply</p>
                  )}
              </div>

              {/* Warning Section */}
              <div className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">This action will:</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside mt-1 space-y-0.5">
                    <li>Update your AdMob mediation group immediately</li>
                    <li>Affect 100% of traffic for this ad unit</li>
                    <li>Changes will take effect within minutes</li>
                  </ul>
                </div>
              </div>

              {/* A/B Test Warning (if applicable) */}
              {mode === "direct" && (
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800 border border-purple-200">
                  <strong>Note:</strong> If an A/B test is currently running, applying these changes will stop the test
                  and apply this configuration to all traffic.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void handleApply()} disabled={!canApplyDirect}>
                Apply Changes
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading State: Apply (1 request) → Sync → sau đó onSuccess đóng modal và reload */}
        {modalState === "loading" && (
          <div className="py-8 px-4">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center">Applying &amp; Syncing...</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-w-sm mx-auto">
              {PROCESS_STEPS.map((step, index) => {
                const done = processStep > index
                const current = processStep === index
                return (
                  <div key={step.label} className="flex items-start gap-3 text-sm">
                    {done ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : current ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-slate-200 flex-shrink-0 mt-0.5" />
                    )}
                    <div className={done ? "text-slate-700" : current ? "text-slate-900 font-medium" : "text-slate-400"}>
                      <p>{step.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-sm text-amber-600 mt-6">Please wait, do not close this window.</p>
          </div>
        )}

        {/* Success State (chỉ cho test-winner; direct mode đã gọi onSuccess và đóng modal) */}
        {modalState === "success" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="mb-2">Done</DialogTitle>
            <p className="text-sm text-slate-600 mb-6">The page will refresh.</p>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {/* Error State */}
        {modalState === "error" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="mb-2">Failed to Apply Changes</DialogTitle>
            <p className="text-sm text-slate-600 mb-4">There was an error updating AdMob:</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-sm mx-auto mb-2">
              {errorMessage || "Unknown error. Please try again."}
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Check AdMob token and network, then retry.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => void handleApply()}>
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
