"use client"

import { useState, useRef, useEffect, useId, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import mermaid from "mermaid"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Play,
  BookOpen,
  Copy,
  Edit2,
  ExternalLink,
  Save,
  BarChart3,
  Download,
  X,
  Zap,
  Lightbulb,
  TrendingUp,
  FileCode,
  Check,
  FileText,
  Type,
} from "lucide-react"
import type { AiMessage, QueryResult } from "./ai-assistant-content"
import { QueryResultTable } from "./query-result-table"
import { aiAssistantApi } from "@/lib/api/ai-assistant"
import { useToast } from "@/hooks/use-toast"

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadResultAsCsv(result: QueryResult, filename?: string) {
  const header = result.columns.map(escapeCsvCell).join(",")
  const rows = result.rows.map((row) =>
    result.columns.map((c) => escapeCsvCell(row[c])).join(",")
  )
  const csv = [header, ...rows].join("\r\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename ?? `query-result-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type ContentViewMode = "markdown" | "source"

function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !code?.trim()) return
    setError(null)
    const el = containerRef.current
    el.innerHTML = ""
    el.textContent = code
    mermaid.initialize({ startOnLoad: false })
    mermaid
      .run({
        nodes: [el],
        suppressErrors: true,
      })
      .catch((e) => setError(e.message ?? "Mermaid error"))
  }, [code])

  if (!code?.trim()) return null
  return (
    <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4 overflow-x-auto">
      <div ref={containerRef} className="mermaid" />
      {error && (
        <p className="mt-2 text-xs text-red-600">Mermaid: {error}</p>
      )}
    </div>
  )
}

function isNumericColumn(rows: Record<string, unknown>[], col: string): boolean {
  const sample = rows.slice(0, Math.min(20, rows.length))
  if (sample.length === 0) return false
  return sample.every((row) => {
    const v = row[col]
    if (v === null || v === undefined) return true
    if (typeof v === "number" && !Number.isNaN(v)) return true
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v.replace(/[^0-9.-]/g, "")))) return true
    return false
  })
}

