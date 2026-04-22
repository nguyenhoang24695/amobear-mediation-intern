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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Loader2, Eye, EyeOff, Plug, Upload, X, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { dataAccountsApi } from "@/lib/api/services"

export interface DataAccount {
  id: string
  name: string
  network: "admob" | "applovin" | "xmp" | "appsflyer" | "qonversion" | "apple"
  // admob
  publisherId?: string
  defaultAppType?: string
  clientId?: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  // applovin
  reportKey?: string
  baseUrl?: string
  // xmp
  xmpClientId?: string
  xmpClientSecret?: string
  // appsflyer
  apiV2Token?: string
  pushWebhookAuthToken?: string
  isDefault?: boolean
  qonProjectKey?: string
  qonApiBaseUrl?: string
  qonGcsBucketName?: string
  qonHasGcsJson?: boolean
  appleVendorNumber?: string
  appleAscKeyId?: string
  appleAscIssuerId?: string
  appleHasAscPrivateKey?: boolean
  appleIapKeyId?: string
  appleIapIssuerId?: string
  appleHasIapPrivateKey?: boolean
  appleUseSandboxStoreKit?: boolean
}

interface AddEditAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editAccount?: DataAccount | null
  onSaved?: () => void
}

type TestState = "idle" | "loading" | "success" | "error"

