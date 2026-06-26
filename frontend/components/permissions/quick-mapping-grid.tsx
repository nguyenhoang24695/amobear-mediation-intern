"use client"

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from "react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { PermissionMap, Role, Screen } from "./permission-management-content"

type QuickMappingGridProps = {
  roles: Role[]
  screens: Screen[]
  permissions: PermissionMap
  disabled?: boolean
  /** Rendered above the column header row, inside the same sticky stack (e.g. Edit / Save). */
  toolbar?: ReactNode
  /** Shown below the sticky header block, above grid body (e.g. unsaved hint). */
  notice?: ReactNode
  onToggleScreenForRole: (roleId: string, screen: Screen) => void
  onToggleFunctionForRole: (roleId: string, screenId: string, functionId: string) => void
}

function screenPermissionState(
  rolePerms: Record<string, string[]> | undefined,
  screen: Screen,
): "none" | "some" | "all" {
  const granted = rolePerms?.[screen.id] ?? []
  if (granted.length === 0) return "none"
  if (granted.length === screen.functions.length) return "all"
  return "some"
}

export function QuickMappingGrid({
  roles,
  screens,
  permissions,
  disabled = false,
  toolbar,
  notice,
  onToggleScreenForRole,
  onToggleFunctionForRole,
}: QuickMappingGridProps) {
  const rolesSorted = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles],
  )

  const screensSorted = useMemo(
    () =>
      [...screens].sort((a, b) =>
        `${a.module}:${a.name}`.localeCompare(`${b.module}:${b.name}`),
      ),
    [screens],
  )

  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(
    () => new Set(screensSorted.map((s) => s.id)),
  )

  /** `position: sticky` fails when any ancestor has non-visible overflow; keep horizontal scroll on inner divs and sync scrollLeft. */
  const scrollSyncLock = useRef(false)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  const onHeaderScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (scrollSyncLock.current) return
    scrollSyncLock.current = true
    const left = e.currentTarget.scrollLeft
    const body = bodyScrollRef.current
    if (body && body.scrollLeft !== left) body.scrollLeft = left
    scrollSyncLock.current = false
  }, [])

  const onBodyScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (scrollSyncLock.current) return
    scrollSyncLock.current = true
    const left = e.currentTarget.scrollLeft
    const head = headerScrollRef.current
    if (head && head.scrollLeft !== left) head.scrollLeft = left
    scrollSyncLock.current = false
  }, [])

  const toggleExpand = (screenId: string) => {
    setExpandedScreens((prev) => {
      const next = new Set(prev)
      if (next.has(screenId)) next.delete(screenId)
      else next.add(screenId)
      return next
    })
  }

  const onKeyActivate =
    (handler: () => void) => (e: KeyboardEvent<HTMLElement>) => {
      if (disabled) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handler()
      }
    }

  if (rolesSorted.length === 0 || screensSorted.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
        No roles/screens found.
      </div>
    )
  }

  const gridTemplateColumns = `minmax(340px, 1fr) repeat(${rolesSorted.length}, minmax(160px, 220px))`

  return (
    <div className="flex max-h-[calc(100dvh-18rem)] min-h-[24rem] flex-col overflow-hidden rounded-lg border border-border bg-background">
      {/* Header stays fixed; body scrolls vertically below */}
      <div className="z-30 shrink-0 border-b border-border bg-background shadow-sm">
        {toolbar != null && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border/80 px-3 py-3 sm:px-4">
            {toolbar}
          </div>
        )}
        <div
          ref={headerScrollRef}
          className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onScroll={onHeaderScroll}
        >
          <div className="grid bg-muted/40" style={{ gridTemplateColumns }}>
            <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Screen Permissions
            </div>
            {rolesSorted.map((r) => (
              <div
                key={r.id}
                className="border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
                title={r.description}
              >
                {r.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {notice != null && <div className="shrink-0 bg-background px-3 pb-3 pt-0 sm:px-4">{notice}</div>}

      <div
        ref={bodyScrollRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        onScroll={onBodyScroll}
      >
        <div className="grid bg-background" style={{ gridTemplateColumns }}>
          {/* Body */}
          {screensSorted.map((screen) => {
            const isExpanded = expandedScreens.has(screen.id)
            return (
              <div key={screen.id} className="contents">
                {/* Screen header row (toggle all functions per role) */}
                <div className="sticky left-0 z-10 border-b border-border bg-background px-4 py-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted/40",
                        disabled && "cursor-not-allowed opacity-60 hover:bg-background",
                      )}
                      disabled={disabled}
                      onClick={() => toggleExpand(screen.id)}
                      aria-label={isExpanded ? "Collapse screen" : "Expand screen"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {screen.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{screen.module}</span>
                    </div>
                  </div>
                </div>
                {rolesSorted.map((role) => {
                  const state = screenPermissionState(permissions[role.id], screen)
                  return (
                    <div
                      key={role.id}
                      className={cn(
                        "flex items-center gap-2 border-b border-border px-4 py-3 text-left hover:bg-muted/40",
                        disabled && "cursor-not-allowed hover:bg-background",
                      )}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      onClick={() => (disabled ? undefined : onToggleScreenForRole(role.id, screen))}
                      onKeyDown={onKeyActivate(() => onToggleScreenForRole(role.id, screen))}
                      title={
                        state === "all"
                          ? "All functions granted (click to clear)"
                          : state === "none"
                            ? "No functions granted (click to grant all)"
                            : "Partial functions granted (click to grant all)"
                      }
                    >
                      <Checkbox
                        checked={
                          state === "all" ? true : state === "some" ? "indeterminate" : false
                        }
                        aria-label={`${role.name} - ${screen.name} (all functions)`}
                        disabled={disabled}
                      />
                      <span className="text-xs text-muted-foreground">
                        {state === "all" ? "All" : state === "none" ? "None" : "Some"}
                      </span>
                    </div>
                  )
                })}

                {/* Function rows */}
                {isExpanded &&
                  screen.functions.map((fn) => (
                    <div key={fn.id} className="contents">
                      <div className="sticky left-0 z-10 border-b border-border bg-background px-4 py-2 pl-12">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {fn.label}
                          </span>
                        </div>
                      </div>
                      {rolesSorted.map((role) => {
                        const granted = (permissions[role.id]?.[screen.id] ?? []).includes(fn.id)
                        return (
                          <div
                            key={role.id}
                            className={cn(
                              "flex items-center gap-2 border-b border-border px-4 py-2 text-left hover:bg-muted/40",
                              disabled && "cursor-not-allowed hover:bg-background",
                            )}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            onClick={() =>
                              disabled
                                ? undefined
                                : onToggleFunctionForRole(role.id, screen.id, fn.id)
                            }
                            onKeyDown={onKeyActivate(() =>
                              onToggleFunctionForRole(role.id, screen.id, fn.id),
                            )}
                            title={granted ? "Granted (click to revoke)" : "Not granted (click to grant)"}
                          >
                            <Checkbox
                              checked={granted}
                              aria-label={`${role.name} - ${screen.name} - ${fn.label}`}
                              disabled={disabled}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


