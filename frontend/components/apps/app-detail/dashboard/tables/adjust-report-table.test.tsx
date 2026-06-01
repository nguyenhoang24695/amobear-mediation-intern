import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AdjustReportResponse } from "@/types/app-dashboard"
import { AdjustReportTable } from "./adjust-report-table"

const useAdjustReport = vi.fn()

vi.mock("../hooks/use-adjust-report", () => ({
  useAdjustReport: (...args: unknown[]) => useAdjustReport(...args),
}))

describe("AdjustReportTable", () => {
  beforeEach(() => {
    useAdjustReport.mockReset()
  })

  it("renders Adjust report rows with spend, CPI, ROAS and retention", () => {
    useAdjustReport.mockReturnValue({ data: response(), loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(<AdjustReportTable appId="app-1" range="last7" />)

    expect(html).toContain("Adjust Report")
    expect(html).toContain("facebook")
    expect(html).toContain("spring_promo_2026")
    expect(html).toContain("1,234")
    expect(html).toContain("$567.89")
    expect(html).toContain("$0.46")
    expect(html).toContain("12.3%")
    expect(html).toContain("34.5%")
  })

  it("renders Adjust not configured state", () => {
    useAdjustReport.mockReturnValue({ data: { ...response(), available: false, rows: [] }, loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(<AdjustReportTable appId="app-1" range="last7" />)

    expect(html).toContain("Adjust account is not configured")
  })

  it("renders range empty state when Adjust is configured", () => {
    useAdjustReport.mockReturnValue({ data: { ...response(), rows: [] }, loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(<AdjustReportTable appId="app-1" range="today" />)

    expect(html).toContain("No Adjust report data for this range")
    expect(html).toContain("Adjust syncs daily")
  })

  it("renders loading skeletons", () => {
    useAdjustReport.mockReturnValue({ data: null, loading: true, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(<AdjustReportTable appId="app-1" range="last7" />)

    expect(html.match(/animate-pulse/g)?.length).toBeGreaterThan(0)
  })

  it("renders error retry block", () => {
    useAdjustReport.mockReturnValue({ data: null, loading: false, error: new Error("boom"), refetch: vi.fn() })

    const html = renderToStaticMarkup(<AdjustReportTable appId="app-1" range="last7" />)

    expect(html).toContain("Could not load Adjust Report")
    expect(html).toContain("Retry")
  })
})

function response(): AdjustReportResponse {
  return {
    date_range: {
      range: "last7",
      start_date_account_tz: "2026-05-21",
      end_date_account_tz: "2026-05-27",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    available: true,
    rows: [
      {
        channel: "facebook",
        source: "spring_promo_2026",
        installs: 1234,
        ad_spend_usd: 567.89,
        cpi_usd: 0.46,
        roas_d0: 12.3,
        roas_d1: 25.4,
        roas_d3: 41.2,
        roas_d7: 62.7,
        retention_d1: 34.5,
        retention_d3: 22.1,
        retention_d7: 11.4,
      },
    ],
  }
}
