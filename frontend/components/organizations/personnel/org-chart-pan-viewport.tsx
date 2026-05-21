"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

function canStartPan(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest("button, [data-chart-no-pan], [data-dnd-kit-draggable]")) return false
  return !!target.closest("[data-chart-pan-surface]")
}

interface OrgChartPanViewportProps {
  children: ReactNode
  className?: string
}

export function OrgChartPanViewport({ children, className }: OrgChartPanViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const [panning, setPanning] = useState(false)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !viewportRef.current || !canStartPan(e.target)) return
    e.preventDefault()
    viewportRef.current.setPointerCapture(e.pointerId)
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    }
    setPanning(true)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!panning || !viewportRef.current) return
      const dx = e.clientX - panRef.current.x
      const dy = e.clientY - panRef.current.y
      viewportRef.current.scrollLeft = panRef.current.scrollLeft - dx
      viewportRef.current.scrollTop = panRef.current.scrollTop - dy
    },
    [panning],
  )

  const endPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning) return
    setPanning(false)
    viewportRef.current?.releasePointerCapture(e.pointerId)
  }, [panning])

  return (
    <div
      ref={viewportRef}
      data-chart-pan-surface
      className={cn(
        "overflow-auto rounded-lg border border-slate-200 bg-slate-50/50",
        panning && "cursor-grabbing select-none",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      {children}
    </div>
  )
}
