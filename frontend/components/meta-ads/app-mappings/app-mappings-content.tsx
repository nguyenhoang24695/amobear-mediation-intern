"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Plus, MoreHorizontal, Edit, Trash2, ChevronRight, GitMerge, Search,
} from "lucide-react"
import Image from "next/image"

interface AppMapping {
  id: string
  appId: string
  appName: string
  appIcon: string
  platform: "ANDROID" | "IOS"
  adAccountId: string
  adAccountName: string
  metaAppId: string
  isEnabled: boolean
  createdAt: string
}

const mockMappings: AppMapping[] = [
  {
    id: "m1", appId: "app_001", appName: "Weather Now: Radar & Forecast", appIcon: "/weather-app-icon.png",
    platform: "ANDROID", adAccountId: "act_111222333", adAccountName: "MediationPro Main",
    metaAppId: "6453210987654321", isEnabled: true, createdAt: "2026-02-10",
  },
  {
    id: "m2", appId: "app_001", appName: "Weather Now: Radar & Forecast", appIcon: "/weather-app-icon.png",
    platform: "IOS", adAccountId: "act_111222333", adAccountName: "MediationPro Main",
    metaAppId: "6453210987654322", isEnabled: true, createdAt: "2026-02-10",
  },
  {
    id: "m3", appId: "app_002", appName: "Word Master - Brain Puzzle", appIcon: "/word-game-icon.jpg",
    platform: "ANDROID", adAccountId: "act_444555666", adAccountName: "MediationPro APAC",
    metaAppId: "6453210987654323", isEnabled: true, createdAt: "2026-02-18",
  },
  {
    id: "m4", appId: "app_003", appName: "Speed Racer Rush", appIcon: "/racing-game-icon.png",
    platform: "ANDROID", adAccountId: "act_111222333", adAccountName: "MediationPro Main",
    metaAppId: "6453210987654324", isEnabled: false, createdAt: "2026-03-01",
  },
  {
    id: "m5", appId: "app_004", appName: "Bubble Pop Blast", appIcon: "/bubble-game-icon.jpg",
    platform: "IOS", adAccountId: "act_444555666", adAccountName: "MediationPro APAC",
    metaAppId: "6453210987654325", isEnabled: true, createdAt: "2026-03-12",
  },
]

const PLATFORM_COLORS: Record<string, string> = {
  ANDROID: "bg-green-100 text-green-700",
  IOS: "bg-slate-100 text-slate-600",
}

const emptyForm = {
  appId: "", appName: "", platform: "ANDROID" as "ANDROID" | "IOS",
  adAccountId: "", metaAppId: "", isEnabled: true,
}

export function AppMappingsContent() {
  const { toast } = useToast()
  const [mappings, setMappings] = useState(mockMappings)
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AppMapping | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppMapping | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = mappings.filter((m) => {
    if (search && !m.appName.toLowerCase().includes(search.toLowerCase()) && !m.metaAppId.includes(search)) return false
    if (platformFilter !== "all" && m.platform !== platformFilter) return false
    if (accountFilter !== "all" && m.adAccountId !== accountFilter) return false
    return true
  })

  const uniqueAccounts = Array.from(new Set(mappings.map((m) => m.adAccountId))).map((id) => ({
    id, name: mappings.find((m) => m.adAccountId === id)!.adAccountName,
  }))

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDrawerOpen(true)
  }

  const openEdit = (m: AppMapping) => {
    setEditTarget(m)
    setForm({ appId: m.appId, appName: m.appName, platform: m.platform, adAccountId: m.adAccountId, metaAppId: m.metaAppId, isEnabled: m.isEnabled })
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (editTarget) {
      setMappings((prev) => prev.map((m) => m.id === editTarget.id ? { ...m, ...form, adAccountName: uniqueAccounts.find(a => a.id === form.adAccountId)?.name ?? m.adAccountName } : m))
      toast({ title: "Mapping updated" })
    } else {
      const newMapping: AppMapping = {
        id: `m${Date.now()}`, appIcon: "/placeholder.svg", appName: form.appName,
        appId: form.appId, platform: form.platform, adAccountId: form.adAccountId,
        adAccountName: uniqueAccounts.find(a => a.id === form.adAccountId)?.name ?? form.adAccountId,
        metaAppId: form.metaAppId, isEnabled: form.isEnabled, createdAt: new Date().toISOString().split("T")[0],
      }
      setMappings((prev) => [...prev, newMapping])
      toast({ title: "Mapping created" })
    }
    setDrawerOpen(false)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    setMappings((prev) => prev.filter((m) => m.id !== deleteTarget.id))
    toast({ title: "Mapping deleted" })
    setDeleteTarget(null)
  }

  const toggleEnabled = (id: string) => {
    setMappings((prev) => prev.map((m) => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m))
    toast({ title: "Mapping updated" })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <span>Meta Ads</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">App Mappings</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <GitMerge className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">App Mappings</h1>
              <p className="text-sm text-slate-500">
                Link your apps to Meta ad accounts and Meta App IDs for campaign targeting
              </p>
            </div>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Add Mapping
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by app name or Meta App ID..."
            className="h-9 text-sm pl-8 w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-9 w-36 text-sm bg-white">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ANDROID">Android</SelectItem>
            <SelectItem value="IOS">iOS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="h-9 w-52 text-sm bg-white">
            <SelectValue placeholder="Ad Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ad Accounts</SelectItem>
            {uniqueAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} mapping{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs text-slate-500 font-medium">App</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-24">Platform</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Ad Account</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium">Meta App ID</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-20">Enabled</TableHead>
              <TableHead className="text-xs text-slate-500 font-medium w-28">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                  No mappings found. Add a mapping to get started.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className="text-sm hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <Image
                          src={m.appIcon || "/placeholder.svg"}
                          alt={m.appName}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-medium text-slate-900 line-clamp-1">{m.appName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] ${PLATFORM_COLORS[m.platform]}`}>
                      {m.platform}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium text-slate-800">{m.adAccountName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{m.adAccountId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-blue-700">{m.metaAppId}</TableCell>
                  <TableCell>
                    <Switch
                      checked={m.isEnabled}
                      onCheckedChange={() => toggleEnabled(m.id)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{m.createdAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <Edit className="w-4 h-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="w-full max-w-[560px] p-0 gap-0 rounded-xl overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {editTarget ? "Edit App Mapping" : "Add App Mapping"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                App Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 text-sm"
                value={form.appName}
                onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
                placeholder="e.g. Weather Now"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm((f) => ({ ...f, platform: v as "ANDROID" | "IOS" }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANDROID">Android</SelectItem>
                  <SelectItem value="IOS">iOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Ad Account <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.adAccountId}
                onValueChange={(v) => setForm((f) => ({ ...f, adAccountId: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select ad account..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Meta App ID <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 text-sm font-mono"
                value={form.metaAppId}
                onChange={(e) => setForm((f) => ({ ...f, metaAppId: e.target.value }))}
                placeholder="e.g. 6453210987654321"
              />
              <p className="text-[11px] text-slate-400">
                Found in your Meta Business Suite under App Settings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isEnabled: v }))}
              />
              <Label className="text-sm text-slate-700 cursor-pointer">Enabled</Label>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <Button variant="ghost" className="text-slate-600" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSave}
              disabled={!form.appName || !form.adAccountId || !form.metaAppId}
            >
              {editTarget ? "Save Changes" : "Add Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the mapping for{" "}
              <span className="font-semibold text-slate-900">{deleteTarget?.appName}</span> ({deleteTarget?.platform})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
