"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { DataQualityRowDto } from "@/types/api"

const statusConfig: Record<string, { label: string; className: string }> = {
  healthy: { label: "Healthy", className: "bg-green-100 text-green-700 border-green-200" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-700 border-amber-200" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  scheduled_only: { label: "Scheduled", className: "bg-slate-100 text-slate-600 border-slate-200" },
  unknown: { label: "Unknown", className: "bg-slate-100 text-slate-500 border-slate-200" },
}

type SortKey = "source" | "table" | "lastUpdated" | "rowCount" | "status" | "layer"
type SortDir = "asc" | "desc"

function parseLastUpdatedSort(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

export function DataQualityMonitor({ rows }: { rows: DataQualityRowDto[] }) {
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("source")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const sourceKeys = useMemo(() => {
    const s = new Set(rows.map((r) => r.sourceKey))
    return Array.from(s).sort()
  }, [rows])

  const filteredSorted = useMemo(() => {
    let data = rows
    if (sourceFilter !== "all") data = data.filter((r) => r.sourceKey === sourceFilter)
    if (statusFilter !== "all") data = data.filter((r) => r.status === statusFilter)

    const dir = sortDir === "asc" ? 1 : -1
    data = [...data].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "source":
          cmp = a.sourceName.localeCompare(b.sourceName) || a.tableName.localeCompare(b.tableName)
          break
        case "table":
          cmp = a.tableName.localeCompare(b.tableName)
          break
        case "layer":
          cmp = a.layer.localeCompare(b.layer) || a.tableName.localeCompare(b.tableName)
          break
        case "lastUpdated": {
          const ta = parseLastUpdatedSort(a.lastDataAtUtc)
          const tb = parseLastUpdatedSort(b.lastDataAtUtc)
          cmp = ta === tb ? (a.lastUpdatedRelative || "").localeCompare(b.lastUpdatedRelative || "") : ta - tb
          break
        }
        case "rowCount": {
          const va = a.rowCountValue ?? -1
          const vb = b.rowCountValue ?? -1
          cmp = va === vb ? (a.rowCount || "").localeCompare(b.rowCount || "") : va - vb
          break
        }
        case "status":
          cmp = a.status.localeCompare(b.status) || a.tableName.localeCompare(b.tableName)
          break
        default:
          cmp = 0
      }
      return cmp * dir
    })
    return data
  }, [rows, sourceFilter, statusFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-600" />
    )
  }

  const sortableHead = (label: string, column: SortKey, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center font-medium text-slate-700 hover:text-slate-900"
      >
        {label}
        <SortIcon column={column} />
      </button>
    </TableHead>
  )

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">Data Quality Monitor</CardTitle>
          <div className="flex items-center gap-3 shrink-0">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="scheduled_only">Scheduled</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {sortableHead("Source", "source")}
              {sortableHead("Layer", "layer", "w-[90px]")}
              {sortableHead("Table", "table")}
              {sortableHead("Last updated", "lastUpdated")}
              {sortableHead("Row count", "rowCount", "text-right w-[110px]")}
              {sortableHead("Status", "status", "text-right w-[110px]")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSorted.map((row) => {
              const cfg = statusConfig[row.status] ?? statusConfig.unknown
              return (
                <TableRow key={row.id} className="hover:bg-slate-50/80">
                  <TableCell className="text-sm text-slate-800">{row.sourceName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {row.layer}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="font-mono text-xs text-slate-800">{row.tableName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{row.description}</div>
                    {row.notes && <div className="text-[11px] text-slate-400 italic mt-1">{row.notes}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 whitespace-nowrap align-top">
                    {row.lastUpdatedRelative || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-700 text-right align-top">{row.rowCount ?? "—"}</TableCell>
                  <TableCell className="text-right align-top">
                    <Badge variant="outline" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {filteredSorted.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">No rows match filters.</p>
        )}
      </CardContent>
    </Card>
  )
}
