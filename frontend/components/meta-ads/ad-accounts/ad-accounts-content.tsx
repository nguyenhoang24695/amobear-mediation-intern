"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { metaAdAccountsApi, metaIntegrationsApi } from "@/lib/api/meta-ads"
import type { MetaAdAccountDto, UpsertMetaAdAccountRequestDto } from "@/types/meta-ads"
import { MoreHorizontal, Edit, RefreshCw, CreditCard, ChevronRight, Download, Loader2 } from "lucide-react"

const SCREEN_META_ACCOUNTS = "s-meta-accounts"

const emptyForm: UpsertMetaAdAccountRequestDto = {
  metaIntegrationId: 0,
  metaAdAccountId: "",
  name: "",
  currency: "",
  timeZoneName: "",
  timezoneOffsetMinutes: null,
  businessId: "",
  businessName: "",
  status: "active",
  isActive: true,
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function formatAdAccountStatus(value?: string | null) {
  switch ((value ?? "").trim()) {
    case "1":
      return "Active"
    case "2":
      return "Disabled"
    case "3":
      return "Unsettled"
    case "7":
      return "Pending Risk Review"
    case "8":
      return "Pending Settlement"
    case "9":
      return "In Grace Period"
    case "100":
      return "Pending Closure"
    case "101":
      return "Closed"
    case "201":
      return "Any Active"
    default:
      if (!value) return "—"
      return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
  }
}
export function AdAccountsContent() {
  const { toast } = useToast()
  const canEdit = hasScreenFunction(SCREEN_META_ACCOUNTS, "edit")
  const canDisableEnable = hasScreenFunction(SCREEN_META_ACCOUNTS, "disable-enable")

  const {
    data: accounts,
    loading,
    error,
    refetch,
  } = useApi(
    () => metaAdAccountsApi.list(),
    { cacheKey: "meta-ad-accounts:list" }
  )

  const { data: integrations } = useApi(
    () => metaIntegrationsApi.list(),
    { cacheKey: "meta-integrations:list" }
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MetaAdAccountDto | null>(null)
  const [form, setForm] = useState<UpsertMetaAdAccountRequestDto>(emptyForm)
  const [syncIntegrationId, setSyncIntegrationId] = useState("")
  const [search, setSearch] = useState("")
  const [metaIdFilter, setMetaIdFilter] = useState("")
  const [businessIdFilter, setBusinessIdFilter] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(null)

  const integrationById = useMemo(() => {
    return new Map((integrations ?? []).map((integration) => [integration.id, integration.displayName]))
  }, [integrations])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const metaIdQuery = metaIdFilter.trim().toLowerCase()
    const businessIdQuery = businessIdFilter.trim().toLowerCase()

    return (accounts ?? []).filter((account) => {
      const matchesSearch = !query || [
        account.name.toLowerCase(),
        account.metaAdAccountId.toLowerCase(),
        account.businessId?.toLowerCase() ?? "",
        account.businessName?.toLowerCase() ?? "",
        integrationById.get(account.metaIntegrationId)?.toLowerCase() ?? "",
      ].some((value) => value.includes(query))

      const matchesMetaId = !metaIdQuery || account.metaAdAccountId.toLowerCase().includes(metaIdQuery)
      const matchesBusinessId = !businessIdQuery || (account.businessId?.toLowerCase() ?? "").includes(businessIdQuery)

      return matchesSearch && matchesMetaId && matchesBusinessId
    })
  }, [accounts, businessIdFilter, integrationById, metaIdFilter, search])

  const openEdit = (account: MetaAdAccountDto) => {
    setEditTarget(account)
    setForm({
      metaIntegrationId: account.metaIntegrationId,
      metaAdAccountId: account.metaAdAccountId,
      name: account.name,
      currency: account.currency ?? "",
      timeZoneName: account.timeZoneName ?? "",
      timezoneOffsetMinutes: account.timezoneOffsetMinutes ?? null,
      businessId: account.businessId ?? "",
      businessName: account.businessName ?? "",
      status: account.status,
      isActive: account.isActive,
    })
    setDrawerOpen(true)
  }


  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      if (!editTarget) {
        throw new Error("Manual ad account creation has been removed. Sync from integration instead.")
      }

      await metaAdAccountsApi.update(editTarget.id, form)

      invalidateCache("meta-ad-accounts:list")
      await refetch()
      setDrawerOpen(false)
      toast({ title: "Account updated" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to save ad account."
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (account: MetaAdAccountDto) => {
    try {
      setRowActionLoadingId(account.id)
      if (account.isActive) {
        await metaAdAccountsApi.disable(account.id)
      } else {
        await metaAdAccountsApi.enable(account.id)
      }

      invalidateCache("meta-ad-accounts:list")
      await refetch()
      toast({ title: account.isActive ? "Account disabled" : "Account enabled" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to update account."
      toast({ title: "Update failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleSyncSingleAccount = async (account: MetaAdAccountDto) => {
    try {
      setRowActionLoadingId(account.id)
      await metaIntegrationsApi.syncAdAccounts(account.metaIntegrationId)
      invalidateCache("meta-ad-accounts:list")
      await refetch()
      toast({ title: "Account sync completed" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to sync account."
      toast({ title: "Sync failed", description: message, variant: "destructive" })
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleSyncIntegration = async () => {
    try {
      setSubmitting(true)
      await metaIntegrationsApi.syncAdAccounts(Number(syncIntegrationId))
      invalidateCache("meta-ad-accounts:list")
      await refetch()
      setSyncDialogOpen(false)
      toast({ title: "Ad accounts synced" })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to sync integration."
      toast({ title: "Sync failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <span>Meta Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">Ad Accounts</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meta Ad Accounts</h1>
              <p className="text-sm text-slate-500">Manage synced Meta ad accounts and their connection status</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setSyncDialogOpen(true)} disabled={(integrations?.length ?? 0) === 0}>
              <Download className="w-4 h-4 mr-2" />
              Sync from Integration
            </Button>
          ) : null}

        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name, integration, Meta ID, or business..."
          className="h-9 text-sm w-72"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Input
          placeholder="Filter by Meta Ad Account ID..."
          className="h-9 text-sm w-64 font-mono"
          value={metaIdFilter}
          onChange={(event) => setMetaIdFilter(event.target.value)}
        />
        <Input
          placeholder="Filter by Business ID..."
          className="h-9 text-sm w-56 font-mono"
          value={businessIdFilter}
          onChange={(event) => setBusinessIdFilter(event.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium">Meta Ad Account ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Name</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Integration</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Currency</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Timezone</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Business ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Business Name</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Status</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Active</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-32">Last Synced</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading ad accounts...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-sm text-red-600">
                  {error.message}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-sm text-slate-400">
                  No ad accounts found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((account) => {
                const isBusy = rowActionLoadingId === account.id
                return (
                  <TableRow key={account.id} className="text-sm">
                    <TableCell className="font-mono text-xs text-blue-700">{account.metaAdAccountId}</TableCell>
                    <TableCell className="font-medium text-slate-900">{account.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{integrationById.get(account.metaIntegrationId) ?? `Integration ${account.metaIntegrationId}`}</TableCell>
                    <TableCell className="text-xs text-slate-600">{account.currency ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-600">{account.timeZoneName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{account.businessId ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-600">{account.businessName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={formatAdAccountStatus(account.status) === "Active" ? "bg-green-100 text-green-700 text-[11px]" : formatAdAccountStatus(account.status) === "Disabled" || formatAdAccountStatus(account.status) === "Closed" ? "bg-red-100 text-red-700 text-[11px]" : "bg-slate-100 text-slate-500 text-[11px]"}>
                        {formatAdAccountStatus(account.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={account.isActive} onCheckedChange={() => canDisableEnable && void handleToggleActive(account)} disabled={!canDisableEnable || isBusy} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(account.lastSyncedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => openEdit(account)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => void handleSyncSingleAccount(account)}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync
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
        <DialogContent className="w-full max-w-[560px] p-0 gap-0 rounded-xl overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Edit Ad Account
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Ad Account ID <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 text-sm font-mono"
                value={form.metaAdAccountId}
                onChange={(event) => setForm((current) => ({ ...current, metaAdAccountId: event.target.value }))}
                placeholder="act_xxxxxxxxx"
                disabled={!!editTarget}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input className="h-9 text-sm" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Integration</Label>
              <Select value={form.metaIntegrationId.toString()} onValueChange={(value) => setForm((current) => ({ ...current, metaIntegrationId: Number(value) }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select integration..." />
                </SelectTrigger>
                <SelectContent>
                  {(integrations ?? []).map((integration) => (
                    <SelectItem key={integration.id} value={integration.id.toString()}>
                      {integration.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Currency</Label>
                <Input className="h-9 text-sm" value={form.currency ?? ""} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} placeholder="USD" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Timezone</Label>
                <Input className="h-9 text-sm" value={form.timeZoneName ?? ""} onChange={(event) => setForm((current) => ({ ...current, timeZoneName: event.target.value }))} placeholder="America/New_York" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Timezone Offset Minutes</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.timezoneOffsetMinutes ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, timezoneOffsetMinutes: event.target.value ? Number(event.target.value) : null }))}
                placeholder="e.g. -300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Business ID</Label>
              <Input className="h-9 text-sm" value={form.businessId ?? ""} onChange={(event) => setForm((current) => ({ ...current, businessId: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Business Name</Label>
              <Input className="h-9 text-sm" value={form.businessName ?? ""} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(value) => setForm((current) => ({ ...current, isActive: value }))} />
              <Label className="text-sm text-slate-700 cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void handleSubmit()}
              disabled={submitting || !form.metaIntegrationId || !form.metaAdAccountId.trim() || !form.name.trim()}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="w-full max-w-[460px] p-0 gap-0 rounded-xl overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">Sync Ad Accounts</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Integration <span className="text-red-500">*</span>
              </Label>
              <Select value={syncIntegrationId} onValueChange={setSyncIntegrationId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select integration..." />
                </SelectTrigger>
                <SelectContent>
                  {(integrations ?? []).map((integration) => (
                    <SelectItem key={integration.id} value={integration.id.toString()}>
                      {integration.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <Button variant="ghost" className="text-slate-600" onClick={() => setSyncDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleSyncIntegration()} disabled={submitting || !syncIntegrationId}>
              {submitting ? "Syncing..." : "Sync"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



