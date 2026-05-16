"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { iso3166Alpha2ToCountryName, iso3166Alpha2ToFlagEmoji } from "@/lib/utils/country-flag"

/** Dùng trong Select filter: cờ + tên quốc gia. */
export function CountryFilterOption({ code }: { code: string }) {
  const flag = iso3166Alpha2ToFlagEmoji(code) ?? "🏳️"
  const name = iso3166Alpha2ToCountryName(code) || code
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-base leading-none" aria-hidden>
        {flag}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

/** Chỉ emoji cờ; hover tooltip hiển thị tên quốc gia. */
export function CountryFlagTooltipCell({ code }: { code?: string | null }) {
  const raw = code?.trim()
  if (!raw) return <span className="text-slate-500">—</span>
  const name = iso3166Alpha2ToCountryName(raw) || raw
  const flag = iso3166Alpha2ToFlagEmoji(raw)
  if (!flag) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default font-mono text-[11px] tabular-nums text-slate-600">{raw}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{name}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center justify-center text-base leading-none" aria-label={name}>
          {flag}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{name}</p>
      </TooltipContent>
    </Tooltip>
  )
}
