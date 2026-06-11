import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { QonversionProductsResponse } from "@/types/app-dashboard"
import { QonversionProductTable } from "./qonversion-product-table"

const useQonversionProducts = vi.fn()

vi.mock("../hooks/use-qonversion-products", () => ({
  useQonversionProducts: (...args: unknown[]) => useQonversionProducts(...args),
}))

describe("QonversionProductTable", () => {
  beforeEach(() => {
    useQonversionProducts.mockReset()
  })

  it("renders subscription product rows with raw product id and counts", () => {
    useQonversionProducts.mockReturnValue({ data: subscriptionsResponse(), loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="Subscriptions by Product"
        report="subscriptions"
        columns={[
          { key: "activeSubscriptions", label: "Active Subscriptions" },
          { key: "newSubscriptions", label: "New Subscriptions" },
        ]}
      />,
    )

    expect(html).toContain("Subscriptions by Product")
    expect(html).toContain("qon_sub_week_v2:qon-sub-week-v2:qon-sub-week-v2-trial")
    expect(html).toContain("12.3K")
    expect(html).toContain("55")
  })

  it("renders rates as percentage values without multiplying by 100", () => {
    useQonversionProducts.mockReturnValue({ data: newUserToTrialResponse(), loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="New-User-to-Trial by Product"
        report="new_user_to_trial"
        columns={[{ key: "conversionRate", label: "Conversion rate (%)" }]}
      />,
    )

    expect(html).toContain("0.28%")
    expect(html).not.toContain("28.00%")
  })

  it("renders revenue and refund dollars", () => {
    useQonversionProducts.mockReturnValue({ data: refundsResponse(), loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="Refunds by Product"
        report="refunds"
        columns={[
          { key: "refundsUsd", label: "Refunds ($)" },
          { key: "refundRate", label: "Refund rate (%)" },
        ]}
      />,
    )

    expect(html).toContain("$70.04")
    expect(html).toContain("3.68%")
  })

  it("keeps long tables in a 10-row scroll area", () => {
    useQonversionProducts.mockReturnValue({ data: manySubscriptionsResponse(), loading: false, error: null, refetch: vi.fn() })

    const html = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="Subscriptions by Product"
        report="subscriptions"
        columns={[
          { key: "activeSubscriptions", label: "Active Subscriptions" },
          { key: "newSubscriptions", label: "New Subscriptions" },
        ]}
      />,
    )

    expect(html).toContain("max-h-[520px] overflow-y-auto")
    expect(html).toContain("product-11")
  })

  it("renders empty state for warning or empty rows", () => {
    useQonversionProducts.mockReturnValue({
      data: { ...subscriptionsResponse(), meta: { warnings: ["qonversion_charts_not_configured"] } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    const html = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="Subscriptions by Product"
        report="subscriptions"
        columns={[{ key: "activeSubscriptions", label: "Active Subscriptions" }]}
      />,
    )

    expect(html).toContain("No Qonversion data for this app/range")
    expect(html).not.toContain("qon_sub_week_v2:qon-sub-week-v2:qon-sub-week-v2-trial")
  })

  it("renders loading and error states", () => {
    useQonversionProducts.mockReturnValue({ data: null, loading: true, error: null, refetch: vi.fn() })

    const loadingHtml = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="Trial-to-Paid by Product"
        report="trial_to_paid"
        columns={[{ key: "revenueUsd", label: "Revenue ($)" }]}
      />,
    )

    expect(loadingHtml.match(/animate-pulse/g)?.length).toBeGreaterThan(0)

    useQonversionProducts.mockReturnValue({ data: null, loading: false, error: new Error("boom"), refetch: vi.fn() })

    const errorHtml = renderToStaticMarkup(
      <QonversionProductTable
        appId="app-1"
        range="last7"
        title="Trial-to-Paid by Product"
        report="trial_to_paid"
        columns={[{ key: "revenueUsd", label: "Revenue ($)" }]}
      />,
    )

    expect(errorHtml).toContain("Could not load Trial-to-Paid by Product")
    expect(errorHtml).toContain("Retry")
  })
})

function baseResponse(): Omit<QonversionProductsResponse, "report" | "rows"> {
  return {
    dateRange: {
      range: "last7",
      start_date_account_tz: "2026-05-30",
      end_date_account_tz: "2026-06-05",
      tz_offset_hours: 7,
      display_tz_offset_hours: 7,
    },
    meta: { warnings: [] },
  }
}

function subscriptionsResponse(): QonversionProductsResponse {
  return {
    ...baseResponse(),
    report: "subscriptions",
    rows: [
      {
        productId: "qon_sub_week_v2:qon-sub-week-v2:qon-sub-week-v2-trial",
        activeSubscriptions: 12345,
        newSubscriptions: 55,
      },
    ],
  }
}

function manySubscriptionsResponse(): QonversionProductsResponse {
  return {
    ...baseResponse(),
    report: "subscriptions",
    rows: Array.from({ length: 12 }, (_, index) => ({
      productId: `product-${index}`,
      activeSubscriptions: 100 - index,
      newSubscriptions: index,
    })),
  }
}

function newUserToTrialResponse(): QonversionProductsResponse {
  return {
    ...baseResponse(),
    report: "new_user_to_trial",
    rows: [{ productId: "qon_sub_week_v2:qon-sub-week-v2:qon-sub-week-v2-trial", conversionRate: 0.28 }],
  }
}

function refundsResponse(): QonversionProductsResponse {
  return {
    ...baseResponse(),
    report: "refunds",
    rows: [{ productId: "qon_sub_week_v2:qon-sub-week-v2:qon-sub-week-v2-trial", refundsUsd: 70.04, refundRate: 3.68 }],
  }
}
