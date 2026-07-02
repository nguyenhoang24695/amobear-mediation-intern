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
      return <span className="text-muted-foreground">{line}</span>
    }

    return line
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="line-numbers"
              checked={showLineNumbers}
              onCheckedChange={setShowLineNumbers}
              className="data-[state=checked]:bg-primary"
            />
            <Label
              htmlFor="line-numbers"
              className="cursor-pointer text-xs text-muted-foreground"
            >
              Line numbers
            </Label>
          </div>
          <span className="text-xs text-muted-foreground">
            {lines.length} lines
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
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
      <div className="max-h-[480px] overflow-x-auto overflow-y-auto p-3 sm:max-h-[600px] sm:p-4">
        <pre className="font-mono text-sm leading-relaxed">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "flex rounded hover:bg-muted/60",
                showLineNumbers ? "" : "pl-2",
              )}
            >
              {showLineNumbers && (
                <span className="w-10 flex-shrink-0 select-none pr-3 text-right text-muted-foreground sm:w-12 sm:pr-4">
                  {index + 1}
                </span>
              )}
              <span className="flex-1 whitespace-pre-wrap break-words text-foreground">
                {highlightLine(line) || "\u00A0"}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </Card>
  )
}
