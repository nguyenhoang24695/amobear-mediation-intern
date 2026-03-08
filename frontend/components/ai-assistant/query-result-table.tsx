"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { QueryResult } from "./ai-assistant-content"

interface QueryResultTableProps {
  result: QueryResult
}

export function QueryResultTable({ result }: QueryResultTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedRows = [...result.rows].sort((a, b) => {
    if (!sortColumn) return 0
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    
    // Handle string comparison
    if (typeof aVal === "string" && typeof bVal === "string") {
      // Remove % and other characters for numeric strings
      const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ""))
      const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ""))
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum
      }
      return sortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal)
    }
    
    // Handle number comparison
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    }
    
    return 0
  })

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "number") return value.toLocaleString()
    return String(value)
  }

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-white">
          <TableRow>
            {result.columns.map((column) => (
              <TableHead
                key={column}
                className="cursor-pointer hover:bg-slate-50 select-none"
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-1">
                  <span>{column}</span>
                  {sortColumn === column ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-slate-300" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-slate-50">
              {result.columns.map((column) => (
                <TableCell key={column} className="text-sm">
                  {formatValue(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
