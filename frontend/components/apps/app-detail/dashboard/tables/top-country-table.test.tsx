import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TopCountriesResponse } from "@/types/app-dashboard"
import { TopCountryTable } from "./top-country-table"

const useTopCountry = vi.fn()

vi.mock("../hooks/use-top-country", () => ({
  useTopCountry: (...args: unknown[]) => useTopCountry(...args),
}))

describe("TopCountryTable", () => {
  beforeEach(() => {
    useTopCountry.mockReset()
  })

  it("renders revenue metric with USD values and derived columns", () => {
    useTopCountry.mockReturnValue({ data: response("iaa"), loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <TopCountryTable appId="app-1" range="last7" metric="iaa" title="Top Country by IAA Revenue" />,
    )

    expect(html).toContain("Top Country by IAA Revenue")
    expect(html).toContain("United States")
    expect(html).toContain("US")
    expect(html).toContain("$123.45")
    expect(html).toContain("$0.12")
    expect(html).toContain("2.34%")
  })

  it("renders user metric with count primary value", () => {
    const data = response("new_users")
    data.rows[0].primary_value = 12345
    useTopCountry.mockReturnValue({ data, loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <TopCountryTable appId="app-1" range="last7" metric="new_users" title="Top Country by New Users" />,
    )

    expect(html).toContain("Top Country by New Users")
    expect(html).toContain("12.3K")
  })

  it("renders Qonversion empty state for IAP and SUB country revenue", () => {
    useTopCountry.mockReturnValue({ data: { ...response("iap_sub"), rows: [] }, loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <TopCountryTable appId="app-1" range="last7" metric="iap_sub" title="Top Country by IAP + SUB Revenue" />,
    )

    expect(html).toContain("No Qonversion country IAP/SUB data for this range")
    expect(html).not.toContain("No Adjust country revenue data for this range")
  })

  it("renders loading skeletons", () => {
    useTopCountry.mockReturnValue({ data: null, loading: true, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <TopCountryTable appId="app-1" range="last7" metric="total_users" title="Top Country by Total Users" />,
    )

    expect(html.match(/animate-pulse/g)?.length).toBeGreaterThan(0)
  })

  it("renders error retry block", () => {
    useTopCountry.mockReturnValue({ data: null, loading: false, error: new Error("boom"), refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <TopCountryTable appId="app-1" range="last7" metric="total_users" title="Top Country by Total Users" />,
    )

    expect(html).toContain("Could not load Top Country by Total Users")
    expect(html).toContain("Retry")
  })
})

function response(metric: TopCountriesResponse["metric"]): TopCountriesResponse {
  return {
    date_range: {
      range: "last7",
      start_date_account_tz: "2026-05-21",
      end_date_account_tz: "2026-05-27",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    metric,
    rows: [
      {
        country_code: "US",
        country_name: "United States",
        primary_value: 123.45,
        arpu_country_usd: 0.1234,
        conversion_rate_percent: 2.34,
      },
    ],
  }
}
