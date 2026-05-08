"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { RefreshCw, ShieldCheck, PlugZap, Play, CheckCircle2, XCircle, Send, Pencil, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  tiktokAccountsApi,
  tiktokAuthApi,
  tiktokCampaignRequestsApi,
  tiktokReferenceApi,
} from "@/lib/api/tiktok-ads"
import type {
  TikTokAdAccountDto,
  TikTokAppMappingDto,
  TikTokCampaignRequestListItemDto,
  TikTokIntegrationDto,
  TikTokReferenceResponseDto,
} from "@/types/tiktok-ads"

function statusTone(value?: string) {
  const normalized = (value || "").toLowerCase()
  if (["valid", "active", "approved", "completed"].includes(normalized)) return "bg-emerald-50 text-emerald-700"
  if (["disabled", "rejected", "failed", "invalid", "revoked"].includes(normalized)) return "bg-rose-50 text-rose-700"
  return "bg-slate-100 text-slate-700"
}

function PageShell({ title, subtitle, children, action }: { title: string; subtitle: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null
  return <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>
}

type IntegrationFormState = {
  displayName: string
  tikTokAppId: string
  appSecret: string
  accessToken: string
  scopes: string
  isDefault: boolean
  isEnabled: boolean
  clearAppSecret: boolean
  clearAccessToken: boolean
}

const emptyIntegrationForm: IntegrationFormState = {
  displayName: "",
  tikTokAppId: "",
  appSecret: "",
  accessToken: "",
  scopes: "3,4,7",
  isDefault: false,
  isEnabled: true,
  clearAppSecret: false,
  clearAccessToken: false,
}

function parseScopes(value: string) {
  return value.split(",").map((x) => x.trim()).filter(Boolean)
}

export function TikTokIntegrationsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokIntegrationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [form, setForm] = useState<IntegrationFormState>(emptyIntegrationForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try { setItems(await tiktokAccountsApi.getIntegrations()) }
    catch (ex: any) { setError(ex.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyIntegrationForm)
  }

  const startEdit = (item: TikTokIntegrationDto) => {
    setEditingId(item.id)
    setForm({
      displayName: item.displayName,
      tikTokAppId: item.tikTokAppId,
      appSecret: "",
      accessToken: "",
      scopes: item.scopes.join(","),
      isDefault: item.isDefault,
      isEnabled: item.isEnabled,
      clearAppSecret: false,
      clearAccessToken: false,
    })
  }

  const save = async () => {
    setSubmitting(true)
    try {
      if (editingId) {
        await tiktokAccountsApi.updateIntegration(editingId, {
          displayName: form.displayName,
          tikTokAppId: form.tikTokAppId,
          appSecret: form.appSecret || undefined,
          accessToken: form.accessToken || undefined,
          clearAppSecret: form.clearAppSecret,
          clearAccessToken: form.clearAccessToken,
          scopes: parseScopes(form.scopes),
          isSandbox: false,
          isDefault: form.isDefault,
          isEnabled: form.isEnabled,
        })
      } else {
        await tiktokAccountsApi.createIntegration({
          displayName: form.displayName,
          tikTokAppId: form.tikTokAppId,
          appSecret: form.appSecret || undefined,
          accessToken: form.accessToken || undefined,
          scopes: parseScopes(form.scopes),
          isSandbox: false,
          isDefault: form.isDefault,
          isEnabled: form.isEnabled,
        })
      }
      resetForm()
      await load()
      toast({ title: editingId ? "TikTok integration updated" : "TikTok integration created" })
    } catch (ex: any) {
      toast({ title: editingId ? "Update failed" : "Create failed", description: ex.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEnabled = async (item: TikTokIntegrationDto) => {
    try {
      if (item.isEnabled) await tiktokAccountsApi.disableIntegration(item.id)
      else await tiktokAccountsApi.enableIntegration(item.id)
      await load()
      toast({ title: item.isEnabled ? "TikTok integration disabled" : "TikTok integration enabled" })
    } catch (ex: any) {
      toast({ title: "Status update failed", description: ex.message, variant: "destructive" })
    }
  }

  const test = async (id: number) => {
    try {
      await tiktokAuthApi.testSaved(id)
      await load()
      toast({ title: "TikTok token test completed" })
    } catch (ex: any) {
      toast({ title: "Token test failed", description: ex.message, variant: "destructive" })
    }
  }

  const sync = async (id: number) => {
    try {
      await tiktokAccountsApi.syncAdAccounts(id)
      await load()
      toast({ title: "TikTok ad accounts synced" })
    } catch (ex: any) {
      toast({ title: "Sync failed", description: ex.message, variant: "destructive" })
    }
  }

  const oauth = async (id: number) => {
    try {
      const redirectUri = `${window.location.origin}/tiktok-ads/integrations/callback`
      const result = await tiktokAuthApi.getAuthorizeUrl(id, redirectUri, String(id))
      window.location.href = result.authorizationUrl
    } catch (ex: any) {
      toast({ title: "OAuth URL failed", description: ex.message, variant: "destructive" })
    }
  }

  return (
    <PageShell
      title="TikTok Integrations"
      subtitle="OAuth app, masked secrets, token status, and advertiser sync."
      action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
    >
      <ErrorBox message={error} />
      <div className="rounded-md border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{editingId ? "Edit integration" : "Create integration"}</h2>
            <p className="text-sm text-slate-500">
              {editingId ? "Leave secret/token empty to keep the saved encrypted values." : "Add app credentials before OAuth or paste an existing access token."}
            </p>
          </div>
          {editingId && <Button variant="outline" size="sm" onClick={resetForm}><X className="mr-2 h-4 w-4" />Cancel edit</Button>}
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <div><Label>Name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><Label>App ID</Label><Input value={form.tikTokAppId} onChange={(e) => setForm({ ...form, tikTokAppId: e.target.value })} /></div>
          <div><Label>{editingId ? "New Secret" : "Secret"}</Label><Input type="password" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value, clearAppSecret: false })} /></div>
          <div><Label>{editingId ? "New Access Token" : "Access Token"}</Label><Input type="password" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value, clearAccessToken: false })} /></div>
          <div><Label>Scopes</Label><Input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked === true })} />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={form.isDefault} onCheckedChange={(checked) => setForm({ ...form, isDefault: checked === true })} />
            Default
          </label>
          {editingId && (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.clearAppSecret} onCheckedChange={(checked) => setForm({ ...form, clearAppSecret: checked === true, appSecret: checked ? "" : form.appSecret })} />
                Clear secret
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={form.clearAccessToken} onCheckedChange={(checked) => setForm({ ...form, clearAccessToken: checked === true, accessToken: checked ? "" : form.accessToken })} />
                Clear token
              </label>
            </>
          )}
        </div>
        <Button className="mt-4" onClick={save} disabled={submitting}>
          <PlugZap className="mr-2 h-4 w-4" />
          {editingId ? "Update" : "Create"}
        </Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>App ID</TableHead><TableHead>Secret</TableHead><TableHead>Token</TableHead><TableHead>Status</TableHead><TableHead>Enabled</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow> : items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.displayName}</TableCell>
                <TableCell>{item.tikTokAppId}</TableCell>
                <TableCell>{item.hasAppSecret ? item.appSecretHint : "No"}</TableCell>
                <TableCell>{item.hasAccessToken ? item.accessTokenHint : "No"}</TableCell>
                <TableCell><Badge className={statusTone(item.tokenStatus)}>{item.tokenStatus}</Badge></TableCell>
                <TableCell><Badge className={statusTone(item.isEnabled ? "active" : "disabled")}>{item.isEnabled ? "enabled" : "disabled"}</Badge></TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => toggleEnabled(item)}>{item.isEnabled ? "Disable" : "Enable"}</Button>
                  <Button size="sm" variant="outline" onClick={() => oauth(item.id)}>OAuth</Button>
                  <Button size="sm" variant="outline" onClick={() => test(item.id)}>Test</Button>
                  <Button size="sm" onClick={() => sync(item.id)}>Sync</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  )
}

