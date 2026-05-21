"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  organizationLogoCacheKey,
  resolveOrganizationLogoSrc,
} from "@/lib/organizations/organization-logo"
import { getOrgColor, getOrgInitials } from "./org-utils"
import { Loader2, Upload, X } from "lucide-react"

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
const MAX_LOGO_BYTES = 2 * 1024 * 1024

type OrganizationLogoAvatarProps = {
  orgId: string
  orgName: string
  logoUrl?: string | null
  size?: "md" | "lg"
  editable?: boolean
  uploading?: boolean
  onUpload?: (file: File) => void | Promise<void>
  onRemove?: () => void | Promise<void>
  className?: string
}

export function OrganizationLogoAvatar({
  orgId,
  orgName,
  logoUrl,
  size = "lg",
  editable = false,
  uploading = false,
  onUpload,
  onRemove,
  className,
}: OrganizationLogoAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewSrc = resolveOrganizationLogoSrc(logoUrl)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const displaySrc = localPreview ?? previewSrc

  const avatarClass = size === "lg" ? "h-16 w-16 rounded-xl" : "h-12 w-12 rounded-lg"
  const fallbackClass =
    size === "lg" ? "rounded-xl text-lg font-bold" : "rounded-lg text-sm font-bold"

  useEffect(() => {
    setLocalPreview(null)
  }, [organizationLogoCacheKey(orgId, logoUrl)])

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !onUpload) return
    if (file.size > MAX_LOGO_BYTES) return

    const blobUrl = URL.createObjectURL(file)
    setLocalPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return blobUrl
    })

    await onUpload(file)
  }

  const hasLogo = Boolean(previewSrc || localPreview)

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        <Avatar className={avatarClass}>
          {displaySrc && <AvatarImage src={displaySrc} alt={orgName} className="object-cover" />}
          <AvatarFallback className={cn(fallbackClass, getOrgColor(orgName))}>
            {getOrgInitials(orgName)}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </span>
        )}
      </div>

      {editable && (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-transparent gap-1.5"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Avatar
            </Button>
            {hasLogo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-transparent text-red-600 hover:text-red-700 gap-1.5"
                disabled={uploading}
                onClick={() => void onRemove?.()}
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">PNG, JPG, WEBP, GIF or SVG. Max 2 MB.</p>
        </div>
      )}
    </div>
  )
}
