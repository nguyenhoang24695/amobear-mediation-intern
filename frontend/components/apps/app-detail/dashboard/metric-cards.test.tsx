import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { MetricCards } from "./metric-cards"
import type { DashboardSummary } from "@/types/app-dashboard"

describe("MetricCards", () => {
  it("renders the 9 dashboard metrics with formatted values", () => {
    const html = renderToStaticMarkup(
      <MetricCards summary={summary()} loading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(html).toContain("Installs")
    expect(html).toContain("New users")
    expect(html).toContain("Install-to-open rate")
    expect(html).toContain("Users not opened")
    expect(html).toContain("Total users")
    expect(html).toContain("Returning users")
    expect(html).toContain("Avg engagement time")
    expect(html).toContain("Engaged sessions / user")
    expect(html).toContain("Total revenue")
    expect(html).toContain("12.3K")
    expect(html).toContain("79.99%")
    expect(html).toContain("4m 19s")
    expect(html).toContain("$567.89")
  })

  it("renders null metrics as dash", () => {
    const data = summary()
    data.metrics.installs = null
    data.metrics.total_revenue_usd = null

    const html = renderToStaticMarkup(
      <MetricCards summary={data} loading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(html).toContain("—")
  })

  it("renders warning empty states", () => {
    const data = summary()
    data.meta.warnings = [
      "adjust_not_configured",
      "firebase_not_configured",
      "adjust_ad_revenue_missing",
      "qonversion_not_configured",
    ]

    const html = renderToStaticMarkup(
      <MetricCards summary={data} loading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(html).toContain("Adjust account is not configured")
    expect(html).toContain("Firebase data is not configured")
    expect(html).toContain("Adjust ad_revenue tracking is not enabled")
    expect(html).toContain("Qonversion IAP/SUB data is not configured")
  })

  it("renders loading skeletons", () => {
    const html = renderToStaticMarkup(
      <MetricCards summary={null} loading={true} error={null} onRetry={vi.fn()} />,
    )

    expect(html.match(/animate-pulse/g)?.length).toBeGreaterThan(0)
  })
})

function summary(): DashboardSummary {
  return {
    date_range: {
      range: "last7",
      start_date_account_tz: "2026-05-21",
      end_date_account_tz: "2026-05-27",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    meta: {
      admob_account: {
        account_id: "pub-1",
        display_name: "Test AdMob",
        is_default: true,
      },
      currency: "USD",
      warnings: [],
    },
    metrics: {
      installs: 12345,
      new_users: 9876,
      install_to_open_rate: 79.99,
      users_not_opened: 2469,
      total_users: 23456,
      returning_users: 13580,
      avg_engagement_time_minutes: 4.32,
      engaged_sessions_per_user: 2.15,
      total_revenue_usd: 567.89,
    },
  }
}
