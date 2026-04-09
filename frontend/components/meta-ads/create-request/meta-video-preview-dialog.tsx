"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ProtectedMediaImage, ProtectedMediaVideo } from "../shared/protected-media-image"
import { AlertCircle, ImageIcon, Video } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  playableUrl?: string | null
  thumbnailUrl?: string | null
  requiresAuth?: boolean
  fallbackMessage?: string
}

export function MetaVideoPreviewDialog({
  open,
  onOpenChange,
  title,
  playableUrl,
  thumbnailUrl,
  requiresAuth = false,
  fallbackMessage = "Playable preview is unavailable for this video.",
}: Props) {
  const [playbackFailed, setPlaybackFailed] = useState(false)

  const canPlay = !!playableUrl && !playbackFailed

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        setPlaybackFailed(false)
      }
      onOpenChange(nextOpen)
    }}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>{title || "Video preview"}</DialogTitle>
          <DialogDescription>
            Preview the selected Meta video. If direct playback is unavailable, the thumbnail stays available.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            {canPlay ? (
              <ProtectedMediaVideo
                src={playableUrl ?? ""}
                requiresAuth={requiresAuth}
                controls
                className="max-h-[68vh] w-full bg-black"
                onError={() => setPlaybackFailed(true)}
              />
            ) : thumbnailUrl ? (
              <div className="flex flex-col items-center justify-center gap-3 bg-slate-50 p-6">
                <div className="w-full max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <ProtectedMediaImage
                    src={thumbnailUrl}
                    requiresAuth={requiresAuth}
                    alt={title || "Video thumbnail"}
                    className="h-auto w-full object-contain"
                    fallback={<div className="flex h-64 items-center justify-center text-slate-400"><Video className="h-12 w-12" /></div>}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{fallbackMessage}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-slate-400">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
          </div>
          {!canPlay && playableUrl ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setPlaybackFailed(false)}>
                Retry playback
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
