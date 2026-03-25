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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
  Plus, MoreHorizontal, Edit, Power, RefreshCw, Link2, Eye, EyeOff,
  ChevronRight, CheckCircle2, XCircle, Download
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Integration {
  id: string
  displayName: string
  authMode: string
  businessId: string
  metaAppId: string
  tokenStatus: "valid" | "expired" | "missing"
  scopes: string[]
  isDefault: boolean
  isEnabled: boolean
  lastValidatedAt: string
  updatedAt: string
}

const mockIntegrations: Integration[] = [
  {
    id: "int_001", displayName: "Main Production Token", authMode: "SYSTEM_USER", businessId: "111222333444",
    metaAppId: "987654321098765", tokenStatus: "valid", scopes: ["ads_management", "ads_read", "business_management"],
    isDefault: true, isEnabled: true, lastValidatedAt: "2026-03-24 08:00", updatedAt: "2026-03-01"
  },
  {
    id: "int_002", displayName: "APAC Region Token", authMode: "USER_TOKEN", businessId: "555666777888",
    metaAppId: "987654321098765", tokenStatus: "expired", scopes: ["ads_management", "ads_read"],
    isDefault: false, isEnabled: true, lastValidatedAt: "2026-03-10 08:00", updatedAt: "2026-02-15"
  },
  {
    id: "int_003", displayName: "Dev / Sandbox", authMode: "USER_TOKEN", businessId: "111222333444",
    metaAppId: "123456789012345", tokenStatus: "missing", scopes: [],
    isDefault: false, isEnabled: false, lastValidatedAt: "—", updatedAt: "2026-01-10"
  },
]

const tokenStatusConfig = {
  valid: { label: "Token Ready", className: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  expired: { label: "Token Expired", className: "bg-amber-100 text-amber-700", icon: <RefreshCw className="w-3 h-3" /> },
  missing: { label: "Token Missing", className: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> },
}

function MaskedInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className="h-9 text-sm pr-9 font-mono"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export function IntegrationsContent() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState(mockIntegrations)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Integration | null>(null)
  const [form, setForm] = useState({ displayName: "", authMode: "SYSTEM_USER", businessId: "", metaAppId: "", appSecret: "", accessToken: "", refreshToken: "", tokenType: "", tokenExpiresAt: "", scopes: "", isDefault: false, isEnabled: true })

  const openCreate = () => {
    setEditTarget(null)
    setForm({ displayName: "", authMode: "SYSTEM_USER", businessId: "", metaAppId: "", appSecret: "", accessToken: "", refreshToken: "", tokenType: "", tokenExpiresAt: "", scopes: "", isDefault: false, isEnabled: true })
    setDrawerOpen(true)
  }
  const openEdit = (int: Integration) => {
    setEditTarget(int)
    setForm({ displayName: int.displayName, authMode: int.authMode, businessId: int.businessId, metaAppId: int.metaAppId, appSecret: "••••••••", accessToken: "••••••••", refreshToken: "••••••••", tokenType: "Bearer", tokenExpiresAt: "", scopes: int.scopes.join(", "), isDefault: int.isDefault, isEnabled: int.isEnabled })
    setDrawerOpen(true)
  }
  const toggleEnabled = (id: string) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, isEnabled: !i.isEnabled } : i))
    toast({ title: "Integration updated" })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <span>Meta Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">Integrations</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Link2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meta Integrations</h1>
              <p className="text-sm text-slate-500">Manage Meta API tokens and business account connections</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast({ title: "OAuth flow initiated" })}>
            <Link2 className="w-4 h-4 mr-2" />Open OAuth Flow
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Create Integration
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium">Name</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-32">Auth Mode</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Business ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Meta App ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-36">Token Status</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Scopes</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Default</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Enabled</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-32">Last Validated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations.map(int => {
              const ts = tokenStatusConfig[int.tokenStatus]
              return (
                <TableRow key={int.id} className="text-sm">
                  <TableCell className="font-medium text-slate-900">{int.displayName}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{int.authMode}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{int.businessId}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{int.metaAppId}</TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] flex items-center gap-1 w-fit ${ts.className}`}>
                      {ts.icon}{ts.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{int.scopes.slice(0, 2).join(", ")}{int.scopes.length > 2 ? ` +${int.scopes.length - 2}` : ""}</TableCell>
                  <TableCell>{int.isDefault && <Badge className="bg-blue-100 text-blue-700 text-[11px]">Default</Badge>}</TableCell>
                  <TableCell>
                    <Switch checked={int.isEnabled} onCheckedChange={() => toggleEnabled(int.id)} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{int.lastValidatedAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(int)}>
                          <Edit className="w-4 h-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleEnabled(int.id)}>
                          <Power className="w-4 h-4 mr-2" />{int.isEnabled ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast({ title: "Syncing ad accounts..." })}>
                          <Download className="w-4 h-4 mr-2" />Sync Ad Accounts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "Token refreshed" })}>
                          <RefreshCw className="w-4 h-4 mr-2" />Refresh Token
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="w-full max-w-[600px] p-0 gap-0 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {editTarget ? "Edit Integration" : "Create Integration"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Display Name <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Auth Mode</Label>
              <Select value={form.authMode} onValueChange={v => setForm(f => ({ ...f, authMode: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM_USER">SYSTEM_USER</SelectItem>
                  <SelectItem value="USER_TOKEN">USER_TOKEN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Meta Business ID <span className="text-red-500">*</span></Label>
                <Input className="h-9 text-sm font-mono" value={form.businessId} onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Meta App ID <span className="text-red-500">*</span></Label>
                <Input className="h-9 text-sm font-mono" value={form.metaAppId} onChange={e => setForm(f => ({ ...f, metaAppId: e.target.value }))} />
              </div>
            </div>
            <MaskedInput label="App Secret" value={form.appSecret} onChange={v => setForm(f => ({ ...f, appSecret: v }))} required />
            <MaskedInput label="Access Token" value={form.accessToken} onChange={v => setForm(f => ({ ...f, accessToken: v }))} required />
            <MaskedInput label="Refresh Token" value={form.refreshToken} onChange={v => setForm(f => ({ ...f, refreshToken: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Token Type</Label>
                <Input className="h-9 text-sm" value={form.tokenType} onChange={e => setForm(f => ({ ...f, tokenType: e.target.value }))} placeholder="Bearer" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Token Expires At</Label>
                <Input type="datetime-local" className="h-9 text-sm" value={form.tokenExpiresAt} onChange={e => setForm(f => ({ ...f, tokenExpiresAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Scopes (comma-separated)</Label>
              <Input className="h-9 text-sm" value={form.scopes} onChange={e => setForm(f => ({ ...f, scopes: e.target.value }))} placeholder="ads_management, ads_read" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} />
                Set as Default
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <Switch checked={form.isEnabled} onCheckedChange={v => setForm(f => ({ ...f, isEnabled: v }))} />
                Enabled
              </label>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setDrawerOpen(false); toast({ title: editTarget ? "Integration updated" : "Integration created" }) }}>
              {editTarget ? "Save Changes" : "Create Integration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
