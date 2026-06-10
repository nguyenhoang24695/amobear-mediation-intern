import { computeDeltaPercent, toNumeric, type CompareEnrichedRow } from "@/lib/reports/my-report-compare-utils"
import { formatDimensionCell } from "@/lib/reports/report-format-utils"

export type PivotTreeNode = {
  /** Stable path key for expand/collapse state */
  key: string
  depth: number
  dimensionId: string
  label: string
  metrics: Record<string, number | null>
  compare: Record<string, number | null>
  deltaPct: Record<string, number | null>
  children: PivotTreeNode[]
  isLeaf: boolean
}

export type AggregatedMetrics = {
  metrics: Record<string, number | null>
  compare: Record<string, number | null>
  deltaPct: Record<string, number | null>
}

export function aggregatePivotMetrics(
  rows: CompareEnrichedRow[],
  metricIds: string[],
): AggregatedMetrics {
  const metrics: Record<string, number | null> = {}
  const compare: Record<string, number | null> = {}
  const deltaPct: Record<string, number | null> = {}

  for (const metricId of metricIds) {
    let sum = 0
    let hasValue = false
    let compareSum = 0
    let hasCompare = false

    for (const row of rows) {
      const value = toNumeric(row[metricId])
      if (value != null) {
        sum += value
        hasValue = true
      }
      const compareValue = row.__compare?.[metricId]
      if (compareValue != null) {
        compareSum += compareValue
        hasCompare = true
      }
    }

    const current = hasValue ? sum : null
    const previous = hasCompare ? compareSum : null
    metrics[metricId] = current
    compare[metricId] = previous
    deltaPct[metricId] = computeDeltaPercent(current, previous)
  }

  return { metrics, compare, deltaPct }
}

function groupRowsByDimension(
  rows: CompareEnrichedRow[],
  dimensionId: string,
): Map<string, CompareEnrichedRow[]> {
  const groups = new Map<string, CompareEnrichedRow[]>()
  for (const row of rows) {
    const key = String(row[dimensionId] ?? "")
    const bucket = groups.get(key)
    if (bucket) bucket.push(row)
    else groups.set(key, [row])
  }
  return groups
}

function buildPivotLevel(
  rows: CompareEnrichedRow[],
  dimensions: string[],
  metricIds: string[],
  depth: number,
  pathPrefix: string,
): PivotTreeNode[] {
  if (depth >= dimensions.length || rows.length === 0) return []

  const dimensionId = dimensions[depth]
  const groups = groupRowsByDimension(rows, dimensionId)
  const isLeafLevel = depth === dimensions.length - 1

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([dimensionValue, groupRows]) => {
      const sampleRow = groupRows[0]
      const nodeKey = pathPrefix ? `${pathPrefix}\u001f${dimensionValue}` : dimensionValue
      const { metrics, compare, deltaPct } = aggregatePivotMetrics(groupRows, metricIds)
      const children = isLeafLevel
        ? []
        : buildPivotLevel(groupRows, dimensions, metricIds, depth + 1, nodeKey)

      return {
        key: nodeKey,
        depth,
        dimensionId,
        label: formatDimensionCell(dimensionId, sampleRow),
        metrics,
        compare,
        deltaPct,
        children,
        isLeaf: isLeafLevel,
      }
    })
}

/** Build hierarchical pivot tree grouped by dimensions in order (dim1 → dim2 → … → dimN). */
export function buildPivotTree(
  rows: CompareEnrichedRow[],
  dimensions: string[],
  metricIds: string[],
): PivotTreeNode[] {
  if (dimensions.length < 2 || rows.length === 0 || metricIds.length === 0) return []
  return buildPivotLevel(rows, dimensions, metricIds, 0, "")
}

export function flattenVisiblePivotNodes(
  nodes: PivotTreeNode[],
  expandedKeys: ReadonlySet<string>,
): PivotTreeNode[] {
  const visible: PivotTreeNode[] = []

  const walk = (level: PivotTreeNode[]) => {
    for (const node of level) {
      visible.push(node)
      if (!node.isLeaf && node.children.length > 0 && expandedKeys.has(node.key)) {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return visible
}

export function buildPivotDimensionHeader(
  dimensions: string[],
  dimensionCatalog: Array<{ id: string; label: string }>,
): string {
  return dimensions
    .map((id) => dimensionCatalog.find((d) => d.id === id)?.label ?? id)
    .join(" > ")
}
