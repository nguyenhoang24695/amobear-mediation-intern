"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  dataAccountsApi,
  type AppsFlyerAppAdminItem,
  type UpdateAppsFlyerAppRequest,
} from "@/lib/api/services"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DataAccountAppsFlyerAppsTabProps {
  accountId: number
}

export function DataAccountAppsFlyerAppsTab({ accountId }: DataAccountAppsFlyerAppsTabProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState<AppsFlyerAppAdminItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AppsFlyerAppAdminItem | null>(null)
  const [afAppId, setAfAppId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [pushToken, setPushToken] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteRow, setDeleteRow] = useState<AppsFlyerAppAdminItem | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const list = await dataAccountsApi.getAppsFlyerApps(accountId)
      setApps(list)
    } catch {
      toast({ title: "Error", description: "Failed to load AppsFlyer apps.", variant: "destructive" })
      setApps([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accountId
  }, [accountId])

  const openCreate = () => {
    setEditing(null)
    setAfAppId("")
    setDisplayName("")
    setEnabled(true)
    setPushToken("")
    setDialogOpen(true)
  }

  const openEdit = (row: AppsFlyerAppAdminItem) => {
    setEditing(row)
    setAfAppId(row.afAppId)
    setDisplayName(row.displayName)
    setEnabled(row.enabled)
    setPushToken("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!afAppId.trim() || !displayName.trim()) {
      toast({ title: "Validation", description: "Af App ID and display name are required.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const body: UpdateAppsFlyerAppRequest = {
          afAppId: afAppId.trim(),
          displayName: displayName.trim(),
          enabled,
        }
        if (pushToken.trim()) body.pushWebhookAuthToken = pushToken.trim()
        await dataAccountsApi.updateAppsFlyerApp(accountId, editing.id, body)
        toast({ title: "App updated" })
      } else {
        await dataAccountsApi.createAppsFlyerApp(accountId, {
          afAppId: afAppId.trim(),
          displayName: displayName.trim(),
          enabled,
          pushWebhookAuthToken: pushToken.trim() || undefined,
        })
        toast({ title: "App added" })
      }
      setDialogOpen(false)
      await load()
    } catch {
      toast({ title: "Error", description: "Save failed.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRow) return
    try {
      await dataAccountsApi.deleteAppsFlyerApp(accountId, deleteRow.id)
      toast({ title: "App removed" })
      setDeleteRow(null)
      await load()
    } catch {
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">AppsFlyer app IDs</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Each row is an AF <span className="font-mono">app_id</span> (Android package or iOS{" "}
            <span className="font-mono">id…</span>) used by sync jobs. Map the same value to{" "}
            <span className="font-mono">silver.dim_app_identifiers.appsflyer_af_app_id</span> so StarRocks UA
            pipelines can join to AdMob apps.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add app
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : apps.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
          No AF apps yet. Add at least one app id for Pull/Master sync.
        </p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs">Af App ID</TableHead>
                <TableHead className="text-xs">Display name</TableHead>
                <TableHead className="text-xs w-24">Enabled</TableHead>
                <TableHead className="text-xs w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.afAppId}</TableCell>
                  <TableCell className="text-sm">{row.displayName}</TableCell>
                  <TableCell className="text-sm">{row.enabled ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteRow(row)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit AF app" : "Add AF app"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Af App ID</Label>
              <Input
                className="font-mono text-sm"
                placeholder="com.example.app or id1234567890"
                value={afAppId}
                onChange={(e) => setAfAppId(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={saving} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} disabled={saving} id="af-app-enabled" />
              <Label htmlFor="af-app-enabled" className="font-normal cursor-pointer">
                Enabled for sync
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label>Push webhook token (optional)</Label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={editing ? "Leave blank to keep current" : "Override account default for this app"}
                value={pushToken}
                onChange={(e) => setPushToken(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove AF app?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow ? `This will remove ${deleteRow.afAppId} from sync configuration.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