export function AddEditAccountModal({ open, onOpenChange, editAccount, onSaved }: AddEditAccountModalProps) {
  const isEdit = !!editAccount

  const [activeTab, setActiveTab] = useState<"admob" | "applovin" | "xmp" | "appsflyer" | "qonversion" | "apple">("admob")
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
  const [admobDefaultAppType, setAdmobDefaultAppType] = useState<string>("")
  const [showClientSecret, setShowClientSecret] = useState(false)

  // AppLovin fields
  const [applovinName, setApplovinName] = useState("")
  const [reportKey, setReportKey] = useState("")
  const [showReportKey, setShowReportKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState("https://r.applovin.com")

  // XMP fields
  const [xmpName, setXmpName] = useState("")
  const [xmpClientId, setXmpClientId] = useState("")
  const [xmpClientSecret, setXmpClientSecret] = useState("")
  const [showXmpClientSecret, setShowXmpClientSecret] = useState(false)

  // AppsFlyer
  const [appsflyerName, setAppsflyerName] = useState("")
  const [afApiV2Token, setAfApiV2Token] = useState("")
  const [afBaseUrl, setAfBaseUrl] = useState("https://hq1.appsflyer.com")
  const [afPushWebhookToken, setAfPushWebhookToken] = useState("")
  const [showAfApiToken, setShowAfApiToken] = useState(false)
  const [afIsDefault, setAfIsDefault] = useState(false)

  const [qonName, setQonName] = useState("")
  const [qonProjectKey, setQonProjectKey] = useState("")
  const [qonSecretKey, setQonSecretKey] = useState("")
  const [qonWebhookToken, setQonWebhookToken] = useState("")
  const [qonBaseUrl, setQonBaseUrl] = useState("https://api.qonversion.io/v3")
  const [qonGcsJson, setQonGcsJson] = useState("")
  const [qonGcsBucket, setQonGcsBucket] = useState("")
  const [qonDashboardCookie, setQonDashboardCookie] = useState("")
  const [qonDashboardUid, setQonDashboardUid] = useState("")
  const [qonIsDefault, setQonIsDefault] = useState(false)
  const [showQonSecret, setShowQonSecret] = useState(false)

  const [appleName, setAppleName] = useState("")
  const [appleVendorNumber, setAppleVendorNumber] = useState("")
  const [appleAscPem, setAppleAscPem] = useState("")
  const [appleAscKeyId, setAppleAscKeyId] = useState("")
  const [appleAscIssuerId, setAppleAscIssuerId] = useState("")
  const [appleIapPem, setAppleIapPem] = useState("")
  const [appleIapKeyId, setAppleIapKeyId] = useState("")
  const [appleIapIssuerId, setAppleIapIssuerId] = useState("")
  const [appleSandbox, setAppleSandbox] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset / pre-fill on open
  useEffect(() => {
    if (open) {
      setTestState("idle")
      setErrors({})
      setSaving(false)
      setShowReportKey(false)
      setShowXmpClientSecret(false)
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
          setAdmobDefaultAppType(editAccount.defaultAppType ?? "")
        } else if (editAccount.network === "applovin") {
          setApplovinName(editAccount.name)
          setReportKey(editAccount.reportKey ?? "")
          setBaseUrl(editAccount.baseUrl ?? "https://r.applovin.com")
        } else if (editAccount.network === "appsflyer") {
          setAppsflyerName(editAccount.name)
          setAfApiV2Token("")
          setAfBaseUrl(editAccount.baseUrl ?? "https://hq1.appsflyer.com")
          setAfPushWebhookToken("")
          setAfIsDefault(editAccount.isDefault ?? false)
        } else if (editAccount.network === "qonversion") {
          setQonName(editAccount.name)
          setQonProjectKey("")
          setQonSecretKey("")
          setQonWebhookToken("")
          setQonBaseUrl(editAccount.qonApiBaseUrl ?? "https://api.qonversion.io/v3")
          setQonGcsJson("")
          setQonGcsBucket(editAccount.qonGcsBucketName ?? "")
          setQonDashboardCookie("")
          setQonDashboardUid("")
          setQonIsDefault(editAccount.isDefault ?? false)
        } else if (editAccount.network === "apple") {
          setAppleName(editAccount.name)
          setAppleVendorNumber(editAccount.appleVendorNumber ?? "")
          setAppleAscPem("")
          setAppleAscKeyId(editAccount.appleAscKeyId ?? "")
          setAppleAscIssuerId(editAccount.appleAscIssuerId ?? "")
          setAppleIapPem("")
          setAppleIapKeyId(editAccount.appleIapKeyId ?? "")
          setAppleIapIssuerId(editAccount.appleIapIssuerId ?? "")
          setAppleSandbox(editAccount.appleUseSandboxStoreKit ?? false)
        } else {
          setXmpName(editAccount.name)
          setXmpClientId(editAccount.xmpClientId ?? "")
          setXmpClientSecret(editAccount.xmpClientSecret ?? "")
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
        setAdmobDefaultAppType("")
        setApplovinName("")
        setReportKey("")
        setBaseUrl("https://r.applovin.com")
        setXmpName("")
        setXmpClientId("")
        setXmpClientSecret("")
        setAppsflyerName("")
        setAfApiV2Token("")
        setAfBaseUrl("https://hq1.appsflyer.com")
        setAfPushWebhookToken("")
        setAfIsDefault(false)
        setQonName("")
        setQonProjectKey("")
        setQonSecretKey("")
        setQonWebhookToken("")
        setQonBaseUrl("https://api.qonversion.io/v3")
        setQonGcsJson("")
        setQonGcsBucket("")
        setQonDashboardCookie("")
        setQonDashboardUid("")
        setQonIsDefault(false)
        setAppleName("")
        setAppleVendorNumber("")
        setAppleAscPem("")
        setAppleAscKeyId("")
        setAppleAscIssuerId("")
        setAppleIapPem("")
        setAppleIapKeyId("")
        setAppleIapIssuerId("")
        setAppleSandbox(false)
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
    } else if (activeTab === "appsflyer") {
      if (!appsflyerName.trim()) newErrors.appsflyerName = "Account name is required"
      if (!isEdit && !afApiV2Token.trim()) newErrors.afApiV2Token = "API V2 token is required"
    } else if (activeTab === "qonversion") {
      if (!qonName.trim()) newErrors.qonName = "Account name is required"
    } else if (activeTab === "apple") {
      if (!appleName.trim()) newErrors.appleName = "Account name is required"
      if (!appleVendorNumber.trim()) newErrors.appleVendorNumber = "Vendor number is required"
      if (!appleAscKeyId.trim()) newErrors.appleAscKeyId = "ASC Key ID is required"
      if (!appleAscIssuerId.trim()) newErrors.appleAscIssuerId = "ASC Issuer ID is required"
      if (!appleIapKeyId.trim()) newErrors.appleIapKeyId = "IAP Key ID is required"
      if (!appleIapIssuerId.trim()) newErrors.appleIapIssuerId = "IAP Issuer ID is required"
      if (!isEdit) {
        if (!appleAscPem.trim()) newErrors.appleAscPem = "ASC private key (.p8 PEM) is required"
        if (!appleIapPem.trim()) newErrors.appleIapPem = "IAP private key (.p8 PEM) is required"
      }
    } else {
      if (!xmpName.trim()) newErrors.xmpName = "Account name is required"
      if (!xmpClientId.trim()) newErrors.xmpClientId = "Client ID is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTestConnection = async () => {
    setTestState("loading")
    await new Promise((r) => setTimeout(r, 1800))
    // Simulate: error if name contains "test" (case-insensitive)
    const currentName =
      activeTab === "admob"
        ? admobName
        : activeTab === "applovin"
          ? applovinName
          : activeTab === "appsflyer"
            ? appsflyerName
            : activeTab === "qonversion"
              ? qonName
              : activeTab === "apple"
                ? appleName
                : xmpName
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
            defaultAppType: admobDefaultAppType,
          })
        } else if (network === "applovin") {
          await dataAccountsApi.update(network, id, {
            name: applovinName.trim(),
            reportKey: reportKey || undefined,
            baseUrl: baseUrl.trim() || undefined,
          })
        } else if (network === "appsflyer") {
          await dataAccountsApi.update(network, id, {
            name: appsflyerName.trim(),
            baseUrl: afBaseUrl.trim() || undefined,
            isDefault: afIsDefault,
            ...(afApiV2Token.trim() ? { apiV2Token: afApiV2Token.trim() } : {}),
            ...(afPushWebhookToken.trim() ? { pushWebhookAuthToken: afPushWebhookToken.trim() } : {}),
          })
        } else if (network === "qonversion") {
          await dataAccountsApi.update(network, id, {
            name: qonName.trim(),
            isDefault: qonIsDefault,
            ...(qonProjectKey.trim() ? { qonProjectKey: qonProjectKey.trim() } : {}),
            ...(qonSecretKey.trim() ? { qonSecretKey: qonSecretKey.trim() } : {}),
            ...(qonWebhookToken.trim() ? { qonWebhookAuthToken: qonWebhookToken.trim() } : {}),
            qonApiBaseUrl: qonBaseUrl.trim() || undefined,
            ...(qonGcsJson.trim() ? { qonGcsServiceAccountJson: qonGcsJson.trim() } : {}),
            ...(qonGcsBucket.trim() ? { qonGcsBucketName: qonGcsBucket.trim() } : {}),
            ...(qonDashboardCookie.trim() ? { qonDashboardCookie: qonDashboardCookie.trim() } : {}),
            ...(qonDashboardUid.trim() ? { qonDashboardAccountUid: qonDashboardUid.trim() } : {}),
          })
        } else if (network === "apple") {
          await dataAccountsApi.update(network, id, {
            name: appleName.trim(),
            appleVendorNumber: appleVendorNumber.trim(),
            appleAscKeyId: appleAscKeyId.trim(),
            appleAscIssuerId: appleAscIssuerId.trim(),
            ...(appleAscPem.trim() ? { appleAscPrivateKeyPem: appleAscPem.trim() } : {}),
            appleIapKeyId: appleIapKeyId.trim(),
            appleIapIssuerId: appleIapIssuerId.trim(),
            ...(appleIapPem.trim() ? { appleIapPrivateKeyPem: appleIapPem.trim() } : {}),
            appleUseSandboxStoreKit: appleSandbox,
          })
        } else {
          await dataAccountsApi.update(network, id, {
            name: xmpName.trim(),
            xmpClientId: xmpClientId.trim() || undefined,
            xmpClientSecret: xmpClientSecret.trim() || undefined,
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
            defaultAppType: admobDefaultAppType || undefined,
          })
        } else if (activeTab === "applovin") {
          await dataAccountsApi.create({
            network: "applovin",
            name: applovinName.trim(),
            reportKey: reportKey || undefined,
            baseUrl: baseUrl.trim() || undefined,
          })
        } else if (activeTab === "appsflyer") {
          await dataAccountsApi.create({
            network: "appsflyer",
            name: appsflyerName.trim(),
            baseUrl: afBaseUrl.trim() || undefined,
            apiV2Token: afApiV2Token.trim(),
            pushWebhookAuthToken: afPushWebhookToken.trim() || undefined,
            isDefault: afIsDefault,
          })
        } else if (activeTab === "qonversion") {
          await dataAccountsApi.create({
            network: "qonversion",
            name: qonName.trim(),
            isDefault: qonIsDefault,
            ...(qonProjectKey.trim() ? { qonProjectKey: qonProjectKey.trim() } : {}),
            qonSecretKey: qonSecretKey.trim() || undefined,
            qonWebhookAuthToken: qonWebhookToken.trim() || undefined,
            qonApiBaseUrl: qonBaseUrl.trim() || undefined,
            qonGcsServiceAccountJson: qonGcsJson.trim() || undefined,
            qonGcsBucketName: qonGcsBucket.trim() || undefined,
            qonDashboardCookie: qonDashboardCookie.trim() || undefined,
            qonDashboardAccountUid: qonDashboardUid.trim() || undefined,
          })
        } else if (activeTab === "apple") {
          await dataAccountsApi.create({
            network: "apple",
            name: appleName.trim(),
            appleVendorNumber: appleVendorNumber.trim(),
            appleAscPrivateKeyPem: appleAscPem.trim(),
            appleAscKeyId: appleAscKeyId.trim(),
            appleAscIssuerId: appleAscIssuerId.trim(),
            appleIapPrivateKeyPem: appleIapPem.trim(),
            appleIapKeyId: appleIapKeyId.trim(),
            appleIapIssuerId: appleIapIssuerId.trim(),
            appleUseSandboxStoreKit: appleSandbox,
          })
        } else {
          await dataAccountsApi.create({
            network: "xmp",
            name: xmpName.trim(),
            xmpClientId: xmpClientId.trim() || undefined,
            xmpClientSecret: xmpClientSecret.trim() || undefined,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] min-w-0 max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto">
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
            <TabsList className={`grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 bg-slate-100 ${isEdit ? "pointer-events-none opacity-70" : ""}`}>
              <TabsTrigger value="admob">AdMob</TabsTrigger>
              <TabsTrigger value="applovin">AppLovin</TabsTrigger>
              <TabsTrigger value="xmp">XMP</TabsTrigger>
              <TabsTrigger value="appsflyer">AppsFlyer</TabsTrigger>
              <TabsTrigger value="qonversion">Qonversion</TabsTrigger>
              <TabsTrigger value="apple">Apple</TabsTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="default-app-type">Default app type (new apps from sync)</Label>
                <Select value={admobDefaultAppType || "__none__"} onValueChange={(v) => setAdmobDefaultAppType(v === "__none__" ? "" : v)} disabled={saving}>
                  <SelectTrigger id="default-app-type" className="bg-white">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not set</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                    <SelectItem value="app">App</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Applied to <span className="font-mono">apps.type</span> when a new app is inserted for this publisher during structure sync.</p>
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
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  placeholder="https://r.applovin.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={saving}
                />
              </div>
            </TabsContent>

            {/* ── AppsFlyer Tab ── */}
            <TabsContent value="appsflyer" className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="af-name">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="af-name"
                  placeholder="e.g. AppsFlyer Production"
                  value={appsflyerName}
                  onChange={(e) => {
                    setAppsflyerName(e.target.value)
                    setErrors((p) => ({ ...p, appsflyerName: "" }))
                  }}
                  className={errors.appsflyerName ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.appsflyerName && <p className="text-xs text-red-500">{errors.appsflyerName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="af-api-token">
                  API V2 Token {!isEdit && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="af-api-token"
                    type={showAfApiToken ? "text" : "password"}
                    placeholder={isEdit ? "Leave blank to keep existing token" : "From Dashboard → Integration → API Access"}
                    value={afApiV2Token}
                    onChange={(e) => {
                      setAfApiV2Token(e.target.value)
                      setErrors((p) => ({ ...p, afApiV2Token: "" }))
                    }}
                    className={errors.afApiV2Token ? "border-red-500 pr-10" : "pr-10"}
                    disabled={saving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowAfApiToken(!showAfApiToken)}
                  >
                    {showAfApiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.afApiV2Token && <p className="text-xs text-red-500">{errors.afApiV2Token}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="af-base-url">API base URL</Label>
                <Input
                  id="af-base-url"
                  placeholder="https://hq1.appsflyer.com"
                  value={afBaseUrl}
                  onChange={(e) => setAfBaseUrl(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="af-push-token">Push webhook auth token (optional)</Label>
                <Input
                  id="af-push-token"
                  type="password"
                  placeholder={isEdit ? "Leave blank to keep unchanged" : "Bearer secret for /api/webhooks/appsflyer"}
                  value={afPushWebhookToken}
                  onChange={(e) => setAfPushWebhookToken(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch id="af-default" checked={afIsDefault} onCheckedChange={setAfIsDefault} disabled={saving} />
                <Label htmlFor="af-default" className="font-normal cursor-pointer">
                  Default AppsFlyer account (used when jobs need a single credential set)
                </Label>
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
                <Label htmlFor="xmp-client-id">
                  Client ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="xmp-client-id"
                  placeholder="Enter Client ID"
                  value={xmpClientId}
                  onChange={(e) => { setXmpClientId(e.target.value); setErrors((p) => ({ ...p, xmpClientId: "" })) }}
                  className={errors.xmpClientId ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.xmpClientId && <p className="text-xs text-red-500">{errors.xmpClientId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="xmp-client-secret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="xmp-client-secret"
                    type={showXmpClientSecret ? "text" : "password"}
                    placeholder="Enter Client Secret"
                    value={xmpClientSecret}
                    onChange={(e) => setXmpClientSecret(e.target.value)}
                    className="pr-10"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowXmpClientSecret(!showXmpClientSecret)}
                  >
                    {showXmpClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* ── Qonversion Tab — org cookie for crawler; per-app keys in App → Settings ── */}
            <TabsContent value="qonversion" className="mt-5 min-w-0 space-y-6">
              <p className="text-sm text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 leading-relaxed">
                <span className="font-medium text-slate-800">Web crawler</span> uses the dashboard cookie and default account below.
                <span className="font-medium text-slate-800"> Project / API / secret per app</span> are set under each app&apos;s Settings, not here.
              </p>
              <div className="space-y-2">
                <Label htmlFor="qon-name">
                  Account name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="qon-name"
                  placeholder="e.g. Qonversion — dashboard crawl"
                  value={qonName}
                  onChange={(e) => {
                    setQonName(e.target.value)
                    setErrors((p) => ({ ...p, qonName: "" }))
                  }}
                  className={errors.qonName ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.qonName && <p className="text-xs text-red-500">{errors.qonName}</p>}
              </div>

              <div className="min-w-0 max-w-full space-y-3 rounded-lg border border-sky-100 bg-sky-50/50 p-4">
                <h4 className="text-sm font-semibold text-slate-800">Dashboard (web crawler)</h4>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="qon-dcookie">Cookie header</Label>
                  <div className="min-w-0 w-full max-w-full overflow-hidden rounded-md border border-input bg-background shadow-xs">
                    <Textarea
                      id="qon-dcookie"
                      rows={3}
                      placeholder={
                        isEdit
                          ? "Paste new cookie from browser devtools or leave blank"
                          : "Full Cookie header after login to dash.qonversion.io"
                      }
                      value={qonDashboardCookie}
                      onChange={(e) => setQonDashboardCookie(e.target.value)}
                      disabled={saving}
                      className="box-border min-h-[4.5rem] max-h-48 min-w-0 w-full max-w-full resize-y overflow-x-auto overflow-y-auto whitespace-pre border-0 font-mono text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qon-duid">Dashboard account UID</Label>
                  <Input
                    id="qon-duid"
                    value={qonDashboardUid}
                    onChange={(e) => setQonDashboardUid(e.target.value)}
                    disabled={saving}
                    placeholder="Query param account=... from export URL"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <h4 className="text-sm font-semibold text-slate-800">Optional — org-wide REST / GCS / webhook</h4>
                <p className="text-xs text-slate-500">
                  Fallback only when no per-app keys are configured. Prefer App → Settings for production.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="qon-pk">
                    Project key
                    {isEdit && <span className="text-slate-400 font-normal text-xs ml-1">(leave blank to keep)</span>}
                  </Label>
                  <Input
                    id="qon-pk"
                    placeholder={isEdit ? "Paste new project key or leave blank" : "Optional — legacy single-project Bearer"}
                    value={qonProjectKey}
                    onChange={(e) => {
                      setQonProjectKey(e.target.value)
                      setErrors((p) => ({ ...p, qonProjectKey: "" }))
                    }}
                    className={errors.qonProjectKey ? "border-red-500" : ""}
                    disabled={saving}
                    autoComplete="off"
                  />
                  {errors.qonProjectKey && <p className="text-xs text-red-500">{errors.qonProjectKey}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qon-sk">Secret key</Label>
                  <div className="relative">
                    <Input
                      id="qon-sk"
                      type={showQonSecret ? "text" : "password"}
                      placeholder={isEdit ? "Leave blank to keep" : "Optional — grant/revoke API"}
                      value={qonSecretKey}
                      onChange={(e) => setQonSecretKey(e.target.value)}
                      disabled={saving}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowQonSecret(!showQonSecret)}
                    >
                      {showQonSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qon-wh">Webhook auth token</Label>
                  <Input
                    id="qon-wh"
                    type="password"
                    placeholder={isEdit ? "Leave blank to keep" : "Validates incoming webhooks"}
                    value={qonWebhookToken}
                    onChange={(e) => setQonWebhookToken(e.target.value)}
                    disabled={saving}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qon-base">API base URL</Label>
                  <Input
                    id="qon-base"
                    value={qonBaseUrl}
                    onChange={(e) => setQonBaseUrl(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qon-gcs">GCS service account JSON</Label>
                  <Textarea
                    id="qon-gcs"
                    rows={4}
                    placeholder="Paste JSON for GCS reconciliation, or leave empty"
                    value={qonGcsJson}
                    onChange={(e) => setQonGcsJson(e.target.value)}
                    disabled={saving}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qon-bucket">GCS bucket name</Label>
                  <Input
                    id="qon-bucket"
                    value={qonGcsBucket}
                    onChange={(e) => setQonGcsBucket(e.target.value)}
                    disabled={saving}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Switch id="qon-default" checked={qonIsDefault} onCheckedChange={setQonIsDefault} disabled={saving} />
                <Label htmlFor="qon-default" className="font-normal cursor-pointer">
                  Default Qonversion account (web crawler + optional legacy jobs use GetDefault)
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="apple" className="mt-5 min-w-0 space-y-4">
              <p className="text-sm text-slate-600 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                App Store Connect API (ASC key) for sales, finance, analytics, and catalog. In-App Purchase key for
                StoreKit Server API. Keys are encrypted in the database; paste full <span className="font-mono">.p8</span> PEM
                including <span className="font-mono">BEGIN/END</span> lines.
              </p>
              <div className="space-y-2">
                <Label htmlFor="apple-name">
                  Account name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apple-name"
                  placeholder="e.g. Apple — production vendor"
                  value={appleName}
                  onChange={(e) => {
                    setAppleName(e.target.value)
                    setErrors((p) => ({ ...p, appleName: "" }))
                  }}
                  className={errors.appleName ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.appleName && <p className="text-xs text-red-500">{errors.appleName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apple-vendor">
                  Vendor number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apple-vendor"
                  placeholder="From App Store Connect → Payments and Financial Reports"
                  value={appleVendorNumber}
                  onChange={(e) => {
                    setAppleVendorNumber(e.target.value)
                    setErrors((p) => ({ ...p, appleVendorNumber: "" }))
                  }}
                  className={errors.appleVendorNumber ? "border-red-500" : ""}
                  disabled={saving}
                />
                {errors.appleVendorNumber && <p className="text-xs text-red-500">{errors.appleVendorNumber}</p>}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="text-sm font-semibold text-slate-800">App Store Connect (ASC)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="apple-asc-pem">
                      Private key (.p8 PEM) {!isEdit && <span className="text-red-500">*</span>}
                      {isEdit && <span className="text-slate-400 font-normal text-xs ml-1">(leave blank to keep)</span>}
                    </Label>
                    <Textarea
                      id="apple-asc-pem"
                      rows={5}
                      className={`font-mono text-xs min-h-[6rem] ${errors.appleAscPem ? "border-red-500" : ""}`}
                      placeholder="-----BEGIN PRIVATE KEY----- ..."
                      value={appleAscPem}
                      onChange={(e) => {
                        setAppleAscPem(e.target.value)
                        setErrors((p) => ({ ...p, appleAscPem: "" }))
                      }}
                      disabled={saving}
                    />
                    {errors.appleAscPem && <p className="text-xs text-red-500">{errors.appleAscPem}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apple-asc-kid">Key ID *</Label>
                    <Input
                      id="apple-asc-kid"
                      value={appleAscKeyId}
                      onChange={(e) => {
                        setAppleAscKeyId(e.target.value)
                        setErrors((p) => ({ ...p, appleAscKeyId: "" }))
                      }}
                      className={errors.appleAscKeyId ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {errors.appleAscKeyId && <p className="text-xs text-red-500">{errors.appleAscKeyId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apple-asc-iss">Issuer ID *</Label>
                    <Input
                      id="apple-asc-iss"
                      value={appleAscIssuerId}
                      onChange={(e) => {
                        setAppleAscIssuerId(e.target.value)
                        setErrors((p) => ({ ...p, appleAscIssuerId: "" }))
                      }}
                      className={errors.appleAscIssuerId ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {errors.appleAscIssuerId && <p className="text-xs text-red-500">{errors.appleAscIssuerId}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="text-sm font-semibold text-slate-800">In-App Purchase / StoreKit</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="apple-iap-pem">
                      Private key (.p8 PEM) {!isEdit && <span className="text-red-500">*</span>}
                      {isEdit && <span className="text-slate-400 font-normal text-xs ml-1">(leave blank to keep)</span>}
                    </Label>
                    <Textarea
                      id="apple-iap-pem"
                      rows={5}
                      className={`font-mono text-xs min-h-[6rem] ${errors.appleIapPem ? "border-red-500" : ""}`}
                      placeholder="-----BEGIN PRIVATE KEY----- ..."
                      value={appleIapPem}
                      onChange={(e) => {
                        setAppleIapPem(e.target.value)
                        setErrors((p) => ({ ...p, appleIapPem: "" }))
                      }}
                      disabled={saving}
                    />
                    {errors.appleIapPem && <p className="text-xs text-red-500">{errors.appleIapPem}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apple-iap-kid">Key ID *</Label>
                    <Input
                      id="apple-iap-kid"
                      value={appleIapKeyId}
                      onChange={(e) => {
                        setAppleIapKeyId(e.target.value)
                        setErrors((p) => ({ ...p, appleIapKeyId: "" }))
                      }}
                      className={errors.appleIapKeyId ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {errors.appleIapKeyId && <p className="text-xs text-red-500">{errors.appleIapKeyId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apple-iap-iss">Issuer ID *</Label>
                    <Input
                      id="apple-iap-iss"
                      value={appleIapIssuerId}
                      onChange={(e) => {
                        setAppleIapIssuerId(e.target.value)
                        setErrors((p) => ({ ...p, appleIapIssuerId: "" }))
                      }}
                      className={errors.appleIapIssuerId ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {errors.appleIapIssuerId && <p className="text-xs text-red-500">{errors.appleIapIssuerId}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="apple-sandbox" checked={appleSandbox} onCheckedChange={setAppleSandbox} disabled={saving} />
                <Label htmlFor="apple-sandbox" className="font-normal cursor-pointer">
                  Use sandbox StoreKit environment
                </Label>
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
