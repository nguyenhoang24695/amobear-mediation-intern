"use client"

import { Label } from "@/components/ui/label"
import type { CustomReportCatalogItem } from "@/types/reports"

export type PivotConfigPanelProps = {
  dimensions: string[]
  metrics: string[]
  dimensionCatalog: CustomReportCatalogItem[]
  metricCatalog: CustomReportCatalogItem[]
  pivotRowDim: string
  pivotColDim: string
  pivotMetricId: string
  onChange: (patch: { pivotRowDim?: string; pivotColDim?: string; pivotMetricId?: string }) => void
}

export function PivotConfigPanel({
  dimensions,
  metrics,
  dimensionCatalog,
  metricCatalog,
  pivotRowDim,
  pivotColDim,
  pivotMetricId,
  onChange,
}: PivotConfigPanelProps) {
  const dimensionOptions = dimensions.length > 0 ? dimensions : dimensionCatalog.map((d) => d.id)
  const metricOptions = metrics.length > 0 ? metrics : metricCatalog.map((m) => m.id)

  const labelForDim = (id: string) => dimensionCatalog.find((d) => d.id === id)?.label ?? id
  const labelForMetric = (id: string) => metricCatalog.find((m) => m.id === id)?.label ?? id

  return (
    <div className="mx-6 mb-4 grid gap-3 rounded-md border border-gray-200 bg-gray-50/80 p-4 md:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="pivot-row-dim">Row dimension</Label>
        <select
          id="pivot-row-dim"
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
          value={pivotRowDim}
          onChange={(event) => onChange({ pivotRowDim: event.target.value })}
        >
          {dimensionOptions.map((id) => (
            <option key={id} value={id}>
              {labelForDim(id)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pivot-col-dim">Column dimension</Label>
        <select
          id="pivot-col-dim"
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
          value={pivotColDim}
          onChange={(event) => onChange({ pivotColDim: event.target.value })}
        >
          {dimensionOptions.map((id) => (
            <option key={id} value={id}>
              {labelForDim(id)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pivot-metric">Metric</Label>
        <select
          id="pivot-metric"
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
          value={pivotMetricId}
          onChange={(event) => onChange({ pivotMetricId: event.target.value })}
        >
          {metricOptions.map((id) => (
            <option key={id} value={id}>
              {labelForMetric(id)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
