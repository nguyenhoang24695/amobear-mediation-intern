"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Check, Loader2, CheckCircle2, XCircle, Circle, ArrowRight } from "lucide-react"

interface ApplyVariantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "direct" | "test-winner"
  changes?: {
    floorsModified: Array<{ name: string; oldValue: number; newValue: number }>
    sourcesAdded: Array<{ name: string; floor: number }>
    sourcesRemoved: Array<{ name: string }>
  }
}

type ModalState = "confirm" | "loading" | "success" | "error"

// Default mock changes
const defaultChanges = {
  floorsModified: [
    { name: "Inter81.15", oldValue: 81.15, newValue: 191.42 },
    { name: "Inter65.93", oldValue: 65.93, newValue: 153.14 },
    { name: "Inter50.72", oldValue: 50.72, newValue: 122.5 },
    { name: "Inter40.57", oldValue: 40.57, newValue: 85.75 },
    { name: "Inter30.43", oldValue: 30.43, newValue: 47.16 },
  ],
  sourcesAdded: [] as Array<{ name: string; floor: number }>,
  sourcesRemoved: [] as Array<{ name: string }>,
}

export function ApplyVariantModal({ open, onOpenChange, mode, changes = defaultChanges }: ApplyVariantModalProps) {
  const [modalState, setModalState] = useState<ModalState>("confirm")
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const totalSteps = changes.floorsModified.length + changes.sourcesAdded.length + changes.sourcesRemoved.length

  const handleApply = () => {
    setModalState("loading")
    setCurrentStep(0)
    setCompletedSteps([])

    // Simulate step-by-step progress
    let step = 0
    const interval = setInterval(() => {
      setCompletedSteps((prev) => [...prev, step])
      step++
      setCurrentStep(step)

      if (step >= totalSteps) {
        clearInterval(interval)
        setTimeout(() => setModalState("success"), 500)
      }
    }, 600)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setModalState("confirm")
      setCurrentStep(0)
      setCompletedSteps([])
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
                {changes.floorsModified.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                      {changes.floorsModified.length} eCPM floors will be updated:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      {changes.floorsModified.slice(0, 5).map((change) => (
                        <li key={change.name} className="flex items-center gap-1">
                          <span className="text-slate-500">{change.name}:</span>
                          <span className="text-slate-400">${change.oldValue.toFixed(2)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-900">${change.newValue.toFixed(2)}</span>
                        </li>
                      ))}
                      {changes.floorsModified.length > 5 && (
                        <li className="text-slate-500 italic">...and {changes.floorsModified.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Sources Added */}
                {changes.sourcesAdded.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700">
                      {changes.sourcesAdded.length} sources will be added:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      {changes.sourcesAdded.map((source) => (
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
                {changes.sourcesRemoved.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-700">
                      {changes.sourcesRemoved.length} sources will be removed:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-1 ml-4">
                      {changes.sourcesRemoved.map((source) => (
                        <li key={source.name} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="line-through">{source.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {changes.floorsModified.length === 0 &&
                  changes.sourcesAdded.length === 0 &&
                  changes.sourcesRemoved.length === 0 && (
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
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApply} disabled={totalSteps === 0}>
                Apply Changes
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading State */}
        {modalState === "loading" && (
          <div className="py-8 px-4">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-center">Applying Changes to AdMob...</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 max-w-sm mx-auto max-h-64 overflow-y-auto">
              {/* Floors */}
              {changes.floorsModified.map((change, index) => (
                <div key={change.name} className="flex items-center gap-3 text-sm py-1">
                  {completedSteps.includes(index) ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : currentStep === index ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  )}
                  <span
                    className={
                      completedSteps.includes(index)
                        ? "text-slate-700"
                        : currentStep === index
                          ? "text-slate-700"
                          : "text-slate-400"
                    }
                  >
                    {change.name}: ${change.oldValue.toFixed(2)} → ${change.newValue.toFixed(2)}
                    {completedSteps.includes(index) && <span className="text-green-500 ml-1">✓</span>}
                  </span>
                </div>
              ))}

              {/* Added Sources */}
              {changes.sourcesAdded.map((source, i) => {
                const index = changes.floorsModified.length + i
                return (
                  <div key={source.name} className="flex items-center gap-3 text-sm py-1">
                    {completedSteps.includes(index) ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : currentStep === index ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span
                      className={
                        completedSteps.includes(index)
                          ? "text-slate-700"
                          : currentStep === index
                            ? "text-slate-700"
                            : "text-slate-400"
                      }
                    >
                      Adding {source.name}
                      {completedSteps.includes(index) && <span className="text-green-500 ml-1">✓</span>}
                    </span>
                  </div>
                )
              })}

              {/* Removed Sources */}
              {changes.sourcesRemoved.map((source, i) => {
                const index = changes.floorsModified.length + changes.sourcesAdded.length + i
                return (
                  <div key={source.name} className="flex items-center gap-3 text-sm py-1">
                    {completedSteps.includes(index) ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : currentStep === index ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    )}
                    <span
                      className={
                        completedSteps.includes(index)
                          ? "text-slate-700"
                          : currentStep === index
                            ? "text-slate-700"
                            : "text-slate-400"
                      }
                    >
                      Removing {source.name}
                      {completedSteps.includes(index) && <span className="text-green-500 ml-1">✓</span>}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-sm text-amber-600 mt-6">Please wait, do not close this window.</p>
          </div>
        )}

        {/* Success State */}
        {modalState === "success" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="mb-2">Changes Applied Successfully!</DialogTitle>
            <p className="text-sm text-slate-600 mb-2">Your waterfall has been updated in AdMob.</p>
            <p className="text-xs text-slate-500 mb-1">Changes will take effect within a few minutes.</p>
            <p className="text-xs text-slate-500 mb-6">Next sync scheduled: 5 minutes</p>

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
              API rate limit exceeded. Please try again in 5 minutes.
            </div>
            <p className="text-xs text-slate-500 mb-6">
              {completedSteps.length} of {totalSteps} changes were applied successfully.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                View Details
              </Button>
              <Button variant="outline" onClick={handleApply}>
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
