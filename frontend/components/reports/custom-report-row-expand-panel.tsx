"use client"

import { memo, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BarChart3, Layers } from "lucide-react"

export interface CustomReportRowExpandParameter {
  id: string
  label: string
  content: ReactNode
  desktopContent?: ReactNode
}

export interface CustomReportRowExpandMetric {
  id: string
  label: string
  value: string
}

export interface CustomReportRowExpandPanelProps {
  rowIndex: number
  parameters: CustomReportRowExpandParameter[]
  metrics: CustomReportRowExpandMetric[]
}

const PRIMARY_PARAMETER_IDS = ["app", "date", "platform"] as const

function ParameterCard({
  label,
  content,
  equalHeight = false,
  centeredValue = false,
}: {
  label: string
  content: ReactNode
  equalHeight?: boolean
  centeredValue?: boolean
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm",
        equalHeight && "flex h-full min-h-full w-full flex-col",
      )}
    >
      <div className={cn("shrink-0 text-xs font-medium text-slate-500", !centeredValue && "mb-1")}>
        {label}
      </div>
      <div
        className={cn(
          "min-w-0 text-sm text-slate-900",
          equalHeight && "flex-1",
          centeredValue && equalHeight && "flex items-center justify-center text-center",
        )}
      >
        {content}
      </div>
    </div>
  )
}

function PrimaryParameterCards({ parameters }: { parameters: CustomReportRowExpandParameter[] }) {
  const app = parameters.find((param) => param.id === "app")
  const date = parameters.find((param) => param.id === "date")
  const platform = parameters.find((param) => param.id === "platform")

  if (!app && !date && !platform) return null

  return (
    <>
      <div className="space-y-2 md:hidden">
        {app ? <ParameterCard label={app.label} content={app.content} /> : null}
        {date || platform ? (
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {date ? <ParameterCard label={date.label} content={date.content} /> : null}
            {platform ? <ParameterCard label={platform.label} content={platform.content} /> : null}
          </div>
        ) : null}
      </div>

      <div className="hidden min-w-0 items-stretch gap-2 md:grid md:grid-cols-4">
        {app ? (
          <div className="col-span-2 h-full min-w-0">
            <ParameterCard equalHeight label={app.label} content={app.content} />
          </div>
        ) : null}
        {date ? (
          <div className="col-span-1 h-full min-w-0">
            <ParameterCard
              equalHeight
              centeredValue
              label={date.label}
              content={date.desktopContent ?? date.content}
            />
          </div>
        ) : null}
        {platform ? (
          <div className="col-span-1 h-full min-w-0">
            <ParameterCard
              equalHeight
              centeredValue
              label={platform.label}
              content={platform.desktopContent ?? platform.content}
            />
          </div>
        ) : null}
      </div>
    </>
  )
}

export const CustomReportRowExpandPanel = memo(function CustomReportRowExpandPanel({
  rowIndex,
  parameters,
  metrics,
}: CustomReportRowExpandPanelProps) {
  const primaryParameters = parameters.filter((param) =>
    PRIMARY_PARAMETER_IDS.includes(param.id as (typeof PRIMARY_PARAMETER_IDS)[number]),
  )
  const otherParameters = parameters.filter(
    (param) => !PRIMARY_PARAMETER_IDS.includes(param.id as (typeof PRIMARY_PARAMETER_IDS)[number]),
  )

  return (
    <div className="box-border w-full min-w-0 max-w-full overflow-hidden border-t border-blue-100 bg-blue-50/40 px-3 py-3 sm:px-5 sm:py-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Row {rowIndex + 1} details
      </p>

      {parameters.length > 0 ? (
        <div className="mb-4 min-w-0 space-y-2">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Parameters
          </div>

          <PrimaryParameterCards parameters={primaryParameters} />

          {otherParameters.map((param) => (
            <ParameterCard key={param.id} label={param.label} content={param.content} />
          ))}
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-700">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Metrics
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className={cn(
                  "min-w-0 rounded-lg border px-3 py-2.5 shadow-sm",
                  "border-blue-100 bg-blue-50/60",
                )}
              >
                <div className="mb-0.5 text-xs font-medium text-slate-500">{metric.label}</div>
                <div className="text-sm font-semibold break-words text-slate-900 tabular-nums">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
})
