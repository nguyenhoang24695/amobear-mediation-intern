"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileQuestion, Sparkles } from "lucide-react"

interface NoInsightStateProps {
  reason: string
  onGenerate: () => void
}

export function NoInsightState({ reason, onGenerate }: NoInsightStateProps) {
  return (
    <Card className="p-12 bg-slate-50 border-dashed border-2 border-slate-200">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FileQuestion className="w-8 h-8 text-slate-400" />
        </div>

        <h3 className="text-lg font-medium text-slate-800 mb-2">
          No Insight Available
        </h3>

        <p className="text-sm text-slate-500 max-w-md mb-6">
          {reason}
        </p>

        <Button
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          onClick={onGenerate}
        >
          <Sparkles className="w-4 h-4" />
          Generate Insight Now
        </Button>
      </div>
    </Card>
  )
}
