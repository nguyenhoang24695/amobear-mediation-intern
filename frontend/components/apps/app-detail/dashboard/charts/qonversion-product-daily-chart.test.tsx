import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { QonversionProductSeriesResponse } from "@/types/app-dashboard"
import { QonversionProductDailyChart } from "./qonversion-product-daily-chart"
import {
  buildQonversionDailyChartData,
  formatQonversionDailyValue,
  QONVERSION_PRODUCT_DAILY_CHARTS,
} from "./qonversion-product-daily-chart-data"

const useQonversionProductSeries = vi.fn()

vi.mock("../hooks/use-qonversion-product-series", () => ({
  useQonversionProductSeries: (...args: unknown[]) => useQonversionProductSeries(...args),
}))

describe("qonversion daily chart data", () => {
  it("pivots additive daily rows into top products plus Other", () => {
    const config = QONVERSION_PRODUCT_DAILY_CHARTS[0]
    const data = buildQonversionDailyChartData(manySubscriptionRows(), config.primaryMetric, 5)

    expect(data.series).toHaveLength(6)
    expect(data.series.at(-1)?.label).toBe("Other")
    expect(data.rows).toHaveLength(2)
    expect(data.rows[0].reportDate).toBe("2026-06-01")
    expect(data.rows[0].dateLabel).toBe("06-01")
    expect(data.rows[0].other).toBe(2)
  })

  it("does not create Other for percent metrics and keeps rate units", () => {
    const config = QONVERSION_PRODUCT_DAILY_CHARTS[1]
    const data = buildQonversionDailyChartData(newUserToTrialResponse().rows, config.primaryMetric, 5)

    expect(data.series.some((series) => series.label === "Other")).toBe(false)
    expect(formatQonversionDailyValue(0.28, "percent")).toBe("0.28%")
    expect(formatQonversionDailyValue(70.04, "usd")).toBe("$70.04")
    expect(formatQonversionDailyValue(12345, "count")).toBe("12.3K")
  })
})

describe("QonversionProductDailyChart", () => {
  beforeEach(() => {
    useQonversionProductSeries.mockReset()
  })

  it("renders loading and error states", () => {
    useQonversionProductSeries.mockReturnValue({ data: null, loading: true, error: null, refetch: vi.fn() })

    const loadingHtml = renderToStaticMarkup(
      <QonversionProductDailyChart appId="app-1" range="last7" {...QONVERSION_PRODUCT_DAILY_CHARTS[0]} />,
    )

    expect(loadingHtml).toContain("Subscriptions by Product")
    expect(loadingHtml).toContain("animate-pulse")

    useQonversionProductSeries.mockReturnValue({ data: null, loading: false, error: new Error("boom"), refetch: vi.fn() })

    const errorHtml = renderToStaticMarkup(
      <QonversionProductDailyChart appId="app-1" range="last7" {...QONVERSION_PRODUCT_DAILY_CHARTS[0]} />,
    )

    expect(errorHtml).toContain("Could not load Subscriptions by Product")
    expect(errorHtml).toContain("Retry")
  })

  it("renders empty state for warning", () => {
    useQonversionProductSeries.mockReturnValue({
      data: { ...subscriptionsResponse(), rows: [], meta: { warnings: ["qonversion_charts_not_configured"] } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    const html = renderToStaticMarkup(
      <QonversionProductDailyChart appId="app-1" range="last7" {...QONVERSION_PRODUCT_DAILY_CHARTS[0]} />,
    )

    expect(html).toContain("No Qonversion daily data for this app/range")
  })
})

function baseResponse(): Omit<QonversionProductSeriesResponse, "report" | "rows"> {
  return {
    dateRange: {
      range: "last7",
      start_date_account_tz: "2026-06-01",
      end_date_account_tz: "2026-06-07",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    meta: { warnings: [] },
  }
}

function subscriptionsResponse(): QonversionProductSeriesResponse {
  return {
    ...baseResponse(),
    report: "subscriptions",
    rows: manySubscriptionRows(),
  }
}

function manySubscriptionRows(): QonversionProductSeriesResponse["rows"] {
  return [
    ...Array.from({ length: 6 }, (_, index) => ({
      reportDate: "2026-06-01",
      productId: `product-${index}`,
      newSubscriptions: 6 - index,
    })),
    { reportDate: "2026-06-02", productId: "product-0", newSubscriptions: 2 },
    { reportDate: "2026-06-02", productId: "product-5", newSubscriptions: 4 },
  ]
}

function newUserToTrialResponse(): QonversionProductSeriesResponse {
  return {
    ...baseResponse(),
    report: "new_user_to_trial",
    rows: [
      { reportDate: "2026-06-01", productId: "product-0", conversionRate: 0.28 },
      { reportDate: "2026-06-01", productId: "product-1", conversionRate: 0.14 },
    ],
  }
}
