"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle } from "lucide-react"

const templates = [
  { id: "puzzle-game", label: "Puzzle Game Insight", icon: "🧩", isDefault: true },
  { id: "ai-utility", label: "AI Utility App Insight", icon: "🤖" },
  { id: "video-media", label: "Video/Media App Insight", icon: "📹" },
  { id: "casual-game", label: "Casual Game Insight", icon: "🎮" },
  { id: "generic", label: "Generic App Insight", icon: "📊" },
]

export function TemplateAssignment() {
  const [selectedTemplate, setSelectedTemplate] = useState("puzzle-game")
  const [isCustom, setIsCustom] = useState(false)

  const current = templates.find((t) => t.id === selectedTemplate)

  return (
    <Card className="border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-6">
        {/* Left: Current Template */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Insight Template</h3>
          
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6">
            <span className="text-2xl">{current?.icon}</span>
            <div>
              <p className="font-semibold text-slate-900">{current?.label}</p>
              <Badge className={isCustom ? "bg-amber-100 text-amber-700 border-0" : "bg-indigo-100 text-indigo-700 border-0"}>
                {isCustom ? "Customized" : "System Default"}
              </Badge>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            {isCustom ? (
              <>
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Custom configuration</p>
                  <p className="text-amber-700">This app has independent settings</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-900">Using system template</p>
                  <p className="text-green-700">Changes to system template will auto-apply</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Change Template */}
        <div className="flex-1">
          <label className="text-sm font-semibold text-slate-900 block mb-2">Change Template</label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <span className="mr-2">{template.icon}</span>
                  {template.label}
                  {template.isDefault && " (System Default)"}
                </SelectItem>
              ))}
              <div className="my-1 h-px bg-slate-200" />
              <SelectItem value="custom">
                <span className="mr-2">🔧</span>
                Create Custom for this App
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-2">
            Select a template or create a custom configuration for this app
          </p>
        </div>
      </div>
    </Card>
  )
}
