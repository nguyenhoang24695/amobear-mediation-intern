"use client"

import { useState } from "react"
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

export interface StringMultiSelectOption {
  value: string
  label: string
}

interface StringMultiSelectComboboxProps {
  options: readonly StringMultiSelectOption[]
  values: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  triggerClassName?: string
}

export function StringMultiSelectCombobox({
  options,
  values,
  onChange,
  disabled = false,
  id,
  placeholder = "Select items",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  triggerClassName,
}: StringMultiSelectComboboxProps) {
  const [open, setOpen] = useState(false)

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  const selectAll = () => {
    onChange(options.map((option) => option.value))
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 min-h-10 w-full justify-between bg-white px-3 text-left font-normal",
              triggerClassName,
            )}
          >
            <span className={cn("min-w-0 flex-1 truncate", values.length === 0 && "text-slate-500")}>
              {values.length === 0
                ? placeholder
                : values.length === options.length
                  ? `All (${options.length})`
                  : `${values.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,360px)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__select_all__"
                  onSelect={() => {
                    if (values.length === options.length) clearAll()
                    else selectAll()
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      values.length === options.length && options.length > 0
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="text-sm font-medium">Select all</span>
                </CommandItem>
                {options.map((option) => {
                  const isSelected = values.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => toggle(option.value)}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate text-sm">{option.label}</span>
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
