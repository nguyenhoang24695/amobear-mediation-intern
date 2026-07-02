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
    <Card className="border-2 border-dashed border-border/70 bg-card p-12 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>

        <h3 className="mb-2 text-lg font-medium text-foreground">
          No Insight Available
        </h3>

        <p className="mb-6 max-w-md text-sm text-muted-foreground">
          {reason}
        </p>

        <Button
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onGenerate}
        >
          <Sparkles className="w-4 h-4" />
          Generate Insight Now
        </Button>
      </div>
    </Card>
  )
}
