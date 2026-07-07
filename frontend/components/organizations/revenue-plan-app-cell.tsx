"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ImageIcon } from "lucide-react"

export interface RevenuePlanAppCellProps {
  appLabel: string
  appStoreId?: string | null
  admobAppId?: string | null
  appPlatform?: string | null
  appIconUri?: string | null
}

function renderPlatformIcon(platformValue?: string | null, className?: string) {
  const isAndroid = (platformValue ?? "").toUpperCase() === "ANDROID"
  if (isAndroid) {
    return (
      <svg className={cn("h-3 w-3", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    )
  }

  return (
    <svg className={cn("h-3 w-3", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
    </svg>
  )
}

function formatPlatformLabel(platformValue?: string | null): string {
  const normalized = (platformValue ?? "").trim().toUpperCase()
  if (normalized === "ANDROID") return "Android"
  if (normalized === "IOS") return "iOS"
  if (!platformValue?.trim()) return "Unknown"
  return platformValue.trim()
}

function renderPlatformBadge(platformValue?: string | null) {
  const platform = platformValue?.trim() || "Unknown"
  const isAndroid = platform.toUpperCase() === "ANDROID"
  const label = formatPlatformLabel(platformValue)

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 shrink-0 gap-1 px-1.5 text-[10px] font-medium whitespace-nowrap",
        isAndroid
          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/70 dark:bg-green-950/50 dark:text-green-300"
          : "border-border bg-muted text-muted-foreground",
      )}
      title={platform}
    >
      {renderPlatformIcon(platform)}
      <span>{label}</span>
    </Badge>
  )
}

export function RevenuePlanAppCell({
  appLabel,
  appStoreId,
  admobAppId,
  appPlatform,
  appIconUri,
}: RevenuePlanAppCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0 rounded-md">
        {appIconUri ? (
          <AvatarImage src={appIconUri} alt={appLabel} className="rounded-md object-cover" />
        ) : null}
        <AvatarFallback className="rounded-md bg-muted">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-foreground" title={appLabel}>
          {appLabel}
        </div>
        <div
          className="truncate font-mono text-[10px] text-muted-foreground"
          title={appStoreId || admobAppId || undefined}
        >
          {appStoreId || admobAppId || "—"}
        </div>
      </div>
      {renderPlatformBadge(appPlatform)}
    </div>
  )
}
