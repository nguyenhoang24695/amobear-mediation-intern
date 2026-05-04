"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { MermaidRenderer } from "./mermaid-renderer"
import { cn } from "@/lib/utils"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from "recharts"

interface InsightContentRenderedProps {
  content: string
}

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
}

type ParsedRadar = {
  title?: string
  rows: Array<{ label: string; value: number }>
}

function tryParseRadarMarkdown(chart: string): ParsedRadar | null {
  const raw = chart.trim()
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  // Example (what we saw in prod):
  // radar
  // title Health Radar — AR Tracer 2026-04-27
  // "Revenue\n(47)" : 47
  if (lines.length < 3) return null
  if (lines[0].toLowerCase() !== "radar") return null

  let title: string | undefined
  const rows: Array<{ label: string; value: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().startsWith("title ")) {
      title = line.slice(6).trim()
      continue
    }

    const m = line.match(/^(?:"([^"]+)"|([^:]+))\s*:\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (!m) continue
    const labelRaw = (m[1] ?? m[2] ?? "").trim()
    const value = Number(m[3])
    if (!labelRaw || Number.isNaN(value)) continue
    const label = labelRaw.replace(/\\n/g, " ").replace(/\s+/g, " ").trim()
    rows.push({ label, value })
  }

  if (rows.length < 3) return null
  return { title, rows }
}

type ParsedPie = {
  title?: string
  rows: Array<{ name: string; value: number }>
}

function tryParseMermaidPie(chart: string): ParsedPie | null {
  const raw = chart.trim()
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  // Mermaid pie syntax:
  // pie title Foo
  //   "A" : 10
  //   "B" : 20
  if (lines.length < 3) return null
  if (!lines[0].toLowerCase().startsWith("pie")) return null

  let title: string | undefined
  const header = lines[0]
  const titleIdx = header.toLowerCase().indexOf("title")
  if (titleIdx >= 0) title = header.slice(titleIdx + 5).trim().replace(/^["']|["']$/g, "")

  const rows: Array<{ name: string; value: number }> = []
  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^(?:"([^"]+)"|([^:]+))\s*:\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (!m) continue
    const nameRaw = (m[1] ?? m[2] ?? "").trim()
    const value = Number(m[3])
    if (!nameRaw || Number.isNaN(value)) continue
    rows.push({ name: nameRaw, value })
  }

  if (rows.length < 2) return null
  return { title, rows }
}

type ParsedXYChart = {
  title?: string
  xLabel?: string
  yLabel?: string
  data: Array<Record<string, string | number>>
  series: Array<{ key: string; kind: "bar" | "line"; name: string }>
}