export function TikTokAdAccountsPage() {
  const [items, setItems] = useState<TikTokAdAccountDto[]>([])
  const [error, setError] = useState("")
  const load = async () => {
    setError("")
    try { setItems(await tiktokAccountsApi.getAdAccounts()) }
    catch (ex: any) { setError(ex.message) }
  }
  useEffect(() => { void load() }, [])
  return (
    <PageShell title="TikTok Ad Accounts" subtitle="Advertiser accounts synced from OAuth integrations." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Advertiser ID</TableHead><TableHead>Currency</TableHead><TableHead>Timezone</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.advertiserId}</TableCell><TableCell>{item.currency}</TableCell><TableCell>{item.timezone}</TableCell><TableCell>{item.balance ?? "-"}</TableCell><TableCell><Badge className={statusTone(item.isActive ? "active" : "disabled")}>{item.isActive ? "active" : "disabled"}</Badge></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </PageShell>
  )
}

export function TikTokAppMappingsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokAppMappingDto[]>([])
  const [error, setError] = useState("")
  const [form, setForm] = useState({ appRowId: "", tikTokAppId: "", downloadUrl: "" })
  const load = async () => {
    setError("")
    try { setItems(await tiktokAccountsApi.getAppMappings()) }
    catch (ex: any) { setError(ex.message) }
  }
  useEffect(() => { void load() }, [])
  const create = async () => {
    try {
      await tiktokAccountsApi.createAppMapping({ appRowId: Number(form.appRowId), tikTokAppId: form.tikTokAppId, downloadUrl: form.downloadUrl, isActive: true })
      setForm({ appRowId: "", tikTokAppId: "", downloadUrl: "" })
      await load()
      toast({ title: "TikTok app mapping created" })
    } catch (ex: any) {
      toast({ title: "Create failed", description: ex.message, variant: "destructive" })
    }
  }
  return (
    <PageShell title="TikTok App Mappings" subtitle="Map internal apps to TikTok App IDs and store URLs." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="rounded-md border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>App Row ID</Label><Input value={form.appRowId} onChange={(e) => setForm({ ...form, appRowId: e.target.value })} /></div>
          <div><Label>TikTok App ID</Label><Input value={form.tikTokAppId} onChange={(e) => setForm({ ...form, tikTokAppId: e.target.value })} /></div>
          <div><Label>Download URL</Label><Input value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} /></div>
        </div>
        <Button className="mt-4" onClick={create}>Create</Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>App</TableHead><TableHead>App Row ID</TableHead><TableHead>TikTok App ID</TableHead><TableHead>Download URL</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.appDisplayName ?? item.appId}</TableCell><TableCell>{item.appRowId}</TableCell><TableCell>{item.tikTokAppId}</TableCell><TableCell className="max-w-md truncate">{item.downloadUrl}</TableCell><TableCell><Badge className={statusTone(item.isActive ? "active" : "disabled")}>{item.isActive ? "active" : "disabled"}</Badge></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </PageShell>
  )
}

