"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Plug,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Loader2,
  Clock,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddEditAccountModal } from "./add-edit-account-modal"
import { DataAccountOverviewTab } from "./tabs/data-account-overview-tab"
import { DataAccountSyncHistoryTab } from "./tabs/data-account-sync-history-tab"
import { DataAccountSettingsTab } from "./tabs/data-account-settings-tab"
import { DataAccountAppsFlyerAppsTab } from "./data-account-appsflyer-apps-tab"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { dataAccountsApi, type DataAccountItem } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

type NetworkType = "admob" | "applovin" | "xmp" | "appsflyer" | "qonversion" | "apple"

const networkConfig: Record<NetworkType, { label: string; color: string; badgeClass: string }> = {
  admob: { label: "AdMob", color: "bg-primary", badgeClass: "bg-primary/10 text-primary border-primary/20" },
  applovin: { label: "AppLovin", color: "bg-emerald-500", badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25" },
  xmp: { label: "XMP / Mintegral", color: "bg-purple-500", badgeClass: "bg-purple-100 text-purple-700 border-purple-200" },
  appsflyer: { label: "AppsFlyer", color: "bg-sky-500", badgeClass: "bg-sky-100 text-sky-800 border-sky-200" },
  qonversion: { label: "Qonversion", color: "bg-fuchsia-500", badgeClass: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
  apple: { label: "Apple App Store", color: "bg-muted-foreground", badgeClass: "bg-muted text-foreground border-border" },
}

const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  active: { label: "Active", badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25", dotClass: "bg-emerald-500" },
  error: { label: "Error", badgeClass: "bg-destructive/10 text-destructive border-destructive/30", dotClass: "bg-destructive/100" },
  disabled: { label: "Disabled", badgeClass: "bg-muted text-muted-foreground border-border", dotClass: "bg-muted-foreground" },
}

// ─── Network avatar icon ──────────────────────────────────────────────────────

function NetworkAvatar({ network }: { network: NetworkType }) {
  const initials: Record<NetworkType, string> = { admob: "AM", applovin: "AL", xmp: "XM", appsflyer: "AF", qonversion: "QO", apple: "AP" }
  const colors: Record<NetworkType, string> = {
    admob: "bg-primary/10 text-primary",
    applovin: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    xmp: "bg-purple-100 text-purple-700",
    appsflyer: "bg-sky-100 text-sky-800",
    qonversion: "bg-fuchsia-100 text-fuchsia-800",
    apple: "bg-muted text-foreground",
  }
  return (
    <div className={`h-16 w-16 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${colors[network]}`}>
      {initials[network]}
    </div>
  )
}

// ─── Info card ────────────────────────────────────────────────────────────────

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  )
}

// ─── Parse composite ID ───────────────────────────────────────────────────────

