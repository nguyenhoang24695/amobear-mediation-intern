"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, Check, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"
import { waterfallManagementApi } from "@/lib/api/services"

/** Dữ liệu thay đổi khi Apply Direct / Apply Winner — dùng dữ liệu thật từ waterfall optimization */
export interface ApplyDirectChanges {
  floorsModified: Array<{ name: string; lineId: string; oldValue: number; newValue: number }>
  /** adSourceId bắt buộc để backend tạo waterfall unit + mapping (ví dụ "admob" cho AdMob Network). */
  sourcesAdded: Array<{ name: string; floor: number; adSourceId: string }>
  sourcesRemoved: Array<{ name: string; lineId: string }>
  /** Ad units thuộc mediation group để user chọn phạm vi apply. */
  adUnits: Array<{ adUnitKey: string; displayName: string }>
  /** Danh sách ad units được chọn mặc định khi mở modal. */
  selectedAdUnitKeys: string[]
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
  adUnits: [],
  selectedAdUnitKeys: [],
}

export function ApplyVariantModal({ open, onOpenChange, mode, mediationGroupId, changes, onSuccess }: ApplyVariantModalProps) {
  const effectiveChanges = changes ?? emptyChanges
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [processStep, setProcessStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [selectedAdUnitKeys, setSelectedAdUnitKeys] = useState<string[]>([])

  const totalChangeCount =
    effectiveChanges.floorsModified.length +
    effectiveChanges.sourcesAdded.length +
    effectiveChanges.sourcesRemoved.length
  const availableAdUnits = effectiveChanges.adUnits ?? []
  const selectedAdUnitKeySet = new Set(selectedAdUnitKeys)

  useEffect(() => {
    if (!open) return
    const fallbackSelected = effectiveChanges.selectedAdUnitKeys?.length
      ? effectiveChanges.selectedAdUnitKeys
      : availableAdUnits.map((unit) => unit.adUnitKey)
    setSelectedAdUnitKeys(Array.from(new Set(fallbackSelected)))
  }, [open, effectiveChanges.selectedAdUnitKeys, availableAdUnits])

  const canApplyDirect = mode === "direct"
    ? !!mediationGroupId && totalChangeCount > 0 && selectedAdUnitKeys.length > 0
    : totalChangeCount > 0

  const toggleAdUnit = (adUnitKey: string) => {
    setSelectedAdUnitKeys((prev) =>
      prev.includes(adUnitKey)
        ? prev.filter((key) => key !== adUnitKey)
        : [...prev, adUnitKey])
  }

  const toggleSelectAllAdUnits = () => {
    if (selectedAdUnitKeys.length === availableAdUnits.length) {
      setSelectedAdUnitKeys([])
      return
    }
    setSelectedAdUnitKeys(availableAdUnits.map((unit) => unit.adUnitKey))
  }

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
          selectedAdUnitKeys,
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
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        {/* Confirm State */}
        {modalState === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Apply Optimized Waterfall?</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">You are about to apply the following changes to AdMob:</p>

              {/* Changes Summary Card */}
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/40 p-4">
                <h4 className="font-medium text-foreground">Changes Summary</h4>

                {/* eCPM Floors Modified */}
                {effectiveChanges.floorsModified.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {effectiveChanges.floorsModified.length} eCPM floors will be updated:
                    </p>
                    <ul className="ml-0 space-y-1 text-sm text-muted-foreground sm:ml-4">
                      {effectiveChanges.floorsModified.slice(0, 5).map((change) => (
                        <li key={change.name} className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <span className="min-w-0 break-words text-muted-foreground">{change.name}:</span>
                          <span className="text-muted-foreground">${change.oldValue.toFixed(2)}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground">${change.newValue.toFixed(2)}</span>
                        </li>
                      ))}
                      {effectiveChanges.floorsModified.length > 5 && (
                        <li className="italic text-muted-foreground">
                          ...and {effectiveChanges.floorsModified.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Sources Added — backend gọi AdMob batchCreate + batchCreateAdUnitMappings + patch (theo Dolphin) */}
                {effectiveChanges.sourcesAdded.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {effectiveChanges.sourcesAdded.length} sources will be added:
                    </p>
                    <ul className="ml-0 space-y-1 text-sm text-muted-foreground sm:ml-4">
                      {effectiveChanges.sourcesAdded.map((source) => (
                        <li key={source.name} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span className="min-w-0 break-words">
                            {source.name}{" "}
                            <span className="text-muted-foreground">at ${source.floor.toFixed(2)} floor</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sources Removed */}
                {effectiveChanges.sourcesRemoved.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">
                      {effectiveChanges.sourcesRemoved.length} sources will be removed:
                    </p>
                    <ul className="ml-0 space-y-1 text-sm text-muted-foreground sm:ml-4">
                      {effectiveChanges.sourcesRemoved.map((source) => (
                        <li key={source.name} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                          <span className="min-w-0 break-words line-through">{source.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {effectiveChanges.floorsModified.length === 0 &&
                  effectiveChanges.sourcesAdded.length === 0 &&
                  effectiveChanges.sourcesRemoved.length === 0 && (
                    <p className="text-sm italic text-muted-foreground">No changes to apply</p>
                  )}
              </div>

              {mode === "direct" && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground">Apply for ad units</h4>
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={toggleSelectAllAdUnits}>
                      {selectedAdUnitKeys.length === availableAdUnits.length ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only selected ad units will be affected by this apply.
                  </p>
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {availableAdUnits.map((unit) => (
                      <label key={unit.adUnitKey} className="flex items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                        <Checkbox
                          checked={selectedAdUnitKeySet.has(unit.adUnitKey)}
                          onCheckedChange={() => toggleAdUnit(unit.adUnitKey)}
                        />
                        <span className="min-w-0 break-words text-sm text-foreground">
                          {unit.displayName}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedAdUnitKeys.length}/{availableAdUnits.length}
                  </p>
                </div>
              )}

              {/* Warning Section */}
              <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-foreground">This action will:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    <li>Update your AdMob mediation group immediately</li>
                    <li>Affect 100% of traffic for this ad unit</li>
                    <li>Changes will take effect within minutes</li>
                  </ul>
                </div>
              </div>

              {/* A/B Test Warning (if applicable) */}
              {mode === "direct" && (
                <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-foreground">
                  <strong>Note:</strong> If an A/B test is currently running, applying these changes will stop the test
                  and apply this configuration to all traffic.
                </div>
              )}
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => void handleApply()} disabled={!canApplyDirect}>
                Apply Changes
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading State: Apply (1 request) → Sync → sau đó onSuccess đóng modal và reload */}
        {modalState === "loading" && (
          <div className="px-4 py-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center">Applying &amp; Syncing...</DialogTitle>
            </DialogHeader>

            <div className="mx-auto max-w-sm space-y-4">
              {PROCESS_STEPS.map((step, index) => {
                const done = processStep > index
                const current = processStep === index
                return (
                  <div key={step.label} className="flex items-start gap-3 text-sm">
                    {done ? (
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-300" />
                    ) : current ? (
                      <Loader2 className="mt-0.5 h-5 w-5 flex-shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 border-border" />
                    )}
                    <div className={done ? "text-foreground" : current ? "font-medium text-foreground" : "text-muted-foreground"}>
                      <p>{step.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-6 text-center text-sm text-amber-700 dark:text-amber-300">Please wait, do not close this window.</p>
          </div>
        )}

        {/* Success State (chỉ cho test-winner; direct mode đã gọi onSuccess và đóng modal) */}
        {modalState === "success" && (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
            </div>
            <DialogTitle className="mb-2">Done</DialogTitle>
            <p className="mb-6 text-sm text-muted-foreground">The page will refresh.</p>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {/* Error State */}
        {modalState === "error" && (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="mb-2">Failed to Apply Changes</DialogTitle>
            <p className="mb-4 text-sm text-muted-foreground">There was an error updating AdMob:</p>
            <div className="mx-auto mb-2 max-w-sm break-words rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage || "Unknown error. Please try again."}
            </div>
            <p className="mb-6 text-xs text-muted-foreground">
              Check AdMob token and network, then retry.
            </p>

            <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button variant="outline" onClick={() => void handleApply()}>
                Retry
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
