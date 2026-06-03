"use client"

import { cn } from "@/lib/utils"
import { OrgChartPanViewport } from "./org-chart-pan-viewport"
import { PersonnelDroppableNode } from "./personnel-droppable-node"
import type { PersonnelNode } from "@/lib/mock/org-personnel-mock"
import { flattenPersonnelTree } from "@/lib/mock/org-personnel-mock"
import { getTeamGroupChartClusterClass, type TeamGroupSection } from "@/lib/organizations/team-group"

type ChartChildSlot =
  | { kind: "node"; node: PersonnelNode }
  | { kind: "teamGroupCluster"; label: string; teams: PersonnelNode[] }

function buildChartChildSlots(children: PersonnelNode[], teamGroupSections: TeamGroupSection[]): ChartChildSlot[] {
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

  for (const section of teamGroupSections) {
    const clusterTeams = teamsByKey.get(section.key) ?? []
    if (clusterTeams.length > 0) {
      slots.push({ kind: "teamGroupCluster", label: section.label, teams: clusterTeams })
    }
  }

  return slots
}

interface OrgChartTreeProps {
  root: PersonnelNode
  teamGroupSections: TeamGroupSection[]
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

type OrgChartSharedProps = Pick<
  OrgChartTreeProps,
  | "teamGroupSections"
  | "selectedId"
  | "searchQuery"
  | "collapsedIds"
  | "onSelect"
  | "onToggleCollapse"
  | "isEditMode"
  | "onRemoveNode"
  | "organizationLogoUrl"
>

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

function ChartChildSlotsList({
  childrenNodes,
  teamGroupSections,
  selectedId,
  searchQuery,
  collapsedIds,
  onSelect,
  onToggleCollapse,
  isEditMode = false,
  onRemoveNode,
  organizationLogoUrl,
}: OrgChartSharedProps & { childrenNodes: PersonnelNode[] }) {
  const slots = buildChartChildSlots(childrenNodes, teamGroupSections)
  const siblingCount = slots.length

  return (
    <ul className="relative flex items-start gap-6 pt-0">
      {slots.map((slot, index) =>
        slot.kind === "node" ? (
          <OrgChartNode
            key={slot.node.id}
            node={slot.node}
            teamGroupSections={teamGroupSections}
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
        ) : (
          <TeamGroupCluster
            key={`team-cluster-${slot.label}`}
            slot={slot}
            teamGroupSections={teamGroupSections}
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
        ),
      )}
    </ul>
  )
}

/** Border wraps parent team nodes only; subtrees render below outside the cluster. */
function TeamGroupCluster({
  slot,
  teamGroupSections,
  siblingIndex,
  siblingCount,
  selectedId,
  searchQuery,
  collapsedIds,
  onSelect,
  onToggleCollapse,
  isEditMode = false,
  onRemoveNode,
  organizationLogoUrl,
}: OrgChartSharedProps & {
  slot: Extract<ChartChildSlot, { kind: "teamGroupCluster" }>
  siblingIndex: number
  siblingCount: number
}) {
  const showSubtrees = slot.teams.some((team) => {
    const hasChildren = (team.children?.length ?? 0) > 0
    return hasChildren && !collapsedIds.has(team.id)
  })

  return (
    <li className="relative flex flex-col items-center pt-6">
      <ChildConnectors index={siblingIndex} siblingCount={siblingCount} />
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative rounded-2xl border-2 px-5 pb-5 pt-8 shadow-sm",
            getTeamGroupChartClusterClass(slot.label, teamGroupSections),
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
                teamGroupSections={teamGroupSections}
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
                cardOnly
              />
            ))}
          </ul>
        </div>
        {showSubtrees ? (
          <ul className="relative flex items-start gap-6">
            {slot.teams.map((team) => {
              const children = team.children ?? []
              const hasChildren = children.length > 0
              const collapsed = collapsedIds.has(team.id)
              return (
                <li
                  key={`${team.id}-subtree`}
                  className="relative flex min-w-[12rem] flex-col items-center"
                >
                  {hasChildren && !collapsed ? (
                    <>
                      <div className="h-6 w-px bg-slate-300" aria-hidden />
                      <ChartChildSlotsList
                        childrenNodes={children}
                        teamGroupSections={teamGroupSections}
                        selectedId={selectedId}
                        searchQuery={searchQuery}
                        collapsedIds={collapsedIds}
                        onSelect={onSelect}
                        onToggleCollapse={onToggleCollapse}
                        isEditMode={isEditMode}
                        onRemoveNode={onRemoveNode}
                        organizationLogoUrl={organizationLogoUrl}
                      />
                    </>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

function OrgChartNode({
  node,
  teamGroupSections,
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
  cardOnly = false,
}: {
  node: PersonnelNode
  teamGroupSections: TeamGroupSection[]
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
  /** When true, render only the node card (used inside a team-group border). */
  cardOnly?: boolean
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

      {!cardOnly && hasChildren && !collapsed && (
        <>
          <div className="h-6 w-px bg-slate-300" aria-hidden />
          <ChartChildSlotsList
            childrenNodes={children}
            teamGroupSections={teamGroupSections}
            selectedId={selectedId}
            searchQuery={searchQuery}
            collapsedIds={collapsedIds}
            onSelect={onSelect}
            onToggleCollapse={onToggleCollapse}
            isEditMode={isEditMode}
            onRemoveNode={onRemoveNode}
            organizationLogoUrl={organizationLogoUrl}
          />
        </>
      )}
    </li>
  )
}

export function OrgChartTree({
  root,
  teamGroupSections,
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
            teamGroupSections={teamGroupSections}
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
