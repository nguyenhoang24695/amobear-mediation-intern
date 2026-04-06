"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function GenerationSettings() {
  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [priority, setPriority] = useState("normal")
  const [provider, setProvider] = useState("openai")
  const [additionalInstructions, setAdditionalInstructions] = useState(
    "Ưu tiên phân tích rewarded video format vì đang là revenue driver chính.\nSo sánh ngày trong tuần (weekday vs weekend) vì engagement pattern khác biệt lớn."
  )

  return (
    <Card className="border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Generation Settings</h3>

      <div className="space-y-6">
        {/* Override Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <p className="font-semibold text-slate-900">Override generation settings</p>
            <p className="text-sm text-slate-600">Use custom settings for this app instead of system defaults</p>
          </div>
          <Toggle
            pressed={overrideEnabled}
            onPressedChange={setOverrideEnabled}
            className="data-[state=on]:bg-indigo-600"
          />
        </div>

        {overrideEnabled && (
          <div className="space-y-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            {/* AI Provider */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">AI Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Priority</Label>
              <RadioGroup value={priority} onValueChange={setPriority}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded hover:bg-white/50 cursor-pointer">
                    <RadioGroupItem value="high" id="high" />
                    <label htmlFor="high" className="cursor-pointer flex-1">
                      <p className="font-medium text-slate-900">High (generate first)</p>
                      <p className="text-xs text-slate-600">Will be prioritized in the generation queue</p>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded hover:bg-white/50 cursor-pointer">
                    <RadioGroupItem value="normal" id="normal" />
                    <label htmlFor="normal" className="cursor-pointer flex-1">
                      <p className="font-medium text-slate-900">Normal</p>
                      <p className="text-xs text-slate-600">Standard priority</p>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded hover:bg-white/50 cursor-pointer">
                    <RadioGroupItem value="low" id="low" />
                    <label htmlFor="low" className="cursor-pointer flex-1">
                      <p className="font-medium text-slate-900">Low (generate last)</p>
                      <p className="text-xs text-slate-600">Will be processed after other apps</p>
                    </label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Additional Instructions */}
            <div>
              <Label htmlFor="instructions" className="text-sm font-semibold">
                Additional Instructions (append to template)
              </Label>
              <Textarea
                id="instructions"
                rows={5}
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="font-mono text-xs mt-1"
              />
              <p className="text-xs text-slate-600 mt-2">
                These instructions will be appended to the system template instructions
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
