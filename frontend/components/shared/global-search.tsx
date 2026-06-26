"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Smartphone, Layers, KeyRound, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useGlobalSearch, categoryLabels, type SearchCategory, type SearchResultItem } from "@/hooks/use-global-search"
import { cn } from "@/lib/utils"

const categoryIcons: Record<SearchCategory, React.ElementType> = {
    apps: Smartphone,
    mediationGroups: Layers,
    dataAccounts: KeyRound,
}

export function GlobalSearch() {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const {
        query,
        isOpen,
        loading,
        results,
        activeIndex,
        activeResult,
        setActiveIndex,
        handleSearch,
        open,
        close,
        moveUp,
        moveDown,
    } = useGlobalSearch()

    // ---- Navigate to selected result ----
    const navigateTo = useCallback(
        (item: SearchResultItem) => {
            close()
            inputRef.current?.blur()
            router.push(item.href)
        },
        [close, router]
    )

    // ---- Global Ctrl+K shortcut ----
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault()
                if (isOpen) {
                    close()
                } else {
                    open()
                    // Slight delay so the input is rendered and visible
                    setTimeout(() => inputRef.current?.focus(), 50)
                }
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, open, close])

    // ---- Click outside to close ----
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                close()
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handler)
        }
        return () => document.removeEventListener("mousedown", handler)
    }, [isOpen, close])

    // ---- Keyboard navigation on input ----
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                moveDown()
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                moveUp()
            } else if (e.key === "Enter" && activeResult) {
                e.preventDefault()
                navigateTo(activeResult)
            } else if (e.key === "Escape") {
                e.preventDefault()
                close()
                inputRef.current?.blur()
            }
        },
        [moveDown, moveUp, activeResult, navigateTo, close]
    )

    // ---- Group results by category for rendering ----
    const grouped = results.reduce<Partial<Record<SearchCategory, SearchResultItem[]>>>(
        (acc, item) => {
            if (!acc[item.category]) acc[item.category] = []
            acc[item.category]!.push(item)
            return acc
        },
        {}
    )

    // Flat index → determine which item is active
    let flatIndex = 0

    return (
        <div ref={containerRef} className="flex-1 max-w-md mx-8 relative" id="global-search">
            {/* ---- Search Input ---- */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    placeholder="Search apps, networks, reports..."
                    className="h-10 bg-background/60 pl-9 pr-16 transition-colors focus:bg-background"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => open()}
                    onKeyDown={handleKeyDown}
                    id="global-search-input"
                />
                {/* Ctrl+K badge */}
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground sm:inline-flex">
                    Ctrl K
                </kbd>
            </div>

            {/* ---- Dropdown ---- */}
            {isOpen && query.trim().length > 0 && (
                <div
                    className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
                    id="global-search-dropdown"
                >
                    {/* Loading spinner */}
                    {loading && results.length === 0 && (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                        </div>
                    )}

                    {/* No results */}
                    {!loading && query.trim().length > 0 && results.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No results found for &ldquo;{query}&rdquo;
                        </div>
                    )}

                    {/* Results grouped by category */}
                    {results.length > 0 && (
                        <div className="max-h-80 overflow-y-auto py-1.5">
                            {(Object.keys(grouped) as SearchCategory[]).map((cat) => {
                                const items = grouped[cat]!
                                const CatIcon = categoryIcons[cat]

                                return (
                                    <div key={cat}>
                                        {/* Category header */}
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            <CatIcon className="w-3 h-3" />
                                            {categoryLabels[cat]}
                                        </div>

                                        {/* Items */}
                                        {items.map((item) => {
                                            const currentIndex = flatIndex++
                                            const isActive = currentIndex === activeIndex

                                            return (
                                                <button
                                                    key={item.id}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                                                        isActive
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-popover-foreground hover:bg-accent"
                                                    )}
                                                    onMouseEnter={() => setActiveIndex(currentIndex)}
                                                    onClick={() => navigateTo(item)}
                                                    id={`search-result-${item.id}`}
                                                >
                                                    {/* Icon / avatar */}
                                                    {item.icon ? (
                                                        <img
                                                            src={item.icon}
                                                            alt=""
                                                            className="h-7 w-7 flex-shrink-0 rounded-md bg-muted object-contain"
                                                        />
                                                    ) : (
                                                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                                                            <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </div>
                                                    )}

                                                    {/* Text */}
                                                    <div className="flex-1 min-w-0">
                                                        <p
                                                            className={cn(
                                                                "truncate font-medium text-[13px]",
                                                                isActive ? "text-primary" : "text-popover-foreground"
                                                            )}
                                                        >
                                                            {item.title}
                                                        </p>
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {item.subtitle}
                                                        </p>
                                                    </div>

                                                    {/* Meta badges */}
                                                    {item.meta &&
                                                        Object.entries(item.meta).map(([key, val]) => (
                                                            <span
                                                                key={key}
                                                                className="hidden items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex"
                                                            >
                                                                {val}
                                                            </span>
                                                        ))}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Footer hint */}
                    {results.length > 0 && (
                        <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border bg-muted px-1 py-0.5">↑</kbd>
                                <kbd className="rounded border bg-muted px-1 py-0.5">↓</kbd>
                                navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border bg-muted px-1 py-0.5">↵</kbd>
                                open
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border bg-muted px-1 py-0.5">esc</kbd>
                                close
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
