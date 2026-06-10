"use client"

import { useMemo, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IAP_REVENUE_MODE_OPTIONS } from "@/lib/reports/my-report-defaults"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import type { App } from "@/types/api"

const CUSTOM_GLOBAL = "custom"

type GlobalMode = "preset" | "custom"

function isPresetRate(rate: number): boolean {
  return IAP_REVENUE_MODE_OPTIONS.some((o) => o.value === rate)
}

function resolveGlobalMode(rate: number): GlobalMode {
  return isPresetRate(rate) ? "preset" : "custom"
}

export type MyReportIapFilterEditorProps = {
  draft: MyReportConfig
  updateDraft: (patch: Partial<MyReportConfig>) => void
  appPool: App[]
}

export function MyReportIapFilterEditor({
  draft,
  updateDraft,
  appPool,
}: MyReportIapFilterEditorProps) {
  const [globalMode, setGlobalMode] = useState<GlobalMode>(() => resolveGlobalMode(draft.iapRevenueMode))
  const [customGlobalPct, setCustomGlobalPct] = useState(() =>
    String(Math.round(draft.iapRevenueMode * 1000) / 10),
  )

  const overrideApps = useMemo(() => {
    const ids = draft.selectedAppIds.length > 0 ? draft.selectedAppIds : appPool.map((a) => a.appId)
    const idSet = new Set(ids.filter(Boolean))
    return appPool.filter((app) => app.appId && idSet.has(app.appId))
  }, [appPool, draft.selectedAppIds])

  const handleGlobalPreset = (value: string) => {
    if (value === CUSTOM_GLOBAL) {
      setGlobalMode("custom")
      const pct = Number(customGlobalPct)
      if (Number.isFinite(pct) && pct > 0) updateDraft({ iapRevenueMode: pct / 100 })
      return
    }
    setGlobalMode("preset")
    updateDraft({ iapRevenueMode: Number(value) })
  }

  const handleCustomGlobalBlur = () => {
    const pct = Number(customGlobalPct)
    if (!Number.isFinite(pct) || pct <= 0) return
    updateDraft({ iapRevenueMode: pct / 100 })
  }

  const setOverride = (appId: string, rate: number | null) => {
    const next = { ...draft.iapRevenueModeOverrides }
    if (rate == null) delete next[appId]
    else next[appId] = rate
    updateDraft({ iapRevenueModeOverrides: next })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">Global IAP rate</Label>
        <Select
          value={globalMode === "custom" ? CUSTOM_GLOBAL : String(draft.iapRevenueMode)}
          onValueChange={handleGlobalPreset}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IAP_REVENUE_MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_GLOBAL}>Custom %</SelectItem>
          </SelectContent>
        </Select>
        {globalMode === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={100}
              step={0.1}
              value={customGlobalPct}
              onChange={(e) => setCustomGlobalPct(e.target.value)}
              onBlur={handleCustomGlobalBlur}
              className="h-9"
            />
            <span className="text-sm text-gray-500">% of Gross</span>
          </div>
        ) : null}
      </div>

      {overrideApps.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Per-app overrides</Label>
          <ScrollArea className="max-h-48 rounded border border-gray-100">
            <div className="divide-y divide-gray-100">
              {overrideApps.map((app) => {
                const override = draft.iapRevenueModeOverrides[app.appId]
                const selectValue =
                  override == null ? "inherit" : isPresetRate(override) ? String(override) : "custom"
                return (
                  <div key={app.appId} className="flex items-center gap-2 px-2 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                      {app.displayName ?? app.name ?? app.appId}
                    </span>
                    <Select
                      value={selectValue}
                      onValueChange={(v) => {
                        if (v === "inherit") setOverride(app.appId, null)
                        else if (v !== "custom") setOverride(app.appId, Number(v))
                      }}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit global</SelectItem>
                        {IAP_REVENUE_MODE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={String(o.value)}>
                            {o.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectValue === "custom" ? (
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        step={0.1}
                        className="h-8 w-16"
                        defaultValue={
                          override != null ? Math.round(override * 1000) / 10 : undefined
                        }
                        onBlur={(e) => {
                          const pct = Number(e.target.value)
                          if (Number.isFinite(pct) && pct > 0) setOverride(app.appId, pct / 100)
                        }}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Select apps to configure per-app IAP rates.</p>
      )}

      {Object.keys(draft.iapRevenueModeOverrides).length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => updateDraft({ iapRevenueModeOverrides: {} })}
        >
          Clear all overrides
        </Button>
      ) : null}
    </div>
  )
}
