"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Code2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MermaidRendererProps {
  chart: string
  className?: string
}

export function MermaidRenderer({ chart, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)
  const [mermaidLoaded, setMermaidLoaded] = useState(false)
  const normalizedChart = chart.replace(/\\n/g, "\n")

  useEffect(() => {
    // Dynamically import mermaid
    const loadMermaid = async () => {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "Inter, sans-serif",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
          pie: {
            useMaxWidth: true,
          },
          themeVariables: {
            primaryColor: "#e0e7ff",
            primaryTextColor: "#3730a3",
            primaryBorderColor: "#6366f1",
            lineColor: "#94a3b8",
            secondaryColor: "#f1f5f9",
            tertiaryColor: "#fef3c7",
          },
        })
        setMermaidLoaded(true)
      } catch (err) {
        console.error("Failed to load mermaid:", err)
        setError("Failed to load diagram library")
      }
    }
    loadMermaid()
  }, [])

  useEffect(() => {
    if (!mermaidLoaded || !chart) return

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        // Mermaid can throw on unsupported syntaxes; never let it break the insight page layout.
        // Also clear previous SVG so we don't show stale diagrams after an error.
        setSvg("")
        const { svg: renderedSvg } = await mermaid.render(id, normalizedChart)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        console.error("Mermaid rendering error:", err)
        setError("Failed to render diagram")
      }
    }

    renderDiagram()
  }, [chart, mermaidLoaded, normalizedChart])

  if (error) {
    return (
      <div className={cn("rounded-lg border border-amber-200 bg-amber-50 p-4", className)}>
        <div className="flex items-start gap-3">
          <Code2 className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Diagram could not be rendered</p>
            <p className="text-xs text-amber-600 mt-1">{error}</p>
            <pre className="mt-3 p-3 bg-amber-100 rounded text-xs font-mono text-amber-900 overflow-auto max-h-64 whitespace-pre-wrap break-words">
              {normalizedChart}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={cn("rounded-lg border border-slate-200 bg-slate-50 p-8 animate-pulse", className)}>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white overflow-hidden", className)}>
      {/* Rendered Diagram */}
      <div
        ref={containerRef}
        className="p-4 flex items-center justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* View Source Toggle */}
      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-slate-500 hover:text-slate-700 gap-1.5"
          onClick={() => setShowSource(!showSource)}
        >
          <Code2 className="w-3.5 h-3.5" />
          View source
          {showSource ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </Button>

        {showSource && (
          <pre className="mt-2 p-3 bg-slate-900 rounded text-xs font-mono text-slate-300 overflow-x-auto">
            {chart}
          </pre>
        )}
      </div>
    </div>
  )
}
