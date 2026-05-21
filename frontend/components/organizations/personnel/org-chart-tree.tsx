"use client"

import { cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { PersonnelDroppableNode } from "./personnel-droppable-node"
import type { PersonnelNode } from "@/lib/mock/org-personnel-mock"
import { flattenPersonnelTree } from "@/lib/mock/org-personnel-mock"

interface OrgChartTreeProps {
  root: PersonnelNode
  selectedId: string | null
  searchQuery: string
  collapsedIds: Set<string>
  zoom: number
  onSelect: (node: PersonnelNode) => void
  onToggleCollapse: (id: string) => void
  isEditMode?: boolean
}

function nodeMatchesSearch(node: PersonnelNode, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return (
    node.name.toLowerCase().includes(q) ||
    (node.title?.toLowerCase().includes(q) ?? false) ||
    (node.department?.toLowerCase().includes(q) ?? false) ||
    (node.email?.toLowerCase().includes(q) ?? false)
  )
}

function ChildConnectors({ index, siblingCount }: { index: number; siblingCount: number }) {
  if (siblingCount <= 1) {
    return (
      <span className="absolute top-0 left-1/2 h-6 w-px -translate-x-1/2 bg-slate-300" aria-hidden />
    )
  }
  return (
    <>
      {index === 0 && (
        <span
          className="absolute top-0 left-1/2 h-px bg-slate-300"
          style={{ width: "50%", right: 0 }}
          aria-hidden
        />
      )}
      {index === siblingCount - 1 && (
        <span
          className="absolute top-0 right-1/2 h-px bg-slate-300"
          style={{ width: "50%", left: 0 }}
          aria-hidden
        />
      )}
      {index > 0 && index < siblingCount - 1 && (
        <span className="absolute top-0 left-0 right-0 h-px bg-slate-300" aria-hidden />
      )}
      <span className="absolute top-0 left-1/2 h-6 w-px -translate-x-1/2 bg-slate-300" aria-hidden />
    </>
  )
}

function OrgChartNode({
  node,
  selectedId,
  searchQuery,
  collapsedIds,
  onSelect,
  onToggleCollapse,
  isEditMode = false,
  siblingIndex = 0,
  siblingCount = 1,
  isRoot = false,
}: {
  node: PersonnelNode
  selectedId: string | null
  searchQuery: string
  collapsedIds: Set<string>
  onSelect: (node: PersonnelNode) => void
  onToggleCollapse: (id: string) => void
  isEditMode?: boolean
  siblingIndex?: number
  siblingCount?: number
  isRoot?: boolean
}) {
  const children = node.children ?? []
  const hasChildren = children.length > 0
  const collapsed = collapsedIds.has(node.id)
  const highlighted = nodeMatchesSearch(node, searchQuery)

  return (
    <li
      className={cn(
        "relative flex flex-col items-center",
        !isRoot && "pt-6",
      )}
    >
      {!isRoot && <ChildConnectors index={siblingIndex} siblingCount={siblingCount} />}

      <PersonnelDroppableNode
        node={node}
        isEditMode={isEditMode}
        selected={selectedId === node.id}
        highlighted={highlighted}
        collapsed={collapsed}
        hasChildren={hasChildren}
        onClick={() => onSelect(node)}
        onToggleCollapse={hasChildren ? () => onToggleCollapse(node.id) : undefined}
      />

      {hasChildren && !collapsed && (
        <>
          <div className="h-6 w-px bg-slate-300" aria-hidden />
          <ul className="relative flex items-start gap-6 pt-0">
            {children.map((child, index) => (
              <OrgChartNode
                key={child.id}
                node={child}
                selectedId={selectedId}
                searchQuery={searchQuery}
                collapsedIds={collapsedIds}
                onSelect={onSelect}
                onToggleCollapse={onToggleCollapse}
                isEditMode={isEditMode}
                siblingIndex={index}
                siblingCount={children.length}
              />
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

export function OrgChartTree({
  root,
  selectedId,
  searchQuery,
  collapsedIds,
  zoom,
  onSelect,
  onToggleCollapse,
  isEditMode = false,
}: OrgChartTreeProps) {
  const flat = flattenPersonnelTree(root)
  const hasVisibleMatch =
    !searchQuery.trim() || flat.some((n) => nodeMatchesSearch(n, searchQuery))

  if (!hasVisibleMatch) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        No people or departments match your search.
      </div>
    )
  }

  return (
    <ScrollArea className={cn("w-full rounded-lg border border-slate-200 bg-slate-50/50", isEditMode && "flex-1")}>
      <div
        className={cn("inline-block min-w-full p-8 origin-top transition-transform duration-200")}
        style={{ transform: `scale(${zoom})` }}
      >
        <ul className="mx-auto flex min-w-max justify-center">
          <OrgChartNode
            node={root}
            selectedId={selectedId}
            searchQuery={searchQuery}
            collapsedIds={collapsedIds}
            onSelect={onSelect}
            onToggleCollapse={onToggleCollapse}
            isEditMode={isEditMode}
            isRoot
          />
        </ul>
      </div>
      <ScrollBar orientation="horizontal" />
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
