"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { TikTokTargetingOptionDto } from "@/types/tiktok-ads"

interface SearchableSelectProps<T> {
  value: string
  options: T[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  disabled?: boolean
  onValueChange: (value: string) => void
  getValue: (option: T) => string
  getSearchText: (option: T) => string
  renderOption: (option: T) => ReactNode
  renderValue: (option: T) => ReactNode
  onSearchChange?: (query: string) => void
  shouldFilter?: boolean
}

export function SearchableSelect<T>({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  onValueChange,
  getValue,
  getSearchText,
  renderOption,
  renderValue,
  onSearchChange,
  shouldFilter = true,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => getValue(option) === value)

  return (
    <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between bg-white px-3 text-left font-normal"
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? renderValue(selectedOption) : <span className="text-slate-500">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[320px] p-0" align="start">
        <Command shouldFilter={shouldFilter}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const optionValue = getValue(option)
                const isSelected = optionValue === value
                return (
                  <CommandItem
                    key={optionValue}
                    value={getSearchText(option)}
                    onSelect={() => {
                      onValueChange(optionValue)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1">{renderOption(option)}</span>
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

interface TargetingMultiSelectProps {
  values: string[]
  options: TikTokTargetingOptionDto[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  disabled?: boolean
  onValuesChange: (values: string[]) => void
}

export function TargetingMultiSelect({ values, options, placeholder, searchPlaceholder, emptyMessage, disabled = false, onValuesChange }: TargetingMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const selectedOptions = useMemo(() => {
    return values.map((value) => options.find((option) => option.key === value) ?? { key: value, label: value, type: "unknown" })
  }, [options, values])

  function toggle(value: string) {
    onValuesChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  function remove(value: string) {
    onValuesChange(values.filter((item) => item !== value))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="min-h-10 w-full justify-between bg-white px-3 text-left font-normal"
          >
            <span className={cn("min-w-0 flex-1 truncate", values.length === 0 && "text-slate-500")}>
              {values.length === 0 ? placeholder : `${values.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = values.includes(option.key)
                  return (
                    <CommandItem key={option.key} value={`${option.label} ${option.key} ${option.countryCode ?? ""} ${option.path ?? ""}`} onSelect={() => toggle(option.key)}>
                      <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.label}</span>
                        <span className="block truncate text-xs text-slate-400">{option.countryCode ? `${option.countryCode} · ` : ""}{option.path || option.key}</span>
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <Badge key={option.key} variant="outline" className="gap-1 rounded-md bg-white px-2 py-1 text-xs">
              <span className="max-w-[180px] truncate">{option.label}</span>
              <button type="button" className="rounded-sm text-slate-400 hover:text-slate-700" onClick={() => remove(option.key)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