export function TikTokRequestsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<TikTokCampaignRequestListItemDto[]>([])
  const [reference, setReference] = useState<TikTokReferenceResponseDto | null>(null)
  const [error, setError] = useState("")
  const [draftJson, setDraftJson] = useState("")

  const defaultDraft = useMemo(() => ({
    tikTokAdAccountRowId: reference?.adAccounts[0]?.id ?? 0,
    appRowId: reference?.appMappings[0]?.appRowId ?? 0,
    campaign: { campaignName: "", objectiveType: "APP_PROMOTION", budget: 50, budgetMode: "BUDGET_MODE_DAY" },
    adGroup: { adGroupName: "", placementType: "PLACEMENT_TYPE_AUTOMATIC", placements: [], budget: 50, budgetMode: "BUDGET_MODE_DAY", scheduleType: "SCHEDULE_FROM_NOW", optimizationGoal: "INSTALL", bidType: "BID_TYPE_NO_BID", billingEvent: "OCPM", appId: reference?.appMappings[0]?.tikTokAppId, appDownloadUrl: reference?.appMappings[0]?.downloadUrl, operatingSystems: [], locationIds: ["6252001"], ageGroups: [], gender: "GENDER_UNLIMITED", languages: [] },
    ad: { adName: "", adFormat: "SINGLE_VIDEO", videoId: "", imageIds: [], imageAssetIds: [] },
  }), [reference])

  const load = async () => {
    setError("")
    try {
      const [list, ref] = await Promise.all([tiktokCampaignRequestsApi.getRequests(), tiktokReferenceApi.getCreateCampaign()])
      setItems(list)
      setReference(ref)
    } catch (ex: any) {
      setError(ex.message)
    }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { if (reference && !draftJson) setDraftJson(JSON.stringify(defaultDraft, null, 2)) }, [reference, defaultDraft, draftJson])

  const create = async () => {
    try {
      await tiktokCampaignRequestsApi.create(JSON.parse(draftJson))
      await load()
      toast({ title: "TikTok request draft created" })
    } catch (ex: any) {
      toast({ title: "Create failed", description: ex.message, variant: "destructive" })
    }
  }
  const run = async (id: number, action: "submit" | "approve" | "reject" | "execute" | "retry") => {
    try {
      if (action === "submit") await tiktokCampaignRequestsApi.submit(id)
      if (action === "approve") await tiktokCampaignRequestsApi.approve(id)
      if (action === "reject") await tiktokCampaignRequestsApi.reject(id, "Rejected from UI")
      if (action === "execute") await tiktokCampaignRequestsApi.execute(id, true)
      if (action === "retry") await tiktokCampaignRequestsApi.retry(id, true)
      await load()
      toast({ title: `TikTok request ${action} completed` })
    } catch (ex: any) {
      toast({ title: `${action} failed`, description: ex.message, variant: "destructive" })
    }
  }

  return (
    <PageShell title="TikTok Requests" subtitle="Create, approve, and dry-run campaign execution requests." action={<Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
      <ErrorBox message={error} />
      <div className="rounded-md border bg-white p-4">
        <Label>Request JSON</Label>
        <Textarea className="mt-2 min-h-72 font-mono text-xs" value={draftJson} onChange={(e) => setDraftJson(e.target.value)} />
        <Button className="mt-4" onClick={create}><Send className="mr-2 h-4 w-4" />Create Draft</Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Account</TableHead><TableHead>App</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.campaignName}</TableCell><TableCell>{item.tikTokAdAccountName}</TableCell><TableCell>{item.appDisplayName ?? item.appId}</TableCell><TableCell><Badge className={statusTone(item.status)}>{item.status}</Badge></TableCell><TableCell className="space-x-2 text-right"><Button size="sm" variant="outline" onClick={() => run(item.id, "submit")}><Send className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => run(item.id, "approve")}><CheckCircle2 className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => run(item.id, "reject")}><XCircle className="h-4 w-4" /></Button><Button size="sm" onClick={() => run(item.id, item.status === "failed" ? "retry" : "execute")}><Play className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </PageShell>
  )
}

export function TikTokCampaignsPage() {
  return (
    <PageShell title="TikTok Campaigns" subtitle="Local mirror campaigns from sync and approved execution flow.">
      <div className="rounded-md border bg-white p-6 text-sm text-slate-600">
        Campaign mirror detail uses the Phase 1 dashboard data today. Request-created objects appear on each request detail through backend `createdObjects`; a richer campaign detail view can now be layered on top of the same mirror tables.
      </div>
    </PageShell>
  )
}
