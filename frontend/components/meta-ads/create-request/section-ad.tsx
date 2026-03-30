"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tv, ChevronDown, ChevronUp } from "lucide-react"
import type { RequestFormState } from "./create-request-content"

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
}

export function AdSection({ form, onChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Tv className="w-4 h-4 text-slate-500" />
          Ad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Ad Name <span className="text-red-500">*</span></Label>
          <Input
            placeholder="e.g. WeatherApp_US_IMG_v1_Ad"
            className="h-9 text-sm"
            value={form.adName}
            onChange={e => onChange({ adName: e.target.value })}
          />
        </div>

        {/* Advanced collapsible */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="text-xs font-medium text-slate-600">Advanced Settings</span>
            {advancedOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {advancedOpen && (
            <div className="px-4 py-3 space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Tracking Specs JSON <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                placeholder={'[{"action.type":["app_install"],"app":[1234567890]}]'}
                className="text-xs font-mono resize-none"
                rows={4}
                value={form.trackingSpecs}
                onChange={e => onChange({ trackingSpecs: e.target.value })}
              />
              <p className="text-[11px] text-slate-400">Raw JSON array for tracking specs. Leave empty if not required.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
