"use client"

import { useCallback, useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { organizationsApi, type PersonnelChartHistoryItem } from "@/lib/api/services"
import type { PersonnelNode } from "@/lib/organizations/personnel-chart-types"
import { PersonnelUsersPalette } from "./personnel-users-palette"
import { ChevronLeft, ChevronRight, History, Loader2, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface PersonnelSidePanelProps {
  orgId: string
  tree: PersonnelNode
  isEditMode: boolean
  canManage: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  historyRefreshKey?: number
}

function HistoryMetadataChips({ metadata }: { metadata?: Record<string, unknown> | null }) {
  if (!metadata) return null
  const added = Array.isArray(metadata.addedLinkedUserIds) ? metadata.addedLinkedUserIds.length : 0
  const removed = Array.isArray(metadata.removedLinkedUserIds) ? metadata.removedLinkedUserIds.length : 0
  const moved = typeof metadata.movedCount === "number" ? metadata.movedCount : 0
  if (added === 0 && removed === 0 && moved === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {added > 0 && (
        <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">
          +{added} members
        </Badge>
      )}
      {removed > 0 && (
        <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700">
          -{removed} members
        </Badge>
      )}
      {moved > 0 && (
        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">
          {moved} moved
        </Badge>
      )}
    </div>
  )
}

function HistoryRow({ item }: { item: PersonnelChartHistoryItem }) {
  const when = formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 text-sm">
      <p className="text-xs text-slate-500">{when}</p>
      <p className="font-medium text-slate-800 mt-0.5">{item.actorName ?? "Unknown"}</p>
      {item.actorRole && <p className="text-[10px] text-slate-500 capitalize">{item.actorRole}</p>}
      <p className="text-slate-600 mt-1 text-xs leading-snug">{item.summary}</p>
      <HistoryMetadataChips metadata={item.metadata as Record<string, unknown> | null} />
    </div>
  )
}

export function PersonnelSidePanel({
  orgId,
  tree,
  isEditMode,
  canManage,
  expanded,
  onExpandedChange,
  historyRefreshKey = 0,
}: PersonnelSidePanelProps) {
  const [historyItems, setHistoryItems] = useState<PersonnelChartHistoryItem[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyMaxViewable, setHistoryMaxViewable] = useState(50)
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadHistory = useCallback(
    async (page: number, append: boolean) => {
      setHistoryLoading(true)
      try {
        const result = await organizationsApi.getPersonnelChartHistory(orgId, { page, pageSize: 10 })
        setHistoryItems((prev) => (append ? [...prev, ...result.items] : result.items))
        setHistoryPage(result.page)
        setHistoryTotal(result.total)
        setHistoryHasMore(result.hasMore)
        setHistoryMaxViewable(result.maxViewable)
      } catch (err) {
        console.error("Failed to load chart history:", err)
      } finally {
        setHistoryLoading(false)
      }
    },
    [orgId],
  )

  useEffect(() => {
    void loadHistory(1, false)
  }, [loadHistory, historyRefreshKey])

  const handleViewMore = () => {
    if (!historyHasMore || historyLoading) return
    void loadHistory(historyPage + 1, true)
  }

  const loadedCount = historyItems.length
  const cappedTotal = Math.min(historyTotal, historyMaxViewable)
  const showViewMore =
    historyHasMore && loadedCount < cappedTotal && loadedCount < historyMaxViewable

  const defaultTab = isEditMode && canManage ? "users" : "history"

  if (!expanded) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onExpandedChange(true)}
          title="Expand panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80">
      <div className="flex items-center justify-end border-b border-slate-200 px-1 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onExpandedChange(false)}
          title="Collapse panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <Tabs key={defaultTab} defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className={cn("mx-2 grid w-auto", canManage ? "grid-cols-2" : "grid-cols-1")}>
          {canManage && (
            <TabsTrigger value="users" className="text-xs gap-1" disabled={!isEditMode}>
              <Users className="h-3 w-3" />
              Users
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="text-xs gap-1">
            <History className="h-3 w-3" />
            History
          </TabsTrigger>
        </TabsList>

        {canManage && (
          <TabsContent value="users" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            {isEditMode ? (
              <PersonnelUsersPalette orgId={orgId} tree={tree} embedded />
            ) : (
              <p className="px-3 py-4 text-xs text-slate-500">Switch to edit mode to add users from the list.</p>
            )}
          </TabsContent>
        )}

          <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-2">
              {historyLoading && historyItems.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : historyItems.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">No saved changes yet</p>
              ) : (
                historyItems.map((item) => <HistoryRow key={item.id} item={item} />)
              )}
              {showViewMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={historyLoading}
                  onClick={handleViewMore}
                >
                  {historyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "View more"}
                </Button>
              )}
              {historyTotal > 0 && (
                <p className="text-center text-[10px] text-slate-500 pt-1">
                  Showing {loadedCount} of {cappedTotal} changes
                  {historyTotal > historyMaxViewable ? ` (max ${historyMaxViewable})` : ""}
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
