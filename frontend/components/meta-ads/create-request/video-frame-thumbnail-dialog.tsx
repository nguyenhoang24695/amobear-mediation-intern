"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

interface VideoFrameThumbnailDialogProps {
  videoFile: File | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseFrame: (file: File) => void
}

function formatTimestamp(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00.0"
  const minutes = Math.floor(value / 60)
  const seconds = value - minutes * 60
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error("Cannot capture this video frame in browser. Please upload a thumbnail manually."))
      }
    }, type, quality)
  })
}

function waitForVideoSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked)
      video.removeEventListener("error", handleError)
    }
    const handleSeeked = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error("Cannot seek this video in browser. Please upload a thumbnail manually."))
    }
    video.addEventListener("seeked", handleSeeked, { once: true })
    video.addEventListener("error", handleError, { once: true })
  })
}

export function VideoFrameThumbnailDialog({ videoFile, open, onOpenChange, onUseFrame }: VideoFrameThumbnailDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [selectedTime, setSelectedTime] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : null), [videoFile])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!open) return
    setDuration(0)
    setSelectedTime(0)
    setCapturedFile(null)
    setError(null)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }, [open, videoFile])

  async function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !videoFile) return
    if (!video.videoWidth || !video.videoHeight) {
      setError("Cannot read video dimensions. Please upload a thumbnail manually.")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const safeTime = Math.min(Math.max(selectedTime, 0), Math.max(0, duration - 0.05))
      if (Math.abs(video.currentTime - safeTime) > 0.05) {
        const seeked = waitForVideoSeek(video)
        video.currentTime = safeTime
        await seeked
      } else if (video.seeking) {
        await waitForVideoSeek(video)
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Cannot capture this video frame in browser. Please upload a thumbnail manually.")
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92)
      const timestamp = formatTimestamp(safeTime).replace(":", "-")
      const file = new File([blob], `thumbnail-from-video-${timestamp}.jpg`, { type: "image/jpeg" })
      setCapturedFile(file)
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(file)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot capture this video frame in browser. Please upload a thumbnail manually.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create thumbnail from video frame</DialogTitle>
          <DialogDescription>Pick a timestamp, capture the current frame, then use it as the Meta video thumbnail.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-md border bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="max-h-[420px] w-full object-contain"
                  controls
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    const nextDuration = event.currentTarget.duration
                    setDuration(Number.isFinite(nextDuration) ? nextDuration : 0)
                    setError(null)
                  }}
                  onTimeUpdate={(event) => {
                    if (!busy) setSelectedTime(event.currentTarget.currentTime)
                  }}
                  onError={() => setError("Cannot decode this video in browser. Please upload a thumbnail manually.")}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-slate-300">No local video file available.</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{formatTimestamp(selectedTime)}</span>
                <span>{formatTimestamp(duration)}</span>
              </div>
              <Slider
                value={[selectedTime]}
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.1}
                disabled={!duration || busy}
                onValueChange={([value]) => {
                  const nextTime = value ?? 0
                  setSelectedTime(nextTime)
                  if (videoRef.current) videoRef.current.currentTime = nextTime
                }}
              />
            </div>

            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Captured frame</p>
              <div className="mt-3 overflow-hidden rounded-md border bg-white">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Captured thumbnail preview" className="h-40 w-full object-contain" />
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-400">No frame captured yet</div>
                )}
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" disabled={!videoUrl || !duration || busy} onClick={() => void captureFrame()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Capture frame
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            disabled={!capturedFile || busy}
            onClick={() => {
              if (!capturedFile) return
              onUseFrame(capturedFile)
              onOpenChange(false)
            }}
          >
            Use as thumbnail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
