"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { tiktokAccountsApi, tiktokAuthApi } from "@/lib/api/tiktok-ads"
import type {
  CreateTikTokIntegrationRequestDto,
  TikTokIntegrationDto,
  TikTokIntegrationTestResultDto,
  UpdateTikTokIntegrationRequestDto,
} from "@/types/tiktok-ads"

const SCREEN_TIKTOK_ACCOUNTS = "s-tiktok-accounts"
const REQUIRED_SCOPES = ["3", "4", "7"] as const
const SCOPE_HINT = REQUIRED_SCOPES.join(", ")
const SCOPE_DESCRIPTIONS = [
  {
    id: "3",
    name: "Campaign Management",
    description: "Read campaign, ad group, and ad structure.",
  },
  {
    id: "4",
    name: "Ad Account Management",
    description: "Read advertiser list and ad account metadata.",
  },
  {
    id: "7",
    name: "Reporting",
    description: "Read TikTok Ads performance reports.",
  },
  {
    id: "19",
    name: "Business Center",
    description: "Optional for BC assets, balances, and transactions.",
  },
] as const

const emptyForm: CreateTikTokIntegrationRequestDto = {
  displayName: "",
  tikTokAppId: "",
  appSecret: "",
  accessToken: "",
  scopes: [...REQUIRED_SCOPES],
  isSandbox: false,
  isDefault: false,
  isEnabled: true,
}

interface TikTokIntegrationsContentProps {
  embedded?: boolean
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function scopesToString(scopes?: string[] | null) {
  return (scopes ?? []).join(", ")
}

function listToString(values?: string[] | null) {
  if (!values || values.length === 0) return "-"
  return values.join(", ")
}

function formatTokenStatus(value?: string | null) {
  return (value?.toUpperCase() ?? "NOT_TESTED").replaceAll("_", " ")
}

function getTokenStatusMessageClass(value?: string | null) {
  switch (value?.toUpperCase() ?? "NOT_TESTED") {
    case "VALID":
      return "text-green-700"
    case "NOT_TESTED":
      return "text-amber-700"
    case "REVOKED":
    case "MISSING_SCOPES":
    case "INVALID":
      return "text-red-700"
    default:
      return "text-slate-700"
  }
}

function getConnectionTestToast(result: TikTokIntegrationTestResultDto): {
  title: string
  description: string
  variant: "default" | "destructive"
} {
  return {
    title: result.success ? "Connection valid" : "Connection failed",
    description: result.message || formatTokenStatus(result.tokenStatus),
    variant: result.success ? "default" : "destructive",
  }
}

function deriveTokenBadge(integration: TikTokIntegrationDto) {
  if (!integration.isEnabled) {
    return { label: "Disabled", className: "bg-slate-100 text-slate-600", icon: <Power className="w-3 h-3" /> }
  }

  switch (integration.tokenStatus) {
    case "VALID":
      return { label: "Valid", className: "bg-green-100 text-green-700", icon: <ShieldCheck className="w-3 h-3" /> }
    case "REVOKED":
      return { label: "Revoked", className: "bg-red-100 text-red-700", icon: <ShieldX className="w-3 h-3" /> }
    case "MISSING_SCOPES":
      return { label: "Missing Scopes", className: "bg-red-100 text-red-700", icon: <ShieldX className="w-3 h-3" /> }
    case "INVALID":
      return { label: "Invalid", className: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> }
    default:
      return { label: "Not Tested", className: "bg-amber-100 text-amber-700", icon: <ShieldAlert className="w-3 h-3" /> }
  }
}

function MaskedInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string | null
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-700">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className="h-9 pr-9 font-mono text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => setShow((current) => !current)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint ? <p className="text-[11px] text-slate-400">Current hint: {hint}</p> : null}
    </div>
  )
}

