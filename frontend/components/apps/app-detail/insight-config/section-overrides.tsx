"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"

const sections = [
  { id: "executive", label: "Executive Summary", icon: "📊", status: "system" },
  { id: "revenue", label: "Revenue & Monetization", icon: "💰", status: "system" },
  { id: "users", label: "Users & Engagement", icon: "👥", status: "system" },
  { id: "game-health", label: "Game Health", icon: "🎮", status: "custom" },
  { id: "ua-growth", label: "UA & Growth", icon: "📢", status: "disabled" },
  { id: "anomalies", label: "Anomalies & Alerts", icon: "⚠️", status: "system" },
  { id: "recommendations", label: "Recommendations", icon: "✅", status: "system" },
]

const statusConfig = {
  system: { badge: "System", color: "bg-green-100 text-green-700", indicator: "🟢" },
  custom: { badge: "Custom", color: "bg-amber-100 text-amber-700", indicator: "🟡" },
  disabled: { badge: "Disabled", color: "bg-slate-100 text-slate-700", indicator: "🔴" },
}

export function SectionOverrides() {
  const [overrides, setOverrides] = useState<Record<string, string>>(
    sections.reduce((acc, s) => ({ ...acc, [s.id]: s.status }), {})
  )

  const handleStatusChange = (sectionId: string, newStatus: string) => {
    setOverrides((prev) => ({ ...prev, [sectionId]: newStatus }))
  }

  return (
    <Card className="border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Section Configuration</h3>
      <p className="text-sm text-slate-600 mb-4">Override system template sections for this specific app</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Section</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Override</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const status = overrides[section.id]
              const config = statusConfig[status as keyof typeof statusConfig]
              return (
                <tr key={section.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span>{section.icon}</span>
                      <span className="font-medium text-slate-900">{section.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Select value={status} onValueChange={(val) => handleStatusChange(section.id, val)}>
                      <SelectTrigger className="w-40 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Use System</SelectItem>
                        <SelectItem value="custom">Customize</SelectItem>
                        <SelectItem value="disabled">Disable</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span>{config?.indicator}</span>
                      <Badge className={`${config?.color} border-0 text-xs`}>{config?.badge}</Badge>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
