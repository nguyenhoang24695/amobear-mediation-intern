"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { metaRequestsApi } from "@/lib/api/meta-ads"
import { buildMetaRequestAssetContentUrl } from "@/lib/meta-ads/media-preview"
import type { MetaRequestAssetDto, MetaRequestAssetOwnersDto, MetaRequestAssetPageDto } from "@/types/meta-ads"
import { ProtectedMediaImage } from "../shared/protected-media-image"
import { MetaVideoPreviewDialog } from "./meta-video-preview-dialog"
import { CheckCircle2, Folder, FolderOpen, ImageIcon, Loader2, Search, UserRound, UsersRound, Video } from "lucide-react"

type AssetTab = "images" | "videos"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetKind: "image" | "video" | "both"
  selectionMode?: "single" | "multiple"
  maxSelectionCount?: number
  selectedAssetId?: number | null
  selectedAssetIds?: number[]
  onSelect?: (asset: MetaRequestAssetDto) => void
  onSelectMany?: (assets: MetaRequestAssetDto[]) => void
}

const pageSize = 24

function getInitialTab(targetKind: Props["targetKind"]): AssetTab {
  return targetKind === "video" ? "videos" : "images"
}

function mergeUnique(existing: MetaRequestAssetDto[], incoming: MetaRequestAssetDto[]): MetaRequestAssetDto[] {
  const seen = new Set(existing.map((item) => item.id))
  const next = [...existing]
  for (const item of incoming) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    next.push(item)
  }
  return next
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-"
  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function NexusAssetLibraryDialog({
  open,
  onOpenChange,
  targetKind,
  selectionMode = "single",
  maxSelectionCount,
  selectedAssetId,
  selectedAssetIds,
  onSelect,
  onSelectMany,
}: Props) {
  const [activeTab, setActiveTab] = useState<AssetTab>(getInitialTab(targetKind))
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null)
  const [multiSelectedItems, setMultiSelectedItems] = useState<Map<number, MetaRequestAssetDto>>(new Map())
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<MetaRequestAssetDto[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [previewItem, setPreviewItem] = useState<MetaRequestAssetDto | null>(null)
  const isMultiple = selectionMode === "multiple"
  const selectionLimit = Math.max(0, maxSelectionCount ?? Number.MAX_SAFE_INTEGER)

  useEffect(() => {
    if (!open) return
    setActiveTab(getInitialTab(targetKind))
    setMultiSelectedItems(new Map())
  }, [open, targetKind])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const queryBaseKey = useMemo(() => [activeTab, selectedOwner || "__all__", search || "__empty__"].join(":"), [activeTab, selectedOwner, search])

  useEffect(() => {
    setPage(1)
    setItems([])
    setTotal(0)
    setHasMore(false)
  }, [queryBaseKey])

  const assetKind = activeTab === "images" ? "image" : "video"
  const requestCacheKey = `${queryBaseKey}:page:${page}`
  const ownersApi = useApi<MetaRequestAssetOwnersDto>(
    () => metaRequestsApi.listAssetOwners(),
    {
      enabled: open,
      cacheKey: "meta-requests:asset-library:owners",
    }
  )
  const assetsApi = useApi<MetaRequestAssetPageDto>(
    () => metaRequestsApi.listAssets({ kind: assetKind, ownerUsername: selectedOwner || undefined, q: search || undefined, page, pageSize }),
    {
      enabled: open,
      cacheKey: `meta-requests:asset-library:${requestCacheKey}`,
    }
  )

  useEffect(() => {
    if (!assetsApi.data) return
    setItems((previous) => (page > 1 ? mergeUnique(previous, assetsApi.data?.items ?? []) : (assetsApi.data?.items ?? [])))
    setTotal(assetsApi.data.total)
    setHasMore(assetsApi.data.hasMore)
  }, [assetsApi.data, page])

  const selectableKind = targetKind === "both" ? null : targetKind
  const externalSelectedIds = new Set(selectedAssetIds ?? [])
  const selectedAssetIdsKey = (selectedAssetIds ?? []).join(":")
  const multiSelectedCount = multiSelectedItems.size
  const owners = ownersApi.data?.owners ?? []
  const activeOwnerLabel = selectedOwner || "All users"
  const totalImageCount = owners.reduce((sum, owner) => sum + owner.imageCount, 0)
  const totalVideoCount = owners.reduce((sum, owner) => sum + owner.videoCount, 0)
  const totalOwnerCount = activeTab === "images" ? totalImageCount : totalVideoCount
  const getOwnerCount = (owner: { imageCount: number; videoCount: number }) => activeTab === "images" ? owner.imageCount : owner.videoCount
  const emptyMessage = search
    ? `No ${activeTab === "images" ? "images" : "videos"} matched your search in ${activeOwnerLabel}.`
    : `No ${activeTab === "images" ? "images" : "videos"} have been uploaded${selectedOwner ? ` by ${selectedOwner}` : " to the Nexus library"} yet.`

  const toggleAssetSelection = (item: MetaRequestAssetDto, disabled: boolean) => {
    if (disabled) return
    setMultiSelectedItems((current) => {
      const next = new Map(current)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else if (next.size < selectionLimit) {
        next.set(item.id, item)
      }
      return next
    })
  }

  useEffect(() => {
    if (!isMultiple || !selectedAssetIds?.length) return
    setMultiSelectedItems((current) => {
      const next = new Map(current)
      for (const item of items) {
        if (next.size >= selectionLimit) break
        if (selectedAssetIds.includes(item.id)) {
          next.set(item.id, item)
        }
      }
      return next
    })
  }, [isMultiple, items, selectedAssetIds, selectedAssetIdsKey, selectionLimit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-6xl" showCloseButton>
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>From Library</DialogTitle>
          <DialogDescription>
            {isMultiple
              ? "Reuse multiple previously uploaded Nexus assets without uploading the same files again."
              : "Reuse previously uploaded Nexus assets from this organization without uploading the same file again."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b bg-slate-50 px-4 py-4 md:border-r md:border-b-0">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Library root</p>                
              </div>
              <div className="max-h-[460px] space-y-1 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedOwner(null)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${selectedOwner == null ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 truncate">
                    <UsersRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">All users</span>
                  </span>
                  <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{totalOwnerCount}</span>
                </button>
                {ownersApi.loading && owners.length === 0 ? (
                  <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading users...</div>
                ) : owners.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">No library users yet.</div>
                ) : owners.map((owner) => {
                  const selected = selectedOwner === owner.ownerUsername
                  const count = getOwnerCount(owner)
                  const OwnerIcon = selected ? FolderOpen : Folder
                  return (
                    <button
                      key={owner.ownerUsername}
                      type="button"
                      onClick={() => setSelectedOwner(owner.ownerUsername)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${selected ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 truncate">
                        <OwnerIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{owner.ownerUsername}</span>
                      </span>
                      <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-4 px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">{activeOwnerLabel}</p>
                <p className="text-[11px] text-slate-500">Showing assets directly under this user folder, including all dated subfolders.</p>
              </div>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AssetTab)}>
                <TabsList className="grid w-[220px] grid-cols-2">
                  <TabsTrigger value="images" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Images</TabsTrigger>
                  <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" />Videos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-600">Search</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by file name" className="pl-8" />
                </div>
              </div>
            </div>

            {assetsApi.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                {assetsApi.error.message}
              </div>
            ) : assetsApi.loading && items.length === 0 ? (
              <div className="flex h-[420px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading library assets...
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
                {emptyMessage}
              </div>
            ) : (
              <div className="space-y-4">
              {activeTab !== getInitialTab(targetKind) && targetKind !== "both" ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  You are currently selecting a {targetKind}. Switch back to the {getInitialTab(targetKind) === "images" ? "Images" : "Videos"} tab to apply a selection.
                </div>
              ) : null}

              <div className="grid max-h-[420px] grid-cols-2 gap-4 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const isVideo = item.kind.toLowerCase() === "video"
                  const isSelectable = selectableKind === null ? true : item.kind.toLowerCase() === selectableKind
                  const isSelected = isMultiple
                    ? multiSelectedItems.has(item.id) || externalSelectedIds.has(item.id)
                    : selectedAssetId != null && selectedAssetId === item.id
                  const isAtCapacity = isMultiple && multiSelectedCount >= selectionLimit
                  const isDisabled = !isSelectable || (isMultiple && !isSelected && isAtCapacity)
                  return (
                    <div
                      key={item.id}
                      role={isMultiple ? "button" : undefined}
                      tabIndex={isMultiple && !isDisabled ? 0 : undefined}
                      onClick={() => {
                        if (isMultiple) toggleAssetSelection(item, isDisabled)
                      }}
                      onKeyDown={(event) => {
                        if (!isMultiple || isDisabled) return
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          toggleAssetSelection(item, false)
                        }
                      }}
                      className={`group flex flex-col overflow-hidden rounded-xl border bg-white text-left transition ${!isDisabled ? "hover:border-blue-300 hover:shadow-sm" : "opacity-60"} ${isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"} ${isMultiple && !isDisabled ? "cursor-pointer" : ""}`}
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-100">
                        {!isVideo ? (
                          <ProtectedMediaImage
                            src={buildMetaRequestAssetContentUrl(item.id)}
                            requiresAuth
                            alt={item.fileName}
                            className="h-full w-full object-cover"
                            fallback={<div className="flex h-full items-center justify-center text-slate-400"><ImageIcon className="h-8 w-8" /></div>}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Video className="h-8 w-8" />
                          </div>
                        )}
                        {isSelected ? (
                          <div className="absolute top-2 right-2 rounded-full bg-blue-600 p-1 text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{item.fileName}</p>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="uppercase">{item.kind}</span>
                          <span>{formatBytes(item.sizeBytes)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex min-w-0 items-center gap-1 truncate"><UserRound className="h-3 w-3 shrink-0" />{item.ownerUsername || "unknown"}</span>
                          <span>{item.createdAt ? item.createdAt.slice(0, 10) : "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2">
                        {isVideo ? (
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={(event) => { event.stopPropagation(); setPreviewItem(item) }}>
                            Preview
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant={isSelected ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={(event) => {
                            event.stopPropagation()
                            if (isMultiple) {
                              toggleAssetSelection(item, isDisabled)
                              return
                            }
                            if (!isSelectable) return
                            onSelect?.(item)
                            onOpenChange(false)
                          }}
                          disabled={isDisabled}
                        >
                          {isMultiple ? (isSelected ? "Remove" : "Add") : (isSelected ? "Selected" : "Select")}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <p className="text-xs text-slate-500">
                  Showing {items.length} of {total} {activeTab === "images" ? "images" : "videos"} in {activeOwnerLabel}.
                  {isMultiple ? ` Selected ${multiSelectedCount}/${selectionLimit}.` : ""}
                </p>
                <div className="flex items-center gap-2">
                  {hasMore ? (
                    <Button type="button" variant="outline" onClick={() => setPage((current) => current + 1)} disabled={assetsApi.loading}>
                      {assetsApi.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Load more
                    </Button>
                  ) : null}
                  {isMultiple ? (
                    <>
                      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                      <Button
                        type="button"
                        disabled={multiSelectedCount === 0}
                        onClick={() => {
                          if (multiSelectedCount === 0) return
                          onSelectMany?.(Array.from(multiSelectedItems.values()))
                          onOpenChange(false)
                        }}
                      >
                        Apply selected
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <MetaVideoPreviewDialog
        open={previewItem != null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setPreviewItem(null) }}
        title={previewItem?.fileName || "Video preview"}
        playableUrl={previewItem ? buildMetaRequestAssetContentUrl(previewItem.id) : undefined}
        requiresAuth
      />
    </Dialog>
  )
}
