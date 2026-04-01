"use client"

import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react"
import { clearAuthSessionData, getAccessToken, refreshAuthSession } from "@/lib/auth"
import { getMetaAdsApiBaseUrl } from "@/lib/meta-ads/media-preview"

type ProtectedMediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: ReactNode
  requiresAuth?: boolean
}

async function fetchProtectedMedia(sourceUrl: string, signal: AbortSignal): Promise<Blob> {
  const executeFetch = async (token: string | null) => {
    const headers = new Headers()
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(sourceUrl, { headers, signal })
  }

  let response = await executeFetch(getAccessToken())

  if (response.status === 401) {
    const refreshedToken = await refreshAuthSession(getMetaAdsApiBaseUrl())
    if (refreshedToken) {
      response = await executeFetch(refreshedToken)
    }
  }

  if (response.status === 401) {
    clearAuthSessionData()
  }

  if (!response.ok) {
    throw new Error(`Failed to load media preview (${response.status})`)
  }

  return response.blob()
}

function useProtectedMediaPreview(sourceUrl?: string, requiresAuth?: boolean): string {
  const [resolvedUrl, setResolvedUrl] = useState("")

  useEffect(() => {
    if (!sourceUrl) {
      setResolvedUrl("")
      return
    }

    if (!requiresAuth) {
      setResolvedUrl(sourceUrl)
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null
    let active = true

    setResolvedUrl("")

    void fetchProtectedMedia(sourceUrl, controller.signal)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setResolvedUrl(objectUrl)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error("Unable to load protected media preview.", error)
        if (active) setResolvedUrl("")
      })

    return () => {
      active = false
      controller.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [requiresAuth, sourceUrl])

  return resolvedUrl
}

export function ProtectedMediaImage({ fallback = null, requiresAuth = false, src, ...props }: ProtectedMediaImageProps) {
  const sourceUrl = typeof src === "string" ? src : ""
  const resolvedUrl = useProtectedMediaPreview(sourceUrl, requiresAuth)

  if (!resolvedUrl) return <>{fallback}</>

  return <img {...props} src={resolvedUrl} />
}

