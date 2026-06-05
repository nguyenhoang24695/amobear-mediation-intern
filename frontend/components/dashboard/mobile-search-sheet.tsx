"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search, Smartphone, Layers, KeyRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useGlobalSearch,
  categoryLabels,
  type SearchCategory,
  type SearchResultItem,
} from "@/hooks/use-global-search"
import { cn } from "@/lib/utils"

const categoryIcons: Record<SearchCategory, React.ElementType> = {
  apps: Smartphone,
  mediationGroups: Layers,
  dataAccounts: KeyRound,
}

interface MobileSearchSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSearchSheet({ open, onOpenChange }: MobileSearchSheetProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    query,
    loading,
    results,
    activeIndex,
    activeResult,
    setActiveIndex,
    handleSearch,
    open: openSearch,
    close,
    moveUp,
    moveDown,
  } = useGlobalSearch()

  const navigateTo = useCallback(
    (item: SearchResultItem) => {
      close()
      onOpenChange(false)
      router.push(item.href)
    },
    [close, onOpenChange, router],
  )

  useEffect(() => {
    if (open) {
      openSearch()
      const timer = window.setTimeout(() => inputRef.current?.focus(), 100)
      return () => window.clearTimeout(timer)
    }
    close()
    handleSearch("")
  }, [open, openSearch, close, handleSearch])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      moveDown()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      moveUp()
    } else if (e.key === "Enter" && activeResult) {
      e.preventDefault()
      navigateTo(activeResult)
    }
  }

  const grouped = results.reduce<Partial<Record<SearchCategory, SearchResultItem[]>>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category]!.push(item)
      return acc
    },
    {},
  )

  let flatIndex = 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl px-4 pb-6">
        <SheetHeader className="text-left">
          <SheetTitle>Search</SheetTitle>
          <SheetDescription>Apps, mediation groups, data accounts</SheetDescription>
        </SheetHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            ref={inputRef}
            placeholder="Search apps, networks, reports..."
            className="h-11 border-slate-200 bg-slate-50 pl-9"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}

          {!loading && query.trim().length > 0 && results.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {(Object.keys(grouped) as SearchCategory[]).map((cat) => {
                const items = grouped[cat]!
                const CatIcon = categoryIcons[cat]

                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <CatIcon className="h-3 w-3" />
                      {categoryLabels[cat]}
                    </div>
                    {items.map((item) => {
                      const currentIndex = flatIndex++
                      const isActive = currentIndex === activeIndex

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors",
                            isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50",
                          )}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() => navigateTo(item)}
                        >
                          {item.icon ? (
                            <img
                              src={item.icon}
                              alt=""
                              className="h-8 w-8 flex-shrink-0 rounded-md bg-slate-100 object-contain"
                            />
                          ) : (
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100">
                              <CatIcon className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{item.title}</p>
                            <p className="truncate text-[11px] text-slate-400">{item.subtitle}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
