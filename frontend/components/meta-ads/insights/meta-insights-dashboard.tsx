"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronRight } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { metaInsightsApi } from "@/lib/api/meta-ads"
import { Card, CardContent } from "@/components/ui/card"
import { MetaCampaignTable } from "./meta-campaign-table"
import { MetaInsightsFilters } from "./meta-insights-filters"
import { MetaKpiCards } from "./meta-kpi-cards"
import { MetaSpendChart } from "./meta-spend-chart"
import {
  formatDateForApi,
  getDefaultMetaRange,
  toFilterValue,
} from "./meta-insights-utils"

export function MetaInsightsDashboard() {
  const [range, setRange] = useState(getDefaultMetaRange)
  const [accountId, setAccountId] = useState("all")
  const [campaignId, setCampaignId] = useState("all")
  const [country, setCountry] = useState("all")
  const [refreshToken, setRefreshToken] = useState(0)

  const startDate = useMemo(() => formatDateForApi(range.from), [range.from])
  const endDate = useMemo(() => formatDateForApi(range.to), [range.to])
  const selectedAccountId = toFilterValue(accountId)
  const selectedCampaignId = toFilterValue(campaignId)
  const selectedCountry = toFilterValue(country)

  const overviewCacheKey = useMemo(
    () => ["meta-insights-overview", startDate, endDate, selectedAccountId ?? "all", selectedCampaignId ?? "all", selectedCountry ?? "all"].join(":"),
    [startDate, endDate, selectedAccountId, selectedCampaignId, selectedCountry],
  )
  const dailyCacheKey = useMemo(
    () => ["meta-insights-daily", startDate, endDate, selectedAccountId ?? "all", selectedCampaignId ?? "all", selectedCountry ?? "all"].join(":"),
    [startDate, endDate, selectedAccountId, selectedCampaignId, selectedCountry],
  )
  const filtersCacheKey = useMemo(
    () => ["meta-insights-filters", startDate, endDate, selectedAccountId ?? "all", selectedCampaignId ?? "all", selectedCountry ?? "all"].join(":"),
    [startDate, endDate, selectedAccountId, selectedCampaignId, selectedCountry],
  )

  const overviewApi = useApi(
    () => metaInsightsApi.getOverview({
      startDate,
      endDate,
      accountId: selectedAccountId,
      campaignId: selectedCampaignId,
      country: selectedCountry,
    }),
    { cacheKey: overviewCacheKey },
  )

  const dailyApi = useApi(
    () => metaInsightsApi.getDaily({
      startDate,
      endDate,
      accountId: selectedAccountId,
      campaignId: selectedCampaignId,
      country: selectedCountry,
    }),
    { cacheKey: dailyCacheKey },
  )

  const filtersApi = useApi(
    () => metaInsightsApi.getFilters({
      startDate,
      endDate,
      accountId: selectedAccountId,
      campaignId: selectedCampaignId,
      country: selectedCountry,
    }),
    { cacheKey: filtersCacheKey },
  )

  useEffect(() => {
    if (accountId !== "all" && !(filtersApi.data?.accounts ?? []).some((item) => item.value === accountId)) {
      setAccountId("all")
    }
    if (campaignId !== "all" && !(filtersApi.data?.campaigns ?? []).some((item) => item.value === campaignId)) {
      setCampaignId("all")
    }
    if (country !== "all" && !(filtersApi.data?.countries ?? []).some((item) => item.value === country)) {
      setCountry("all")
    }
  }, [filtersApi.data, accountId, campaignId, country])

  const handleRefresh = () => {
    void overviewApi.refetch()
    void dailyApi.refetch()
    void filtersApi.refetch()
    setRefreshToken((current) => current + 1)
  }

  const hasEmptyState = !overviewApi.loading && !dailyApi.loading && !overviewApi.error && !dailyApi.error && (dailyApi.data?.length ?? 0) === 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
            <span>Meta Ads</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900">Insights</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Meta Ads Insights</h1>
              <p className="text-sm text-slate-500">Campaign-level Meta spend, installs, CPI, CTR, CPC, CPM, reach, frequency, impressions, plus Adjust-attributed revenue and ROAS.</p>
            </div>
          </div>
        </div>
      </div>

      <MetaInsightsFilters
        range={range}
        accountId={accountId}
        campaignId={campaignId}
        country={country}
        filters={filtersApi.data}
        loading={filtersApi.loading}
        refreshing={overviewApi.loading || dailyApi.loading || filtersApi.loading}
        onRangeChange={setRange}
        onAccountChange={setAccountId}
        onCampaignChange={setCampaignId}
        onCountryChange={setCountry}
        onRefresh={handleRefresh}
      />

      {overviewApi.error || dailyApi.error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="p-4 text-sm text-rose-700">
            {overviewApi.error?.message ?? dailyApi.error?.message}
          </CardContent>
        </Card>
      ) : null}

      <MetaKpiCards overview={overviewApi.data} daily={dailyApi.data ?? []} loading={overviewApi.loading || dailyApi.loading} />
      <MetaSpendChart daily={dailyApi.data ?? []} loading={dailyApi.loading} />

      {hasEmptyState ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-10 text-center text-sm text-slate-500">
            No data available for the selected Meta insights range and filters.
          </CardContent>
        </Card>
      ) : null}

      <MetaCampaignTable
        startDate={startDate}
        endDate={endDate}
        accountId={selectedAccountId}
        campaignId={selectedCampaignId}
        country={selectedCountry}
        refreshToken={refreshToken}
      />
    </div>
  )
}