export function TikTokIntegrationsContent({ embedded = false }: TikTokIntegrationsContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const canCreate = hasScreenFunction(SCREEN_TIKTOK_ACCOUNTS, "create")
  const canEdit = hasScreenFunction(SCREEN_TIKTOK_ACCOUNTS, "edit")
  const canDisableEnable = hasScreenFunction(SCREEN_TIKTOK_ACCOUNTS, "disable-enable")

  const { data: integrations, loading, error, refetch } = useApi(
    () => tiktokAccountsApi.getIntegrations(),
    { cacheKey: "tiktok-integrations:list" }
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TikTokIntegrationDto | null>(null)
  const [form, setForm] = useState<CreateTikTokIntegrationRequestDto>(emptyForm)
  const [scopeInput, setScopeInput] = useState(scopesToString(emptyForm.scopes))
  const [submitting, setSubmitting] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<TikTokIntegrationTestResultDto | null>(null)
  const [connectionStateDirty, setConnectionStateDirty] = useState(true)
  const [oauthLoadingId, setOauthLoadingId] = useState<number | null>(null)
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(null)
  const oauthNoticeRef = useRef<string | null>(null)

  useEffect(() => {
    const oauthStatus = searchParams.get("oauth")
    if (!oauthStatus) return

    const marker = searchParams.toString()
    if (oauthNoticeRef.current === marker) return
    oauthNoticeRef.current = marker

    const message = searchParams.get("message")
    if (oauthStatus === "success") {
      toast({ title: "TikTok OAuth completed", description: message ?? "TikTok token exchange completed successfully." })
    } else {
      toast({
        title: "TikTok OAuth failed",
        description: message ?? "TikTok token flow did not complete.",
        variant: "destructive",
      })
    }

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("oauth")
    nextParams.delete("message")
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [pathname, router, searchParams, toast])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setScopeInput(scopesToString(emptyForm.scopes))
    setTestResult(null)
    setConnectionStateDirty(true)
    setDrawerOpen(true)
  }

  const openEdit = (integration: TikTokIntegrationDto) => {
    setEditTarget(integration)
    setForm({
      displayName: integration.displayName,
      tikTokAppId: integration.tikTokAppId,
      appSecret: "",
      accessToken: "",
      scopes: integration.scopes.length > 0 ? integration.scopes : [...REQUIRED_SCOPES],
      isSandbox: false,
      isDefault: integration.isDefault,
      isEnabled: integration.isEnabled,
    })
    setScopeInput(scopesToString(integration.scopes.length > 0 ? integration.scopes : [...REQUIRED_SCOPES]))
    setTestResult(null)
    setConnectionStateDirty(false)
    setDrawerOpen(true)
  }

  const redirectToOAuth = async (integration: TikTokIntegrationDto) => {
    try {
      setOauthLoadingId(integration.id)
      const redirectUri = `${window.location.origin}/tiktok-ads/integrations/callback`
      const response = await tiktokAuthApi.getAuthorizeUrl(integration.id, redirectUri, String(integration.id))
      window.location.href = response.authorizationUrl
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to start TikTok OAuth."
      toast({ title: "OAuth failed", description: message, variant: "destructive" })
    } finally {
      setOauthLoadingId(null)
    }
  }

  const updateConnectionForm = (patch: Partial<CreateTikTokIntegrationRequestDto>) => {
    setForm((current) => ({ ...current, ...patch }))
    setTestResult(null)
    setConnectionStateDirty(true)
  }

  const validateForm = () => {
    const errors: string[] = []
    if (!form.displayName.trim()) errors.push("Display Name is required.")
    if (!form.tikTokAppId.trim()) errors.push("TikTok Developer App ID is required.")
    if (!form.appSecret?.trim() && !editTarget?.hasAppSecret) errors.push("App Secret is required.")
    return errors
  }

  const buildTestRequest = () => ({
    integrationId: editTarget?.id ?? null,
    tikTokAppId: form.tikTokAppId || null,
    appSecret: form.appSecret || null,
    accessToken: form.accessToken || null,
    scopes: form.scopes ?? [],
    isSandbox: false,
  })

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true)
      const result = await tiktokAuthApi.testDraft(buildTestRequest())
      setTestResult(result)
      setConnectionStateDirty(false)
      if (result.scopes.length > 0) {
        setScopeInput(scopesToString(result.scopes))
      }
      setForm((current) => ({
        ...current,
        scopes: result.scopes.length > 0 ? result.scopes : current.scopes,
      }))
      toast(getConnectionTestToast(result))
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to test the TikTok integration."
      toast({ title: "Test failed", description: message, variant: "destructive" })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const validationErrors = validateForm()
      if (validationErrors.length > 0) {
        toast({ title: "Validation failed", description: validationErrors[0], variant: "destructive" })
        return
      }

      const requestPayload = {
        ...form,
        appSecret: form.appSecret || null,
        accessToken: form.accessToken || null,
        scopes: form.scopes ?? [],
        isSandbox: false,
      }

      if (editTarget) {
        await tiktokAccountsApi.updateIntegration(editTarget.id, requestPayload as UpdateTikTokIntegrationRequestDto)
      } else {
        await tiktokAccountsApi.createIntegration(requestPayload)
      }

      invalidateCache("tiktok-integrations:list")
      await refetch()
      setDrawerOpen(false)
      toast({ title: editTarget ? "Integration updated" : "Integration created" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to save integration."
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEnabled = async (integration: TikTokIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id)
      if (integration.isEnabled) {
        await tiktokAccountsApi.disableIntegration(integration.id)
      } else {
        await tiktokAccountsApi.enableIntegration(integration.id)
      }

      invalidateCache("tiktok-integrations:list")
      await refetch()
      toast({ title: integration.isEnabled ? "Integration disabled" : "Integration enabled" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to update integration."
      toast({ title: "Update failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleTestSavedConnection = async (integration: TikTokIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id)
      const result = await tiktokAuthApi.testSaved(integration.id)
      invalidateCache("tiktok-integrations:list")
      await refetch()
      toast(getConnectionTestToast(result))
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to test the integration."
      toast({ title: "Test failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleSyncAdAccounts = async (integration: TikTokIntegrationDto) => {
    try {
      setRowActionLoadingId(integration.id)
      await tiktokAccountsApi.syncAdAccounts(integration.id)
      invalidateCache("tiktok-integrations:list")
      invalidateCache("tiktok-ad-accounts:list")
      await refetch()
      toast({ title: "Ad accounts synced" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to sync ad accounts."
      toast({ title: "Sync failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const displayedTokenStatus = testResult?.tokenStatus ?? (connectionStateDirty ? "NOT_TESTED" : editTarget?.tokenStatus ?? "NOT_TESTED")
  const displayedLastCheckedAt = testResult?.checkedAt ?? (connectionStateDirty ? null : editTarget?.lastCheckedAt ?? null)
  const displayedMessage =
    testResult?.message ??
    (connectionStateDirty ? (editTarget ? "Connection test needs to be rerun after recent credential or permission changes." : null) : editTarget?.lastCheckMessage ?? null)
  const displayedScopes = testResult?.scopes.length ? testResult.scopes : form.scopes ?? []
  const displayedAdvertisers = testResult?.authorizedAdvertiserIds.length ? testResult.authorizedAdvertiserIds : editTarget?.authorizedAdvertiserIds ?? []
  const displayedAdvertiserCount = displayedAdvertisers.length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          {!embedded ? (
            <nav className="mb-1.5 flex items-center gap-1 text-xs text-slate-500">
              <span>TikTok Ads</span>
              <span>/</span>
              <span className="font-medium text-slate-900">Integrations</span>
            </nav>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-50 p-2">
              <Link2 className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TikTok Integrations</h1>
              <p className="text-sm text-slate-500">Manage TikTok Marketing API credentials, OAuth tokens, and advertiser sync.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Button className="bg-blue-600 text-white hover:bg-blue-700" size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Integration
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-medium text-slate-500">Name</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">TikTok Developer App ID</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Secret</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Token</TableHead>
              <TableHead className="w-36 text-xs font-medium text-slate-500">Token Status</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Advertisers</TableHead>
              <TableHead className="text-xs font-medium text-slate-500">Scopes</TableHead>
              <TableHead className="w-20 text-xs font-medium text-slate-500">Default</TableHead>
              <TableHead className="w-20 text-xs font-medium text-slate-500">Enabled</TableHead>
              <TableHead className="w-32 text-xs font-medium text-slate-500">Last Checked</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading integrations...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-red-600">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : (integrations ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-slate-400">
                  No integrations configured yet.
                </TableCell>
              </TableRow>
            ) : (
              (integrations ?? []).map((integration) => {
                const badge = deriveTokenBadge(integration)
                const isBusy = rowActionLoadingId === integration.id

                return (
                  <TableRow key={integration.id} className="text-sm">
                    <TableCell className="font-medium text-slate-900">{integration.displayName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{integration.tikTokAppId}</TableCell>
                    <TableCell className="text-xs text-slate-500">{integration.hasAppSecret ? integration.appSecretHint ?? "Saved" : "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{integration.hasAccessToken ? integration.accessTokenHint ?? "Saved" : "-"}</TableCell>
                    <TableCell>
                      <Badge className={`flex w-fit items-center gap-1 text-[11px] ${badge.className}`}>
                        {badge.icon}
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{integration.authorizedAdvertiserIds.length.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {integration.scopes.length > 0 ? scopesToString(integration.scopes.slice(0, 3)) : "-"}
                      {integration.scopes.length > 3 ? ` +${integration.scopes.length - 3}` : ""}
                    </TableCell>
                    <TableCell>{integration.isDefault ? <Badge className="bg-blue-100 text-[11px] text-blue-700">Default</Badge> : null}</TableCell>
                    <TableCell>
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={() => canDisableEnable && void toggleEnabled(integration)}
                        disabled={!canDisableEnable || isBusy}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(integration.lastCheckedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => openEdit(integration)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canDisableEnable ? (
                            <DropdownMenuItem onClick={() => void toggleEnabled(integration)}>
                              <Power className="mr-2 h-4 w-4" />
                              {integration.isEnabled ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                          ) : null}
                          {canEdit || canDisableEnable ? <DropdownMenuSeparator /> : null}
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => void handleTestSavedConnection(integration)}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Test Connection
                            </DropdownMenuItem>
                          ) : null}
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => void handleSyncAdAccounts(integration)}>
                              <Download className="mr-2 h-4 w-4" />
                              Sync Ad Accounts
                            </DropdownMenuItem>
                          ) : null}
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => void redirectToOAuth(integration)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open OAuth
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:w-[min(1120px,calc(100vw-3rem))] sm:!max-w-[1120px]">
          <DialogHeader className="flex-shrink-0 border-b border-slate-100 px-6 pb-4 pt-6">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {editTarget ? "Edit Integration" : "Create Integration"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="rounded-lg border border-pink-200 bg-pink-50 px-3 py-2.5 text-sm text-pink-800">
              This integration is used by backend services to call TikTok Marketing API for OAuth, advertiser sync, reports, and campaign requests.
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_400px] xl:grid-cols-[minmax(0,1.25fr)_430px]">
              <div className="space-y-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Integration Setup</h3>
                  <p className="mt-1 text-[11px] text-slate-500">Configure the TikTok app credentials used for OAuth token exchange.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    Display Name <span className="text-red-500">*</span>
                  </Label>
                  <Input className="h-9 text-sm" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">
                    TikTok Developer App ID <span className="text-red-500">*</span>
                  </Label>
                  <Input className="h-9 font-mono text-sm" value={form.tikTokAppId} onChange={(event) => updateConnectionForm({ tikTokAppId: event.target.value })} />
                  <p className="text-[11px] text-slate-400">Developer App ID from TikTok Business Developer settings.</p>
                </div>
                <div className="space-y-1.5">
                  <MaskedInput
                    label="App Secret"
                    value={form.appSecret ?? ""}
                    onChange={(value) => updateConnectionForm({ appSecret: value })}
                    placeholder="Leave blank to keep current value"
                    hint={editTarget?.appSecretHint ?? null}
                  />
                  <p className="text-[11px] text-slate-400">Secret from TikTok Business Developer settings.</p>
                </div>
              </div>

              <div className="h-fit space-y-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Access &amp; Permissions</h3>
                  <p className="mt-1 text-[11px] text-slate-500">Use OAuth for new tokens or paste an existing token for local validation.</p>
                </div>
                <MaskedInput
                  label="Access Token"
                  value={form.accessToken ?? ""}
                  onChange={(value) => updateConnectionForm({ accessToken: value })}
                  placeholder="Leave blank to keep current value"
                  hint={editTarget?.accessTokenHint ?? null}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Scopes (comma-separated)</Label>
                  <Input
                    className="h-9 text-sm"
                    value={scopeInput}
                    onChange={(event) => {
                      const value = event.target.value
                      setScopeInput(value)
                      updateConnectionForm({
                        scopes: value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }}
                    placeholder={SCOPE_HINT}
                  />
                  <p className="text-[11px] text-slate-400">Required scopes: {SCOPE_HINT}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                  <p className="mb-2 text-xs font-medium text-slate-700">Scope meanings</p>
                  <div className="space-y-2">
                    {SCOPE_DESCRIPTIONS.map((scope) => {
                      const isSelected = (form.scopes ?? []).includes(scope.id)
                      return (
                        <div key={scope.id} className="flex items-start gap-2 text-xs">
                          <Badge className={isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}>
                            {scope.id}
                          </Badge>
                          <div>
                            <p className="font-medium text-slate-800">{scope.name}</p>
                            <p className="text-slate-500">{scope.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="grid gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-xs md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-slate-500">Token Status</p>
                    <p className="font-medium text-slate-900">{formatTokenStatus(displayedTokenStatus)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-slate-500">Last Checked At</p>
                    <p className="font-medium text-slate-900">{formatDateTime(displayedLastCheckedAt)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-1 text-slate-500">Resolved Scopes</p>
                    <p className="break-all font-mono text-slate-700">{displayedScopes.length > 0 ? scopesToString(displayedScopes) : "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="mb-1 text-slate-500">Authorized Advertisers</p>
                    <p className="font-medium text-slate-900">{displayedAdvertiserCount.toLocaleString()}</p>
                  </div>
                  {displayedMessage ? (
                    <div className="md:col-span-2">
                      <p className="mb-1 text-slate-500">Last Check Message</p>
                      <p className={`text-sm ${getTokenStatusMessageClass(displayedTokenStatus)}`}>{displayedMessage}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Switch checked={form.isDefault} onCheckedChange={(value) => setForm((current) => ({ ...current, isDefault: value }))} />
                  Set as Default
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Switch checked={form.isEnabled} onCheckedChange={(value) => setForm((current) => ({ ...current, isEnabled: value }))} />
                  Enabled
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void handleTestConnection()} disabled={submitting || testingConnection || !canEdit}>
                {testingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Test Connection
              </Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => void handleSubmit()} disabled={submitting || !form.displayName.trim()}>
                {submitting ? "Saving..." : editTarget ? "Save Changes" : "Create Integration"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
