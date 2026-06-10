"use client"

import { useEffect, useState } from "react"
import {
  BarChart2,
  BarChart3,
  ChartLine,
  ChartPie,
  FolderOpen,
  GripVertical,
  Hash,
  Info,
  Plus,
  SlidersHorizontal,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { CustomReportCatalogItem } from "@/types/reports"
import type { MyReportChartType } from "@/components/my-reports/hooks/use-my-report-config"

export type MyReportChartPanelKind = "trend" | "breakdown"

export type MyReportChartEditDraft = {
  chartType: MyReportChartType
  metricIds: string[]
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

const CHART_TYPE_COLORS = ["#2563eb", "#f97316", "#14b8a6", "#6366f1", "#22c55e"]

const CHART_TYPE_META: Record<
  MyReportChartType,
  { label: string; icon: React.ReactNode }
> = {
  line:        { label: "Line chart",        icon: <TrendingUp className="h-4 w-4" /> },
  combo:       { label: "Combo chart",       icon: <BarChart2  className="h-4 w-4" /> },
  bar:         { label: "Bar chart",         icon: <BarChart2  className="h-4 w-4" /> },
  "stacked-bar": { label: "Stacked bar chart", icon: <BarChart3 className="h-4 w-4" /> },
  area:        { label: "Stacked area chart",icon: <BarChart3  className="h-4 w-4" /> },
  scorecard:   { label: "Score card",        icon: <Hash       className="h-4 w-4" /> },
  pie:         { label: "Pie chart",         icon: <ChartPie   className="h-4 w-4" /> },
}

type ChartTypeGroup = { label: string; types: MyReportChartType[] }

const CHART_TYPE_GROUPS: ChartTypeGroup[] = [
  { label: "Line & combo", types: ["line", "combo"] },
  { label: "Bar",          types: ["bar", "stacked-bar"] },
  { label: "Other",        types: ["scorecard", "pie"] },
]

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

  const getMetricLabel = (id: string) =>
    metricCatalog.find((m) => m.id === id)?.label ?? id

  const excludedTypes: MyReportChartType[] =
    panelKind === "breakdown" ? ["area"] : []

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
                  <div className="flex items-center gap-2">
                    {CHART_TYPE_META[localDraft.chartType]?.icon}
                    <SelectValue>{CHART_TYPE_META[localDraft.chartType]?.label}</SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPE_GROUPS.map((group, groupIdx) => {
                    const visibleTypes = group.types.filter(
                      (t) => !excludedTypes.includes(t),
                    )
                    if (visibleTypes.length === 0) return null
                    return (
                      <SelectGroup key={group.label}>
                        {groupIdx > 0 && <SelectSeparator />}
                        {visibleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {CHART_TYPE_META[type].icon}
                              <span>{CHART_TYPE_META[type].label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  })}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    <ChartLine className="h-3.5 w-3.5 text-gray-500" />
                    Metrics (y-axis ↑)
                  </div>
                  {(() => {
                    const nextMetric = metrics.find((id) => !localDraft.metricIds.includes(id))
                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!nextMetric}
                        onClick={() => {
                          if (nextMetric) {
                            setLocalDraft((prev) => ({
                              ...prev,
                              metricIds: [...prev.metricIds, nextMetric],
                            }))
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )
                  })()}
                </div>
                <div className="space-y-1.5">
                  {localDraft.metricIds.map((mId, idx) => (
                    <div
                      key={mId}
                      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1.5"
                    >
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_TYPE_COLORS[idx % CHART_TYPE_COLORS.length] }}
                      />
                      <Select
                        value={mId}
                        onValueChange={(newId) =>
                          setLocalDraft((prev) => ({
                            ...prev,
                            metricIds: prev.metricIds.map((id, i) => (i === idx ? newId : id)),
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 flex-1 border-0 text-xs shadow-none focus:ring-0">
                          <SelectValue>{getMetricLabel(mId)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {metrics
                            .filter((id) => id === mId || !localDraft.metricIds.includes(id))
                            .map((id) => (
                              <SelectItem key={id} value={id}>
                                {getMetricLabel(id)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={localDraft.metricIds.length <= 1}
                        onClick={() =>
                          setLocalDraft((prev) => ({
                            ...prev,
                            metricIds: prev.metricIds.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                    <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
                    Dimensions (x-axis →)
                  </div>
                  {(() => {
                    const firstAvailable = availableDimensionIds.find(
                      (id) => !localDraft.dimensionIds.includes(id),
                    )
                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!firstAvailable}
                        onClick={() => {
                          if (firstAvailable) {
                            setLocalDraft((prev) => ({
                              ...prev,
                              dimensionIds: [...prev.dimensionIds, firstAvailable],
                            }))
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )
                  })()}
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
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
                  Data configuration
                  <Info className="h-3 w-3 text-gray-400" />
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
