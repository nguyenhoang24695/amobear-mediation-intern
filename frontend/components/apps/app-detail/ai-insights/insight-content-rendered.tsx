"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { MermaidRenderer } from "./mermaid-renderer"
import { cn } from "@/lib/utils"

interface InsightContentRenderedProps {
  content: string
}

// Simple markdown parser for our specific use case
function parseMarkdown(content: string) {
  const elements: Array<{ type: string; content: string; key: number }> = []
  const lines = content.split("\n")
  let currentTable: string[] = []
  let inTable = false
  let key = 0
  let codeBlock = ""
  let inCodeBlock = false
  let codeBlockLang = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Handle code blocks
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockLang = line.slice(3).trim()
        codeBlock = ""
      } else {
        if (codeBlockLang === "mermaid") {
          elements.push({ type: "mermaid", content: codeBlock.trim(), key: key++ })
        } else {
          elements.push({ type: "code", content: codeBlock.trim(), key: key++ })
        }
        inCodeBlock = false
        codeBlockLang = ""
      }
      continue
    }

    if (inCodeBlock) {
      codeBlock += line + "\n"
      continue
    }

    // Handle tables
    if (line.startsWith("|")) {
      if (!inTable) {
        inTable = true
        currentTable = []
      }
      currentTable.push(line)
      continue
    } else if (inTable) {
      elements.push({ type: "table", content: currentTable.join("\n"), key: key++ })
      currentTable = []
      inTable = false
    }

    // Handle headers
    if (line.startsWith("# ") && !line.startsWith("##")) {
      elements.push({ type: "h1", content: line.slice(2), key: key++ })
      continue
    }
    if (line.startsWith("## ")) {
      elements.push({ type: "h2", content: line.slice(3), key: key++ })
      continue
    }
    if (line.startsWith("### ")) {
      elements.push({ type: "h3", content: line.slice(4), key: key++ })
      continue
    }

    // Handle horizontal rules
    if (line === "---") {
      elements.push({ type: "hr", content: "", key: key++ })
      continue
    }

    // Handle lists
    if (line.match(/^\d+\.\s/)) {
      elements.push({ type: "li-ordered", content: line.replace(/^\d+\.\s/, ""), key: key++ })
      continue
    }
    if (line.startsWith("- ")) {
      elements.push({ type: "li-unordered", content: line.slice(2), key: key++ })
      continue
    }

    // Handle paragraphs
    if (line.trim()) {
      elements.push({ type: "p", content: line, key: key++ })
    } else if (elements.length > 0 && elements[elements.length - 1].type !== "space") {
      elements.push({ type: "space", content: "", key: key++ })
    }
  }

  // Handle remaining table
  if (inTable && currentTable.length > 0) {
    elements.push({ type: "table", content: currentTable.join("\n"), key: key++ })
  }

  return elements
}

// Parse inline formatting
function parseInline(text: string) {
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-sm font-mono">$1</code>')
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 hover:underline">$1</a>')
  return text
}

// Parse table
function parseTable(tableContent: string) {
  const rows = tableContent.split("\n").filter((row) => row.trim())
  if (rows.length < 2) return null

  const headers = rows[0]
    .split("|")
    .filter((cell) => cell.trim())
    .map((cell) => cell.trim())

  // Skip the separator row (row[1])
  const dataRows = rows.slice(2).map((row) =>
    row
      .split("|")
      .filter((cell) => cell.trim())
      .map((cell) => cell.trim())
  )

  return { headers, dataRows }
}

export function InsightContentRendered({ content }: InsightContentRenderedProps) {
  const elements = useMemo(() => parseMarkdown(content), [content])

  return (
    <Card className="p-6 bg-white">
      <div className="prose prose-slate max-w-none">
        {elements.map((element) => {
          switch (element.type) {
            case "h1":
              return (
                <h1
                  key={element.key}
                  className="text-2xl font-bold text-slate-900 mb-6 mt-2"
                >
                  {element.content}
                </h1>
              )
            case "h2":
              return (
                <h2
                  key={element.key}
                  id={element.content.toLowerCase().replace(/\s+/g, "-")}
                  className="text-xl font-semibold text-indigo-700 border-b border-indigo-100 pb-2 mb-4 mt-8 first:mt-0 scroll-mt-20"
                >
                  {element.content}
                </h2>
              )

            case "h3":
              return (
                <h3
                  key={element.key}
                  className="text-lg font-medium text-slate-800 mt-6 mb-3"
                >
                  {element.content}
                </h3>
              )

            case "p":
              return (
                <p
                  key={element.key}
                  className="text-slate-700 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: parseInline(element.content) }}
                />
              )

            case "li-ordered":
              return (
                <div key={element.key} className="flex gap-3 mb-2 ml-4">
                  <span className="text-indigo-500 font-medium">
                    {element.key}.
                  </span>
                  <p
                    className="text-slate-700 flex-1"
                    dangerouslySetInnerHTML={{ __html: parseInline(element.content) }}
                  />
                </div>
              )

            case "li-unordered":
              return (
                <div key={element.key} className="flex gap-3 mb-2 ml-4">
                  <span className="text-indigo-400 mt-2">
                    <span className="block w-1.5 h-1.5 rounded-full bg-current" />
                  </span>
                  <p
                    className="text-slate-700 flex-1"
                    dangerouslySetInnerHTML={{ __html: parseInline(element.content) }}
                  />
                </div>
              )

            case "table": {
              const tableData = parseTable(element.content)
              if (!tableData) return null
              return (
                <div key={element.key} className="my-4 overflow-x-auto">
                  <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        {tableData.headers.map((header, i) => (
                          <th
                            key={i}
                            className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableData.dataRows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={cn(
                            "hover:bg-slate-50 transition-colors",
                            rowIndex % 2 === 1 && "bg-slate-25"
                          )}
                        >
                          {row.map((cell, cellIndex) => {
                            // Check if cell contains positive/negative percentage
                            const isPositive = cell.startsWith("+") && cell.includes("%")
                            const isNegative = cell.startsWith("-") && cell.includes("%")
                            return (
                              <td
                                key={cellIndex}
                                className={cn(
                                  "px-4 py-2.5 text-sm",
                                  cellIndex === 0 ? "font-medium text-slate-800" : "text-slate-600",
                                  isPositive && "text-emerald-600 font-mono font-medium",
                                  isNegative && "text-red-600 font-mono font-medium"
                                )}
                              >
                                {cell}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }

            case "mermaid":
              return (
                <MermaidRenderer
                  key={element.key}
                  chart={element.content}
                  className="my-4"
                />
              )

            case "code":
              return (
                <pre
                  key={element.key}
                  className="my-4 p-4 bg-slate-900 rounded-lg overflow-x-auto"
                >
                  <code className="text-sm font-mono text-slate-300">
                    {element.content}
                  </code>
                </pre>
              )

            case "hr":
              return (
                <hr key={element.key} className="my-8 border-slate-200" />
              )

            case "space":
              return <div key={element.key} className="h-2" />

            default:
              return null
          }
        })}
      </div>
    </Card>
  )
}