function QueryResultChartDialog({
  open,
  onOpenChange,
  result,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: QueryResult
}) {
  const numericCols = useMemo(
    () => result.columns.filter((c) => isNumericColumn(result.rows, c)),
    [result.columns, result.rows]
  )
  const [xColumn, setXColumn] = useState(result.columns[0] ?? "")
  const [yColumn, setYColumn] = useState(numericCols[0] ?? result.columns[1] ?? "")
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar")

  useEffect(() => {
    if (open && result.columns.length) {
      setXColumn((prev) => (result.columns.includes(prev) ? prev : result.columns[0]))
      setYColumn((prev) => (numericCols.includes(prev) ? prev : numericCols[0] ?? result.columns[1] ?? ""))
    }
  }, [open, result.columns, numericCols])

  const chartData = useMemo(() => {
    return result.rows.map((row) => {
      const point: Record<string, string | number> = {}
      result.columns.forEach((c) => {
        const v = row[c]
        if (typeof v === "number" && !Number.isNaN(v)) point[c] = v
        else if (v !== null && v !== undefined) point[c] = String(v)
      })
      return point
    })
  }, [result.rows, result.columns])

  const yNumKey = numericCols.includes(yColumn) ? yColumn : numericCols[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Biểu đồ từ kết quả</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Trục X:</span>
              <Select value={xColumn} onValueChange={setXColumn}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {result.columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Trục Y:</span>
              <Select value={yColumn} onValueChange={setYColumn}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {result.columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              {(["bar", "line", "area"] as const).map((t) => (
                <Button
                  key={t}
                  variant={chartType === t ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setChartType(t)}
                >
                  {t === "bar" ? "Cột" : t === "line" ? "Đường" : "Miền"}
                </Button>
              ))}
            </div>
          </div>
          <div className="h-[320px] w-full">
            {chartData.length > 0 && yNumKey ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" && (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey={xColumn} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey={yNumKey} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
                {chartType === "line" && (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey={xColumn} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey={yNumKey} stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
                {chartType === "area" && (
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                    <XAxis dataKey={xColumn} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey={yNumKey} fill="var(--chart-1)" stroke="var(--chart-1)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Chọn cột trục Y dạng số để vẽ biểu đồ.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AiMessageBubbleProps {
  message: AiMessage
  onAskAboutTable?: (result: { columns: string[]; rows: Record<string, unknown>[] }) => void
}

const providerConfig = {
  claude: {
    color: "bg-amber-500",
    textColor: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "Claude",
    icon: "🟠",
  },
  gemini: {
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Gemini",
    icon: "🔵",
  },
  chatgpt: {
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "ChatGPT",
    icon: "🟢",
  },
}

export function AiMessageBubble({ message, onAskAboutTable }: AiMessageBubbleProps) {
  const { toast } = useToast()
  const [showExplainDetails, setShowExplainDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const [queryRunning, setQueryRunning] = useState(false)
  const [queryRan, setQueryRan] = useState(false)
  const [localQueryResult, setLocalQueryResult] = useState<QueryResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [isEditingSql, setIsEditingSql] = useState(false)
  const [editedSql, setEditedSql] = useState<string | null>(null)
  const [contentViewMode, setContentViewMode] = useState<ContentViewMode>("markdown")
  const [chartOpen, setChartOpen] = useState(false)

  const displaySql = editedSql ?? message.metadata?.sql ?? ""

  const handleRunQuery = async () => {
    const sqlToRun = displaySql?.trim()
    if (!sqlToRun) {
      toast({ title: "No SQL to run", variant: "destructive" })
      return
    }
    setQueryRunning(true)
    setRunError(null)
    try {
      const res = await aiAssistantApi.executeSql({
        sql: sqlToRun,
        messageId: message.id,
        limit: 500,
      })
      if (!res.success) {
        setRunError(res.error ?? "Execution failed")
        toast({ title: res.error ?? "Execution failed", variant: "destructive" })
        return
      }
      const columns = res.columns?.map((c) => c.name) ?? []
      const rows = res.data ?? []
      setLocalQueryResult({
        columns,
        rows: rows as Record<string, unknown>[],
        rowCount: res.rowCount,
        executionTime: res.executionMs / 1000,
        provider: "StarRocks",
      })
      setQueryRan(true)
    } catch (e) {
      const err = e instanceof Error ? e.message : "Failed to run query"
      setRunError(err)
      toast({ title: err, variant: "destructive" })
    } finally {
      setQueryRunning(false)
    }
  }

  const provider = (message.metadata?.provider as keyof typeof providerConfig) || "claude"
  const config = providerConfig[provider]

  const handleCopy = async () => {
    if (displaySql) {
      await navigator.clipboard.writeText(displaySql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStartEditSql = () => {
    setEditedSql(displaySql)
    setIsEditingSql(true)
  }

  const handleApplyEditSql = () => {
    setIsEditingSql(false)
  }

  const handleCancelEditSql = () => {
    setEditedSql(null)
    setIsEditingSql(false)
  }

  return (
    <div className="flex gap-3">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
            config.color
          )}
        >
          AI
        </div>
      </div>

      <div className="flex-1 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-slate-900">AI Assistant</span>
          <Badge
            variant="secondary"
            className={cn("text-xs font-normal", config.bgColor, config.textColor)}
          >
            {config.icon} {config.label}
            {message.metadata?.fallbackFrom && (
              <span className="ml-1 text-slate-400">
                (fallback from {message.metadata.fallbackFrom})
              </span>
            )}
          </Badge>
          <span className="text-xs text-slate-400">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Content header: view mode toggle (Source / Markdown) */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500">Answer</span>
            <div className="flex items-center gap-1">
              <Button
                variant={contentViewMode === "source" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setContentViewMode("source")}
              >
                <FileText className="h-3 w-3 mr-1" />
                Source
              </Button>
              <Button
                variant={contentViewMode === "markdown" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setContentViewMode("markdown")}
              >
                <Type className="h-3 w-3 mr-1" />
                Markdown
              </Button>
            </div>
          </div>

          {/* Explanation Text — Source (raw) or Markdown (rendered) */}
          <div className="p-4">
            {contentViewMode === "source" ? (
              <pre className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-[60vh] overflow-y-auto">
                {message.content}
              </pre>
            ) : (
              <div className="prose prose-slate prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold text-slate-800 mt-3 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-700 mt-2 mb-1">{children}</h3>,
                    p: ({ children }) => <p className="text-slate-700 text-sm leading-relaxed mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside text-slate-700 text-sm space-y-1 my-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-slate-700 text-sm space-y-1 my-2">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-700">{children}</li>,
                    table: ({ children }) => (
                      <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[200px] border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
                    tr: ({ children }) => <tr className="border-b border-slate-200 last:border-0">{children}</tr>,
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left font-semibold text-slate-800 border-b border-slate-200">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => <td className="px-3 py-2 text-slate-700">{children}</td>,
                    code: ({ className, children }) => {
                      const isMermaid = className?.includes("language-mermaid")
                      if (isMermaid) {
                        return <MermaidBlock code={String(children)} />
                      }
                      const isBlock = className?.includes("language-")
                      if (isBlock) {
                        return <code className="block bg-slate-100 text-slate-800 rounded px-2 py-1 font-mono text-xs overflow-x-auto">{children}</code>
                      }
                      return <code className="bg-slate-100 text-slate-800 rounded px-1.5 py-0.5 font-mono text-xs">{children}</code>
                    },
                    pre: ({ children }) => <pre className="bg-slate-100 rounded-lg p-3 overflow-x-auto my-2 text-sm">{children}</pre>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Context Summary for Welcome Messages */}
          {message.metadata?.contextSummary && (
            <div className="px-4 pb-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{message.metadata.contextSummary.name}</h4>
                    <p className="text-xs text-slate-500">App: {message.metadata.contextSummary.appScope}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {message.metadata.contextSummary.focusAreas.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase">Focus Areas</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {message.metadata.contextSummary.focusAreas.map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.metadata.contextSummary.pinnedMetrics.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase">Pinned Metrics</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {message.metadata.contextSummary.pinnedMetrics.map((metric) => (
                          <Badge key={metric} variant="outline" className="text-xs border-emerald-200 text-emerald-700">
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {message.metadata.contextSummary.savedQueries > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-100 text-xs text-slate-600">
                    <Save className="h-3 w-3 inline mr-1" />
                    {message.metadata.contextSummary.savedQueries} saved queries available
                  </div>
                )}
                
                <p className="mt-3 text-sm text-slate-600">
                  Ask me anything about your data - I can help with SQL queries, analytics, and insights!
                </p>
              </div>
            </div>
          )}

          {/* SQL Block */}
          {(message.metadata?.sql || editedSql !== null) && (
            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-500">SQL</span>
                <div className="flex items-center gap-1">
                  {!isEditingSql && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleCopy}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleStartEditSql}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                  {isEditingSql && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-emerald-600"
                        onClick={handleApplyEditSql}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleCancelEditSql}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {isEditingSql ? (
                <div className="p-3 border-b border-slate-100">
                  <Textarea
                    value={editedSql ?? ""}
                    onChange={(e) => setEditedSql(e.target.value)}
                    className="min-h-[120px] font-mono text-sm bg-slate-900 text-slate-100 border-slate-700"
                    placeholder="Edit SQL..."
                  />
                </div>
              ) : (
                <div className="p-4 bg-slate-900 overflow-x-auto">
                  <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                    {displaySql}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Metadata Row */}
          {message.metadata && (
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
              {message.metadata.tables && (
                <span>Tables: {message.metadata.tables.join(", ")}</span>
              )}
              {message.metadata.complexity && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    message.metadata.complexity === "Low"
                      ? "border-green-300 text-green-600"
                      : message.metadata.complexity === "Medium"
                      ? "border-amber-300 text-amber-600"
                      : "border-red-300 text-red-600"
                  )}
                >
                  {message.metadata.complexity} complexity
                </Badge>
              )}
              {message.metadata.usage && (
                <>
                  <span>Tokens: {message.metadata.usage.tokens.toLocaleString()}</span>
                  <span>Cost: ${message.metadata.usage.cost.toFixed(3)}</span>
                </>
              )}
              {message.metadata.agentic && (
                <Badge variant="outline" className="text-xs border-violet-200 text-violet-700">
                  Phân tích sâu · {message.metadata.agentic.iterations} vòng ·{" "}
                  {message.metadata.agentic.mcpQueriesUsed} MCP · {message.metadata.agentic.toolCount} tool ·{" "}
                  {message.metadata.agentic.status}
                </Badge>
              )}
            </div>
          )}

          {/* Run error */}
          {runError && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-sm text-red-700">
              {runError}
            </div>
          )}

          {/* Action Buttons */}
          {(message.metadata?.sql || editedSql !== null) && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRunQuery}
                disabled={queryRunning}
              >
                <Play className={cn("h-3.5 w-3.5 mr-1", queryRunning && "animate-spin")} />
                {queryRunning ? "Running..." : "Run Query"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExplainDetails(!showExplainDetails)}
                className={cn(
                  showExplainDetails && "bg-violet-50 border-violet-300 text-violet-700"
                )}
              >
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Explain Details
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Superset
              </Button>
              <Button variant="outline" size="sm">
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          )}

          {/* Explain Details Panel */}
          {showExplainDetails && message.metadata?.detailedExplanation && (
            <ExplainDetailsPanel
              explanation={message.metadata.detailedExplanation}
              usage={message.metadata.usage}
              onClose={() => setShowExplainDetails(false)}
            />
          )}

          {/* Query Result — shown after Run Query (local or from message) */}
          {queryRan && (localQueryResult ?? message.metadata?.queryResult) && (
            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Result — {(localQueryResult ?? message.metadata?.queryResult)!.rowCount} rows,{" "}
                    {(localQueryResult ?? message.metadata?.queryResult)!.executionTime}s
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {(localQueryResult ?? message.metadata?.queryResult)!.provider}
                  </Badge>
                </div>
                {message.metadata?.suggestedChart && (
                  <span className="text-xs text-slate-500">
                    Suggested: {message.metadata.suggestedChart}
                  </span>
                )}
              </div>
              <QueryResultTable result={(localQueryResult ?? message.metadata?.queryResult)!} />
              <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 flex-wrap">
                {onAskAboutTable && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => onAskAboutTable((localQueryResult ?? message.metadata?.queryResult)!)}
                  >
                    <Lightbulb className="h-3.5 w-3.5 mr-1" />
                    Phân tích bảng này
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChartOpen(true)}
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Chart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadResultAsCsv((localQueryResult ?? message.metadata?.queryResult)!)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  CSV
                </Button>
              </div>
              <QueryResultChartDialog
                open={chartOpen}
                onOpenChange={setChartOpen}
                result={(localQueryResult ?? message.metadata?.queryResult)!}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ExplainDetailsPanelProps {
  explanation: {
    sqlBreakdown: { clause: string; explain: string }[]
    performanceNotes: string
    businessContext: string
    learningTips: string[]
  }
  usage?: { tokens: number; cost: number }
  onClose: () => void
}

function ExplainDetailsPanel({ explanation, usage, onClose }: ExplainDetailsPanelProps) {
  return (
    <div className="border-t border-slate-100 bg-violet-50/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-violet-600" />
          <span className="text-sm font-medium text-violet-900">
            SQL Explanation (Detailed)
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* SQL Breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileCode className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">SQL Breakdown</span>
          </div>
          <div className="space-y-2">
            {explanation.sqlBreakdown.map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-slate-200">
                <code className="text-xs text-violet-700 bg-violet-100 px-2 py-1 rounded font-mono">
                  {item.clause}
                </code>
                <p className="text-sm text-slate-600 mt-2">{item.explain}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700">Performance</span>
          </div>
          <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-200">
            {explanation.performanceNotes}
          </p>
        </div>

        {/* Business Context */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700">Business Context</span>
          </div>
          <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-200">
            {explanation.businessContext}
          </p>
        </div>

        {/* Learning Tips */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-slate-700">Tips</span>
          </div>
          <ul className="space-y-1">
            {explanation.learningTips.map((tip, index) => (
              <li
                key={index}
                className="text-sm text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-200"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Token Cost */}
        {usage && (
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
            Tokens: {usage.tokens.toLocaleString()} | Cost: ${usage.cost.toFixed(3)}
          </div>
        )}
      </div>
    </div>
  )
}
