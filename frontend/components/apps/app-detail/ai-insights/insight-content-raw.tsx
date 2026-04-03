"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface InsightContentRawProps {
  content: string
}

export function InsightContentRaw({ content }: InsightContentRawProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [copied, setCopied] = useState(false)

  const lines = content.split("\n")

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Simple syntax highlighting
  const highlightLine = (line: string) => {
    // Headers
    if (line.startsWith("## ")) {
      return <span className="text-indigo-400 font-semibold">{line}</span>
    }
    if (line.startsWith("### ")) {
      return <span className="text-indigo-300">{line}</span>
    }

    // Code block markers
    if (line.startsWith("```")) {
      return <span className="text-emerald-400">{line}</span>
    }

    // Table rows
    if (line.startsWith("|")) {
      return <span className="text-cyan-300">{line}</span>
    }

    // List items
    if (line.match(/^\d+\.\s/) || line.startsWith("- ")) {
      return <span className="text-amber-300">{line}</span>
    }

    // Bold text
    if (line.includes("**")) {
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      return (
        <>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <span key={i} className="text-white font-semibold">
                  {part}
                </span>
              )
            }
            return <span key={i}>{part}</span>
          })}
        </>
      )
    }

    // Horizontal rule
    if (line === "---") {
      return <span className="text-slate-500">{line}</span>
    }

    return line
  }

  return (
    <Card className="bg-slate-900 border-slate-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="line-numbers"
              checked={showLineNumbers}
              onCheckedChange={setShowLineNumbers}
              className="data-[state=checked]:bg-indigo-600"
            />
            <Label
              htmlFor="line-numbers"
              className="text-xs text-slate-400 cursor-pointer"
            >
              Line numbers
            </Label>
          </div>
          <span className="text-xs text-slate-500">
            {lines.length} lines
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto p-4 max-h-[600px] overflow-y-auto">
        <pre className="font-mono text-sm leading-relaxed">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "flex hover:bg-slate-800/50 rounded",
                showLineNumbers ? "" : "pl-2"
              )}
            >
              {showLineNumbers && (
                <span className="w-12 pr-4 text-right text-slate-600 select-none flex-shrink-0">
                  {index + 1}
                </span>
              )}
              <span className="text-slate-300 whitespace-pre-wrap break-words flex-1">
                {highlightLine(line) || "\u00A0"}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </Card>
  )
}
