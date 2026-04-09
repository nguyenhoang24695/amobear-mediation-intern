"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi } from "@/hooks/use-api"
import { metaReferenceApi } from "@/lib/api/meta-ads"
import type { MetaReferenceMediaDto, MetaReferenceMediaPageDto } from "@/types/meta-ads"
import { ProtectedMediaImage } from "../shared/protected-media-image"
import { MetaVideoPreviewDialog } from "./meta-video-preview-dialog"
import { CalendarDays, CheckCircle2, ImageIcon, Loader2, Search, Video } from "lucide-react"

type AssetTab = "images" | "videos"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  adAccountId: number | null
  targetKind: "image" | "video"
  selectedAssetId?: string | null
  onSelect: (media: MetaReferenceMediaDto) => void
}

const pageSize = 24

function mergeUnique(existing: MetaReferenceMediaDto[], incoming: MetaReferenceMediaDto[]): MetaReferenceMediaDto[] {
  const seen = new Set(existing.map((item) => `${item.assetType}:${item.id}`))
  const next = [...existing]
  for (const item of incoming) {
    const key = `${item.assetType}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

function getInitialTab(targetKind: "image" | "video"): AssetTab {
  return targetKind === "video" ? "videos" : "images"
}

export function MetaMediaPickerDialog({ open, onOpenChange, adAccountId, targetKind, selectedAssetId, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<AssetTab>(getInitialTab(targetKind))
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("created_time_desc")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [after, setAfter] = useState("")
  const [items, setItems] = useState<MetaReferenceMediaDto[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [previewItem, setPreviewItem] = useState<MetaReferenceMediaDto | null>(null)

  useEffect(() => {
    if (!open) return
    setActiveTab(getInitialTab(targetKind))
  }, [open, targetKind])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const queryBaseKey = useMemo(() => {
    return [
      adAccountId ?? "none",
      activeTab,
      search || "__empty__",
      sort,
      dateFrom || "__none__",
      dateTo || "__none__",
    ].join(":")
  }, [activeTab, adAccountId, dateFrom, dateTo, search, sort])

  useEffect(() => {
    setAfter("")
    setItems([])
    setNextCursor(null)
    setHasMore(false)
  }, [queryBaseKey])

  const requestCacheKey = `${queryBaseKey}:after:${after || "__first__"}`
  const mediaApi = useApi<MetaReferenceMediaPageDto>(
    () => {
      const query = {
        q: search || undefined,
        after: after || undefined,
        limit: pageSize,
        sort,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }
      return activeTab === "images"
        ? metaReferenceApi.getAdAccountImages(Number(adAccountId), query)
        : metaReferenceApi.getAdAccountVideos(Number(adAccountId), query)
    },
    {
      enabled: open && !!adAccountId,
      cacheKey: `meta-reference:media:${requestCacheKey}`,
    }
  )

  useEffect(() => {
    if (!mediaApi.data) return
    setItems((previous) => (after ? mergeUnique(previous, mediaApi.data?.items ?? []) : (mediaApi.data?.items ?? [])))
    setNextCursor(mediaApi.data.nextCursor ?? null)
    setHasMore(mediaApi.data.hasMore)
  }, [after, mediaApi.data])

  const selectableAssetType = targetKind === "video" ? "VIDEO" : "IMAGE"
  const emptyMessage = search
    ? `No ${activeTab === "images" ? "images" : "videos"} matched your search.`
    : `No ${activeTab === "images" ? "images" : "videos"} were found in this Meta ad account.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-6xl" showCloseButton>
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>From Meta</DialogTitle>
          <DialogDescription>
            Browse images and videos from the selected Meta ad account. Choose one asset to fill the current creative field.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AssetTab)}>
            <TabsList className="grid w-[220px] grid-cols-2">
              <TabsTrigger value="images" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Images</TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" />Videos</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_160px]">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={activeTab === "images" ? "Search by name, hash, or ID" : "Search by title or video ID"} className="pl-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600">Sort</label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_time_desc">Newest first</SelectItem>
                  <SelectItem value="created_time_asc">Oldest first</SelectItem>
                  <SelectItem value="name_asc">Name A-Z</SelectItem>
                  <SelectItem value="name_desc">Name Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600">Created from</label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="pl-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600">Created to</label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="pl-8" />
              </div>
            </div>
          </div>

          {!adAccountId ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
              Select a Meta ad account first to browse media from Meta.
            </div>
          ) : mediaApi.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
              {mediaApi.error.message}
            </div>
          ) : mediaApi.loading && items.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading Meta media...
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab !== getInitialTab(targetKind) ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  You are currently selecting a {targetKind}. Switch back to the {getInitialTab(targetKind) === "images" ? "Images" : "Videos"} tab to apply a selection.
                </div>
              ) : null}

              <div className="grid max-h-[420px] grid-cols-2 gap-4 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const isSelectable = item.assetType === selectableAssetType
                  const isSelected = selectedAssetId != null && selectedAssetId === item.id
                  const canPreviewVideo = item.assetType === "VIDEO"
                  return (
                    <div
                      key={`${item.assetType}:${item.id}`}
                      className={`group flex flex-col overflow-hidden rounded-xl border bg-white text-left transition ${isSelectable ? "hover:border-blue-300 hover:shadow-sm" : "opacity-70"} ${isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-100">
                        {item.thumbnailUrl ? (
                          <ProtectedMediaImage
                            src={item.thumbnailUrl}
                            requiresAuth={item.requiresAuth}
                            alt={item.name || item.id}
                            className="h-full w-full object-cover"
                            fallback={<div className="flex h-full items-center justify-center text-slate-400">{item.assetType === "VIDEO" ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}</div>}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            {item.assetType === "VIDEO" ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
                          </div>
                        )}
                        {isSelected ? (
                          <div className="absolute top-2 right-2 rounded-full bg-blue-600 p-1 text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{item.name || item.id}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">{item.assetType === "IMAGE" ? (item.hash || item.id) : (item.videoId || item.id)}</p>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>{item.width && item.height ? `${item.width}x${item.height}` : item.assetType}</span>
                          <span>{item.createdTime ? item.createdTime.slice(0, 10) : "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2">
                        {canPreviewVideo ? (
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPreviewItem(item)}>
                            Preview
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant={isSelected ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            if (!isSelectable) return
                            onSelect(item)
                            onOpenChange(false)
                          }}
                          disabled={!isSelectable}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <p className="text-xs text-slate-500">Showing {items.length} {activeTab === "images" ? "images" : "videos"}.</p>
                {hasMore && nextCursor ? (
                  <Button type="button" variant="outline" onClick={() => setAfter(nextCursor)} disabled={mediaApi.loading}>
                    {mediaApi.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load more
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      <MetaVideoPreviewDialog
        open={previewItem != null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setPreviewItem(null) }}
        title={previewItem?.name || previewItem?.videoId || previewItem?.id || "Video preview"}
        playableUrl={previewItem?.playableUrl}
        thumbnailUrl={previewItem?.thumbnailUrl}
        requiresAuth={previewItem?.requiresAuth}
      />
    </Dialog>
  )
}

