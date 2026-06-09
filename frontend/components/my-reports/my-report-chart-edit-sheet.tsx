"use client"

import { useEffect, useState } from "react"
import {
  ChartLine,
  FolderOpen,
  GripVertical,
  Info,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { CustomReportCatalogItem } from "@/types/reports"
import type { MyReportChartType } from "@/components/my-reports/hooks/use-my-report-config"

export type MyReportChartPanelKind = "trend" | "breakdown"

export type MyReportChartEditDraft = {
  chartType: MyReportChartType
  metricId: string
  dimensionIds: string[]
}

export type MyReportChartEditSheetProps = {
  open: boolean
  panelKind: MyReportChartPanelKind | null
  draft: MyReportChartEditDraft
  metrics: string[]
  metricCatalog: CustomReportCatalogItem[]
  dimensionCatalog: CustomReportCatalogItem[]
  availableDimensionIds: string[]
  onOpenChange: (open: boolean) => void
  onApply: (draft: MyReportChartEditDraft) => void
}

const CHART_TYPE_LABELS: Record<MyReportChartType, string> = {
  line: "Line chart",
  bar: "Bar chart",
  area: "Stacked area chart",
}

function dimensionLabel(id: string, catalog: CustomReportCatalogItem[]): string {
  const item = catalog.find((d) => d.id === id)
  if (id === "date") return item?.label ? `Day (${item.label.toLowerCase()})` : "Day (date)"
  if (id === "app") return item?.label ?? "App"
  if (id === "platform") return item?.label ?? "Platform"
  return item?.label ?? id
}

export function MyReportChartEditSheet({
  open,
  panelKind,
  draft,
  metrics,
  metricCatalog,
  dimensionCatalog,
  availableDimensionIds,
  onOpenChange,
  onApply,
}: MyReportChartEditSheetProps) {
  const [localDraft, setLocalDraft] = useState<MyReportChartEditDraft>(draft)

  useEffect(() => {
    if (open) setLocalDraft(draft)
  }, [open, draft])

  const metricLabel =
    metricCatalog.find((m) => m.id === localDraft.metricId)?.label ?? localDraft.metricId

  const chartTypeOptions: MyReportChartType[] =
    panelKind === "breakdown" ? ["line", "bar"] : ["line", "bar", "area"]

  const handleDone = () => {
    onApply(localDraft)
    onOpenChange(false)
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col self-stretch overflow-hidden border-l border-gray-200 bg-gray-50 transition-[width,opacity] duration-200 ease-out",
        open ? "w-[min(100%,280px)] opacity-100" : "w-0 border-l-0 opacity-0",
      )}
      aria-hidden={!open}
    >
      {open ? (
        <>
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
              <ChartLine className="h-4 w-4 shrink-0 text-gray-500" />
              <span className="truncate">Data visualization</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-gray-500"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-5">
              <Select
                value={localDraft.chartType}
                onValueChange={(value) =>
                  setLocalDraft((prev) => ({ ...prev, chartType: value as MyReportChartType }))
                }
              >
                <SelectTrigger className="h-9 w-full bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chartTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CHART_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    <ChartLine className="h-3.5 w-3.5 text-gray-500" />
                    Metrics (y-axis ↑)
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <Select
                    value={localDraft.metricId}
                    onValueChange={(metricId) => setLocalDraft((prev) => ({ ...prev, metricId }))}
                  >
                    <SelectTrigger className="h-8 flex-1 border-0 text-xs shadow-none focus:ring-0">
                      <SelectValue>{metricLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((id) => (
                        <SelectItem key={id} value={id}>
                          {metricCatalog.find((m) => m.id === id)?.label ?? id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled>
                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </div>
                <div className="rounded-md border border-dashed border-gray-200 px-2 py-4" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
                    Dimensions (x-axis →)
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {localDraft.dimensionIds.map((dimId) => (
                    <div
                      key={dimId}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5"
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                      <span className="flex-1 truncate text-xs text-gray-800">
                        {dimensionLabel(dimId, dimensionCatalog)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={localDraft.dimensionIds.length <= 1}
                        onClick={() =>
                          setLocalDraft((prev) => ({
                            ...prev,
                            dimensionIds: prev.dimensionIds.filter((id) => id !== dimId),
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                  ))}
                  {availableDimensionIds
                    .filter((id) => !localDraft.dimensionIds.includes(id))
                    .map((dimId) => (
                      <button
                        key={`add-${dimId}`}
                        type="button"
                        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-gray-200 px-2 py-1.5 text-left text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        onClick={() =>
                          setLocalDraft((prev) => ({
                            ...prev,
                            dimensionIds: [...prev.dimensionIds, dimId],
                          }))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add {dimensionLabel(dimId, dimensionCatalog)}
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
                    Data configuration
                    <Info className="h-3 w-3 text-gray-400" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">
                  App, date, and team filters are configured from Data Configuration tags above the
                  table.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-200 bg-white px-4 py-3">
            <Button
              type="button"
              size="sm"
              className="h-8 bg-blue-600 px-4 text-xs hover:bg-blue-700"
              onClick={handleDone}
            >
              Done
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
