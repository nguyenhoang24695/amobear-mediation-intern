"use client"

import type { LucideIcon } from "lucide-react"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

function avatarInitial(appDisplayName?: string | null, appId?: string | null): string {
  const name = appDisplayName?.trim()
  if (name) return name.slice(0, 1).toUpperCase()
  const id = appId?.trim()
  if (id) return id.slice(0, 1).toUpperCase()
  return "?"
}

/** Chuẩn hóa severity API (HIGH, …) hoặc UI (`critical`, …). */
export function resolveAlertSeverityVisual(severity: string): {
  Icon: LucideIcon
  badgeBg: string
  badgeIconClass: string
} {
  const u = severity.toUpperCase()
  if (u === "CRITICAL" || u === "HIGH" || severity === "critical") {
    return { Icon: AlertTriangle, badgeBg: "bg-red-100", badgeIconClass: "text-red-600" }
  }
  if (u === "MEDIUM" || u === "WARNING" || severity === "warning") {
    return { Icon: AlertCircle, badgeBg: "bg-amber-100", badgeIconClass: "text-amber-600" }
  }
  return { Icon: Info, badgeBg: "bg-blue-100", badgeIconClass: "text-blue-600" }
}

const sizeClasses = {
  sm: { wrap: "h-9 w-9", avatar: "h-9 w-9", badge: "h-[16px] w-[16px]", glyph: "h-2.5 w-2.5" },
  md: { wrap: "h-10 w-10", avatar: "h-10 w-10", badge: "h-[18px] w-[18px]", glyph: "h-2.5 w-2.5" },
} as const

export function AlertAppAvatar({
  appIconUri,
  appDisplayName,
  appId,
  severity,
  size = "md",
  className,
}: {
  appIconUri?: string | null
  appDisplayName?: string | null
  appId?: string | null
  severity: string
  size?: keyof typeof sizeClasses
  className?: string
}) {
  const { Icon, badgeBg, badgeIconClass } = resolveAlertSeverityVisual(severity)
  const s = sizeClasses[size]
  const alt = appDisplayName?.trim() || appId?.trim() || "App"

  return (
    <div className={cn("relative shrink-0", s.wrap, className)}>
      <Avatar className={cn(s.avatar, "rounded-lg border border-slate-200/80 bg-slate-50")}>
        {appIconUri ? (
          <AvatarImage src={appIconUri} alt={alt} className="object-cover" />
        ) : null}
        <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
          {avatarInitial(appDisplayName, appId)}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm",
          s.badge,
          badgeBg
        )}
        aria-hidden
      >
        <Icon className={cn(s.glyph, badgeIconClass)} />
      </span>
    </div>
  )
}
