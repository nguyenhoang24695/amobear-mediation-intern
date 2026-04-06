"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Lightbulb } from "lucide-react"

interface AddEditContextModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingContext?: any
  onSave: (data: any) => void
}

const contextTypes = [
  { id: "game-design", label: "Game Design", desc: "Level design, progression, mechanics, difficulty curves", icon: "🎮" },
  { id: "monetization", label: "Monetization", desc: "IAP packages, ad placements, subscription tiers, pricing strategy", icon: "💰" },
  { id: "user-flow", label: "User Flow", desc: "Onboarding, core loop, session structure, retention hooks", icon: "🔄" },
  { id: "geo-strategy", label: "Geo Strategy", desc: "Country-specific strategies, localization, pricing tiers", icon: "🌍" },
  { id: "ua-campaigns", label: "UA & Campaigns", desc: "Acquisition channels, target audiences, creative strategies", icon: "🎯" },
  { id: "ab-tests", label: "A/B Tests & Experiments", desc: "Currently running experiments, recently concluded tests", icon: "🧪" },
  { id: "custom", label: "Custom", desc: "Any other context relevant for AI analysis", icon: "📝" },
]

const sections = [
  "Executive Summary",
  "Revenue & Monetization",
  "Users & Engagement",
  "Game Health",
  "UA & Growth",
  "Anomalies & Alerts",
  "Recommendations",
]

export function AddEditContextModal({
  isOpen,
  onOpenChange,
  editingContext,
  onSave,
}: AddEditContextModalProps) {
  const [type, setType] = useState(editingContext?.type || "game-design")
  const [title, setTitle] = useState(editingContext?.title || "")
  const [content, setContent] = useState(
    editingContext?.content || 
    "Mô tả chi tiết về app/game ở đây. Ví dụ:\n\n## Level Design\n\n- Puzzle Blast có 500 levels, chia thành 10 worlds (50 levels/world)"
  )
  const [relevantSections, setRelevantSections] = useState<string[]>([
    "Revenue & Monetization",
    "Game Health",
  ])

  const handleSave = () => {
    onSave({
      type,
      title: title || `${contextTypes.find((c) => c.id === type)?.label || "Context"}`,
      content,
      relevantSections,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingContext ? `Edit: ${editingContext.title}` : "Add App Context"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field 1: Context Type */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Context Type</Label>
            <RadioGroup value={type} onValueChange={setType}>
              <div className="grid grid-cols-2 gap-3">
                {contextTypes.map((ct) => (
                  <div key={ct.id} className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                    <RadioGroupItem value={ct.id} id={ct.id} className="mt-1" />
                    <label htmlFor={ct.id} className="cursor-pointer flex-1">
                      <span className="text-lg">{ct.icon}</span>
                      <p className="font-semibold text-slate-900">{ct.label}</p>
                      <p className="text-xs text-slate-600">{ct.desc}</p>
                    </label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Field 2: Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-semibold">
              Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Game Progression & Level Design"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Field 3: Content */}
          <div>
            <Label htmlFor="content" className="text-sm font-semibold">
              Content
            </Label>
            <Textarea
              id="content"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-xs mt-1"
            />
            <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Be specific! Include numbers, dates, thresholds. AI uses this context to make better analysis.</p>
            </div>
            <p className="text-xs text-slate-600 mt-2">{content.length} / 5,000 characters</p>
          </div>

          {/* Field 4: Relevance Settings */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Relevant Sections</Label>
            <p className="text-xs text-slate-600 mb-3">AI will use this context when generating these specific sections</p>
            <div className="space-y-2">
              {sections.map((section) => (
                <div key={section} className="flex items-center gap-2">
                  <Checkbox
                    checked={relevantSections.includes(section)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setRelevantSections((prev) => [...prev, section])
                      } else {
                        setRelevantSections((prev) => prev.filter((s) => s !== section))
                      }
                    }}
                  />
                  <Label className="text-sm font-normal cursor-pointer">{section}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            Save Context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
