"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Database, Brain, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { icon: Database, label: "Fetching app data...", duration: 1000 },
  { icon: Brain, label: "Analyzing performance metrics...", duration: 1500 },
  { icon: Sparkles, label: "Generating insights with AI...", duration: 2000 },
  { icon: FileText, label: "Formatting report...", duration: 500 },
]

export function InsightGeneratingState() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0)
    let elapsed = 0

    const interval = setInterval(() => {
      elapsed += 100
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100)
      setProgress(newProgress)

      // Calculate current step
      let stepElapsed = 0
      for (let i = 0; i < steps.length; i++) {
        stepElapsed += steps[i].duration
        if (elapsed < stepElapsed) {
          setCurrentStep(i)
          break
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="p-12 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
      <div className="flex flex-col items-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </div>
          <div className="absolute -inset-4 rounded-3xl border-2 border-indigo-200 animate-ping opacity-20" />
        </div>

        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          Generating AI Insight
        </h3>

        <p className="text-sm text-slate-500 mb-8">
          This usually takes 10-15 seconds
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3 w-full max-w-md">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isComplete = index < currentStep

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all",
                  isActive && "bg-indigo-50 border border-indigo-200",
                  isComplete && "bg-emerald-50 border border-emerald-200",
                  !isActive && !isComplete && "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive && "bg-indigo-100",
                    isComplete && "bg-emerald-100",
                    !isActive && !isComplete && "bg-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isActive && "text-indigo-600 animate-pulse",
                      isComplete && "text-emerald-600",
                      !isActive && !isComplete && "text-slate-400"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive && "text-indigo-700",
                    isComplete && "text-emerald-700",
                    !isActive && !isComplete && "text-slate-400"
                  )}
                >
                  {step.label}
                </span>
                {isComplete && (
                  <span className="ml-auto text-xs text-emerald-600">Done</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
