"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  BookOpen,
  Copy,
  Edit2,
  ExternalLink,
  Save,
  BarChart3,
  Download,
  Pin,
  Link2,
  X,
  Zap,
  Lightbulb,
  TrendingUp,
  FileCode,
} from "lucide-react"
import type { AiMessage } from "./ai-assistant-content"
import { QueryResultTable } from "./query-result-table"

interface AiMessageBubbleProps {
  message: AiMessage
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

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const [showExplainDetails, setShowExplainDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  const [queryRunning, setQueryRunning] = useState(false)
  const [queryRan, setQueryRan] = useState(false)

  const handleRunQuery = () => {
    setQueryRunning(true)
    setTimeout(() => {
      setQueryRunning(false)
      setQueryRan(true)
    }, 900)
  }

  const provider = (message.metadata?.provider as keyof typeof providerConfig) || "claude"
  const config = providerConfig[provider]

  const handleCopy = async () => {
    if (message.metadata?.sql) {
      await navigator.clipboard.writeText(message.metadata.sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
          {/* Explanation Text */}
          <div className="p-4">
            <p className="text-slate-700 text-sm leading-relaxed">{message.content}</p>
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
          {message.metadata?.sql && (
            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-medium text-slate-500">SQL</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-slate-900 overflow-x-auto">
                <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                  {message.metadata.sql}
                </pre>
              </div>
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
            </div>
          )}

          {/* Action Buttons */}
          {message.metadata?.sql && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100">
              {!queryRan && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleRunQuery}
                  disabled={queryRunning}
                >
                  <Play className={cn("h-3.5 w-3.5 mr-1", queryRunning && "animate-spin")} />
                  {queryRunning ? "Running..." : "Run Query"}
                </Button>
              )}
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

          {/* Query Result — only shown after Run Query */}
          {queryRan && message.metadata?.queryResult && (
            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Result — {message.metadata.queryResult.rowCount} rows,{" "}
                    {message.metadata.queryResult.executionTime}s
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {message.metadata.queryResult.provider}
                  </Badge>
                </div>
                {message.metadata.suggestedChart && (
                  <span className="text-xs text-slate-500">
                    Suggested: {message.metadata.suggestedChart}
                  </span>
                )}
              </div>
              <QueryResultTable result={message.metadata.queryResult} />
              <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Chart
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm">
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  Superset
                </Button>
                <Button variant="outline" size="sm">
                  <Pin className="h-3.5 w-3.5 mr-1" />
                  Pin
                </Button>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  Create View
                </Button>
              </div>
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
