import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { EngagementTrendChart } from "./engagement-trend-chart"
import { RetentionChart } from "./retention-chart"
import { RevenueChart } from "./revenue-chart"
import { UserTrendChart } from "./user-trend-chart"
import type { EngagementTrendSeries, RetentionResponse, RevenueTrendSeries, UserTrendSeries } from "@/types/app-dashboard"

const useDashboardUserTrend = vi.fn()
const useDashboardEngagementTrend = vi.fn()
const useDashboardRevenueTrend = vi.fn()
const useDashboardRetention = vi.fn()

vi.mock("../hooks/use-dashboard-series", () => ({
  useDashboardUserTrend: (...args: unknown[]) => useDashboardUserTrend(...args),
  useDashboardEngagementTrend: (...args: unknown[]) => useDashboardEngagementTrend(...args),
  useDashboardRevenueTrend: (...args: unknown[]) => useDashboardRevenueTrend(...args),
  useDashboardRetention: (...args: unknown[]) => useDashboardRetention(...args),
}))

vi.mock("recharts", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  const empty = () => null
  return {
    CartesianGrid: empty,
    Line: empty,
    LineChart: passthrough,
    ResponsiveContainer: passthrough,
    Tooltip: empty,
    XAxis: empty,
    YAxis: empty,
  }
})

describe("PO dashboard trend charts", () => {
  beforeEach(() => {
    useDashboardUserTrend.mockReset()
    useDashboardEngagementTrend.mockReset()
    useDashboardRevenueTrend.mockReset()
    useDashboardRetention.mockReset()
  })

  it("renders user trend series labels", () => {
    useDashboardUserTrend.mockReturnValue({
      data: userTrend(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    const html = renderToStaticMarkup(<UserTrendChart appId="app-1" range="last7" />)

    expect(html).toContain("User trend")
    expect(html).toContain("Installs")
    expect(html).toContain("New users")
    expect(html).toContain("Total users")
    expect(html).toContain("Returning users")
  })

  it("renders engagement trend series labels", () => {
    useDashboardEngagementTrend.mockReturnValue({
      data: engagementTrend(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    const html = renderToStaticMarkup(<EngagementTrendChart appId="app-1" range="last7" />)

    expect(html).toContain("Engagement trend")
    expect(html).toContain("Avg engagement time")
    expect(html).toContain("Engaged sessions / user")
  })

  it("renders empty user trend without adjust installs", () => {
    const data = userTrend()
    data.series.installs = []
    data.series.new_users = data.series.new_users.map((point) => ({ ...point, value: null }))
    data.series.total_users = data.series.total_users.map((point) => ({ ...point, value: null }))
    data.series.returning_users = data.series.returning_users.map((point) => ({ ...point, value: null }))
    useDashboardUserTrend.mockReturnValue({ data, loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(<UserTrendChart appId="app-1" range="last7" />)

    expect(html).toContain("No user trend data for this range")
  })

  it("renders revenue trend labels including Qon SUB series", () => {
    useDashboardRevenueTrend.mockReturnValue({
      data: revenueTrend(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    const html = renderToStaticMarkup(<RevenueChart appId="app-1" range="last7" />)

    expect(html).toContain("Revenue trend")
    expect(html).toContain("Total")
    expect(html).toContain("IAA")
    expect(html).toContain("IAP")
    expect(html).toContain("SUB")
    expect(html).toContain("ARPU")
    expect(html).not.toContain("Phase 2")
    expect(html).not.toContain("SUB from Qon")
  })

  it("renders two cohort tables with day-offset headers", () => {
    useDashboardRetention.mockReturnValue({
      data: retention(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    const html = renderToStaticMarkup(<RetentionChart appId="app-1" range="last7" />)

    expect(html).toContain("Firebase retention")
    expect(html).toContain("Adjust retention")
    // Firebase daily headers
    expect(html).toContain("1D")
    expect(html).toContain("7D")
    // Adjust milestone headers (14D only exists in Adjust table)
    expect(html).toContain("14D")
    expect(html).toContain("120D")
    // Cohort rows + total
    expect(html).toContain("2026-05-25")
    expect(html).toContain("2026-05-22")
    expect(html).toContain("Total")
    // Adjust daily limitation note
    expect(html).toContain("không có daily")
  })

  it("renders empty state for adjust when unavailable", () => {
    const data = retention()
    data.adjust.available = false
    data.adjust.rows = []
    data.adjust.total = null
    useDashboardRetention.mockReturnValue({ data, loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(<RetentionChart appId="app-1" range="last7" />)

    expect(html).toContain("Firebase retention")
    expect(html).toContain("No Adjust cohort retention data for this range")
  })
})

function userTrend(): UserTrendSeries {
  return {
    date_range: {
      range: "last7",
      start_date_account_tz: "2026-05-21",
      end_date_account_tz: "2026-05-27",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    series: {
      installs: [{ date: "2026-05-21", value: 100 }],
      new_users: [{ date: "2026-05-21", value: 50 }],
      total_users: [{ date: "2026-05-21", value: 80 }],
      returning_users: [{ date: "2026-05-21", value: 30 }],
    },
  }
}

function engagementTrend(): EngagementTrendSeries {
  return {
    date_range: {
      range: "last7",
      start_date_account_tz: "2026-05-21",
      end_date_account_tz: "2026-05-27",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    series: {
      avg_engagement_time_minutes: [{ date: "2026-05-21", value: 4.25 }],
      engaged_sessions_per_user: [{ date: "2026-05-21", value: 2.5 }],
    },
  }
}

function revenueTrend(): RevenueTrendSeries {
  return {
    date_range: dateRange(),
    phase2_notice: [],
    series: {
      total: [{ date: "2026-05-21", value: 100 }],
      iaa: [{ date: "2026-05-21", value: 60 }],
      iap: [{ date: "2026-05-21", value: 40 }],
      sub: [{ date: "2026-05-21", value: 12 }],
      arpu: [{ date: "2026-05-21", value: 4 }],
    },
  }
}

function retention(): RetentionResponse {
  return {
    date_range: dateRange(),
    firebase: {
      available: true,
      day_offsets: [1, 2, 3, 4, 5, 6, 7],
      rows: [
        { install_date: "2026-05-25", users: 6459, retention: [9.26, 6.73, 5.14, 4.34, 3.93, 2.14, 0] },
      ],
      total: { install_date: "Total", users: 6459, retention: [9.26, 6.73, 5.14, 4.34, 3.93, 2.14, 0] },
    },
    adjust: {
      available: true,
      day_offsets: [3, 7, 14, 21, 30, 45, 60, 90, 120],
      rows: [
        { install_date: "2026-05-22", users: 1804, retention: [4.04, 0, null, null, null, null, null, null, null] },
      ],
      total: { install_date: "Total", users: 1804, retention: [4.04, 0, null, null, null, null, null, null, null] },
    },
  }
}

function dateRange() {
  return {
    range: "last7" as const,
    start_date_account_tz: "2026-05-21",
    end_date_account_tz: "2026-05-27",
    tz_offset_hours: 7,
    display_tz_offset_hours: 7,
  }
}
