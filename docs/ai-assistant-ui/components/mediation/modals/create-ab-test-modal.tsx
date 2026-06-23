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
      <DialogContent className="max-w-2xl">
        {/* Form State */}
        {modalState === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>Test your optimized waterfall configuration</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
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
                <div className="border-l-4 border-teal-500 bg-slate-50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-teal-500" />
                    <span className="font-medium text-slate-900">Variant A (Control)</span>
                  </div>
                  <p className="text-sm text-slate-600">Current waterfall configuration</p>
                  <p className="text-xs text-slate-500 mt-1">5 waterfall sources • Est. $859/month</p>
                </div>

                {/* Variant B */}
                <div className="border-l-4 border-purple-500 bg-slate-50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-purple-500" />
                    <span className="font-medium text-slate-900">Variant B (Treatment)</span>
                  </div>
                  <p className="text-sm text-slate-600">Optimized waterfall configuration</p>
                  <p className="text-xs text-slate-500 mt-1">
                    5 waterfall sources • Est. $954/month <span className="text-green-600">(+11.1%)</span>
                  </p>
                  <button className="text-sm text-blue-600 hover:underline mt-2">View differences</button>
                </div>
              </div>

              <Separator />

              {/* Traffic Allocation */}
              <div className="space-y-3">
                <Label>Traffic Allocation</Label>
                <p className="text-sm text-slate-500">How much traffic should each variant receive?</p>

                <RadioGroup value={trafficSplit} onValueChange={setTrafficSplit}>
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      trafficSplit === "50-50" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="50-50" id="split-50" className="mt-0.5" />
                    <div>
                      <Label htmlFor="split-50" className="font-medium cursor-pointer">
                        50% / 50% (Recommended)
                      </Label>
                      <p className="text-xs text-slate-500">Equal split for fastest statistical significance</p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      trafficSplit === "70-30" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="70-30" id="split-70" className="mt-0.5" />
                    <div>
                      <Label htmlFor="split-70" className="font-medium cursor-pointer">
                        70% / 30%
                      </Label>
                      <p className="text-xs text-slate-500">More traffic to control, safer approach</p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      trafficSplit === "90-10" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="90-10" id="split-90" className="mt-0.5" />
                    <div>
                      <Label htmlFor="split-90" className="font-medium cursor-pointer">
                        90% / 10%
                      </Label>
                      <p className="text-xs text-slate-500">Minimal exposure to new variant</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Test Duration */}
              <div className="space-y-3">
                <Label>Test Duration</Label>
                <p className="text-sm text-slate-500">How long should the test run?</p>

                <RadioGroup value={duration} onValueChange={setDuration}>
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      duration === "7" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="7" id="duration-7" className="mt-0.5" />
                    <Label htmlFor="duration-7" className="font-medium cursor-pointer">
                      7 days - Quick validation
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      duration === "14" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="14" id="duration-14" className="mt-0.5" />
                    <Label htmlFor="duration-14" className="font-medium cursor-pointer">
                      14 days - Recommended for reliable results
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      duration === "30" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="30" id="duration-30" className="mt-0.5" />
                    <Label htmlFor="duration-30" className="font-medium cursor-pointer">
                      30 days - Extended testing period
                    </Label>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
                      duration === "custom" ? "bg-blue-50 border-blue-200" : "border-slate-200",
                    )}
                  >
                    <RadioGroupItem value="custom" id="duration-custom" />
                    <Label htmlFor="duration-custom" className="font-medium cursor-pointer">
                      Custom:
                    </Label>
                    <Input
                      type="number"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(e.target.value)
                        setDuration("custom")
                      }}
                      className="w-20 h-8"
                      min={1}
                      max={90}
                    />
                    <span className="text-sm text-slate-600">days</span>
                  </div>
                </RadioGroup>

                <p className="text-sm text-slate-500">
                  Estimated completion: <span className="font-medium text-slate-700">{getEstimatedCompletion()}</span>
                </p>
              </div>

              <Separator />

              {/* Warning Section */}
              <div className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Important Notes:</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside mt-1 space-y-0.5">
                    <li>The test will be created in AdMob via API</li>
                    <li>You can stop the test early at any time</li>
                    <li>Results will be available in real-time</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>
                Create & Start Test
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Loading State */}
        {modalState === "loading" && (
          <div className="py-12 px-4">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-center">Creating A/B Test...</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-700">Variant A configured</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-sm text-slate-700">Configuring Variant B...</span>
              </div>
              <div className="flex items-center gap-3">
                <Circle className="w-5 h-5 text-slate-300" />
                <span className="text-sm text-slate-400">Starting traffic split</span>
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 mt-8">Please wait, this may take a few moments.</p>
          </div>
        )}

        {/* Success State */}
        {modalState === "success" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="mb-2">A/B Test Created Successfully!</DialogTitle>
            <p className="text-sm text-slate-600 mb-2">Your test is now running in AdMob.</p>
            <p className="text-xs text-slate-500 mb-6">
              You&apos;ll be notified when results are statistically significant.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                View Test Details
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {modalState === "error" && (
          <div className="py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="mb-2">Failed to Create A/B Test</DialogTitle>
            <p className="text-sm text-slate-600 mb-4">There was an error communicating with AdMob API.</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-sm mx-auto mb-6">
              Error: Rate limit exceeded. Please try again in 5 minutes.
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
