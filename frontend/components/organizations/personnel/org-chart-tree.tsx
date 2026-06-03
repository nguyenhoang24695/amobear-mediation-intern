"use client"

import { cn } from "@/lib/utils"
import { OrgChartPanViewport } from "./org-chart-pan-viewport"
import { PersonnelDroppableNode } from "./personnel-droppable-node"
import type { PersonnelNode } from "@/lib/mock/org-personnel-mock"
import { flattenPersonnelTree } from "@/lib/mock/org-personnel-mock"
import { TEAM_GROUP_SECTIONS, getTeamGroupChartClusterClass } from "@/lib/organizations/team-group"

type ChartChildSlot =
  | { kind: "node"; node: PersonnelNode }
  | { kind: "teamGroupCluster"; label: string; teams: PersonnelNode[] }

function buildChartChildSlots(children: PersonnelNode[]): ChartChildSlot[] {
  const slots: ChartChildSlot[] = []
  for (const child of children) {
    if (!child.isTeamGroup) slots.push({ kind: "node", node: child })
  }

  const teams = children.filter((child) => child.isTeamGroup)
  if (teams.length === 0) return slots

  const teamsByKey = new Map<string | null, PersonnelNode[]>()
  for (const team of teams) {
    const key = team.teamGroup ?? null
    const list = teamsByKey.get(key) ?? []
    list.push(team)
    teamsByKey.set(key, list)
  }

  for (const section of TEAM_GROUP_SECTIONS) {
    const clusterTeams = teamsByKey.get(section.key) ?? []
    if (clusterTeams.length > 0) {
      slots.push({ kind: "teamGroupCluster", label: section.label, teams: clusterTeams })
    }
  }

  return slots
}

interface OrgChartTreeProps {
  root: PersonnelNode
  selectedId: string | null
  searchQuery: string
  collapsedIds: Set<string>
  zoom: number
  onSelect: (node: PersonnelNode) => void
  onToggleCollapse: (id: string) => void
  isEditMode?: boolean
  onRemoveNode?: (node: PersonnelNode) => void
  organizationLogoUrl?: string | null
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
  onRemoveNode,
  organizationLogoUrl,
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
  onRemoveNode?: (node: PersonnelNode) => void
  organizationLogoUrl?: string | null
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
        onRemove={onRemoveNode}
        organizationLogoUrl={organizationLogoUrl}
      />

      {hasChildren && !collapsed && (
        <>
          <div className="h-6 w-px bg-slate-300" aria-hidden />
          <ul className="relative flex items-start gap-6 pt-0">
            {buildChartChildSlots(children).map((slot, index, slots) => {
              const siblingCount = slots.length
              if (slot.kind === "node") {
                return (
                  <OrgChartNode
                    key={slot.node.id}
                    node={slot.node}
                    selectedId={selectedId}
                    searchQuery={searchQuery}
                    collapsedIds={collapsedIds}
                    onSelect={onSelect}
                    onToggleCollapse={onToggleCollapse}
                    isEditMode={isEditMode}
                    onRemoveNode={onRemoveNode}
                    organizationLogoUrl={organizationLogoUrl}
                    siblingIndex={index}
                    siblingCount={siblingCount}
                  />
                )
              }

              return (
                <li
                  key={`team-cluster-${slot.label}`}
                  className="relative flex flex-col items-center pt-6"
                >
                  <ChildConnectors index={index} siblingCount={siblingCount} />
                  <div
                    className={cn(
                      "relative rounded-2xl border-2 px-5 pb-5 pt-8 shadow-sm",
                      getTeamGroupChartClusterClass(slot.label),
                    )}
                  >
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-0.5 text-xs font-semibold tracking-wide text-slate-700 shadow-sm">
                      {slot.label}
                    </span>
                    <ul className="relative flex items-start gap-6">
                      {slot.teams.map((team, teamIndex) => (
                        <OrgChartNode
                          key={team.id}
                          node={team}
                          selectedId={selectedId}
                          searchQuery={searchQuery}
                          collapsedIds={collapsedIds}
                          onSelect={onSelect}
                          onToggleCollapse={onToggleCollapse}
                          isEditMode={isEditMode}
                          onRemoveNode={onRemoveNode}
                          organizationLogoUrl={organizationLogoUrl}
                          siblingIndex={teamIndex}
                          siblingCount={slot.teams.length}
                        />
                      ))}
                    </ul>
                  </div>
                </li>
              )
            })}
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
  onRemoveNode,
  organizationLogoUrl,
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
    <OrgChartPanViewport className="h-full min-h-0 w-full flex-1">
      <div
        data-chart-pan-surface
        className={cn(
          "inline-block min-h-full min-w-full cursor-grab p-8 pt-10 origin-top transition-transform duration-200",
        )}
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
            onRemoveNode={onRemoveNode}
            organizationLogoUrl={organizationLogoUrl}
            isRoot
          />
        </ul>
      </div>
    </OrgChartPanViewport>
  )
}
