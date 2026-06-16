import { describe, expect, it } from "vitest"
import {
  computeLinearTrend,
  directionFromResidual,
  enrichGrowthPoints,
  residualBarValue,
  symmetricDeviationDomain,
} from "./today-growth-chart-utils"

describe("today-growth-chart-utils", () => {
  it("computes linear trend for evenly spaced values", () => {
    const trend = computeLinearTrend([10, 20, 30, 40])
    expect(trend).toEqual({ slope: 10, intercept: 10 })
  })

  it("maps residual sign to above/below baseline direction", () => {
    expect(directionFromResidual(12)).toBe("high")
    expect(directionFromResidual(-8)).toBe("low")
    expect(directionFromResidual(0)).toBeNull()
  })

  it("hides bar when deviation is zero", () => {
    expect(residualBarValue(0)).toBeNull()
    expect(residualBarValue(0.004)).toBeNull()
    expect(residualBarValue(0.006)).toBe(0.006)
    expect(residualBarValue(-0.01)).toBe(-0.01)
  })

  it("builds symmetric y domain around zero", () => {
    expect(symmetricDeviationDomain([10, -20, 5])).toEqual([-23, 23])
  })

  it("enriches points with trend and flags outlier increment", () => {
    const points = [
      { label: "08:00", value: 10, syncedAt: "2026-06-11T08:00:00Z" },
      { label: "09:00", value: 20, syncedAt: "2026-06-11T09:00:00Z" },
      { label: "10:00", value: 30, syncedAt: "2026-06-11T10:00:00Z" },
      { label: "11:00", value: 31, syncedAt: "2026-06-11T11:00:00Z" },
      { label: "12:00", value: 120, syncedAt: "2026-06-11T12:00:00Z" },
    ]

    const enriched = enrichGrowthPoints(points, { zThreshold: 1.5 })
    expect(enriched).toHaveLength(5)
    expect(enriched[0]?.trend).not.toBeNull()
    expect(enriched.some((p) => p.isAnomaly)).toBe(true)
    const spike = enriched.find((p) => p.value === 120)
    expect(spike?.anomalyDirection).toBe("high")
  })
})
