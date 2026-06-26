"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

function buildDuplicateReportName(existingNames: readonly string[], sourceName: string): string {
  const trimmedSource = sourceName.trim()
  const baseName = trimmedSource.length > 0 ? trimmedSource : "Untitled report"
  const normalizedNames = new Set(existingNames.map((name) => name.trim().toLowerCase()))
  const firstCandidate = `${baseName} (Copy)`
  if (!normalizedNames.has(firstCandidate.toLowerCase())) {
    return firstCandidate
  }

  let index = 2
  while (true) {
    const candidate = `${baseName} (Copy ${index})`
    if (!normalizedNames.has(candidate.toLowerCase())) {
      return candidate
    }
    index++
  }
}

interface FolderGroup {
  key: string
  label: string
  folderId?: string
  reports: CustomReportListItem[]
}

function ReportsTable({
  reports,
  folders,
  onRename,
  onDuplicate,
  onChangeFolder,
  onDelete,
  onTogglePinned,
  renamingReportId,
  duplicatingReportId,
  changingFolderReportId,
  deletingReportId,
  pinningReportId,
  canCreateReports,
  canEditReports,
  canPinReports,
  canDeleteReports,
}: {
  reports: CustomReportListItem[]
  folders: CustomReportFolder[]
  onRename: (report: CustomReportListItem) => void
  onDuplicate: (report: CustomReportListItem) => void
  onChangeFolder: (report: CustomReportListItem) => void
  onDelete: (report: CustomReportListItem) => void
  onTogglePinned: (report: CustomReportListItem) => void
  renamingReportId?: string | null
  duplicatingReportId?: string | null
  changingFolderReportId?: string | null
  deletingReportId?: string | null
  pinningReportId?: string | null
  canCreateReports: boolean
  canEditReports: boolean
  canPinReports: boolean
  canDeleteReports: boolean
}) {
  if (reports.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">No reports in this folder.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/80 hover:bg-muted/80">
          <TableHead>Name</TableHead>
          <TableHead className="w-[220px]">Updated</TableHead>
          <TableHead className="w-[120px]" />
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id} className="hover:bg-muted/80">
            <TableCell>
              <Link
                href={`/reports?reportId=${report.id}`}
                className="font-medium text-primary hover:text-primary hover:underline"
              >
                {report.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
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
              {canCreateReports || canEditReports || canDeleteReports ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={
                        renamingReportId === report.id ||
                        duplicatingReportId === report.id ||
                        changingFolderReportId === report.id ||
                        deletingReportId === report.id
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEditReports ? (
                      <DropdownMenuItem
                        disabled={renamingReportId === report.id}
                        onClick={() => onRename(report)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {renamingReportId === report.id ? "Renaming…" : "Rename"}
                      </DropdownMenuItem>
                    ) : null}
                    {canCreateReports ? (
                      <DropdownMenuItem
                        disabled={duplicatingReportId === report.id}
                        onClick={() => onDuplicate(report)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {duplicatingReportId === report.id ? "Duplicating…" : "Duplicate"}
                      </DropdownMenuItem>
                    ) : null}
                    {canEditReports ? (
                      <DropdownMenuItem
                        disabled={changingFolderReportId === report.id}
                        onClick={() => onChangeFolder(report)}
                      >
                        <Folder className="mr-2 h-4 w-4" />
                        {changingFolderReportId === report.id ? "Changing…" : "Change folder"}
                      </DropdownMenuItem>
                    ) : null}
                    {canDeleteReports ? (
                      <DropdownMenuItem
                        disabled={deletingReportId === report.id}
                        className="text-red-600 focus:text-red-700 dark:text-red-300"
                        onClick={() => onDelete(report)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingReportId === report.id ? "Deleting…" : "Delete"}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
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
  const canEditReports = hasScreenFunction("s-reports", "edit")
  const canDeleteReports = hasScreenFunction("s-reports", "delete")
  const canPinReports = hasScreenFunction("s-reports", "pin")
  const canManageFolders = hasScreenFunction("s-reports", "manage-folders")

  const [searchQuery, setSearchQuery] = useState("")
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [addFolderOpen, setAddFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<CustomReportListItem | null>(null)
  const [reportToChangeFolder, setReportToChangeFolder] = useState<CustomReportListItem | null>(null)
  const [reportToRename, setReportToRename] = useState<CustomReportListItem | null>(null)
  const [renameReportName, setRenameReportName] = useState("")
  const [targetFolderValue, setTargetFolderValue] = useState<string>(UNCATEGORIZED_KEY)
  const [changeFolderNewFolderName, setChangeFolderNewFolderName] = useState("")
  const [creatingFolderForMove, setCreatingFolderForMove] = useState(false)
  const [pendingFolderNames, setPendingFolderNames] = useState<string[]>([])
  const [renamingReportId, setRenamingReportId] = useState<string | null>(null)
  const [duplicatingReportId, setDuplicatingReportId] = useState<string | null>(null)
  const [changingFolderReportId, setChangingFolderReportId] = useState<string | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)
  const [pinningReportId, setPinningReportId] = useState<string | null>(null)

  const availableFolderNames = useMemo(() => {
    const names = new Set<string>()
    for (const folder of folders) {
      if (folder.name.trim()) names.add(folder.name.trim())
    }
    for (const folderName of pendingFolderNames) {
      if (folderName.trim()) names.add(folderName.trim())
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [folders, pendingFolderNames])

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

  const handleDuplicateReport = async (report: CustomReportListItem) => {
    if (!canCreateReports) {
      toast.error("You do not have permission to create reports.")
      return
    }

    setDuplicatingReportId(report.id)
    try {
      const fullReport = await reportsApi.getSaved(report.id)
      const duplicateName = buildDuplicateReportName(
        reports.map((item) => item.name),
        fullReport.name,
      )
      await reportsApi.createSaved({
        name: duplicateName,
        folder: fullReport.folder || null,
        filters: fullReport.filters,
        dimensions: fullReport.dimensions,
        metrics: fullReport.metrics,
      })
      toast.success(`Duplicated "${report.name}"`)
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to duplicate report"
      toast.error(message)
    } finally {
      setDuplicatingReportId(null)
    }
  }

  const openRenameDialog = (report: CustomReportListItem) => {
    if (!canEditReports) {
      toast.error("You do not have permission to edit reports.")
      return
    }

    setReportToRename(report)
    setRenameReportName(report.name)
  }

  const handleRenameReport = async () => {
    if (!reportToRename) return
    if (!canEditReports) {
      toast.error("You do not have permission to edit reports.")
      return
    }

    const nextName = renameReportName.trim()
    if (!nextName) {
      toast.error("Report name is required.")
      return
    }

    const currentName = reportToRename.name.trim()
    if (currentName === nextName) {
      setReportToRename(null)
      return
    }

    setRenamingReportId(reportToRename.id)
    try {
      const fullReport = await reportsApi.getSaved(reportToRename.id)
      await reportsApi.updateSaved(reportToRename.id, {
        name: nextName,
        folder: fullReport.folder || null,
        filters: fullReport.filters,
        dimensions: fullReport.dimensions,
        metrics: fullReport.metrics,
      })
      toast.success(`Renamed "${reportToRename.name}"`)
      setReportToRename(null)
      setRenameReportName("")
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to rename report"
      toast.error(message)
    } finally {
      setRenamingReportId(null)
    }
  }

  const openChangeFolderDialog = (report: CustomReportListItem) => {
    if (!canEditReports) {
      toast.error("You do not have permission to edit reports.")
      return
    }

    setReportToChangeFolder(report)
    setTargetFolderValue(report.folder?.trim() ? report.folder.trim() : UNCATEGORIZED_KEY)
    setChangeFolderNewFolderName("")
  }

  const handleCreateFolderForMove = async () => {
    if (!canManageFolders) {
      toast.error("You do not have permission to manage report folders.")
      return
    }

    const name = changeFolderNewFolderName.trim()
    if (!name) {
      toast.error("Folder name is required.")
      return
    }

    setCreatingFolderForMove(true)
    try {
      const created = await reportsApi.createFolder(name)
      setPendingFolderNames((prev) => (prev.includes(created.name) ? prev : [...prev, created.name]))
      setExpandedKeys((prev) => new Set(prev).add(created.name))
      setTargetFolderValue(created.name)
      setChangeFolderNewFolderName("")
      toast.success(`Folder "${created.name}" created`)
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create folder"
      toast.error(message)
    } finally {
      setCreatingFolderForMove(false)
    }
  }

  const handleChangeFolder = async () => {
    if (!reportToChangeFolder) return
    if (!canEditReports) {
      toast.error("You do not have permission to edit reports.")
      return
    }

    const nextFolder = targetFolderValue === UNCATEGORIZED_KEY ? "" : targetFolderValue
    const currentFolder = reportToChangeFolder.folder?.trim() ?? ""
    if (currentFolder === nextFolder) {
      setReportToChangeFolder(null)
      return
    }

    setChangingFolderReportId(reportToChangeFolder.id)
    try {
      const fullReport = await reportsApi.getSaved(reportToChangeFolder.id)
      await reportsApi.updateSaved(reportToChangeFolder.id, {
        name: fullReport.name,
        folder: nextFolder || null,
        filters: fullReport.filters,
        dimensions: fullReport.dimensions,
        metrics: fullReport.metrics,
      })

      if (nextFolder) {
        setExpandedKeys((prev) => new Set(prev).add(nextFolder))
      } else {
        setExpandedKeys((prev) => new Set(prev).add(UNCATEGORIZED_KEY))
      }

      toast.success(`Moved "${reportToChangeFolder.name}"`)
      setReportToChangeFolder(null)
      onDataChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to change folder"
      toast.error(message)
    } finally {
      setChangingFolderReportId(null)
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
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/reports?new=1">
                <Plus className="mr-2 h-4 w-4" />
                New report
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by report name..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {folderGroups.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
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
              <Card key={group.key} className="overflow-hidden border-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-border bg-muted/80 px-4 py-3 text-left transition-colors hover:bg-muted/80"
                  onClick={() => toggleFolder(group.key)}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  {expanded ? (
                    <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
                  ) : (
                    <Folder className="h-5 w-5 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.reports.length} report{group.reports.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {canCreateReports ? (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-primary hover:text-primary"
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
                      folders={folders}
                      onRename={openRenameDialog}
                      onDuplicate={handleDuplicateReport}
                      onChangeFolder={openChangeFolderDialog}
                      onTogglePinned={handleTogglePinned}
                      renamingReportId={renamingReportId}
                      duplicatingReportId={duplicatingReportId}
                      changingFolderReportId={changingFolderReportId}
                      deletingReportId={deletingReportId}
                      pinningReportId={pinningReportId}
                      onDelete={setReportToDelete}
                      canCreateReports={canCreateReports}
                      canEditReports={canEditReports}
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

      <p className="text-xs text-muted-foreground">
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
              className="bg-primary hover:bg-primary/90"
              disabled={creatingFolder || !newFolderName.trim()}
              onClick={() => void handleCreateFolder()}
            >
              {creatingFolder ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportToRename)}
        onOpenChange={(open) => {
          if (!renamingReportId && !open) {
            setReportToRename(null)
            setRenameReportName("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename report</DialogTitle>
            <DialogDescription>
              {reportToRename
                ? `Update the name for "${reportToRename.name}".`
                : "Update the name for this report."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-report-name">Report name</Label>
            <Input
              id="rename-report-name"
              value={renameReportName}
              onChange={(e) => setRenameReportName(e.target.value)}
              placeholder="Report name"
              maxLength={200}
              disabled={Boolean(renamingReportId)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRenameReport()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(renamingReportId)}
              onClick={() => {
                setReportToRename(null)
                setRenameReportName("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90"
              disabled={Boolean(renamingReportId) || !renameReportName.trim()}
              onClick={() => void handleRenameReport()}
            >
              {renamingReportId ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportToChangeFolder)}
        onOpenChange={(open) => {
          if (!changingFolderReportId && !open) {
            setReportToChangeFolder(null)
            setChangeFolderNewFolderName("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change folder</DialogTitle>
            <DialogDescription>
              {reportToChangeFolder
                ? `Move "${reportToChangeFolder.name}" to another folder.`
                : "Move this report to another folder."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="change-report-folder">Folder</Label>
            <Select
              value={targetFolderValue}
              onValueChange={setTargetFolderValue}
              disabled={Boolean(changingFolderReportId) || creatingFolderForMove}
            >
              <SelectTrigger id="change-report-folder">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCATEGORIZED_KEY}>Uncategorized</SelectItem>
                {availableFolderNames.map((folderName) => (
                  <SelectItem key={folderName} value={folderName}>
                    {folderName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageFolders ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/50 p-3">
                <Label htmlFor="change-report-new-folder">New folder</Label>
                <div className="flex gap-2">
                  <Input
                    id="change-report-new-folder"
                    value={changeFolderNewFolderName}
                    onChange={(e) => setChangeFolderNewFolderName(e.target.value)}
                    placeholder="e.g. Revenue, UA, Executive"
                    maxLength={100}
                    disabled={Boolean(changingFolderReportId) || creatingFolderForMove}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreateFolderForMove()
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(changingFolderReportId) || creatingFolderForMove || !changeFolderNewFolderName.trim()}
                    onClick={() => void handleCreateFolderForMove()}
                  >
                    {creatingFolderForMove ? "Creating…" : "Create"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The new folder will be created and selected automatically.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(changingFolderReportId) || creatingFolderForMove}
              onClick={() => {
                setReportToChangeFolder(null)
                setChangeFolderNewFolderName("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90"
              disabled={Boolean(changingFolderReportId) || creatingFolderForMove}
              onClick={() => void handleChangeFolder()}
            >
              {changingFolderReportId ? "Saving…" : "Save"}
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