function tryParseMermaidXYChart(chart: string): ParsedXYChart | null {
  const raw = chart.trim()
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  // Mermaid xychart-beta syntax (common):
  // xychart-beta
  //   title "Revenue Trend"
  //   x-axis ["D-14","D-13",...]
  //   y-axis "USD" 0 --> 1000
  //   bar [10,20,30]
  //   line [12,18,35]
  if (lines.length < 4) return null
  if (lines[0].toLowerCase() !== "xychart-beta") return null

  let title: string | undefined
  let xLabel: string | undefined
  let yLabel: string | undefined
  let xValues: string[] | null = null
  const series: Array<{ key: string; kind: "bar" | "line"; name: string; values: number[] }> = []

  const parseBracketList = (s: string): string[] | null => {
    const m = s.match(/\[(.*)\]\s*$/)
    if (!m) return null
    const inner = m[1].trim()
    if (!inner) return []
    // Split by comma, strip quotes
    return inner
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => x.replace(/^["']|["']$/g, ""))
  }

  const parseNumberList = (s: string): number[] | null => {
    const arr = parseBracketList(s)
    if (!arr) return null
    const nums = arr.map((x) => Number(x))
    if (nums.some((n) => Number.isNaN(n))) return null
    return nums
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().startsWith("title")) {
      title = line.slice(5).trim().replace(/^["']|["']$/g, "")
      continue
    }
    if (line.toLowerCase().startsWith("x-axis")) {
      xValues = parseBracketList(line) ?? xValues
      // optional: x-axis "Date" [...]
      const m = line.match(/^x-axis\s+["']([^"']+)["']\s+/i)
      if (m) xLabel = m[1]
      continue
    }
    if (line.toLowerCase().startsWith("y-axis")) {
      const m = line.match(/^y-axis\s+["']([^"']+)["']/i)
      if (m) yLabel = m[1]
      continue
    }

    const kind = line.toLowerCase().startsWith("bar")
      ? "bar"
      : line.toLowerCase().startsWith("line")
        ? "line"
        : null
    if (!kind) continue

    // Support optional series label:
    // bar "Revenue (USD)" [..]
    // line "CPI (USD)" [..]
    const labelMatch = line.match(/^(bar|line)\s+(?:"([^"]+)"|'([^']+)')\s+/i)
    const name = (labelMatch?.[2] ?? labelMatch?.[3] ?? "").trim()

    const values = parseNumberList(line)
    if (!values) continue
    const key = `${kind}${series.length + 1}`
    series.push({ key, kind, name: name || (kind === "bar" ? `Bar ${series.filter((s) => s.kind === "bar").length + 1}` : `Line ${series.filter((s) => s.kind === "line").length + 1}`), values })
  }

  if (!xValues || xValues.length < 2 || series.length < 1) return null

  const n = xValues.length
  const data: Array<Record<string, string | number>> = []
  for (let i = 0; i < n; i++) {
    const row: Record<string, string | number> = { x: xValues[i] ?? String(i + 1) }
    for (const s of series) row[s.key] = s.values[i] ?? null
    data.push(row)
  }

  return {
    title,
    xLabel,
    yLabel,
    data,
    series: series.map((s) => ({ key: s.key, kind: s.kind, name: s.name })),
  }
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
  const toc = useMemo(() => {
    return elements
      .filter((e) => e.type === "h2")
      .map((e) => ({
        title: e.content,
        id: slugifyHeading(e.content),
      }))
  }, [elements])

  return (
    <Card className="p-6 bg-white">
      <div className="prose prose-slate max-w-none">
        {elements.map((element) => {
          switch (element.type) {
            case "h1":
              return (
                <div key={element.key} className="mb-6 mt-2">
                  <h1 className="text-2xl font-bold text-slate-900 mb-3">{element.content}</h1>
                  {toc.length > 0 ? (
                    <div className="not-prose rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium text-slate-600 mb-2">Mục lục</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                        {toc.map((item) => (
                          <a
                            key={item.id}
                            href={`#${item.id}`}
                            className="text-sm text-indigo-700 hover:text-indigo-900 hover:underline truncate"
                          >
                            {item.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            case "h2":
              return (
                <h2
                  key={element.key}
                  id={slugifyHeading(element.content)}
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
              // Mermaid doesn't support "radar" in our runtime configuration.
              // When LLM outputs a "radar" block, render it safely with Recharts instead.
              if (tryParseRadarMarkdown(element.content)) {
                const parsed = tryParseRadarMarkdown(element.content)!
                const data = parsed.rows.map((r) => ({
                  dimension: r.label,
                  score: Math.max(0, Math.min(100, r.value)),
                }))
                return (
                  <div key={element.key} className="my-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      {parsed.title ? (
                        <div className="text-sm font-semibold text-slate-800 mb-3">
                          {parsed.title}
                        </div>
                      ) : null}
                      <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                            <PolarGrid strokeDasharray="3 3" />
                            <PolarAngleAxis
                              dataKey="dimension"
                              tick={{ fontSize: 12, fill: "#64748b" }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              tickCount={5}
                            />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#6366f1"
                              fill="#6366f1"
                              fillOpacity={0.25}
                              strokeWidth={2}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )
              }

              const pie = tryParseMermaidPie(element.content)
              if (pie) {
                const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#64748b"]
                return (
                  <div key={element.key} className="my-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      {pie.title ? (
                        <div className="text-sm font-semibold text-slate-800 mb-3">{pie.title}</div>
                      ) : null}
                      <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pie.rows}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius="75%"
                              label
                            >
                              {pie.rows.map((_, idx) => (
                                <Cell key={idx} fill={colors[idx % colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )
              }

              const xy = tryParseMermaidXYChart(element.content)
              if (xy) {
                const palette = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#a855f7", "#64748b"]
                return (
                  <div key={element.key} className="my-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      {xy.title ? (
                        <div className="text-sm font-semibold text-slate-800 mb-3">{xy.title}</div>
                      ) : null}
                      <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={xy.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" tick={{ fontSize: 12, fill: "#64748b" }} />
                            <YAxis
                              tick={{ fontSize: 12, fill: "#64748b" }}
                              label={
                                xy.yLabel
                                  ? { value: xy.yLabel, angle: -90, position: "insideLeft", fill: "#64748b" }
                                  : undefined
                              }
                            />
                            <Tooltip />
                            <Legend />
                            {xy.series.map((s, idx) => {
                              const color = palette[idx % palette.length]
                              if (s.kind === "line") {
                                return (
                                  <Line
                                    key={s.key}
                                    type="monotone"
                                    dataKey={s.key}
                                    name={s.name}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                )
                              }
                              return (
                                <Bar
                                  key={s.key}
                                  dataKey={s.key}
                                  name={s.name}
                                  fill={color}
                                  radius={[4, 4, 0, 0]}
                                />
                              )
                            })}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      {xy.xLabel ? (
                        <div className="text-xs text-slate-500 mt-2">X: {xy.xLabel}</div>
                      ) : null}
                    </div>
                  </div>
                )
              }

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
