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

type NetworkType = "admob" | "applovin" | "xmp" | "appsflyer" | "qonversion"

const networkConfig: Record<NetworkType, { label: string; color: string; badgeClass: string }> = {
  admob: { label: "AdMob", color: "bg-blue-500", badgeClass: "bg-blue-100 text-blue-700 border-blue-200" },
  applovin: { label: "AppLovin", color: "bg-green-500", badgeClass: "bg-green-100 text-green-700 border-green-200" },
  xmp: { label: "XMP / Mintegral", color: "bg-purple-500", badgeClass: "bg-purple-100 text-purple-700 border-purple-200" },
  appsflyer: { label: "AppsFlyer", color: "bg-sky-500", badgeClass: "bg-sky-100 text-sky-800 border-sky-200" },
  qonversion: { label: "Qonversion", color: "bg-fuchsia-500", badgeClass: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
}

const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  active: { label: "Active", badgeClass: "bg-green-100 text-green-700 border-green-200", dotClass: "bg-green-500" },
  error: { label: "Error", badgeClass: "bg-red-100 text-red-700 border-red-200", dotClass: "bg-red-500" },
  disabled: { label: "Disabled", badgeClass: "bg-slate-100 text-slate-600 border-slate-200", dotClass: "bg-slate-400" },
}

// ─── Network avatar icon ──────────────────────────────────────────────────────

function NetworkAvatar({ network }: { network: NetworkType }) {
  const initials: Record<NetworkType, string> = { admob: "AM", applovin: "AL", xmp: "XM", appsflyer: "AF", qonversion: "QO" }
  const colors: Record<NetworkType, string> = {
    admob: "bg-blue-100 text-blue-700",
    applovin: "bg-green-100 text-green-700",
    xmp: "bg-purple-100 text-purple-700",
    appsflyer: "bg-sky-100 text-sky-800",
    qonversion: "bg-fuchsia-100 text-fuchsia-800",
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
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm font-medium text-slate-900">{children}</div>
    </div>
  )
}

// ─── Parse composite ID ───────────────────────────────────────────────────────

function parseAccountId(compositeId: string): { network: string; id: number } | null {
  const match = compositeId.match(/^(admob|applovin|xmp|appsflyer|qonversion)-(\d+)$/)
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500">Loading account details...</p>
      </div>
    )
  }

  if (!account || !parsed) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-semibold text-slate-900 mb-2">Account not found</p>
        <p className="text-sm text-slate-500 mb-4">The requested data account does not exist.</p>
        <Button asChild variant="outline">
          <Link href="/data-accounts">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Data Accounts
          </Link>
        </Button>
      </div>
    )
  }

  const net =
    networkConfig[account.network as NetworkType] ??
    networkConfig.admob
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
    network: account.network as "admob" | "applovin" | "xmp" | "appsflyer" | "qonversion",
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
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* Breadcrumb */}
        <Link
          href="/data-accounts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
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
                <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
                <Badge className={stat.badgeClass}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${stat.dotClass}`} />
                  {stat.label}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5 font-mono">{account.accountId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">


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
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600">{new Date(account.createdAt).toLocaleDateString()}</span>
            </div>
          </InfoCard>

          <InfoCard label="Last Updated">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-normal text-slate-600">{new Date(account.updatedAt).toLocaleDateString()}</span>
            </div>
          </InfoCard>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-100 flex flex-wrap h-auto gap-1 py-1">
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
