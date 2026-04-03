"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown, Send, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface FeedbackSectionProps {
  feedbackGiven: "up" | "down" | null
  onFeedback: (type: "up" | "down") => void
}

export function FeedbackSection({ feedbackGiven, onFeedback }: FeedbackSectionProps) {
  const { toast } = useToast()
  const [showTextarea, setShowTextarea] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")

  const handleFeedback = (type: "up" | "down") => {
    onFeedback(type)
    if (type === "down") {
      setShowTextarea(true)
    } else {
      toast({
        title: "Thanks for your feedback!",
        description: "Your positive feedback helps improve our AI insights.",
      })
    }
  }

  const handleSubmitFeedback = () => {
    toast({
      title: "Feedback submitted",
      description: "Thank you for helping us improve!",
    })
    setShowTextarea(false)
    setFeedbackText("")
  }

  return (
    <Card className="p-4 bg-slate-50 border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Was this insight helpful?
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-2 bg-white",
              feedbackGiven === "up" && "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}
            onClick={() => handleFeedback("up")}
          >
            <ThumbsUp
              className={cn(
                "w-4 h-4",
                feedbackGiven === "up" && "fill-emerald-600"
              )}
            />
            Helpful
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-2 bg-white",
              feedbackGiven === "down" && "bg-red-50 border-red-200 text-red-700"
            )}
            onClick={() => handleFeedback("down")}
          >
            <ThumbsDown
              className={cn(
                "w-4 h-4",
                feedbackGiven === "down" && "fill-red-600"
              )}
            />
            Not helpful
          </Button>
        </div>
      </div>

      {/* Feedback Textarea (shown after negative feedback) */}
      {showTextarea && (
        <div className="mt-4 flex flex-col gap-3">
          <Textarea
            placeholder="Tell us how we can improve this insight... (optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="bg-white resize-none"
            rows={3}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowTextarea(false)
                setFeedbackText("")
              }}
            >
              Skip
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmitFeedback}
            >
              <Send className="w-4 h-4" />
              Submit Feedback
            </Button>
          </div>
        </div>
      )}

      {/* Thank you message */}
      {feedbackGiven && !showTextarea && (
        <p className="mt-3 text-xs text-slate-500 text-center sm:text-left">
          Thank you for your feedback! It helps us improve future insights.
        </p>
      )}
    </Card>
  )
}
