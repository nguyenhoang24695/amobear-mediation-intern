const defaultCaptureSecond = 5

interface CaptureVideoFrameOptions {
  videoFile?: File | null
  videoUrl?: string | null
  resolveVideoUrl?: () => Promise<string | null>
  timestampSeconds?: number
}

function formatTimestamp(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00-00.0"
  const minutes = Math.floor(value / 60)
  const seconds = value - minutes * 60
  return `${String(minutes).padStart(2, "0")}-${seconds.toFixed(1).padStart(4, "0")}`
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeoutId)
      video.removeEventListener(eventName, handleEvent)
      video.removeEventListener("error", handleError)
    }
    const handleEvent = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error("Cannot decode this video in browser. Please upload a thumbnail manually."))
    }
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error("Cannot decode this video in browser. Please upload a thumbnail manually."))
    }, 15000)
    video.addEventListener(eventName, handleEvent, { once: true })
    video.addEventListener("error", handleError, { once: true })
  })
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

export async function captureVideoFrameToFile({
  videoFile,
  videoUrl,
  resolveVideoUrl,
  timestampSeconds = defaultCaptureSecond,
}: CaptureVideoFrameOptions): Promise<File> {
  const objectUrl = videoFile ? URL.createObjectURL(videoFile) : null
  const resolvedUrl = objectUrl ?? (resolveVideoUrl ? await resolveVideoUrl() : videoUrl)
  const sourceUrl = resolvedUrl?.trim()
  if (!sourceUrl) {
    throw new Error("No playable video available for thumbnail capture.")
  }

  const video = document.createElement("video")
  const canvas = document.createElement("canvas")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  if (!videoFile) {
    video.crossOrigin = "anonymous"
  }
  video.style.position = "fixed"
  video.style.left = "-9999px"
  video.style.top = "-9999px"
  video.style.width = "1px"
  video.style.height = "1px"
  document.body.appendChild(video)

  try {
    const metadataLoaded = waitForVideoEvent(video, "loadedmetadata")
    video.src = sourceUrl
    video.load()
    await metadataLoaded

    const safeTime = Math.min(Math.max(timestampSeconds, 0), Math.max(0, (Number.isFinite(video.duration) ? video.duration : timestampSeconds) - 0.05))
    if (safeTime > 0.05) {
      const seeked = waitForVideoEvent(video, "seeked")
      video.currentTime = safeTime
      await seeked
    } else if (!video.videoWidth || !video.videoHeight) {
      await waitForVideoEvent(video, "loadeddata")
    }

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Cannot read video dimensions. Please upload a thumbnail manually.")
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Cannot capture this video frame in browser. Please upload a thumbnail manually.")
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92)
    return new File([blob], `thumbnail-from-video-${formatTimestamp(safeTime)}.jpg`, { type: "image/jpeg" })
  } finally {
    video.removeAttribute("src")
    video.load()
    video.remove()
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  }
}
