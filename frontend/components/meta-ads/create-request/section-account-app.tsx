"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, XCircle, AlertCircle, Building2, AlertTriangle, ShieldAlert, ShieldOff, ShieldCheck } from "lucide-react"
import type { RequestFormState } from "./create-request-content"

const adAccounts = [
  { id: "act_111222333", name: "MediationPro Main", currency: "USD", timezone: "America/New_York", active: true },
  { id: "act_444555666", name: "MediationPro APAC", currency: "SGD", timezone: "Asia/Singapore", active: true },
  { id: "act_777888999", name: "MediationPro EU", currency: "EUR", timezone: "Europe/Berlin", active: false },
]

// Simulated app → meta mapping data
const apps = [
  { id: "app_001", name: "Weather Now: Radar & Forecast", platform: "ANDROID", bundle: "com.weather.radar", metaAppId: "987654321098765", storeUrl: "https://play.google.com/store/apps/details?id=com.weather.radar" },
  { id: "app_002", name: "Word Master Pro", platform: "IOS", bundle: "com.wordmaster.pro", metaAppId: "123456789012345", storeUrl: "https://apps.apple.com/app/word-master-pro/id123456789" },
  { id: "app_003", name: "Speed Racer 3D", platform: "ANDROID", bundle: "com.speedracer.3d", metaAppId: "", storeUrl: "" },
  { id: "app_004", name: "Bubble Pop Mania", platform: "IOS", bundle: "com.bubblepop.mania", metaAppId: "555666777888999", storeUrl: "https://apps.apple.com/app/bubble-pop/id555666777" },
]

const objectives = [
  { value: "APP_PROMOTION", label: "App Promotion" },
  { value: "TRAFFIC", label: "Traffic" },
  { value: "AWARENESS", label: "Awareness" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "LEADS", label: "Leads" },
  { value: "SALES", label: "Sales" },
]

type TokenState = "none" | "ready" | "expired" | "missing_permissions" | "disabled"

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
  tokenState: TokenState
}

function StatusRow({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  )
  return ok ? (
    <div className="flex items-center gap-2 text-xs text-green-700">
      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
      <span>{label}</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-xs text-red-600">
      <XCircle className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  )
}

function TokenStatusBadge({ state }: { state: TokenState }) {
  if (state === "none") return null
  const configs = {
    ready: { icon: ShieldCheck, label: "Token Ready", cls: "bg-green-50 border-green-200 text-green-800" },
    expired: { icon: ShieldAlert, label: "Token Expired", cls: "bg-red-50 border-red-200 text-red-800" },
    missing_permissions: { icon: ShieldAlert, label: "Missing Permissions", cls: "bg-red-50 border-red-200 text-red-800" },
    disabled: { icon: ShieldOff, label: "Integration Disabled", cls: "bg-slate-100 border-slate-200 text-slate-600" },
  }
  const { icon: Icon, label, cls } = configs[state]
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  )
}

export function AccountAppSection({ form, onChange, tokenState }: Props) {
  const selectedApp = apps.find(a => a.id === form.appId)
  const hasMappingIssue = selectedApp && (!selectedApp.metaAppId || !selectedApp.storeUrl)
  const isTokenBlocking = tokenState === "expired" || tokenState === "missing_permissions" || tokenState === "disabled"

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          Account &amp; App Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ad Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Meta Ad Account <span className="text-red-500">*</span></Label>
          <Select value={form.adAccountId} onValueChange={v => onChange({ adAccountId: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select ad account..." />
            </SelectTrigger>
            <SelectContent>
              {adAccounts.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center gap-3 py-0.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{a.id}</span>
                        <Badge className={a.active ? "bg-green-100 text-green-700 text-[10px] px-1.5 py-0" : "bg-red-100 text-red-600 text-[10px] px-1.5 py-0"}>
                          {a.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">{a.name} · {a.currency} · {a.timezone}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Integration Token Status */}
        {form.adAccountId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Integration Status</span>
              <TokenStatusBadge state={tokenState} />
            </div>
            {isTokenBlocking && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  {tokenState === "expired" && "The access token for this account has expired. Re-authenticate to continue."}
                  {tokenState === "missing_permissions" && "This integration is missing required permissions (ads_management, ads_read). Update the token."}
                  {tokenState === "disabled" && "This integration is disabled. Enable it in Meta Ads → Integrations before proceeding."}
                  {" "}
                  <strong>Submit for Approval is blocked until resolved.</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* App */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">App <span className="text-red-500">*</span></Label>
          <Select value={form.appId} onValueChange={v => onChange({ appId: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select app..." />
            </SelectTrigger>
            <SelectContent>
              {apps.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center gap-2 py-0.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${a.platform === "IOS" ? "border-blue-200 text-blue-700" : "border-green-200 text-green-700"}`}>
                      {a.platform}
                    </Badge>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{a.name}</span>
                        {(!a.metaAppId || !a.storeUrl) && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Missing Mapping</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{a.bundle}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Promoted Object Summary Card */}
        {selectedApp && (
          <div className={`rounded-lg border p-3 space-y-2 ${hasMappingIssue ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Promoted Object</p>
              {hasMappingIssue ? (
                <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Missing Meta App Mapping
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Valid
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-500">Application ID</span>
              <span className={`font-mono ${selectedApp.metaAppId ? "text-slate-900" : "text-amber-700 italic"}`}>
                {selectedApp.metaAppId || "Not configured"}
              </span>
              <span className="text-slate-500">Platform</span>
              <span className="text-slate-900">{selectedApp.platform}</span>
              <span className="text-slate-500">Store URL</span>
              <span className={`truncate ${selectedApp.storeUrl ? "text-slate-900" : "text-amber-700 italic"}`}>
                {selectedApp.storeUrl || "Not configured"}
              </span>
            </div>
            {hasMappingIssue && (
              <p className="text-[11px] text-amber-800">
                App campaigns require a valid <code className="bg-amber-100 px-1 rounded">promoted_object</code> with application_id + store URL. Configure the mapping in <strong>Meta Ads → App Mappings</strong>.
              </p>
            )}
          </div>
        )}

        {/* Status mini-grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">App Mapping</p>
            <StatusRow ok={form.appId ? (selectedApp?.metaAppId ? true : false) : null} label={!form.appId ? "Select an app" : selectedApp?.metaAppId ? "Meta App ID set" : "Meta App ID missing"} />
            <StatusRow ok={form.appId ? (selectedApp?.storeUrl ? true : false) : null} label={!form.appId ? "Store URL" : selectedApp?.storeUrl ? "Store URL set" : "Store URL missing"} />
          </div>
          <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Integration</p>
            <StatusRow ok={form.adAccountId ? (tokenState === "ready") : null} label={!form.adAccountId ? "Select an account" : tokenState === "ready" ? "Integration enabled" : "Integration issue"} />
            <StatusRow ok={form.adAccountId ? (tokenState === "ready") : null} label={!form.adAccountId ? "Token status" : tokenState === "ready" ? "Token ready" : tokenState === "expired" ? "Token expired" : tokenState === "missing_permissions" ? "Missing permissions" : "Integration disabled"} />
          </div>
        </div>

        {/* Business Objective */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Business Objective</Label>
          <div className="flex flex-wrap gap-2">
            {objectives.map(obj => (
              <button
                key={obj.value}
                type="button"
                onClick={() => onChange({ objective: form.objective === obj.value ? "" : obj.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.objective === obj.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {obj.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
