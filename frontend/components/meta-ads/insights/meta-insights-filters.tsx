"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MetaInsightsFiltersResponseDto } from "@/types/meta-ads"

interface MetaInsightsFiltersProps {
  range: DateRange
  accountId: string
  campaignId: string
  country: string
  filters: MetaInsightsFiltersResponseDto | null
  loading: boolean
  refreshing: boolean
  onRangeChange: (range: DateRange) => void
  onAccountChange: (value: string) => void
  onCampaignChange: (value: string) => void
  onCountryChange: (value: string) => void
  onRefresh: () => void
}

export function MetaInsightsFilters({
  range,
  accountId,
  campaignId,
  country,
  filters,
  loading,
  refreshing,
  onRangeChange,
  onAccountChange,
  onCampaignChange,
  onCountryChange,
  onRefresh,
}: MetaInsightsFiltersProps) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Filters</h2>
          <DateRangePicker value={range} onChange={onRangeChange} className="flex-wrap" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={accountId} onValueChange={onAccountChange}>
            <SelectTrigger className="h-10 min-w-[190px] bg-white text-sm">
              <SelectValue placeholder="Ad account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ad accounts</SelectItem>
              {(filters?.accounts ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={campaignId} onValueChange={onCampaignChange}>
            <SelectTrigger className="h-10 min-w-[220px] bg-white text-sm">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {(filters?.campaigns ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label || option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger className="h-10 min-w-[160px] bg-white text-sm">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {(filters?.countries ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            className="h-10 border-slate-200 bg-white text-slate-700"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <div className="mt-3 text-xs text-slate-500">Refreshing filter options...</div> : null}
    </Card>
  )
}
