"use client"

import { useDeferredValue, useEffect, useState, type ReactNode } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { useApi } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { WaterfallFilterOptionDto } from "@/types/api"

interface WaterfallFilterComboboxProps {
  value?: string
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  allLabel: string
  cacheKeyBase: string
  scopeKey: string
  loadOptions: (search: string) => Promise<WaterfallFilterOptionDto[]>
  onSelect: (option: WaterfallFilterOptionDto | null) => void
  disabled?: boolean
  className?: string
  minSearchLength?: number
  idleMessage?: string
  renderOption?: (option: WaterfallFilterOptionDto, isSelected: boolean) => ReactNode
  renderButtonValue?: (option: WaterfallFilterOptionDto) => ReactNode
}

function DefaultOptionContent({ option }: { option: WaterfallFilterOptionDto }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.iconUri ? (
        <img src={option.iconUri} alt="" className="h-7 w-7 rounded-md object-cover shrink-0" />
      ) : null}
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{option.label}</span>
        {option.secondaryLabel && option.secondaryLabel !== option.label ? (
          <span className="block truncate text-xs text-muted-foreground">{option.secondaryLabel}</span>
        ) : null}
      </span>
    </span>
  )
}

export function WaterfallFilterCombobox({
  value,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  allLabel,
  cacheKeyBase,
  scopeKey,
  loadOptions,
  onSelect,
  disabled = false,
  className,
  minSearchLength = 0,
  idleMessage,
  renderOption,
  renderButtonValue,
}: WaterfallFilterComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [optionCache, setOptionCache] = useState<Record<string, WaterfallFilterOptionDto>>({})

  const deferredSearch = useDeferredValue(search.trim())
  const querySearch = open ? deferredSearch : (value ?? "")
  const canLoadOptions = Boolean(value) || (open && querySearch.length >= minSearchLength)

  const { data, loading } = useApi(
    () => loadOptions(querySearch),
    {
      enabled: canLoadOptions,
      cacheKey: `${cacheKeyBase}_${scopeKey}_${querySearch || "__empty__"}`,
    },
  )

  const options = data ?? []

  useEffect(() => {
    if (!open && search) {
      setSearch("")
    }
  }, [open, search])

  useEffect(() => {
    if (options.length === 0) return

    setOptionCache((current) => {
      const next = { ...current }
      for (const option of options) {
        next[option.value] = option
      }
      return next
    })
  }, [options])

  const selectedOption = value
    ? optionCache[value] ?? { value, label: value }
    : null

  const buttonContent = selectedOption
    ? renderButtonValue?.(selectedOption) ?? <DefaultOptionContent option={selectedOption} />
    : <span className="truncate text-muted-foreground">{placeholder}</span>

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-10 w-full justify-between bg-card px-3 text-left font-normal", className)}
        >
          <span className="min-w-0 flex-1 truncate">{buttonContent}</span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!canLoadOptions ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {idleMessage ?? emptyMessage}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                <CommandGroup>
                  <CommandItem
                    value={`__all__${allLabel}`}
                    onSelect={() => {
                      onSelect(null)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    <span>{allLabel}</span>
                  </CommandItem>
                </CommandGroup>
                {options.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
                ) : (
                  <CommandGroup>
                    {options.map((option) => {
                      const isSelected = option.value === value
                      return (
                        <CommandItem
                          key={option.value}
                          value={`${option.label} ${option.secondaryLabel ?? ""} ${option.value}`}
                          onSelect={() => {
                            onSelect(option)
                            setOpen(false)
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                          <span className="min-w-0 flex-1">
                            {renderOption?.(option, isSelected) ?? <DefaultOptionContent option={option} />}
                          </span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