function parseAccountId(compositeId: string): { network: string; id: number } | null {
  const match = compositeId.match(/^(admob|applovin|xmp|appsflyer|qonversion|apple)-(\d+)$/)
  if (!match) return null
  return { network: match[1], id: Number(match[2]) }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DataAccountDetailContentProps {
  accountId: string
}

export function DataAccountDetailContent({ accountId }: DataAccountDetailContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const parsed = parseAccountId(accountId)

  const { data: account, loading, refetch } = useApi<DataAccountItem>(
    () => parsed ? dataAccountsApi.getById(parsed.network, parsed.id) : Promise.reject("Invalid ID"),
    { cacheKey: `data-account-${accountId}`, enabled: !!parsed }
  )

  const [editOpen, setEditOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading account details...</p>
      </div>
    )
  }

  if (!account || !parsed) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-semibold text-foreground mb-2">Account not found</p>
        <p className="text-sm text-muted-foreground mb-4">The requested data account does not exist.</p>
        <Button asChild variant="outline">
          <Link href="/data-accounts">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Data Accounts
          </Link>
        </Button>
      </div>
    )
  }

  const net = networkConfig[account.network as NetworkType] ?? networkConfig.admob
  const stat = statusConfig[account.status] || statusConfig.active



  const handleToggleStatus = async () => {
    try {
      if (account.enabled) {
        await dataAccountsApi.disable(account.network, account.id)
        toast({ title: "Account disabled" })
      } else {
        await dataAccountsApi.enable(account.network, account.id)
        toast({ title: "Account enabled" })
      }
      invalidateCache("data-accounts-list")
      refetch()
    } catch {
      toast({ title: "Error", description: "Failed to update account status.", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    try {
      await dataAccountsApi.delete(account.network, account.id)
      toast({ title: "Account deleted", description: `"${account.name}" has been deleted.` })
      invalidateCache("data-accounts-list")
      router.push("/data-accounts")
    } catch {
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" })
    }
  }

  const editAccountData = {
    id: String(account.id),
    name: account.name,
    network: account.network as "admob" | "applovin" | "xmp" | "appsflyer" | "qonversion" | "apple",
    publisherId: account.network === "admob" ? account.accountId : undefined,
    clientId: account.network === "admob" ? account.clientId : undefined,
    clientSecret: account.network === "admob" ? account.clientSecret : undefined,
    accessToken: account.network === "admob" ? account.accessToken : undefined,
    refreshToken: account.network === "admob" ? account.refreshToken : undefined,
    tokenType: account.network === "admob" ? account.tokenType : undefined,
    defaultAppType: account.network === "admob" ? (account.defaultAppType ?? undefined) : undefined,
    reportKey: account.network === "applovin" ? account.reportKey : undefined,
    baseUrl:
      account.network === "applovin" || account.network === "appsflyer" ? account.baseUrl : undefined,
    xmpClientId: account.network === "xmp" ? account.xmpClientId : undefined,
    xmpClientSecret: account.network === "xmp" ? account.xmpClientSecret : undefined,
    isDefault: account.network === "appsflyer" || account.network === "qonversion" ? account.isDefault : undefined,
    qonProjectKey: account.network === "qonversion" ? account.qonProjectKey : undefined,
    qonApiBaseUrl: account.network === "qonversion" ? account.qonApiBaseUrl : undefined,
    qonGcsBucketName: account.network === "qonversion" ? account.qonGcsBucketName ?? undefined : undefined,
    qonHasGcsJson: account.network === "qonversion" ? account.qonHasGcsJson : undefined,
    appleVendorNumber: account.network === "apple" ? account.appleVendorNumber ?? undefined : undefined,
    appleAscKeyId: account.network === "apple" ? account.appleAscKeyId ?? undefined : undefined,
    appleAscIssuerId: account.network === "apple" ? account.appleAscIssuerId ?? undefined : undefined,
    appleHasAscPrivateKey: account.network === "apple" ? account.appleHasAscPrivateKey : undefined,
    appleIapKeyId: account.network === "apple" ? account.appleIapKeyId ?? undefined : undefined,
    appleIapIssuerId: account.network === "apple" ? account.appleIapIssuerId ?? undefined : undefined,
    appleHasIapPrivateKey: account.network === "apple" ? account.appleHasIapPrivateKey : undefined,
    appleUseSandboxStoreKit: account.network === "apple" ? account.appleUseSandboxStoreKit : undefined,
  }

  // Build account-like object for tabs that expect it
  const accountForTabs = {
    id: String(account.id),
    name: account.name,
    accountId: account.accountId,
    email: "",
    network: account.network as NetworkType,
    status: account.status as "active" | "error" | "inactive",
    lastSynced: "-",
    lastSyncedExact: "",
    nextSync: "-",
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    avgDuration: "-",
    linkedApps: 0,
    autoSync: account.enabled,
    syncInterval: "1h",
    publisherId: account.network === "admob" ? account.accountId : undefined,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    enabled: account.enabled,
    isDefault: account.isDefault,
    // AdMob
    clientId: account.clientId,
    clientSecret: account.clientSecret,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    tokenType: account.tokenType,
    tokenExpiresAt: account.tokenExpiresAt,
    timezoneOffsetHours: account.timezoneOffsetHours,
    // AppLovin
    reportKey: account.reportKey,
    baseUrl: account.baseUrl,
    // XMP
    xmpClientId: account.xmpClientId,
    xmpClientSecret: account.xmpClientSecret,
    // AppsFlyer
    apiV2Token: account.apiV2Token,
    pushWebhookAuthToken: account.pushWebhookAuthToken,
    // Qonversion
    qonProjectKey: account.qonProjectKey,
    qonSecretKey: account.qonSecretKey,
    qonWebhookAuthToken: account.qonWebhookAuthToken,
    qonApiBaseUrl: account.qonApiBaseUrl,
    qonHasGcsJson: account.qonHasGcsJson,
    qonGcsBucketName: account.qonGcsBucketName,
    qonHasDashboardCookie: account.qonHasDashboardCookie,
    qonDashboardAccountUid: account.qonDashboardAccountUid,
    qonDashboardCookieUpdatedAt: account.qonDashboardCookieUpdatedAt,
    appleVendorNumber: account.appleVendorNumber,
    appleAscKeyId: account.appleAscKeyId,
    appleAscIssuerId: account.appleAscIssuerId,
    appleHasAscPrivateKey: account.appleHasAscPrivateKey,
    appleIapKeyId: account.appleIapKeyId,
    appleIapIssuerId: account.appleIapIssuerId,
    appleHasIapPrivateKey: account.appleHasIapPrivateKey,
    appleUseSandboxStoreKit: account.appleUseSandboxStoreKit,
    appleLastSalesSyncAt: account.appleLastSalesSyncAt,
    appleLastAnalyticsSyncAt: account.appleLastAnalyticsSyncAt,
    appleLastFinanceSyncAt: account.appleLastFinanceSyncAt,
    appleLastMappingSyncAt: account.appleLastMappingSyncAt,
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Breadcrumb */}
        <Link
          href="/data-accounts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Data Accounts
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <NetworkAvatar network={account.network as NetworkType} />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
                <Badge className={stat.badgeClass}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${stat.dotClass}`} />
                  {stat.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 font-mono">{account.accountId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {account.network === "apple" && account.appleVendorNumber && (
              <Button variant="outline" className="gap-2 bg-transparent" size="sm" asChild>
                <Link
                  href={`/data-sources/apple?vendor=${encodeURIComponent(account.appleVendorNumber)}`}
                >
                  Apple insights
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard label="Network">
            <Badge className={net.badgeClass}>{net.label}</Badge>
          </InfoCard>

          <InfoCard label="Default Account">
            <span className="text-sm">{account.isDefault ? "Yes" : "No"}</span>
          </InfoCard>

          <InfoCard label="Created">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{new Date(account.createdAt).toLocaleDateString()}</span>
            </div>
          </InfoCard>

          <InfoCard label="Last Updated">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-normal text-muted-foreground">{new Date(account.updatedAt).toLocaleDateString()}</span>
            </div>
          </InfoCard>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted flex flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {account.network === "appsflyer" && (
              <TabsTrigger value="af-apps">AF Apps</TabsTrigger>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DataAccountOverviewTab account={accountForTabs} />
          </TabsContent>

          {account.network === "appsflyer" && (
            <TabsContent value="af-apps">
              <DataAccountAppsFlyerAppsTab accountId={account.id} />
            </TabsContent>
          )}

          <TabsContent value="settings">
            <DataAccountSettingsTab
              account={accountForTabs}
              onEdit={() => setEditOpen(true)}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        <AddEditAccountModal
          open={editOpen}
          onOpenChange={setEditOpen}
          editAccount={editAccountData}
          onSaved={refetch}
        />
      </div>
    </TooltipProvider>
  )
}
