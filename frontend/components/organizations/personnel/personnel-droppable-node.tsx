"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { isChartDropTarget, type PersonnelNode } from "@/lib/organizations/personnel-chart-types"
import {
  chartDropId,
  chartNodeDraggableId,
  type PersonnelChartNodeDragData,
  PERSONNEL_CHART_NODE_DRAG_TYPE,
} from "./personnel-dnd"
import { PersonnelNodeCard } from "./personnel-node-card"
import { GripVertical } from "lucide-react"

interface PersonnelDroppableNodeProps {
  node: PersonnelNode
  isEditMode: boolean
  selected?: boolean
  highlighted?: boolean
  collapsed?: boolean
  hasChildren?: boolean
  onClick?: () => void
  onToggleCollapse?: () => void
}

export function PersonnelDroppableNode({
  node,
  isEditMode,
  ...cardProps
}: PersonnelDroppableNodeProps) {
  const canDrop = isEditMode && isChartDropTarget(node)
  const canDrag = isEditMode && node.type === "member"

  const dragData: PersonnelChartNodeDragData = {
    type: PERSONNEL_CHART_NODE_DRAG_TYPE,
    node,
  }

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: chartDropId(node.id),
    disabled: !canDrop,
  })

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: chartNodeDraggableId(node.id),
    data: dragData,
    disabled: !canDrag,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const setRefs = (el: HTMLDivElement | null) => {
    setDropRef(el)
    if (canDrag) setDragRef(el)
  }

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        "rounded-lg transition-all",
        canDrop && isOver && "ring-2 ring-green-500 ring-offset-2 bg-green-50/40",
        canDrop && !isOver && "ring-1 ring-dashed ring-transparent hover:ring-blue-200",
        isDragging && "opacity-50",
      )}
    >
      {canDrag && (
        <button
          type="button"
          className="mx-auto mb-0.5 flex cursor-grab items-center gap-0.5 text-[10px] text-slate-500 active:cursor-grabbing"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3" />
          Drag to reassign
        </button>
      )}
      <PersonnelNodeCard node={node} {...cardProps} />
      {canDrop && isOver && (
        <p className="mt-1 text-center text-[10px] font-medium text-green-700">
          Drop to add report
        </p>
      )}
    </div>
  )
}
