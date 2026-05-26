"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { hasScreenFunction } from "@/lib/auth"
import { reportsApi } from "@/lib/api/services"
import { notifyPinnedCustomReportsChanged } from "@/lib/reports/pinned-custom-reports"
import type { CustomReportFolder, CustomReportListItem } from "@/types/reports"

const UNCATEGORIZED_KEY = "__uncategorized__"

interface SavedReportsIndexContentProps {
  reports: CustomReportListItem[]
  folders: CustomReportFolder[]
  onDataChange?: () => void
}

function formatUpdatedAt(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy · h:mm a")
  } catch {
    return value
  }
}

function reportFolderKey(report: CustomReportListItem): string {
  const trimmed = report.folder?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : UNCATEGORIZED_KEY
}

interface FolderGroup {
  key: string
  label: string
  folderId?: string
  reports: CustomReportListItem[]
}

function ReportsTable({
  reports,
  onDelete,
  onTogglePinned,
  deletingReportId,
  pinningReportId,
  canPinReports,
  canDeleteReports,
}: {
  reports: CustomReportListItem[]
  onDelete: (report: CustomReportListItem) => void
  onTogglePinned: (report: CustomReportListItem) => void
  deletingReportId?: string | null
  pinningReportId?: string | null
  canPinReports: boolean
  canDeleteReports: boolean
}) {
  if (reports.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500">No reports in this folder.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead>Name</TableHead>
          <TableHead className="w-[220px]">Updated</TableHead>
          <TableHead className="w-[120px]" />
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id} className="hover:bg-slate-50/80">
            <TableCell>
              <Link
                href={`/reports?reportId=${report.id}`}
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {report.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-slate-500">
              {formatUpdatedAt(report.updatedAt)}
            </TableCell>
            <TableCell>
              {canPinReports ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    report.isPinned
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                      : ""
                  }
                  disabled={pinningReportId === report.id || deletingReportId === report.id}
                  onClick={() => onTogglePinned(report)}
                >
                  <Pin className="h-4 w-4" />
                  {pinningReportId === report.id ? "Updating…" : report.isPinned ? "Unpin" : "Pin"}
                </Button>
              ) : null}
            </TableCell>
            <TableCell className="text-right">
              {canDeleteReports ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deletingReportId === report.id}
                  onClick={() => onDelete(report)}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingReportId === report.id ? "Deleting…" : "Delete"}
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function SavedReportsIndexContent({
  reports,
  folders,
  onDataChange,
}: SavedReportsIndexContentProps) {
  const canCreateReports = hasScreenFunction("s-reports", "create")
  const canDeleteReports = hasScreenFunction("s-reports", "delete")
  const canPinReports = hasScreenFunction("s-reports", "pin")
  const canManageFolders = hasScreenFunction("s-reports", "manage-folders")

  const [searchQuery, setSearchQuery] = useState("")
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [addFolderOpen, setAddFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<CustomReportListItem | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [pinningReportId, setPinningReportId] = useState<string | null>(null)

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return reports
    return reports.filter((report) => report.name.toLowerCase().includes(q))
  }, [reports, searchQuery])

  const folderGroups = useMemo((): FolderGroup[] => {
    const byKey = new Map<string, CustomReportListItem[]>()

    for (const report of filteredReports) {
      const key = reportFolderKey(report)
      const list = byKey.get(key) ?? []
      list.push(report)
      byKey.set(key, list)
    }

    const groups: FolderGroup[] = folders.map((folder) => ({
      key: folder.name,
      label: folder.name,
      folderId: folder.id,
      reports: (byKey.get(folder.name) ?? []).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    }))

    const uncategorized = byKey.get(UNCATEGORIZED_KEY) ?? []
    if (uncategorized.length > 0) {
      groups.push({
        key: UNCATEGORIZED_KEY,
        label: "Uncategorized",
        reports: [...uncategorized].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }),
      })
    }

    return groups.filter((group) => !searchQuery.trim() || group.reports.length > 0)
  }, [filteredReports, folders, searchQuery])

  useEffect(() => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      for (const group of folderGroups) {
        if (!next.has(group.key)) next.add(group.key)
      }
      return next
    })
  }, [folderGroups])

  const toggleFolder = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleCreateFolder = async () => {
    if (!canManageFolders) {
      toast.error("You do not have permission to manage report folders.")
      return
    }

    const name = newFolderName.trim()
    if (!name) {
      toast.error("Folder name is required.")
      return
    }

    setCreatingFolder(true)
    try {
      const created = await reportsApi.createFolder(name)
      setAddFolderOpen(false)
      setNewFolderName("")
      setExpandedKeys((prev) => new Set(prev).add(created.name))
      toast.success(`Folder "${created.name}" created`)
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create folder"
      toast.error(message)
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!reportToDelete) return
    if (!canDeleteReports) {
      toast.error("You do not have permission to delete reports.")
      return
    }

    setDeletingReportId(reportToDelete.id)
    try {
      await reportsApi.deleteSaved(reportToDelete.id)
      if (reportToDelete.isPinned) notifyPinnedCustomReportsChanged()
      toast.success(`Deleted "${reportToDelete.name}"`)
      setReportToDelete(null)
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete report"
      toast.error(message)
    } finally {
      setDeletingReportId(null)
    }
  }

  const handleTogglePinned = async (report: CustomReportListItem) => {
    if (!canPinReports) {
      toast.error("You do not have permission to pin reports.")
      return
    }

    setPinningReportId(report.id)
    try {
      const updated = await reportsApi.setPinned(report.id, !report.isPinned)
      notifyPinnedCustomReportsChanged()
      toast.success(updated.isPinned ? `Pinned "${report.name}"` : `Unpinned "${report.name}"`)
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update pin"
      toast.error(message)
    } finally {
      setPinningReportId(null)
    }
  }

  const totalVisibleReports = filteredReports.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse folders and open saved custom reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageFolders ? (
            <Button variant="outline" onClick={() => setAddFolderOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add folder
            </Button>
          ) : null}
          {canCreateReports ? (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/reports?new=1">
                <Plus className="mr-2 h-4 w-4" />
                New report
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by report name..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {folderGroups.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            {searchQuery.trim()
              ? "No reports match your search."
              : canCreateReports || canManageFolders
                ? "No folders yet. Add a folder or save your first report."
                : "No reports available yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {folderGroups.map((group) => {
            const expanded = expandedKeys.has(group.key)
            const newReportHref =
              group.key === UNCATEGORIZED_KEY
                ? "/reports?new=1"
                : `/reports?new=1&folder=${encodeURIComponent(group.label)}`

            return (
              <Card key={group.key} className="overflow-hidden border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
                  onClick={() => toggleFolder(group.key)}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  {expanded ? (
                    <FolderOpen className="h-5 w-5 shrink-0 text-blue-600" />
                  ) : (
                    <Folder className="h-5 w-5 shrink-0 text-blue-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{group.label}</p>
                    <p className="text-xs text-slate-500">
                      {group.reports.length} report{group.reports.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {canCreateReports ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-blue-600 hover:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={newReportHref}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        New in folder
                      </Link>
                    </Button>
                  ) : null}
                </button>
                {expanded && (
                  <CardContent className="p-0">
                    <ReportsTable
                      reports={group.reports}
                      onTogglePinned={handleTogglePinned}
                      deletingReportId={deletingReportId}
                      pinningReportId={pinningReportId}
                      onDelete={setReportToDelete}
                      canPinReports={canPinReports}
                      canDeleteReports={canDeleteReports}
                    />
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {totalVisibleReports} report{totalVisibleReports === 1 ? "" : "s"}
        {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
        {" · "}
        {folders.length} folder{folders.length === 1 ? "" : "s"}
      </p>

      <Dialog open={addFolderOpen} onOpenChange={(open) => !creatingFolder && setAddFolderOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize saved reports. You can add reports to it when saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-folder-name">Folder name</Label>
            <Input
              id="new-folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Revenue, UA, Executive"
              maxLength={100}
              disabled={creatingFolder}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFolder()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={creatingFolder}
              onClick={() => setAddFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={creatingFolder || !newFolderName.trim()}
              onClick={() => void handleCreateFolder()}
            >
              {creatingFolder ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportToDelete)}
        onOpenChange={(open) => {
          if (!deletingReportId && !open) setReportToDelete(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete report</DialogTitle>
            <DialogDescription>
              {reportToDelete
                ? `Delete "${reportToDelete.name}"? This action cannot be undone.`
                : "Delete this report? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(deletingReportId)}
              onClick={() => setReportToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(deletingReportId)}
              onClick={() => void handleDeleteReport()}
            >
              {deletingReportId ? "Deleting…" : "Delete report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
