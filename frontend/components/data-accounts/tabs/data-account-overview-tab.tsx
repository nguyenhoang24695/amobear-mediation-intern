"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Smartphone,
  Tablet,
  ArrowRight,
  ImageIcon,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dataAccountsApi, type AccountAppItem } from "@/lib/api/services"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type NetworkType = "admob" | "applovin" | "xmp"

interface OverviewProps {
  account: {
    id: string
    network: NetworkType
    name: string
    accountId: string
    status: string
    enabled?: boolean
    isDefault?: boolean
    // AdMob
    clientId?: string
    clientSecret?: string
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    tokenExpiresAt?: string
    timezoneOffsetHours?: number
    // AppLovin
    reportKey?: string
    baseUrl?: string
    // XMP
    xmpClientId?: string
    xmpClientSecret?: string
    createdAt?: string
    updatedAt?: string
  }
}

const DetailItem = ({ label, value, isCode }: { label: string; value: React.ReactNode; isCode?: boolean }) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-slate-500">{label}</span>
    {isCode ? (
      <code className="text-sm bg-slate-50 px-2 py-1 rounded text-slate-800 font-mono break-all w-fit max-w-full">
        {value}
      </code>
    ) : (
      <span className="text-sm text-slate-900 break-words">{value}</span>
    )}
  </div>
)

export function DataAccountOverviewTab({ account }: OverviewProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const isAdMob = account.network === "admob"
  const accountId = Number(account.id)

  const { data: appsData, loading: appsLoading } = useApi<{ apps: AccountAppItem[]; total: number }>(
    () => dataAccountsApi.getApps(accountId),
    { cacheKey: `data-account-apps-${accountId}`, enabled: isAdMob && !isNaN(accountId) }
  )

  const apps = (appsData?.apps ?? []).filter(
    (app) => app.approvalState === "APPROVED" || !app.approvalState
  )

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(apps.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const displayedApps = apps.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">

      {/* Account Details */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Common fields */}
            <DetailItem label="ID" value={account.id} />
            <DetailItem label="Display Name" value={account.name} />

            {/* AdMob-specific fields */}
            {account.network === "admob" && (
              <>
                <DetailItem label="Account ID" value={account.accountId} isCode />
                <DetailItem label="Client ID" value={account.clientId || "—"} isCode={!!account.clientId} />
                <DetailItem label="Client Secret" value={account.clientSecret || "—"} isCode={!!account.clientSecret} />
                <DetailItem label="Timezone Offset Hours" value={account.timezoneOffsetHours?.toString() ?? "0"} />
                <DetailItem label="Access Token" value={account.accessToken || "—"} isCode={!!account.accessToken} />
                <DetailItem label="Refresh Token" value={account.refreshToken || "—"} isCode={!!account.refreshToken} />
                <DetailItem label="Token Type" value={account.tokenType || "—"} />
                <DetailItem label="Token Expires At" value={formatDate(account.tokenExpiresAt)} />
              </>
            )}

            {/* AppLovin-specific fields */}
            {account.network === "applovin" && (
              <>
                <DetailItem label="Report Key" value={account.reportKey || "—"} isCode={!!account.reportKey} />
                <DetailItem label="Base URL" value={account.baseUrl || "—"} isCode={!!account.baseUrl} />
              </>
            )}

            {/* XMP-specific fields */}
            {account.network === "xmp" && (
              <>
                <DetailItem label="Client ID" value={account.xmpClientId || "—"} isCode={!!account.xmpClientId} />
                <DetailItem label="Client Secret" value={account.xmpClientSecret || "—"} isCode={!!account.xmpClientSecret} />
              </>
            )}

            {/* Common status fields */}
            <DetailItem label="Is Default" value={account.isDefault ? "Yes" : "No"} />
            <DetailItem label="Enabled" value={account.enabled ? "Yes" : "No"} />

            <DetailItem label="Created At" value={formatDate(account.createdAt)} />
            <DetailItem label="Updated At" value={formatDate(account.updatedAt)} />
          </div>
        </CardContent>
      </Card>

      {/* Linked Apps */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Linked Apps</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {appsLoading ? "Loading..." : `${apps.length} apps using this account`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {appsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-slate-500">
                {isAdMob ? "No apps found for this account" : "App listing is only available for AdMob accounts"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-medium uppercase tracking-wide pl-4">App</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide">Platform</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide pr-4">App ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedApps.map((app) => (
                      <TableRow
                        key={app.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/apps/${app.appId}?from=account&accountId=${account.network}-${account.id}`)}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 rounded-lg">
                              <AvatarImage src={app.iconUri || "/placeholder.svg"} alt={app.displayName || app.appId} />
                              <AvatarFallback className="rounded-lg bg-slate-100">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-slate-900">
                              {app.displayName || app.appId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              app.platform === "IOS"
                                ? "bg-blue-100 text-blue-700 border-blue-200 text-xs"
                                : "bg-green-100 text-green-700 border-green-200 text-xs"
                            }
                          >
                            {app.platform === "IOS" ? "iOS" : "Android"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 pr-4 font-mono">{app.appId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <div className="text-sm text-slate-500">
                    Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-slate-900">
                      {Math.min(endIndex, apps.length)}
                    </span>{" "}
                    of <span className="font-medium text-slate-900">{apps.length}</span> apps
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`min-w-[28px] h-7 rounded flex items-center justify-center text-xs font-medium transition-colors ${currentPage === page
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
