"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, MoreHorizontal, Edit, RefreshCw, CreditCard, ChevronRight, Download } from "lucide-react"

interface AdAccount {
  id: string
  adAccountId: string
  name: string
  integration: string
  currency: string
  timezone: string
  businessName: string
  status: "ACTIVE" | "DISABLED"
  active: boolean
  lastSyncedAt: string
}

const mockAccounts: AdAccount[] = [
  { id: "1", adAccountId: "act_111222333", name: "MediationPro Main", integration: "Main Production Token", currency: "USD", timezone: "America/New_York", businessName: "Mediation Pro Inc.", status: "ACTIVE", active: true, lastSyncedAt: "2026-03-24 06:00" },
  { id: "2", adAccountId: "act_444555666", name: "MediationPro APAC", integration: "APAC Region Token", currency: "SGD", timezone: "Asia/Singapore", businessName: "Mediation Pro APAC Pte Ltd", status: "ACTIVE", active: true, lastSyncedAt: "2026-03-24 06:00" },
  { id: "3", adAccountId: "act_777888999", name: "MediationPro EU", integration: "Main Production Token", currency: "EUR", timezone: "Europe/Berlin", businessName: "Mediation Pro EU GmbH", status: "DISABLED", active: false, lastSyncedAt: "2026-03-01 06:00" },
  { id: "4", adAccountId: "act_000111222", name: "Dev / Test Account", integration: "Dev / Sandbox", currency: "USD", timezone: "UTC", businessName: "Mediation Pro Inc.", status: "ACTIVE", active: false, lastSyncedAt: "—" },
]

export function AdAccountsContent() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState(mockAccounts)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdAccount | null>(null)
  const [search, setSearch] = useState("")

  const filtered = accounts.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.adAccountId.includes(search)
  )

  const openEdit = (a: AdAccount) => { setEditTarget(a); setDrawerOpen(true) }
  const openCreate = () => { setEditTarget(null); setDrawerOpen(true) }

  return (
    <div className="space-y-5">
      {/* Header */}
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
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Syncing from integration..." })}>
            <Download className="w-4 h-4 mr-2" />Sync from Integration
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Add Account
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Search by name or account ID..."
          className="h-9 text-sm w-72"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium">Ad Account ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Name</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Integration</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Currency</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Timezone</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Business Name</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Status</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Active</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-32">Last Synced</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(account => (
              <TableRow key={account.id} className="text-sm">
                <TableCell className="font-mono text-xs text-blue-700">{account.adAccountId}</TableCell>
                <TableCell className="font-medium text-slate-900">{account.name}</TableCell>
                <TableCell className="text-xs text-slate-600">{account.integration}</TableCell>
                <TableCell className="text-xs text-slate-600">{account.currency}</TableCell>
                <TableCell className="text-xs text-slate-600">{account.timezone}</TableCell>
                <TableCell className="text-xs text-slate-600">{account.businessName}</TableCell>
                <TableCell>
                  <Badge className={account.status === "ACTIVE" ? "bg-green-100 text-green-700 text-[11px]" : "bg-slate-100 text-slate-500 text-[11px]"}>
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={account.active}
                    onCheckedChange={() => {
                      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, active: !a.active } : a))
                      toast({ title: "Account updated" })
                    }}
                  />
                </TableCell>
                <TableCell className="text-xs text-slate-500">{account.lastSyncedAt}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(account)}>
                        <Edit className="w-4 h-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: "Account synced" })}>
                        <RefreshCw className="w-4 h-4 mr-2" />Sync
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="w-full max-w-[560px] p-0 gap-0 rounded-xl overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {editTarget ? "Edit Ad Account" : "Add Ad Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ad Account ID <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm font-mono" defaultValue={editTarget?.adAccountId || ""} placeholder="act_xxxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm" defaultValue={editTarget?.name || ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Integration</Label>
              <Select defaultValue={editTarget?.integration || ""}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select integration..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Production Token">Main Production Token</SelectItem>
                  <SelectItem value="APAC Region Token">APAC Region Token</SelectItem>
                  <SelectItem value="Dev / Sandbox">Dev / Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Currency</Label>
                <Input className="h-9 text-sm" defaultValue={editTarget?.currency || ""} placeholder="USD" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Timezone</Label>
                <Input className="h-9 text-sm" defaultValue={editTarget?.timezone || ""} placeholder="America/New_York" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Business Name</Label>
              <Input className="h-9 text-sm" defaultValue={editTarget?.businessName || ""} />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setDrawerOpen(false); toast({ title: editTarget ? "Account updated" : "Account added" }) }}>
              {editTarget ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
