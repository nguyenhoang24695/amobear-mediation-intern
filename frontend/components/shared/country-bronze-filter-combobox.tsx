"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CountryFilterOption } from "@/components/shared/country-display"
import { iso3166Alpha2ToCountryName } from "@/lib/utils/country-flag"

export interface CountryBronzeFilterComboboxProps {
  /** Mã ISO alpha-2 từ API filter options. */
  codes: readonly string[]
  /** Rỗng = tất cả quốc gia. */
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  /** Gắn với <Label htmlFor>. */
  id?: string
  triggerClassName?: string
}

function countrySearchBlob(code: string): string {
  const name = iso3166Alpha2ToCountryName(code) || ""
  const upper = code.trim().toUpperCase()
  const lower = upper.toLowerCase()
  return [name, upper, lower, code.trim()].filter(Boolean).join(" ")
}

/**
 * Combobox country cho bronze mediation filters — gõ theo mã ISO hoặc tên (locale hiển thị).
 */
export function CountryBronzeFilterCombobox({
  codes,
  value,
  onChange,
  disabled = false,
  id,
  triggerClassName,
}: CountryBronzeFilterComboboxProps) {
  const [open, setOpen] = useState(false)

  const sortedCodes = useMemo(() => {
    return [...codes].sort((a, b) => {
      const na = iso3166Alpha2ToCountryName(a) || a
      const nb = iso3166Alpha2ToCountryName(b) || b
      const cmp = na.localeCompare(nb, "vi", { sensitivity: "base" })
      return cmp !== 0 ? cmp : a.localeCompare(b)
    })
  }, [codes])

  const isAll = !value.trim()

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "h-10 min-w-0 flex-1 justify-between bg-white px-3 text-left font-normal",
            triggerClassName,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {isAll ? (
              <span className="text-slate-600">Tất cả</span>
            ) : (
              <CountryFilterOption code={value.trim().toUpperCase()} />
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,320px)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm theo mã hoặc tên quốc gia…" />
          <CommandList>
            <CommandEmpty>Không tìm thấy quốc gia.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="tất cả all countries __all__"
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4 shrink-0", isAll ? "opacity-100" : "opacity-0")} />
                <span className="text-slate-700">Tất cả</span>
              </CommandItem>
              {sortedCodes.map((code) => {
                const selected = value.trim().toUpperCase() === code.trim().toUpperCase()
                return (
                  <CommandItem
                    key={code}
                    value={countrySearchBlob(code)}
                    onSelect={() => {
                      onChange(code)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                    <CountryFilterOption code={code} />
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
