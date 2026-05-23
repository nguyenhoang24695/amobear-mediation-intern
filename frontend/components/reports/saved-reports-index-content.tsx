"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { FolderOpen, Pin, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import type { CustomReportListItem } from "@/types/reports"

const ALL_FOLDERS = "__all__"
const UNCATEGORIZED_FOLDER = "__uncategorized__"

interface SavedReportsIndexContentProps {
  reports: CustomReportListItem[]
}

function formatUpdatedAt(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy · h:mm a")
  } catch {
    return value
  }
}

function folderLabel(folder: string): string {
  return folder.trim() || "Uncategorized"
}

export function SavedReportsIndexContent({ reports }: SavedReportsIndexContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [folderFilter, setFolderFilter] = useState(ALL_FOLDERS)

  const folderOptions = useMemo(() => {
    const names = new Set<string>()
    let hasUncategorized = false
    for (const report of reports) {
      const trimmed = report.folder?.trim() ?? ""
      if (trimmed) names.add(trimmed)
      else hasUncategorized = true
    }
    return {
      folders: Array.from(names).sort((a, b) => a.localeCompare(b)),
      hasUncategorized,
    }
  }, [reports])

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return reports
      .filter((report) => {
        if (folderFilter === ALL_FOLDERS) return true
        const trimmed = report.folder?.trim() ?? ""
        if (folderFilter === UNCATEGORIZED_FOLDER) return trimmed.length === 0
        return trimmed === folderFilter
      })
      .filter((report) => !q || report.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [reports, searchQuery, folderFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse saved custom reports by name and folder.
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/reports?new=1">
            <Plus className="mr-2 h-4 w-4" />
            New report
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by report name..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FOLDERS}>All folders</SelectItem>
            {folderOptions.hasUncategorized && (
              <SelectItem value={UNCATEGORIZED_FOLDER}>Uncategorized</SelectItem>
            )}
            {folderOptions.folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead className="w-[200px]">Folder</TableHead>
                <TableHead className="w-[220px]">Updated</TableHead>
                <TableHead className="w-[100px]">Pinned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-slate-500">
                    No reports match your search or folder filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <Link
                        href={`/reports?reportId=${report.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {report.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{folderLabel(report.folder ?? "")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatUpdatedAt(report.updatedAt)}
                    </TableCell>
                    <TableCell>
                      {report.isPinned ? (
                        <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                          <Pin className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        Showing {filteredReports.length} of {reports.length} saved report{reports.length === 1 ? "" : "s"}
      </p>
    </div>
  )
}
