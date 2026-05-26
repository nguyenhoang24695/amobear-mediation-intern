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

interface StringFilterComboboxProps {
  options: readonly string[]
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  id?: string
  triggerClassName?: string
  allLabel?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

export function StringFilterCombobox({
  options,
  value,
  onChange,
  disabled = false,
  id,
  triggerClassName,
  allLabel = "Tất cả",
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Không tìm thấy dữ liệu.",
}: StringFilterComboboxProps) {
  const [open, setOpen] = useState(false)

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" })),
    [options],
  )

  const selectedValue = value.trim()

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
            {selectedValue ? selectedValue : <span className="text-slate-600">{allLabel}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,320px)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`__all__ ${allLabel}`}
                onSelect={() => {
                  onChange("")
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedValue ? "opacity-0" : "opacity-100")} />
                <span className="text-slate-700">{allLabel}</span>
              </CommandItem>
              {sortedOptions.map((option) => {
                const selected = selectedValue === option
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{option}</span>
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
