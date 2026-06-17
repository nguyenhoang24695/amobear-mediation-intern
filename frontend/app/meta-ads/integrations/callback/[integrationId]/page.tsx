"use client"

import { useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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

export default function MetaIntegrationOAuthCallbackPage() {
  const router = useRouter()
  const params = useParams<{ integrationId: string }>()
  const searchParams = useSearchParams()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const integrationId = Number(params.integrationId)
    const code = searchParams.get("code")
    const oauthError = searchParams.get("error")
    const oauthErrorDescription = searchParams.get("error_description")
    const redirectUri = `${window.location.origin}/meta-ads/integrations/callback/${params.integrationId}`

    if (!Number.isFinite(integrationId)) {
      router.replace(buildRedirectUrl("error", "Invalid integration ID in OAuth callback."))
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

    const state = searchParams.get("state")

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
  }, [params.integrationId, router, searchParams])

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
