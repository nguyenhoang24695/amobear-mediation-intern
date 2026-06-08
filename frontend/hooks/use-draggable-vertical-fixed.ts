"use client"

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react"

const DRAG_THRESHOLD_PX = 6
const VIEWPORT_MARGIN_PX = 8

type DragState = {
  pointerId: number
  startY: number
  startTop: number
  moved: boolean
}

function readStoredTop(storageKey: string): number | null {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(storageKey)
  if (stored == null) return null
  const parsed = Number(stored)
  return Number.isFinite(parsed) ? parsed : null
}

function centerTop(containerHeight: number) {
  return Math.round((window.innerHeight - containerHeight) / 2)
}

export function useDraggableVerticalFixed(
  storageKey: string,
  options?: { capture?: boolean },
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [topPx, setTopPx] = useState<number | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const lastInteractionWasDragRef = useRef(false)

  const clampTop = useCallback((top: number) => {
    const height = containerRef.current?.offsetHeight ?? 0
    const maxTop = Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - height - VIEWPORT_MARGIN_PX)
    return Math.min(maxTop, Math.max(VIEWPORT_MARGIN_PX, top))
  }, [])

  const syncTop = useCallback(
    (nextTop?: number) => {
      const height = containerRef.current?.offsetHeight ?? 0
      const fallbackTop = centerTop(height)
      const resolvedTop = clampTop(nextTop ?? readStoredTop(storageKey) ?? fallbackTop)
      setTopPx(resolvedTop)
      return resolvedTop
    },
    [clampTop, storageKey],
  )

  useEffect(() => {
    syncTop()
  }, [syncTop])

  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => {
      setTopPx((prev) => {
        const height = containerRef.current?.offsetHeight ?? 0
        const fallbackTop = centerTop(height)
        const resolvedTop = prev ?? readStoredTop(storageKey) ?? fallbackTop
        return clampTop(resolvedTop)
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [clampTop, storageKey])

  useEffect(() => {
    const onResize = () => {
      setTopPx((prev) => (prev == null ? prev : clampTop(prev)))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [clampTop])

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (topPx == null) return
    lastInteractionWasDragRef.current = false
    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: topPx,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaY = event.clientY - drag.startY
    if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
      drag.moved = true
    }
    setTopPx(clampTop(drag.startTop + deltaY))
  }

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragStateRef.current = null
    lastInteractionWasDragRef.current = drag.moved

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer may already be released.
    }

    setTopPx((prev) => {
      if (prev == null) return prev
      const clamped = clampTop(prev)
      window.localStorage.setItem(storageKey, String(Math.round(clamped)))
      return clamped
    })
  }

  const consumeDragClick = () => {
    const wasDrag = lastInteractionWasDragRef.current
    lastInteractionWasDragRef.current = false
    return wasDrag
  }

  return {
    containerRef,
    topPx,
    consumeDragClick,
    dragProps: options?.capture
      ? {
          onPointerDownCapture: handlePointerDown,
          onPointerMoveCapture: handlePointerMove,
          onPointerUpCapture: finishDrag,
          onPointerCancelCapture: finishDrag,
        }
      : {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: finishDrag,
          onPointerCancel: finishDrag,
        },
  }
}
