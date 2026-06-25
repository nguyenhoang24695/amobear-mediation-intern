"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { MetaInsightsFilterOptionDto, MetaInsightsFiltersResponseDto } from "@/types/meta-ads"

interface SearchableFilterSelectProps {
  value: string
  options: MetaInsightsFilterOptionDto[]
  allLabel: string
  searchPlaceholder: string
  emptyMessage: string
  onValueChange: (value: string) => void
  className?: string
}

function SearchableFilterSelect({
  value,
  options,
  allLabel,
  searchPlaceholder,
  emptyMessage,
  onValueChange,
  className,
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedOption = value === "all" ? null : options.find((option) => option.value === value) ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-10 w-full justify-between bg-background px-3 text-left font-normal", className)}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? selectedOption.label || selectedOption.value : <span className="text-muted-foreground">{allLabel}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`all ${allLabel}`}
                onSelect={() => {
                  onValueChange("all")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === "all" ? "opacity-100" : "opacity-0")} />
                <span>{allLabel}</span>
              </CommandItem>
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option.label || option.value}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

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
    <Card className="p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Filters</h2>
          <DateRangePicker value={range} onChange={onRangeChange} className="flex-wrap" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchableFilterSelect
            value={accountId}
            options={filters?.accounts ?? []}
            allLabel="All ad accounts"
            searchPlaceholder="Search ad accounts..."
            emptyMessage="No ad accounts found."
            onValueChange={onAccountChange}
            className="min-w-[190px] text-sm"
          />

          <SearchableFilterSelect
            value={campaignId}
            options={filters?.campaigns ?? []}
            allLabel="All campaigns"
            searchPlaceholder="Search campaigns..."
            emptyMessage="No campaigns found."
            onValueChange={onCampaignChange}
            className="min-w-[220px] text-sm"
          />

          <SearchableFilterSelect
            value={country}
            options={filters?.countries ?? []}
            allLabel="All countries"
            searchPlaceholder="Search countries..."
            emptyMessage="No countries found."
            onValueChange={onCountryChange}
            className="min-w-[160px] text-sm"
          />

          <Button
            type="button"
            variant="outline"
            className="h-10 border-border bg-background text-foreground hover:bg-accent"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <div className="mt-3 text-xs text-muted-foreground">Refreshing filter options...</div> : null}
    </Card>
  )
}
