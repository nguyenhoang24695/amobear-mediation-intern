"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function PreviewTest() {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [lastPreviewTime, setLastPreviewTime] = useState<string | null>(null)

  const samplePreview = `# Puzzle Blast - Weekly Insight Report

## Executive Summary
- Overall health score: 8.5/10 (↑ +0.5 from last week)
- Revenue trending positively with new monetization test
- Engagement steady with slight increase in DAU
- One anomaly detected in rewarded video completion rates

## Revenue & Monetization
- Total Revenue: $45,230 (↑ +12% WoW)
- eCPM Average: $4.52 (↑ +0.25 from last week)
- **Focus Area**: Rewarded video format showing strong performance as revenue driver
  - Rewarded Video eCPM: $6.20 (↑ +15% since AB test on 15/03)
  - Fill Rate: 96% (excellent)
  - Impression Share: 38% of total impressions

- Rewarded video frequency test (3 vs 5 levels) shows 3-level placement has 8% higher completion
- Recommendation: Consider rolling out 3-level placement across 20% more users

## Users & Engagement
- DAU: 2.14M (↑ +2% WoW)
- Session Length: 24 min (stable)
- Retention D1/D7: 42%/18% (within expected range)

## Game Health
- Drop Rate: 18% average (within target)
- Win Rate: 58% (healthy)
- Level Design performing well across all worlds

## UA & Growth
- CPI: $0.85 (↓ -5% from target, excellent)
- Install Volume: 156K (+8% WoW)
- Highest performing regions: US, UK, India

## Recommendations
1. Scale rewarded video to additional user cohorts
2. Monitor weekday vs weekend engagement patterns
3. Prepare for next major content update (50 new levels planned)`

  const handleGeneratePreview = async () => {
    setIsGenerating(true)
    toast({
      title: "Generating preview...",
      description: "Creating a sample insight with current configuration",
    })

    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 2500))

    setPreview(samplePreview)
    setLastPreviewTime(new Date().toLocaleString())
    setIsGenerating(false)

    toast({
      title: "Preview Generated",
      description: "Sample insight has been created successfully",
    })
  }

  return (
    <Card className="border-2 border-dashed border-slate-300 p-6">
      <div className="flex items-start justify-between gap-6 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Preview Insight</h3>
          </div>
          <p className="text-sm text-slate-600">
            Generate a sample insight using current configuration with real T-1 data
          </p>
        </div>
        {lastPreviewTime && (
          <div className="text-right">
            <p className="text-xs text-slate-600">Last preview</p>
            <p className="text-xs font-mono text-slate-900">{lastPreviewTime}</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleGeneratePreview}
        disabled={isGenerating}
        variant="outline"
        className="gap-2 mb-6"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Generate Preview
          </>
        )}
      </Button>

      {preview ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="prose prose-sm max-w-none">
            <div className="prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900">
              {preview.split("\n").map((line, idx) => {
                if (line.startsWith("# ")) {
                  return (
                    <h1 key={idx} className="text-xl font-bold mt-4 mb-2">
                      {line.replace("# ", "")}
                    </h1>
                  )
                } else if (line.startsWith("## ")) {
                  return (
                    <h2 key={idx} className="text-lg font-semibold mt-3 mb-2">
                      {line.replace("## ", "")}
                    </h2>
                  )
                } else if (line.startsWith("- ")) {
                  return (
                    <li key={idx} className="ml-4 text-slate-700">
                      {line.replace("- ", "")}
                    </li>
                  )
                } else if (line.startsWith("1. ") || line.match(/^\d+\./)) {
                  const match = line.match(/^\d+\.\s(.+)/)
                  return (
                    <li key={idx} className="ml-4 text-slate-700 list-decimal list-inside">
                      {match ? match[1] : line}
                    </li>
                  )
                } else if (line.trim()) {
                  return (
                    <p key={idx} className="text-slate-700 mb-2">
                      {line}
                    </p>
                  )
                }
                return null
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-slate-50 rounded-lg border border-slate-200">
          <Eye className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">No preview generated yet</p>
          <p className="text-sm text-slate-500">Click &quot;Generate Preview&quot; to see a sample of how the insight will look</p>
        </div>
      )}
    </Card>
  )
}
