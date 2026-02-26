"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Eye, EyeOff, Plug, Upload, X, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { dataAccountsApi } from "@/lib/api/services"

export interface DataAccount {
  id: string
  name: string
  network: "admob" | "applovin" | "xmp"
  // admob
  publisherId?: string
  clientId?: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  // applovin
  reportKey?: string
  sdkKey?: string
  // xmp
  apiKey?: string
  apiSecret?: string
  apiDomain?: string
}

interface AddEditAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editAccount?: DataAccount | null
  onSaved?: () => void
}

type TestState = "idle" | "loading" | "success" | "error"

export function AddEditAccountModal({ open, onOpenChange, editAccount, onSaved }: AddEditAccountModalProps) {
  const { toast } = useToast()
  const isEdit = !!editAccount

  const [activeTab, setActiveTab] = useState<"admob" | "applovin" | "xmp">("admob")
  const [saving, setSaving] = useState(false)
  const [testState, setTestState] = useState<TestState>("idle")

  // AdMob fields
  const [admobName, setAdmobName] = useState("")
  const [publisherId, setPublisherId] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [tokenType, setTokenType] = useState("Bearer")
  const [showClientSecret, setShowClientSecret] = useState(false)

  // AppLovin fields
  const [applovinName, setApplovinName] = useState("")
  const [reportKey, setReportKey] = useState("")
  const [showReportKey, setShowReportKey] = useState(false)
  const [sdkKey, setSdkKey] = useState("")

  // XMP fields
  const [xmpName, setXmpName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [showApiSecret, setShowApiSecret] = useState(false)
  const [apiDomain, setApiDomain] = useState("global")

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset / pre-fill on open
  useEffect(() => {
    if (open) {
      setTestState("idle")
      setErrors({})
      setSaving(false)
      setShowReportKey(false)
      setShowApiSecret(false)
      if (editAccount) {
        setActiveTab(editAccount.network)
        if (editAccount.network === "admob") {
          setAdmobName(editAccount.name)
          setPublisherId(editAccount.publisherId ?? "")
          setClientId(editAccount.clientId ?? "")
          setClientSecret(editAccount.clientSecret ?? "")
          setAccessToken(editAccount.accessToken ?? "")
          setRefreshToken(editAccount.refreshToken ?? "")
          setTokenType(editAccount.tokenType ?? "Bearer")
        } else if (editAccount.network === "applovin") {
          setApplovinName(editAccount.name)
          setReportKey(editAccount.reportKey ?? "")
          setSdkKey(editAccount.sdkKey ?? "")
        } else {
          setXmpName(editAccount.name)
          setApiKey(editAccount.apiKey ?? "")
          setApiSecret(editAccount.apiSecret ?? "")
          setApiDomain(editAccount.apiDomain ?? "global")
        }
      } else {
        setActiveTab("admob")
        setAdmobName("")
        setPublisherId("")
        setClientId("")
        setClientSecret("")
        setAccessToken("")
        setRefreshToken("")
        setTokenType("Bearer")
        setApplovinName("")
        setReportKey("")
        setSdkKey("")
        setXmpName("")
        setApiKey("")
        setApiSecret("")
        setApiDomain("global")
      }
    }
  }, [open, editAccount])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (activeTab === "admob") {
      if (!admobName.trim()) newErrors.admobName = "Account name is required"
      if (!publisherId.trim()) newErrors.publisherId = "Publisher ID is required"
    } else if (activeTab === "applovin") {
      if (!applovinName.trim()) newErrors.applovinName = "Account name is required"
    } else {
      if (!xmpName.trim()) newErrors.xmpName = "Account name is required"
      if (!apiKey.trim()) newErrors.apiKey = "API Key is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTestConnection = async () => {
    setTestState("loading")
    await new Promise((r) => setTimeout(r, 1800))
    // Simulate: error if name contains "test" (case-insensitive)
    const currentName =
      activeTab === "admob" ? admobName : activeTab === "applovin" ? applovinName : xmpName
    const success = !currentName.toLowerCase().includes("error")
    setTestState(success ? "success" : "error")
    // Auto-reset after 3s
    setTimeout(() => setTestState("idle"), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (isEdit && editAccount) {
        // Update existing account
        const network = editAccount.network
        const id = Number(editAccount.id)
        if (network === "admob") {
          await dataAccountsApi.update(network, id, {
            name: admobName.trim(),
            accountId: publisherId.trim() || undefined,
            clientId: clientId.trim() || undefined,
            clientSecret: clientSecret.trim() || undefined,
            accessToken: accessToken.trim() || undefined,
            refreshToken: refreshToken.trim() || undefined,
            tokenType: tokenType.trim() || undefined,
          })
        } else if (network === "applovin") {
          await dataAccountsApi.update(network, id, {
            name: applovinName.trim(),
            reportKey: reportKey || undefined,
          })
        } else {
          await dataAccountsApi.update(network, id, {
            name: xmpName.trim(),
            xmpClientId: apiKey || undefined,
            xmpClientSecret: apiSecret || undefined,
          })
        }
      } else {
        // Create new account
        if (activeTab === "admob") {
          await dataAccountsApi.create({
            network: "admob",
            name: admobName.trim(),
            accountId: publisherId.trim(),
            clientId: clientId.trim() || undefined,
            clientSecret: clientSecret.trim() || undefined,
            accessToken: accessToken.trim() || undefined,
            refreshToken: refreshToken.trim() || undefined,
            tokenType: tokenType.trim() || undefined,
          })
        } else if (activeTab === "applovin") {
          await dataAccountsApi.create({
            network: "applovin",
            name: applovinName.trim(),
            reportKey: reportKey || undefined,
          })
        } else {
          await dataAccountsApi.create({
            network: "xmp",
            name: xmpName.trim(),
            xmpClientId: apiKey || undefined,
            xmpClientSecret: apiSecret || undefined,
          })
        }
      }
      toast({
        title: isEdit ? "Account updated" : "Account added successfully",
        description: isEdit
          ? "Your data account has been updated."
          : "Your new data account is ready for syncing.",
      })
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Error",
        description: isEdit ? "Failed to update account." : "Failed to create account.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const TestButtonContent = () => {
    if (testState === "loading") return <><Loader2 className="w-4 h-4 animate-spin" /><span>Testing...</span></>
    if (testState === "success") return <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-700">Connected</span></>
    if (testState === "error") return <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-600">Failed</span></>
    return <><Plug className="w-4 h-4" /><span>Test Connection</span></>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Data Account" : "Add Data Account"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the connection details for this account"
              : "Connect an ad network account for data synchronization"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (!isEdit) {
                setActiveTab(v as typeof activeTab)
                setErrors({})
                setTestState("idle")
              }
            }}
          >
            <TabsList className={`grid w-full grid-cols-3 bg-slate-100 ${isEdit ? "pointer-events-none opacity-70" : ""}`}>
              <TabsTrigger value="admob">AdMob</TabsTrigger>
              <TabsTrigger value="applovin">AppLovin</TabsTrigger>
              <TabsTrigger value="xmp">XMP / Mintegral</TabsTrigger>
            </TabsList>

            {/* ── AdMob Tab ── */}
            <TabsContent value="admob" className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admob-name">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="admob-name"
                  placeholder="e.g. AdMob Production"
                  value={admobName}
                  onChange={(e) => { setAdmobName(e.target.value); setErrors((p) => ({ ...p, admobName: "" })) }}
                  className={errors.admobName ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.admobName && <p className="text-xs text-red-500">{errors.admobName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="publisher-id">
                  Publisher ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="publisher-id"
                  placeholder="pub-XXXXXXXXXXXXXXXX"
                  value={publisherId}
                  onChange={(e) => { setPublisherId(e.target.value); setErrors((p) => ({ ...p, publisherId: "" })) }}
                  className={errors.publisherId ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.publisherId && <p className="text-xs text-red-500">{errors.publisherId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input
                  id="client-id"
                  placeholder="OAuth Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="client-secret"
                    type={showClientSecret ? "text" : "password"}
                    placeholder="OAuth Client Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    disabled={saving}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-700 bg-transparent"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                  >
                    {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-token">Access Token</Label>
                <Input
                  id="access-token"
                  placeholder="OAuth Access Token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-token">Refresh Token</Label>
                <Input
                  id="refresh-token"
                  type="password"
                  placeholder="OAuth Refresh Token"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-type">Token Type</Label>
                <Input
                  id="token-type"
                  placeholder="e.g. Bearer"
                  value={tokenType}
                  onChange={(e) => setTokenType(e.target.value)}
                  disabled={saving}
                />
              </div>
            </TabsContent>

            {/* ── AppLovin Tab ── */}
            <TabsContent value="applovin" className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="al-name">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="al-name"
                  placeholder="e.g. AppLovin Main"
                  value={applovinName}
                  onChange={(e) => { setApplovinName(e.target.value); setErrors((p) => ({ ...p, applovinName: "" })) }}
                  className={errors.applovinName ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.applovinName && <p className="text-xs text-red-500">{errors.applovinName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-key">Report Key</Label>
                <div className="relative">
                  <Input
                    id="report-key"
                    type={showReportKey ? "text" : "password"}
                    placeholder="Enter Report Key"
                    value={reportKey}
                    onChange={(e) => setReportKey(e.target.value)}
                    className="pr-10"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowReportKey(!showReportKey)}
                  >
                    {showReportKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sdk-key">SDK Key</Label>
                <Input
                  id="sdk-key"
                  placeholder="Enter SDK Key"
                  value={sdkKey}
                  onChange={(e) => setSdkKey(e.target.value)}
                  disabled={saving}
                />
              </div>
            </TabsContent>

            {/* ── XMP / Mintegral Tab ── */}
            <TabsContent value="xmp" className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="xmp-name">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="xmp-name"
                  placeholder="e.g. XMP Mintegral Account"
                  value={xmpName}
                  onChange={(e) => { setXmpName(e.target.value); setErrors((p) => ({ ...p, xmpName: "" })) }}
                  className={errors.xmpName ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.xmpName && <p className="text-xs text-red-500">{errors.xmpName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">
                  API Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="api-key"
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setErrors((p) => ({ ...p, apiKey: "" })) }}
                  className={errors.apiKey ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="api-secret"
                    type={showApiSecret ? "text" : "password"}
                    placeholder="Enter API Secret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="pr-10"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-domain">API Domain</Label>
                <Select value={apiDomain} onValueChange={setApiDomain} disabled={saving}>
                  <SelectTrigger id="api-domain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="china">China</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Cancel */}
            <Button
              type="button"
              variant="outline"
              className="bg-transparent order-last sm:order-first"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            {/* Center + Right group */}
            <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
              {/* Test Connection */}


              {/* Save / Update */}
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving
                  ? isEdit
                    ? "Updating..."
                    : "Saving..."
                  : isEdit
                    ? "Update Account"
                    : "Save Account"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
