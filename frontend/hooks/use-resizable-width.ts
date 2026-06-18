"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseResizableWidthOptions {
  defaultWidth: number
  minWidth: number
  maxWidth: number
  storageKey?: string
}

export function useResizableWidth({
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
}: UseResizableWidthOptions) {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined" || !storageKey) return defaultWidth
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return defaultWidth
    const parsed = Number(stored)
    if (!Number.isFinite(parsed)) return defaultWidth
    return Math.min(maxWidth, Math.max(minWidth, parsed))
  })
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      isResizingRef.current = true
      startXRef.current = event.clientX
      startWidthRef.current = width
      setIsResizing(true)
    },
    [width],
  )

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) return
    isResizingRef.current = false
    setIsResizing(false)
  }, [])

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current) return
      const delta = event.clientX - startXRef.current
      const next = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta))
      setWidth(next)
    },
    [minWidth, maxWidth],
  )

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [onMouseMove, stopResizing])

  useEffect(() => {
    if (!isResizing) return
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isResizing])

  useEffect(() => {
    if (!storageKey) return
    window.localStorage.setItem(storageKey, String(width))
  }, [storageKey, width])

  return { width, isResizing, startResizing }
}
