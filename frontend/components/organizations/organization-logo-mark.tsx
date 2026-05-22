"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { resolveOrganizationLogoSrc } from "@/lib/organizations/organization-logo"
import { getOrgColor, getOrgInitials } from "./org-utils"

type OrganizationLogoMarkSize = "sm" | "md" | "chart"

const sizeStyles: Record<
  OrganizationLogoMarkSize,
  { avatar: string; fallback: string }
> = {
  sm: { avatar: "h-8 w-8 rounded-md", fallback: "rounded-md text-xs font-semibold" },
  md: { avatar: "h-10 w-10 rounded-lg", fallback: "rounded-lg text-sm font-semibold" },
  chart: { avatar: "h-10 w-10", fallback: "text-sm font-semibold" },
}

interface OrganizationLogoMarkProps {
  orgName: string
  logoUrl?: string | null
  size?: OrganizationLogoMarkSize
  className?: string
}

/** Read-only org logo/initials avatar for lists and chart nodes. */
export function OrganizationLogoMark({
  orgName,
  logoUrl,
  size = "md",
  className,
}: OrganizationLogoMarkProps) {
  const src = resolveOrganizationLogoSrc(logoUrl)
  const styles = sizeStyles[size]

  return (
    <Avatar className={cn(styles.avatar, className)}>
      {src && <AvatarImage src={src} alt={orgName} className="object-cover" />}
      <AvatarFallback className={cn(styles.fallback, getOrgColor(orgName))}>
        {getOrgInitials(orgName)}
      </AvatarFallback>
    </Avatar>
  )
}
