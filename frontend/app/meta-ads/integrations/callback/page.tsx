"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { invalidateCache, invalidateCachePrefix } from "@/hooks/use-api"
import { metaIntegrationsApi } from "@/lib/api/meta-ads"
import { Loader2 } from "lucide-react"

function buildRedirectUrl(status: "success" | "error", message?: string) {
  const params = new URLSearchParams({ tab: "meta-integrations", oauth: status })
  if (message) {
    params.set("message", message)
  }
  return `/data-accounts?${params.toString()}`
}

function base64UrlDecode(str: string) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

function parseIntegrationIdFromState(state: string | null): number | null {
  if (!state) return null
  try {
    const parts = state.split('.')
    const payloadBase64 = parts[0]
    const json = base64UrlDecode(payloadBase64)
    const payload = JSON.parse(json)
    return Number(payload.IntegrationId ?? payload.integrationId)
  } catch (e) {
    // Fallback format meta:integrationId:guid
    if (state.startsWith("meta:")) {
      const parts = state.split(":")
      if (parts.length >= 2) {
        const id = Number(parts[1])
        if (Number.isFinite(id)) return id
      }
    }
    return null
  }
}

export default function MetaIntegrationOAuthCallbackStablePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const oauthError = searchParams.get("error")
    const oauthErrorDescription = searchParams.get("error_description")

    const integrationId = parseIntegrationIdFromState(state)
    const redirectUri = `${window.location.origin}/meta-ads/integrations/callback`

    if (!integrationId || !Number.isFinite(integrationId)) {
      router.replace(buildRedirectUrl("error", "Invalid or missing integration ID in OAuth callback state."))
      return
    }

    if (oauthError) {
      router.replace(buildRedirectUrl("error", oauthErrorDescription ?? oauthError))
      return
    }

    if (!code) {
      router.replace(buildRedirectUrl("error", "Authorization code was not returned by Meta."))
      return
    }

    void (async () => {
      try {
        await metaIntegrationsApi.exchangeCode(integrationId, code, redirectUri, state || "")
        invalidateCachePrefix("meta-integrations:list")
        invalidateCache("meta-ad-accounts:list")
        router.replace(buildRedirectUrl("success", "Meta USER_TOKEN exchange completed successfully."))
      } catch (apiError) {
        const message = apiError instanceof Error ? apiError.message : "Meta USER_TOKEN OAuth callback failed."
        router.replace(buildRedirectUrl("error", message))
      }
    })()
  }, [router, searchParams])

  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-accounts" functionKey="edit">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Completing Meta USER_TOKEN OAuth flow...
          </div>
        </div>
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
