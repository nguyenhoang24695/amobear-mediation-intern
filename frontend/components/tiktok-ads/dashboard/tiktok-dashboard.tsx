"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { format } from "date-fns"
import { AlertTriangle, BarChart3, ChevronRight, DollarSign, MousePointerClick, RefreshCw, Search, TrendingUp, WalletCards } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/shared/pagination"
import { useApi } from "@/hooks/use-api"
import { tiktokDashboardApi } from "@/lib/api/tiktok-ads"
import { cn } from "@/lib/utils"
import type { TikTokCampaignPerformanceDto, TikTokDashboardDailyDto, TikTokDashboardOverviewDto, TikTokInstallDiscrepancyDto } from "@/types/tiktok-ads"

function getDefaultRange(): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  return { from, to: today }
}

function formatDateForApi(value: Date): string {
  return format(value, "yyyy-MM-dd")
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US")
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return `${Math.round(value)}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function chartDate(value: string): string {
  return format(new Date(value), "MMM d")
}

function buildTikTokCampaignUrl(advertiserId?: string | null, campaignId?: string | null): string | null {
  const adv = advertiserId?.trim()
  const campaign = campaignId?.trim()
  if (!adv || !campaign) return null
  return `https://ads.tiktok.com/i18n/perf/campaign?aadvid=${encodeURIComponent(adv)}&campaign_id=${encodeURIComponent(campaign)}`
}

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  loading,
  tone,
}: {
  title: string
  value: string
  helper: string
  icon: typeof DollarSign
  loading: boolean
  tone: string
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">{title}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{helper}</p>
            </div>
            <div className={cn("rounded-lg p-2.5", tone)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function KpiGrid({ overview, loading }: { overview: TikTokDashboardOverviewDto | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Spend" value={formatCurrency(overview?.totalSpend ?? 0)} helper={`CPI ${formatCurrency(overview?.avgCpi ?? 0)}`} icon={DollarSign} loading={loading} tone="bg-cyan-50 text-cyan-700" />
      <KpiCard title="MMP Installs" value={formatNumber(overview?.totalInstalls ?? 0)} helper="Gold installs come from MMP attribution" icon={TrendingUp} loading={loading} tone="bg-emerald-50 text-emerald-700" />
      <KpiCard title="Clicks / CTR" value={`${formatCompact(overview?.totalClicks ?? 0)} / ${formatPercent(overview?.avgCtr ?? 0)}`} helper={`${formatCompact(overview?.totalImpressions ?? 0)} impressions`} icon={MousePointerClick} loading={loading} tone="bg-violet-50 text-violet-700" />
      <KpiCard title="Balance" value={formatCurrency(overview?.accountBalance ?? 0)} helper={`${formatNumber(overview?.activeCampaigns ?? 0)} active campaigns`} icon={WalletCards} loading={loading} tone="bg-amber-50 text-amber-700" />
    </div>
  )
}

function TrendChart({ daily, loading }: { daily: TikTokDashboardDailyDto[]; loading: boolean }) {
  const data = useMemo(
    () => daily.map((item) => ({
      label: chartDate(item.date),
      spend: item.spend,
      installs: item.installs,
      cpi: item.installs > 0 ? item.spend / item.installs : 0,
      ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
    })),
    [daily],
  )

  if (loading) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72" /></CardHeader>
        <CardContent><Skeleton className="h-[320px] w-full" /></CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">30 Day Trend</CardTitle>
        <CardDescription className="text-sm text-slate-500">TikTok spend, MMP installs, CPI, and CTR grouped by report date.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-slate-500">No daily TikTok data for this range.</div>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} width={58} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(value) => formatCompact(Number(value))} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} width={58} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(value) => `$${Number(value).toFixed(1)}`} />
                <Tooltip formatter={(value: number, name: string) => [name === "spend" || name === "cpi" ? formatCurrency(Number(value)) : name === "ctr" ? formatPercent(Number(value)) : formatNumber(Number(value)), name]} />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" name="Spend" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="installs" name="MMP installs" stroke="#10B981" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cpi" name="CPI" stroke="#F97316" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="ctr" name="CTR %" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DiscrepancyChart({ rows, loading }: { rows: TikTokInstallDiscrepancyDto[]; loading: boolean }) {
  const data = rows.slice(0, 20).reverse().map((item) => ({
    label: item.campaignName || item.campaignId,
    mmpInstalls: item.mmpInstalls,
    tikTokReportedInstalls: item.tikTokReportedInstalls,
    driftPercent: item.driftPercent,
  }))

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-semibold text-slate-900">Install Discrepancy</CardTitle>
        </div>
        <CardDescription className="text-sm text-slate-500">Compare TikTok reported installs with MMP installs; rows above 20% are alert candidates.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">No discrepancy rows for the selected range.</div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="tiktok-drift-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={false} />
                <YAxis axisLine={false} tickLine={false} width={56} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(value) => `${Number(value).toFixed(0)}%`} />
                <Tooltip formatter={(value: number) => formatPercent(Number(value))} />
                <Area type="monotone" dataKey="driftPercent" name="Drift" stroke="#F59E0B" strokeWidth={2.5} fill="url(#tiktok-drift-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CampaignTable({
  startDate,
  endDate,
  advertiserId,
  campaignId,
  refreshToken,
}: {
  startDate: string
  endDate: string
  advertiserId?: string
  campaignId?: string
  refreshToken: number
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const deferredSearch = useDeferredValue(search)

  const cacheKey = useMemo(
    () => ["tiktok-campaigns", startDate, endDate, advertiserId ?? "all", campaignId ?? "all", deferredSearch, page, pageSize, refreshToken].join(":"),
    [startDate, endDate, advertiserId, campaignId, deferredSearch, page, pageSize, refreshToken],
  )

  const { data, loading, error } = useApi(
    () => tiktokDashboardApi.getCampaigns({ startDate, endDate, advertiserId, campaignId, search: deferredSearch.trim() || undefined, page, pageSize }),
    { cacheKey },
  )

  const rows = data?.items ?? []
  const totalPages = Math.max(1, Math.ceil((data?.total ?? rows.length) / pageSize))

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">Campaign Performance</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Read-only TikTok campaign metrics with MMP-attributed installs.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaign" className="h-10 border-slate-200 pl-9" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="px-4">Campaign</TableHead>
                <TableHead className="px-4">Advertiser</TableHead>
                <TableHead className="px-4 text-right">Spend</TableHead>
                <TableHead className="px-4 text-right">Installs</TableHead>
                <TableHead className="px-4 text-right">CPI</TableHead>
                <TableHead className="px-4 text-right">ROAS</TableHead>
                <TableHead className="px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}><TableCell colSpan={7} className="px-4 py-3"><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : error ? (
                <TableRow><TableCell colSpan={7} className="px-4 py-10 text-center text-sm text-rose-600">{error.message}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No campaigns match this range.</TableCell></TableRow>
              ) : (
                rows.map((item: TikTokCampaignPerformanceDto) => {
                  const url = buildTikTokCampaignUrl(item.advertiserId, item.campaignId)
                  return (
                    <TableRow key={`${item.advertiserId}-${item.campaignId}`} className="hover:bg-slate-50/80">
                      <TableCell className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{item.campaignName || item.campaignId}</div>
                          <div className="text-xs text-slate-500">{item.campaignId}</div>
                          {item.appId ? <div className="text-xs text-slate-400">App: {item.appId}</div> : null}
                          {url ? <a href={url} target="_blank" rel="noreferrer noopener" className="text-xs font-medium text-cyan-700 hover:text-cyan-800">Open in TikTok</a> : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">{item.advertiserId}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-700">{formatCurrency(item.spend)}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-700">{formatNumber(item.installs)}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-700">{formatCurrency(item.cpi)}</TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm font-medium text-slate-700">{item.roas == null ? "--" : `${item.roas.toFixed(2)}x`}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">{item.status || "UNKNOWN"}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination currentPage={data?.page ?? page} totalPages={totalPages} totalItems={data?.total ?? rows.length} pageSize={pageSize} itemName="campaigns" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
        </div>
      </CardContent>
    </Card>
  )
}

export function TikTokDashboard() {
  const [range, setRange] = useState(getDefaultRange)
  const [advertiserId, setAdvertiserId] = useState("")
  const [campaignId, setCampaignId] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)

  const startDate = useMemo(() => formatDateForApi(range.from), [range.from])
  const endDate = useMemo(() => formatDateForApi(range.to), [range.to])
  const selectedAdvertiserId = advertiserId.trim() || undefined
  const selectedCampaignId = campaignId.trim() || undefined
  const params = { startDate, endDate, advertiserId: selectedAdvertiserId, campaignId: selectedCampaignId }

  const overviewApi = useApi(() => tiktokDashboardApi.getOverview(params), { cacheKey: ["tiktok-overview", startDate, endDate, selectedAdvertiserId ?? "all", selectedCampaignId ?? "all", refreshToken].join(":") })
  const dailyApi = useApi(() => tiktokDashboardApi.getDaily(params), { cacheKey: ["tiktok-daily", startDate, endDate, selectedAdvertiserId ?? "all", selectedCampaignId ?? "all", refreshToken].join(":") })
  const discrepancyApi = useApi(() => tiktokDashboardApi.getDiscrepancy(params), { cacheKey: ["tiktok-discrepancy", startDate, endDate, selectedAdvertiserId ?? "all", selectedCampaignId ?? "all", refreshToken].join(":") })

  const refresh = () => {
    void overviewApi.refetch()
    void dailyApi.refetch()
    void discrepancyApi.refetch()
    setRefreshToken((value) => value + 1)
  }

  const loading = overviewApi.loading || dailyApi.loading || discrepancyApi.loading

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <nav className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
            <span>TikTok Ads</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900">Dashboard</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-50 p-2.5">
              <BarChart3 className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">TikTok Ads Dashboard</h1>
              <p className="text-sm text-slate-500">Read-only spend, campaign performance, MMP installs, and discrepancy monitoring.</p>
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" className="h-10 border-slate-200 bg-white text-slate-700" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card className="border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Filters</h2>
            <DateRangePicker value={range} onChange={setRange} className="flex-wrap" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={advertiserId} onChange={(event) => setAdvertiserId(event.target.value)} placeholder="Advertiser ID" className="h-10 border-slate-200 md:w-[220px]" />
            <Input value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="Campaign ID" className="h-10 border-slate-200 md:w-[220px]" />
          </div>
        </div>
      </Card>

      {overviewApi.error || dailyApi.error || discrepancyApi.error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="p-4 text-sm text-rose-700">{overviewApi.error?.message ?? dailyApi.error?.message ?? discrepancyApi.error?.message}</CardContent>
        </Card>
      ) : null}

      <KpiGrid overview={overviewApi.data} loading={overviewApi.loading} />
      <TrendChart daily={dailyApi.data ?? []} loading={dailyApi.loading} />
      <DiscrepancyChart rows={discrepancyApi.data ?? []} loading={discrepancyApi.loading} />
      <CampaignTable startDate={startDate} endDate={endDate} advertiserId={selectedAdvertiserId} campaignId={selectedCampaignId} refreshToken={refreshToken} />
    </div>
  )
}
