"use client"

import { useMemo, useState, useCallback, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Users, Building2, Network, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { organizationsApi } from "@/lib/api/services"
import {
  getMockOrgPersonnelTree,
  getPersonnelStats,
  filterPersonnelTree,
  flattenPersonnelTree,
  updatePersonnelNodeInTree,
  getManagerCandidates,
  addOrgUserUnderNode,
  movePersonnelNode,
  type PersonnelNode,
  type PersonnelMemberPatch,
} from "@/lib/mock/org-personnel-mock"
import { personnelTreesEqual } from "@/lib/organizations/personnel-chart-tree-utils"
import { OrgPersonnelToolbar } from "../personnel/org-personnel-toolbar"
import { OrgChartTree } from "../personnel/org-chart-tree"
import { PersonnelDetailSheet } from "../personnel/personnel-detail-sheet"
import { PersonnelSidePanel } from "../personnel/personnel-side-panel"
import {
  parseChartDropId,
  parsePaletteDraggableId,
  parseChartNodeDraggableId,
  type PersonnelDragData,
  type PersonnelChartNodeDragData,
  PERSONNEL_DRAG_TYPE,
  PERSONNEL_CHART_NODE_DRAG_TYPE,
} from "../personnel/personnel-dnd"

const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.25
const ZOOM_STEP = 0.1

interface OrgPersonnelTabProps {
  orgId: string
  orgName?: string
  canManage?: boolean
  canView?: boolean
}

function collectCollapsibleIds(node: PersonnelNode): string[] {
  const ids: string[] = []
  if ((node.children?.length ?? 0) > 0) {
    ids.push(node.id)
    for (const child of node.children ?? []) {
      ids.push(...collectCollapsibleIds(child))
    }
  }
  return ids
}

function findNodeById(root: PersonnelNode, id: string): PersonnelNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

export function OrgPersonnelTab({
  orgId,
  orgName = "Organization",
  canManage = false,
  canView = true,
}: OrgPersonnelTabProps) {
  const defaultTree = useMemo(() => getMockOrgPersonnelTree(orgId, orgName), [orgId, orgName])

  const [savedTree, setSavedTree] = useState<PersonnelNode>(defaultTree)
  const [draftTree, setDraftTree] = useState<PersonnelNode>(defaultTree)
  const [hasSavedOnServer, setHasSavedOnServer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [zoom, setZoom] = useState(1)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<PersonnelNode | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [paletteExpanded, setPaletteExpanded] = useState(true)
  const [dragOverlayLabel, setDragOverlayLabel] = useState<string | null>(null)
  const [dropFeedback, setDropFeedback] = useState<string | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const [pendingExitEdit, setPendingExitEdit] = useState(false)

  const isDirty = useMemo(
    () => !personnelTreesEqual(draftTree, savedTree),
    [draftTree, savedTree],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await organizationsApi.getPersonnelChart(orgId)
        if (cancelled) return
        if (data?.root) {
          setSavedTree(data.root)
          setDraftTree(data.root)
          setHasSavedOnServer(true)
        } else {
          const mock = getMockOrgPersonnelTree(orgId, orgName)
          setSavedTree(mock)
          setDraftTree(mock)
          setHasSavedOnServer(false)
        }
      } catch (err) {
        console.error("Failed to load personnel chart:", err)
        if (!cancelled) {
          const mock = getMockOrgPersonnelTree(orgId, orgName)
          setSavedTree(mock)
          setDraftTree(mock)
          setHasSavedOnServer(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgId, orgName])

  const displayTree = useMemo(() => {
    const source = isEditMode ? draftTree : savedTree
    if (!searchQuery.trim()) return source
    return filterPersonnelTree(source, searchQuery) ?? source
  }, [draftTree, savedTree, searchQuery, isEditMode])

  const activeTree = isEditMode ? draftTree : savedTree
  const stats = useMemo(() => getPersonnelStats(activeTree), [activeTree])
  const allCollapsibleIds = useMemo(() => collectCollapsibleIds(activeTree), [activeTree])
  const allCollapsed =
    allCollapsibleIds.length > 0 && allCollapsibleIds.every((id) => collapsedIds.has(id))

  const managerCandidates = useMemo(() => {
    if (!selectedNode || selectedNode.type !== "member") return []
    return getManagerCandidates(activeTree, selectedNode.id)
  }, [activeTree, selectedNode])

  const handleSelect = useCallback((node: PersonnelNode) => {
    setSelectedNode(node)
    setSheetOpen(true)
  }, [])

  const syncSelectedNode = useCallback((nextTree: PersonnelNode) => {
    setSelectedNode((prev) => (prev ? findNodeById(nextTree, prev.id) : null))
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if ((data as PersonnelDragData)?.type === PERSONNEL_DRAG_TYPE) {
      setDragOverlayLabel((data as PersonnelDragData).user.name)
    } else if ((data as PersonnelChartNodeDragData)?.type === PERSONNEL_CHART_NODE_DRAG_TYPE) {
      setDragOverlayLabel((data as PersonnelChartNodeDragData).node.name)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragOverlayLabel(null)
      const { active, over } = event
      if (!over) return

      const parentId = parseChartDropId(String(over.id))
      if (!parentId) return

      const paletteUserId = parsePaletteDraggableId(String(active.id))
      const chartNodeId = parseChartNodeDraggableId(String(active.id))
      const data = active.data.current

      if (paletteUserId && (data as PersonnelDragData)?.type === PERSONNEL_DRAG_TYPE) {
        const paletteData = data as PersonnelDragData
        setDraftTree((prev) => {
          const next = addOrgUserUnderNode(prev, parentId, paletteData.user)
          if (!next) {
            setDropFeedback("User is already on the chart or cannot be placed here.")
            setTimeout(() => setDropFeedback(null), 3000)
            return prev
          }
          setCollapsedIds((ids) => {
            const n = new Set(ids)
            n.delete(parentId)
            return n
          })
          const parent = findNodeById(next, parentId)
          setDropFeedback(`Added ${paletteData.user.name} under ${parent?.name ?? "selected node"}.`)
          setTimeout(() => setDropFeedback(null), 4000)
          syncSelectedNode(next)
          return next
        })
        return
      }

      if (chartNodeId && (data as PersonnelChartNodeDragData)?.type === PERSONNEL_CHART_NODE_DRAG_TYPE) {
        const nodeData = data as PersonnelChartNodeDragData
        if (chartNodeId === parentId) return

        setDraftTree((prev) => {
          const next = movePersonnelNode(prev, chartNodeId, parentId)
          if (!next) {
            setDropFeedback("Cannot move here (cycle or invalid target).")
            setTimeout(() => setDropFeedback(null), 3000)
            return prev
          }
          const parent = findNodeById(next, parentId)
          setDropFeedback(`Moved ${nodeData.node.name} under ${parent?.name ?? "selected node"}.`)
          setTimeout(() => setDropFeedback(null), 4000)
          setCollapsedIds((ids) => {
            const n = new Set(ids)
            n.delete(parentId)
            return n
          })
          syncSelectedNode(next)
          return next
        })
      }
    },
    [syncSelectedNode],
  )

  const handleEditMember = useCallback(
    (nodeId: string, patch: PersonnelMemberPatch) => {
      setDraftTree((prev) => {
        const next = updatePersonnelNodeInTree(prev, nodeId, patch)
        syncSelectedNode(next)
        return next
      })
    },
    [syncSelectedNode],
  )

  const handleAssignManager = useCallback(
    (nodeId: string, managerId: string | null, managerName: string | null) => {
      setDraftTree((prev) => {
        const next = updatePersonnelNodeInTree(prev, nodeId, { managerId, managerName })
        syncSelectedNode(next)
        return next
      })
    },
    [syncSelectedNode],
  )

  const handleSave = useCallback(async () => {
    if (!canManage || !isDirty) return
    setSaving(true)
    try {
      const result = await organizationsApi.savePersonnelChart(orgId, { root: draftTree })
      if (result.root) {
        setSavedTree(result.root)
        setDraftTree(result.root)
      } else {
        setSavedTree(draftTree)
        setDraftTree(draftTree)
      }
      setHasSavedOnServer(true)
      setHistoryRefreshKey((k) => k + 1)
      toast.success("Organizational chart saved")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save chart"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [canManage, isDirty, orgId, draftTree])

  const applyDiscard = useCallback(() => {
    setDraftTree(savedTree)
    setSheetOpen(false)
    setDropFeedback(null)
    setDiscardDialogOpen(false)
    if (pendingExitEdit) {
      setIsEditMode(false)
      setPendingExitEdit(false)
    }
  }, [savedTree, pendingExitEdit])

  const handleDiscardClick = useCallback(() => {
    if (!isDirty) {
      applyDiscard()
      return
    }
    setPendingExitEdit(false)
    setDiscardDialogOpen(true)
  }, [isDirty, applyDiscard])

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      if (isDirty) {
        setPendingExitEdit(true)
        setDiscardDialogOpen(true)
        return
      }
      setIsEditMode(false)
      setSheetOpen(false)
      setDropFeedback(null)
      return
    }
    setDraftTree(savedTree)
    setIsEditMode(true)
  }, [isEditMode, isDirty, savedTree])

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleExpandAll = () => setCollapsedIds(new Set())
  const handleCollapseAll = () => setCollapsedIds(new Set(allCollapsibleIds))
  const handleZoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100))
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100))

  const flatCount = flattenPersonnelTree(activeTree).length

  if (!canView) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">You do not have permission to view the organizational chart.</p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const chartBlock = (
    <OrgChartTree
      root={displayTree}
      selectedId={selectedNode?.id ?? null}
      searchQuery={searchQuery}
      collapsedIds={collapsedIds}
      zoom={zoom}
      onSelect={handleSelect}
      onToggleCollapse={handleToggleCollapse}
      isEditMode={isEditMode && canManage}
    />
  )

  return (
    <div className="space-y-6">
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes to the organizational chart will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingExitEdit(false)
              }}
            >
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={applyDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.headcount}</p>
              <p className="text-sm text-slate-500">Headcount</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.departments}</p>
              <p className="text-sm text-slate-500">Departments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Network className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{flatCount}</p>
              <p className="text-sm text-slate-500">Nodes in chart</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Organizational Chart</CardTitle>
          <CardDescription>
            {isEditMode
              ? "Edit mode — drag users from the panel or drag members to reassign reporting lines. Save to persist."
              : "Hierarchical view of reporting structure. Open edit mode to make changes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrgPersonnelToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            allCollapsed={allCollapsed}
            isEditMode={isEditMode}
            canEdit={canManage}
            onToggleEditMode={handleToggleEditMode}
            isDirty={isDirty}
            saving={saving}
            hasSavedOnServer={hasSavedOnServer}
            onSave={() => void handleSave()}
            onDiscard={handleDiscardClick}
          />
          {dropFeedback && (
            <p
              className={cn(
                "text-sm rounded-md px-3 py-2 border",
                dropFeedback.startsWith("Added") || dropFeedback.startsWith("Moved")
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-amber-50 text-amber-800 border-amber-200",
              )}
            >
              {dropFeedback}
            </p>
          )}

          <div
            className={cn(
              "flex min-h-[360px] overflow-hidden rounded-lg border border-slate-200",
              isEditMode && canManage && "ring-2 ring-blue-200 ring-offset-2",
            )}
          >
            <PersonnelSidePanel
              orgId={orgId}
              tree={isEditMode ? draftTree : savedTree}
              isEditMode={isEditMode}
              canManage={canManage}
              expanded={paletteExpanded}
              onExpandedChange={setPaletteExpanded}
              historyRefreshKey={historyRefreshKey}
            />
            {isEditMode && canManage ? (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="min-w-0 flex-1">{chartBlock}</div>
                <DragOverlay dropAnimation={null}>
                  {dragOverlayLabel ? (
                    <div className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium shadow-lg">
                      {dragOverlayLabel}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="min-w-0 flex-1">{chartBlock}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <PersonnelDetailSheet
        node={selectedNode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canManage={canManage}
        isEditMode={isEditMode}
        managerCandidates={managerCandidates}
        onEditMember={handleEditMember}
        onAssignManager={handleAssignManager}
      />
    </div>
  )
}
