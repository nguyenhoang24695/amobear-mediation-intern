"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { invalidateCache } from "@/hooks/use-api"
import { tiktokAuthApi } from "@/lib/api/tiktok-ads"

function buildRedirectUrl(status: "success" | "error", message?: string) {
  const params = new URLSearchParams({ tab: "tiktok-integrations", oauth: status })
  if (message) {
    params.set("message", message)
  }
  return `/data-accounts?${params.toString()}`
}

function parseIntegrationId(state: string | null) {
  if (!state) return Number.NaN
  return Number(state) || Number(state.split(":")[1])
}

export default function TikTokOAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const code = searchParams.get("code") || searchParams.get("auth_code")
    const integrationId = parseIntegrationId(searchParams.get("state"))
    const oauthError = searchParams.get("error")
    const oauthErrorDescription = searchParams.get("error_description")
    const redirectUri = `${window.location.origin}/tiktok-ads/integrations/callback`

    if (!Number.isFinite(integrationId)) {
      router.replace(buildRedirectUrl("error", "Invalid integration ID in OAuth callback."))
      return
    }

    if (oauthError) {
      router.replace(buildRedirectUrl("error", oauthErrorDescription ?? oauthError))
      return
    }

    if (!code) {
      router.replace(buildRedirectUrl("error", "Authorization code was not returned by TikTok."))
      return
    }

    void (async () => {
      try {
        await tiktokAuthApi.callback(integrationId, { code, redirectUri })
        invalidateCache("tiktok-integrations:list")
        invalidateCache("tiktok-ad-accounts:list")
        router.replace(buildRedirectUrl("success", "TikTok token exchange completed successfully."))
      } catch (apiError) {
        const message = apiError instanceof Error ? apiError.message : "TikTok OAuth callback failed."
        router.replace(buildRedirectUrl("error", message))
      }
    })()
  }, [router, searchParams])

  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-accounts" functionKey="edit">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Completing TikTok OAuth flow...
          </div>
        </div>
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
