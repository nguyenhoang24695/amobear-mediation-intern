"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BrainCircuit, ChevronDown, ChevronUp, Database, CheckCircle2, XCircle, Loader2, Square } from "lucide-react"
import type { AgenticProgressEventDto } from "@/lib/api/ai-assistant"

export interface AgenticThinkingStep {
  type: AgenticProgressEventDto["eventType"]
  iteration: number
  mcpQueriesUsed: number
  message?: string | null
  toolName?: string | null
  query?: string | null
  success?: boolean | null
  rowCount?: number | null
  elapsedMs?: number | null
}

interface AgenticThinkingPanelProps {
  steps: AgenticThinkingStep[]
  isRunning: boolean
  onStop?: () => void
}

export function AgenticThinkingPanel({ steps, isRunning, onStop }: AgenticThinkingPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const [expandedQueries, setExpandedQueries] = useState<Set<number>>(new Set())

  const currentIteration = steps.length > 0 ? Math.max(...steps.map(s => s.iteration)) : 0
  const mcpQueriesUsed = steps.length > 0 ? Math.max(...steps.map(s => s.mcpQueriesUsed)) : 0

  const toggleQuery = (idx: number) => {
    setExpandedQueries(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="flex gap-3">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-violet-600">
          AI
        </div>
      </div>

      <div className="flex-1 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-slate-900">AI Assistant</span>
          <Badge variant="secondary" className="text-xs font-normal bg-violet-50 text-violet-700">
            {isRunning
              ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Đang phân tích…</span>
              : <span className="flex items-center gap-1"><BrainCircuit className="h-3 w-3" />Phân tích hoàn tất</span>
            }
          </Badge>
          {currentIteration > 0 && (
            <span className="text-xs text-slate-500">
              Lần {currentIteration} · {mcpQueriesUsed} MCP
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
          {/* Header */}
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-50 border-b border-violet-100 hover:bg-violet-100 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              {isRunning
                ? <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
                : <BrainCircuit className="h-4 w-4 text-violet-600" />
              }
              <span className="text-sm font-medium text-violet-900">
                {isRunning ? "Đang suy nghĩ & truy vấn dữ liệu…" : "Chi tiết quá trình phân tích"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isRunning && onStop && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs border-red-200 text-red-600 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); onStop() }}
                >
                  <Square className="h-3 w-3 mr-1" />
                  Dừng
                </Button>
              )}
              {expanded
                ? <ChevronUp className="h-4 w-4 text-violet-500" />
                : <ChevronDown className="h-4 w-4 text-violet-500" />
              }
            </div>
          </button>

          {/* Steps */}
          {expanded && (
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {steps.length === 0 && isRunning && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  Đang khởi động…
                </div>
              )}
              {steps.map((step, idx) => (
                <StepRow
                  key={idx}
                  step={step}
                  idx={idx}
                  queryExpanded={expandedQueries.has(idx)}
                  onToggleQuery={() => toggleQuery(idx)}
                />
              ))}
              {isRunning && steps.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-violet-600 bg-violet-50/50">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang xử lý…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepRow({
  step,
  idx,
  queryExpanded,
  onToggleQuery,
}: {
  step: AgenticThinkingStep
  idx: number
  queryExpanded: boolean
  onToggleQuery: () => void
}) {
  if (step.type === "iteration_start") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-600 bg-slate-50">
        <BrainCircuit className="h-3.5 w-3.5 text-violet-500" />
        <span>Lần {step.iteration} — {step.message ?? "Đang suy nghĩ…"}</span>
      </div>
    )
  }

  if (step.type === "mcp_query_start") {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-violet-500 flex-shrink-0 animate-spin" />
          <Database className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-xs text-slate-600 flex-1 truncate">
            {step.toolName && (
              <code className="text-violet-700 bg-violet-50 rounded px-1">{step.toolName}</code>
            )}
            {" "}{step.message}
          </span>
        </div>
      </div>
    )
  }

  if (step.type === "mcp_query_complete") {
    return (
      <div className="px-4 py-2">
        <button
          className="w-full text-left"
          onClick={step.query ? onToggleQuery : undefined}
        >
          <div className="flex items-center gap-2">
            {step.success
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              : <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            }
            <Database className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
            <span className={cn("text-xs flex-1", step.success ? "text-slate-700" : "text-red-600")}>
              {step.toolName && (
                <code className={cn("rounded px-1", step.success ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50")}>
                  {step.toolName}
                </code>
              )}
              {" "}{step.message}
            </span>
            {step.query && (
              <span className="text-xs text-slate-400">
                {queryExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </span>
            )}
          </div>
        </button>
        {queryExpanded && step.query && (
          <div className="mt-2 ml-8 rounded bg-slate-900 p-2 overflow-x-auto">
            <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap">
              {step.query}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500">
      <span>{step.message}</span>
    </div>
  )
}
