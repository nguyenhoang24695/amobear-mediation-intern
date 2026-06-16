export interface GrowthRawPoint {
  label: string
  value: number
  syncedAt: string
}

export type GrowthAnomalyReason = "residual" | "increment" | "both"
export type GrowthAnomalyDirection = "high" | "low"

/** Deviation nhỏ hơn ngưỡng này coi như 0 — không vẽ cột. */
export const growthDeviationZeroEpsilonUsd = 0.005

export interface GrowthChartPoint extends GrowthRawPoint {
  index: number
  trend: number | null
  residual: number | null
  /** Giá trị vẽ cột anomaly chart; null khi |residual| ≈ 0. */
  residualBar: number | null
  increment: number | null
  residualAbs: number | null
  isAnomaly: boolean
  anomalyReason: GrowthAnomalyReason | null
  /** Cao hơn (trên baseline) hoặc thấp hơn (dưới baseline) khi là anomaly. */
  anomalyDirection: GrowthAnomalyDirection | null
}

export interface LinearTrendModel {
  slope: number
  intercept: number
}

/** Hồi quy tuyến tính y = intercept + slope * x với x = 0..n-1. */
export function computeLinearTrend(values: readonly number[]): LinearTrendModel | null {
  const n = values.length
  if (n < 2) return null

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]!
    sumXY += i * values[i]!
    sumX2 += i * i
  }

  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-12) return null

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function populationStdDev(values: readonly number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function isMeaningfulGrowthDeviation(residual: number | null): residual is number {
  return residual != null && Math.abs(residual) > growthDeviationZeroEpsilonUsd
}

/** Actual > expected → high (trên baseline); actual < expected → low (dưới baseline). */
export function directionFromResidual(residual: number | null): GrowthAnomalyDirection | null {
  if (!isMeaningfulGrowthDeviation(residual)) return null
  return residual > 0 ? "high" : "low"
}

export function residualBarValue(residual: number | null): number | null {
  return isMeaningfulGrowthDeviation(residual) ? residual : null
}

function resolveAnomalyDirection(
  residual: number | null,
  increment: number | null,
  reason: GrowthAnomalyReason,
): GrowthAnomalyDirection | null {
  if (reason === "residual" || reason === "both") {
    if (residual != null && Math.abs(residual) > 1e-9) return residual > 0 ? "high" : "low"
  }
  if (reason === "increment" || reason === "both") {
    if (increment != null && Math.abs(increment) > 1e-9) return increment > 0 ? "high" : "low"
  }
  return null
}

/** Domain Y đối xứng quanh 0 để đường baseline nằm giữa chart. */
export function symmetricDeviationDomain(
  residuals: readonly (number | null)[],
  paddingRatio = 0.15,
): [number, number] {
  const absValues = residuals
    .filter((r): r is number => r != null)
    .map((r) => Math.abs(r))
  const maxAbs = absValues.length > 0 ? Math.max(...absValues) : 0
  const pad = maxAbs > 0 ? maxAbs * paddingRatio : 1
  const bound = maxAbs + pad
  return [-bound, bound]
}

function isZScoreOutlier(value: number, samples: readonly number[], zThreshold: number): boolean {
  if (samples.length < 2) return false
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length
  const std = populationStdDev(samples)
  if (std < 1e-9) return false
  return Math.abs((value - mean) / std) > zThreshold
}

export function enrichGrowthPoints(
  points: readonly GrowthRawPoint[],
  options?: { zThreshold?: number },
): GrowthChartPoint[] {
  const zThreshold = options?.zThreshold ?? 2
  if (points.length === 0) return []

  const values = points.map((p) => p.value)
  const trendModel = computeLinearTrend(values)

  const base = points.map((p, index) => {
    const trend = trendModel ? trendModel.intercept + trendModel.slope * index : null
    const increment = index === 0 ? null : p.value - values[index - 1]!
    const residual = trend != null ? p.value - trend : null
    return {
      ...p,
      index,
      trend,
      residual,
      residualBar: residualBarValue(residual),
      increment,
      residualAbs: residual != null ? Math.abs(residual) : null,
      isAnomaly: false,
      anomalyReason: null as GrowthAnomalyReason | null,
      anomalyDirection: null as GrowthAnomalyDirection | null,
    }
  })

  if (base.length < 3) return base

  const residuals = base.map((p) => p.residual).filter((r): r is number => r != null)
  const increments = base.map((p) => p.increment).filter((inc): inc is number => inc != null)

  return base.map((p) => {
    if (p.index === 0) return p

    const residualOutlier =
      p.residual != null ? isZScoreOutlier(p.residual, residuals, zThreshold) : false
    const incrementOutlier =
      p.increment != null ? isZScoreOutlier(p.increment, increments, zThreshold) : false

    if (!residualOutlier && !incrementOutlier) return p

    const anomalyReason: GrowthAnomalyReason =
      residualOutlier && incrementOutlier ? "both" : residualOutlier ? "residual" : "increment"
    const anomalyDirection =
      directionFromResidual(p.residual) ?? resolveAnomalyDirection(p.residual, p.increment, anomalyReason)

    return { ...p, isAnomaly: true, anomalyReason, anomalyDirection }
  })
}
