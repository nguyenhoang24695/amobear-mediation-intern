"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, Download, ArrowLeft } from "lucide-react"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { appleStoreApi, dataAccountsApi, type DataAccountItem } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

const SCREEN_DATA_ACCOUNTS = "s-data-accounts"
const FN_VIEW = "view"

function toYmd(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtCell(v: unknown) {
  if (v === null || v === undefined) return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function vendorFromAccount(a: DataAccountItem) {
  return a.appleVendorNumber?.trim() ?? ""
}

export function AppleStoreInsightsContent() {
  const { toast } = useToast()
  const search = useSearchParams()
  const canView = hasScreenFunction(SCREEN_DATA_ACCOUNTS, FN_VIEW)

  const [appleAccounts, setAppleAccounts] = useState<DataAccountItem[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const [startDate, setStartDate] = useState(() => {
    const t = new Date()
    t.setDate(t.getDate() - 14)
    return toYmd(t)
  })
  const [endDate, setEndDate] = useState(() => toYmd(new Date()))
  const [appIdFilter, setAppIdFilter] = useState("")

  const [reconRows, setReconRows] = useState<Record<string, unknown>[]>([])
  const [dailyRows, setDailyRows] = useState<Record<string, unknown>[]>([])
  const [loadingStar, setLoadingStar] = useState(false)

  const [vendorNumber, setVendorNumber] = useState("")
  const [reportMonth, setReportMonth] = useState("")
  const [artifacts, setArtifacts] = useState<{ objectName: string; lastModified: string }[]>([])
  const [loadingArtifacts, setLoadingArtifacts] = useState(false)

  const [storeKitAccountId, setStoreKitAccountId] = useState<string>("")
  const [bundleId, setBundleId] = useState("")
  const [originalTxId, setOriginalTxId] = useState("")
  const [storeKitJson, setStoreKitJson] = useState("")
  const [loadingStoreKit, setLoadingStoreKit] = useState(false)

  const loadAppleAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const all = await dataAccountsApi.getAll()
      const apple = all.filter((a) => a.network === "apple")
      setAppleAccounts(apple)
    } catch {
      toast({ title: "Error", description: "Could not load data accounts.", variant: "destructive" })
    } finally {
      setLoadingAccounts(false)
    }
  }, [toast])

  useEffect(() => {
    if (!canView) return
    void loadAppleAccounts()
  }, [canView, loadAppleAccounts])

  useEffect(() => {
    const v = search.get("vendor")?.trim()
    if (v) setVendorNumber(v)
  }, [search])

  const selectedAccount = useMemo(
    () => appleAccounts.find((a) => String(a.id) === storeKitAccountId),
    [appleAccounts, storeKitAccountId],
  )

  const loadStarRocks = async () => {
    setLoadingStar(true)
    try {
      const [recon, daily] = await Promise.all([
        appleStoreApi.getReconciliation(startDate, endDate),
        appleStoreApi.getStoreDaily(startDate, endDate, appIdFilter.trim() || undefined),
      ])
      setReconRows(recon.rows ?? [])
      setDailyRows(daily.rows ?? [])
    } catch {
      toast({ title: "Error", description: "Failed to load StarRocks views.", variant: "destructive" })
    } finally {
      setLoadingStar(false)
    }
  }

  const listArtifacts = async () => {
    if (!vendorNumber.trim()) {
      toast({ title: "Vendor required", description: "Enter vendor number (App Store Connect).", variant: "destructive" })
      return
    }
    setLoadingArtifacts(true)
    try {
      const res = await appleStoreApi.listFinanceArtifacts(
        vendorNumber.trim(),
        reportMonth.trim() || undefined,
      )
      setArtifacts(res.items ?? [])
    } catch {
      toast({ title: "Error", description: "Could not list finance files from object storage.", variant: "destructive" })
    } finally {
      setLoadingArtifacts(false)
    }
  }

  const downloadArtifact = async (objectName: string) => {
    try {
      const { blob } = await appleStoreApi.downloadFinanceArtifactBlob(objectName)
      const name = objectName.split("/").pop() ?? "apple-finance.tsv"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: "Download failed", description: "Check permissions and object path.", variant: "destructive" })
    }
  }

  const fetchStoreKit = async () => {
    const id = Number(storeKitAccountId)
    if (!id || !bundleId.trim() || !originalTxId.trim()) {
      toast({ title: "Missing fields", description: "Pick an Apple account, bundle id, and original transaction id.", variant: "destructive" })
      return
    }
    setLoadingStoreKit(true)
    setStoreKitJson("")
    try {
      const data = await appleStoreApi.getSubscriptionStatusJson(id, bundleId.trim(), originalTxId.trim())
      setStoreKitJson(JSON.stringify(data, null, 2))
    } catch {
      toast({ title: "StoreKit request failed", description: "Verify IAP key, sandbox flag, and identifiers.", variant: "destructive" })
    } finally {
      setLoadingStoreKit(false)
    }
  }

  if (!canView) {
    return <NoPermissionView title="Apple App Store" description="You need Data Accounts view access." />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/data-sources"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Data Sources
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Apple App Store</h1>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Compare gold tables in StarRocks (sales vs Qonversion reconciliation) and download monthly finance artifacts
            stored in the data lake for accounting.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gold — store daily & reconciliation</CardTitle>
          <CardDescription>Reads from StarRocks (<code className="text-xs">gold.apple_store_daily</code>,{" "}
            <code className="text-xs">gold.apple_qon_reconciliation_daily</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="as-start">Start date</Label>
              <Input id="as-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-end">End date</Label>
              <Input id="as-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="as-app">App id filter (optional)</Label>
              <Input
                id="as-app"
                placeholder="bundle id in gold table"
                value={appIdFilter}
                onChange={(e) => setAppIdFilter(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" onClick={() => void loadStarRocks()} disabled={loadingStar} className="gap-2">
            {loadingStar ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Load tables
          </Button>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Reconciliation (Qon vs Apple)</h3>
              <div className="border rounded-lg overflow-x-auto max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(reconRows[0] ? Object.keys(reconRows[0]) : []).map((k) => (
                        <TableHead key={k} className="whitespace-nowrap text-xs">
                          {k}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconRows.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-sm text-muted-foreground">
                          No rows — pick a range and load, or run the Apple reconciliation job.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reconRows.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((v, j) => (
                            <TableCell key={j} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                              {fmtCell(v)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Apple store daily (sales-derived)</h3>
              <div className="border rounded-lg overflow-x-auto max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(dailyRows[0] ? Object.keys(dailyRows[0]) : []).map((k) => (
                        <TableHead key={k} className="whitespace-nowrap text-xs">
                          {k}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRows.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-sm text-muted-foreground">
                          No rows — widen the date range or run sales sync + transforms.
                        </TableCell>
                      </TableRow>
                    ) : (
                      dailyRows.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((v, j) => (
                            <TableCell key={j} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                              {fmtCell(v)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Finance artifacts (MinIO)</CardTitle>
          <CardDescription>
            Files written by the finance sync job under{" "}
            <code className="text-xs">raw/apple/finance/&lt;vendor&gt;/&lt;yyyy-MM&gt;/</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-2 min-w-[180px]">
              <Label>From Apple account</Label>
              <Select
                value={storeKitAccountId}
                onValueChange={(v) => {
                  setStoreKitAccountId(v)
                  const acc = appleAccounts.find((a) => String(a.id) === v)
                  if (acc) {
                    const vn = vendorFromAccount(acc)
                    if (vn) setVendorNumber(vn)
                  }
                }}
                disabled={loadingAccounts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingAccounts ? "Loading…" : "Select account"} />
                </SelectTrigger>
                <SelectContent>
                  {appleAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                      {a.appleVendorNumber ? ` · ${a.appleVendorNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-vendor">Vendor number</Label>
              <Input id="fin-vendor" value={vendorNumber} onChange={(e) => setVendorNumber(e.target.value)} placeholder="8xxxxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-month">Report month (optional)</Label>
              <Input id="fin-month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} placeholder="yyyy-MM" />
            </div>
            <Button type="button" variant="secondary" onClick={() => void listArtifacts()} disabled={loadingArtifacts}>
              {loadingArtifacts ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              List files
            </Button>
          </div>
          <div className="border rounded-lg divide-y max-h-[280px] overflow-y-auto">
            {artifacts.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No files listed yet.</p>
            ) : (
              artifacts.map((a) => (
                <div key={a.objectName} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs truncate" title={a.objectName}>
                      {a.objectName}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(a.lastModified).toLocaleString()}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => void downloadArtifact(a.objectName)}>
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">StoreKit — subscription status (on-demand)</CardTitle>
          <CardDescription>
            Uses the IAP key from the selected Apple data account. Sandbox uses the account&apos;s sandbox flag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Apple data account</Label>
              <Select value={storeKitAccountId} onValueChange={setStoreKitAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {appleAccounts.map((a) => (
                    <SelectItem key={`sk-${a.id}`} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sk-bundle">Bundle id</Label>
              <Input id="sk-bundle" value={bundleId} onChange={(e) => setBundleId(e.target.value)} placeholder="com.example.app" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sk-otid">Original transaction id</Label>
              <Input id="sk-otid" value={originalTxId} onChange={(e) => setOriginalTxId(e.target.value)} placeholder="2000000123456789" />
            </div>
          </div>
          <Button type="button" onClick={() => void fetchStoreKit()} disabled={loadingStoreKit || !selectedAccount}>
            {loadingStoreKit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Fetch JSON
          </Button>
          {storeKitJson ? (
            <pre className="text-xs bg-muted text-foreground rounded-lg p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
              {storeKitJson}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
