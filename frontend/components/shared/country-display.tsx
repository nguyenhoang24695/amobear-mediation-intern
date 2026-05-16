"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { iso3166Alpha2ToCountryName, iso3166Alpha2ToFlagCdnSvgUrl } from "@/lib/utils/country-flag"

const FILTER_FLAG_W = 32
const FILTER_FLAG_H = Math.round((FILTER_FLAG_W * 3) / 4)

function CountryFlagCdnImg({
  code,
  widthPx,
  heightPx,
  className,
}: {
  code: string
  widthPx?: number
  heightPx?: number
  className?: string
}) {
  const w = widthPx ?? FILTER_FLAG_W
  const h = heightPx ?? Math.round((w * 3) / 4)
  const src = iso3166Alpha2ToFlagCdnSvgUrl(code)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      width={w}
      height={h}
      className={cn(
        "shrink-0 rounded-sm border border-slate-200/90 bg-slate-50 object-cover",
        className,
      )}
      loading="lazy"
      decoding="async"
      aria-hidden
    />
  )
}

/** Dùng trong Select filter: cờ (FlagCDN SVG) + tên quốc gia. */
export function CountryFilterOption({ code }: { code: string }) {
  const name = iso3166Alpha2ToCountryName(code) || code
  const hasFlag = !!iso3166Alpha2ToFlagCdnSvgUrl(code)
  return (
    <span className="flex min-w-0 items-center gap-2">
      {hasFlag ? (
        <CountryFlagCdnImg code={code} />
      ) : (
        <span
          className="flex shrink-0 items-center justify-center rounded-sm border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400"
          style={{ width: FILTER_FLAG_W, height: FILTER_FLAG_H }}
          aria-hidden
        >
          ?
        </span>
      )}
      <span className="truncate">{name}</span>
    </span>
  )
}

/** Cờ FlagCDN; hover tooltip hiển thị tên quốc gia. */
export function CountryFlagTooltipCell({ code }: { code?: string | null }) {
  const raw = code?.trim()
  if (!raw) return <span className="text-slate-500">—</span>
  const name = iso3166Alpha2ToCountryName(raw) || raw
  const src = iso3166Alpha2ToFlagCdnSvgUrl(raw)
  if (!src) {
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
        <span className="inline-flex cursor-default align-middle" aria-label={name}>
          <CountryFlagCdnImg code={raw} widthPx={24} heightPx={18} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-medium">{name}</p>
      </TooltipContent>
    </Tooltip>
  )
}
