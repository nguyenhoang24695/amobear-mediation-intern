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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Check, Loader2, CheckCircle2, XCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateABTestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ModalState = "form" | "loading" | "success" | "error"

export function CreateABTestModal({ open, onOpenChange }: CreateABTestModalProps) {
  const [modalState, setModalState] = useState<ModalState>("form")
  const [testName, setTestName] = useState("Waterfall Optimization Test #3")
  const [trafficSplit, setTrafficSplit] = useState("50-50")
  const [duration, setDuration] = useState("14")
  const [customDuration, setCustomDuration] = useState("")

  const handleCreate = () => {
    setModalState("loading")
    // Simulate API call
    setTimeout(() => {
      setModalState("success")
    }, 3000)
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after close animation
    setTimeout(() => {
      setModalState("form")
      setTestName("Waterfall Optimization Test #3")
      setTrafficSplit("50-50")
      setDuration("14")
      setCustomDuration("")
    }, 200)
  }

  const getEstimatedCompletion = () => {
    const days = duration === "custom" ? Number.parseInt(customDuration) || 0 : Number.parseInt(duration)
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        {/* Form State */}
        {modalState === "form" && (
          <>
            <DialogHeader className="px-4 pt-5 sm:px-6 sm:pt-6">
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>Test your optimized waterfall configuration</DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
              {/* Test Name */}
              <div className="space-y-2">
                <Label htmlFor="test-name">Test Name</Label>
                <Input
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* Variants (read-only) */}
              <div className="space-y-3">
                <Label>Variants</Label>

                {/* Variant A */}
                <div className="rounded-r-lg border-l-4 border-teal-500 bg-muted/60 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-teal-500" />
                    <span className="font-medium text-foreground">Variant A (Control)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Current waterfall configuration</p>
                  <p className="mt-1 text-xs text-muted-foreground">5 waterfall sources • Est. $859/month</p>
                </div>

                {/* Variant B */}
                <div className="rounded-r-lg border-l-4 border-purple-500 bg-muted/60 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-purple-500" />
                    <span className="font-medium text-foreground">Variant B (Treatment)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Optimized waterfall configuration</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    5 waterfall sources • Est. $954/month <span className="text-green-600 dark:text-green-400">(+11.1%)</span>
                  </p>
                  <button className="mt-2 text-sm text-primary hover:underline">View differences</button>
                </div>
              </div>

              <Separator />

              {/* Traffic Allocation */}
              <div className="space-y-3">
                <Label>Traffic Allocation</Label>
                <p className="text-sm text-muted-foreground">How much traffic should each variant receive?</p>

                <RadioGroup value={trafficSplit} onValueChange={setTrafficSplit} className="gap-2">
                  <div
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      trafficSplit === "50-50" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="50-50" id="split-50" className="mt-0.5" />
                    <div>
                      <Label htmlFor="split-50" className="cursor-pointer font-medium">
                        50% / 50% (Recommended)
                      </Label>
                      <p className="text-xs text-muted-foreground">Equal split for fastest statistical significance</p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      trafficSplit === "70-30" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="70-30" id="split-70" className="mt-0.5" />
                    <div>
                      <Label htmlFor="split-70" className="cursor-pointer font-medium">
                        70% / 30%
                      </Label>
                      <p className="text-xs text-muted-foreground">More traffic to control, safer approach</p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      trafficSplit === "90-10" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="90-10" id="split-90" className="mt-0.5" />
                    <div>
                      <Label htmlFor="split-90" className="cursor-pointer font-medium">
                        90% / 10%
                      </Label>
                      <p className="text-xs text-muted-foreground">Minimal exposure to new variant</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Test Duration */}
              <div className="space-y-3">
                <Label>Test Duration</Label>
                <p className="text-sm text-muted-foreground">How long should the test run?</p>

                <RadioGroup value={duration} onValueChange={setDuration} className="gap-2">
                  <div
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      duration === "7" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="7" id="duration-7" className="mt-0.5" />
                    <Label htmlFor="duration-7" className="cursor-pointer font-medium">
                      7 days - Quick validation
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      duration === "14" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="14" id="duration-14" className="mt-0.5" />
                    <Label htmlFor="duration-14" className="cursor-pointer font-medium">
                      14 days - Recommended for reliable results
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      duration === "30" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="30" id="duration-30" className="mt-0.5" />
                    <Label htmlFor="duration-30" className="cursor-pointer font-medium">
                      30 days - Extended testing period
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors",
                      duration === "custom" ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <RadioGroupItem value="custom" id="duration-custom" />
                    <Label htmlFor="duration-custom" className="cursor-pointer font-medium">
                      Custom:
                    </Label>
                    <Input
                      type="number"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(e.target.value)
                        setDuration("custom")
                      }}
                      className="h-8 w-24"
                      min={1}
                      max={90}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </RadioGroup>

                <p className="text-sm text-muted-foreground">
                  Estimated completion: <span className="font-medium text-foreground">{getEstimatedCompletion()}</span>
                </p>
              </div>

              <Separator />

              {/* Warning Section */}
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/70 dark:bg-amber-950/40">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Important Notes:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                    <li>The test will be created in AdMob via API</li>
                    <li>You can stop the test early at any time</li>
                    <li>Results will be available in real-time</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border px-4 py-4 sm:px-6">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleCreate}>
                Create & Start Test
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading State */}
        {modalState === "loading" && (
          <div className="px-4 py-12 sm:px-6">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-center">Creating A/B Test...</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-foreground">Variant A configured</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-foreground">Configuring Variant B...</span>
              </div>
              <div className="flex items-center gap-3">
                <Circle className="h-5 w-5 text-muted-foreground/40" />
                <span className="text-sm text-muted-foreground">Starting traffic split</span>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">Please wait, this may take a few moments.</p>
          </div>
        )}

        {/* Success State */}
        {modalState === "success" && (
          <div className="px-4 py-12 text-center sm:px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <DialogTitle className="mb-2">A/B Test Created Successfully!</DialogTitle>
            <p className="mb-2 text-sm text-muted-foreground">Your test is now running in AdMob.</p>
            <p className="mb-6 text-xs text-muted-foreground">
              You&apos;ll be notified when results are statistically significant.
            </p>

            <div className="flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleClose}>
                View Test Details
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {modalState === "error" && (
          <div className="px-4 py-12 text-center sm:px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
            </div>
            <DialogTitle className="mb-2">Failed to Create A/B Test</DialogTitle>
            <p className="mb-4 text-sm text-muted-foreground">There was an error communicating with AdMob API.</p>
            <div className="mx-auto mb-6 max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              Error: Rate limit exceeded. Please try again in 5 minutes.
            </div>

            <div className="flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleClose}>
                Close
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleCreate}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
