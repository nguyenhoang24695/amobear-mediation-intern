"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ZoomIn, ZoomOut, ChevronsDownUp, ChevronsUpDown, Pencil, Eye, Save, Undo2 } from "lucide-react"

interface OrgPersonnelToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
  allCollapsed: boolean
  isEditMode?: boolean
  canEdit?: boolean
  onToggleEditMode?: () => void
  isDirty?: boolean
  saving?: boolean
  hasSavedOnServer?: boolean
  onSave?: () => void
  onDiscard?: () => void
}

export function OrgPersonnelToolbar({
  searchQuery,
  onSearchChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onExpandAll,
  onCollapseAll,
  allCollapsed,
  isEditMode = false,
  canEdit = false,
  onToggleEditMode,
  isDirty = false,
  saving = false,
  hasSavedOnServer = false,
  onSave,
  onDiscard,
}: OrgPersonnelToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by name, title, or department..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && isEditMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!isDirty || saving}
              onClick={onDiscard}
            >
              <Undo2 className="h-4 w-4" />
              Discard
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!isDirty || saving}
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
        {canEdit && onToggleEditMode && (
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={onToggleEditMode}
          >
            {isEditMode ? (
              <>
                <Eye className="h-4 w-4" />
                Return to view mode
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Edit mode
              </>
            )}
          </Button>
        )}
        {isEditMode && (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Edit mode</Badge>
        )}
        {!hasSavedOnServer && (
          <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
            Preview data
          </Badge>
        )}
        {hasSavedOnServer && !isDirty && !isEditMode && (
          <Badge variant="secondary" className="bg-green-50 text-green-800 border-green-200">
            Saved
          </Badge>
        )}
        {isDirty && isEditMode && (
          <Badge variant="secondary" className="bg-orange-50 text-orange-800 border-orange-200">
            Unsaved changes
          </Badge>
        )}
        <span className="text-xs text-slate-500 tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={allCollapsed ? onExpandAll : onCollapseAll}
        >
          {allCollapsed ? (
            <>
              <ChevronsDownUp className="h-4 w-4" />
              Expand all
            </>
          ) : (
            <>
              <ChevronsUpDown className="h-4 w-4" />
              Collapse all
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
