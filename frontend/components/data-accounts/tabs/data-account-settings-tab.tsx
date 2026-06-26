"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import {
  Loader2,
  Eye,
  EyeOff,
  Upload,
  X,
  AlertTriangle,
  Trash2,
  Edit,
} from "lucide-react"

type NetworkType = "admob" | "applovin" | "xmp" | "appsflyer" | "qonversion" | "apple"

interface SettingsTabProps {
  account: {
    id: string
    name: string
    network: NetworkType
    status: "active" | "error" | "inactive"
    email: string
    publisherId?: string
    reportKey?: string
    apiKey?: string
    apiDomain?: string
    enabled?: boolean
  }
  onEdit: () => void
  onToggleStatus: () => Promise<void>
  onDelete: () => Promise<void>
}

const networkLabels: Record<NetworkType, string> = {
  admob: "AdMob",
  applovin: "AppLovin",
  xmp: "XMP / Mintegral",
  appsflyer: "AppsFlyer",
  qonversion: "Qonversion",
  apple: "Apple App Store",
}

const networkBadge: Record<NetworkType, string> = {
  admob: "bg-primary/10 text-primary border-primary/20",
  applovin: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  xmp: "bg-purple-100 text-purple-700 border-purple-200",
  appsflyer: "bg-sky-100 text-sky-800 border-sky-200",
  qonversion: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  apple: "bg-muted text-foreground border-border",
}



export function DataAccountSettingsTab({ account, onEdit, onToggleStatus, onDelete }: SettingsTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Credential fields (read-only display; edit opens the modal)
  const [showSecret, setShowSecret] = useState(false)
  const [credentialsFile] = useState<string | null>("service-account-key.json")

  // Danger Zone dialogs
  const [disableOpen, setDisableOpen] = useState(false)
  const [disableConfirm, setDisableConfirm] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")



  // SettingsTabProps now needs `enabled` instead of checking `status`
  const isDisabled = account.enabled === false

  const handleToggle = async () => {
    setIsSubmitting(true)
    await onToggleStatus()
    setIsSubmitting(false)
    setDisableOpen(false)
    setDisableConfirm("")
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
    // Usually triggers a redirect from parent, but reset just in case.
    setDeleteOpen(false)
    setDeleteConfirm("")
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Connection Details ─────────────────────────────────────── */}


      {/* ── Danger Zone ───────────────────────────────────────────── */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Disable / Enable */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDisabled ? "Enable Account" : "Disable Account"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDisabled
                  ? "Re-enable syncing for this account."
                  : "Temporarily pause all syncing for this account without deleting any data."}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 bg-transparent flex-shrink-0"
              onClick={() => setDisableOpen(true)}
            >
              {isDisabled ? "Enable Account" : "Disable Account"}
            </Button>
          </div>

          {/* Delete */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently remove this data account and all its sync history. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent flex-shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Disable Confirmation ──────────────────────────────────── */}
      <AlertDialog
        open={disableOpen}
        onOpenChange={(open) => { if (!open) { setDisableOpen(false); setDisableConfirm("") } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className={`flex items-center gap-3 mb-2`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDisabled ? 'bg-emerald-500/10' : 'bg-amber-100'}`}>
                {isDisabled ? (
                  <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <AlertDialogTitle>{isDisabled ? "Enable Data Account" : "Disable Data Account"}</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to {isDisabled ? "enable" : "disable"}{" "}
                  <span className="font-semibold text-foreground">{account.name}</span>?
                </p>
                <p className="text-muted-foreground">
                  {isDisabled
                    ? "The account will resume data syncing on schedule."
                    : "All scheduled syncs will be paused. Existing data will be preserved and the account can be re-enabled at any time."
                  }
                </p>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="disableConfirm" className="text-sm">
                    Type <span className="font-mono font-semibold text-foreground">{isDisabled ? "ENABLE" : "DISABLE"}</span> to confirm
                  </Label>
                  <Input
                    id="disableConfirm"
                    value={disableConfirm}
                    onChange={(e) => setDisableConfirm(e.target.value)}
                    placeholder={isDisabled ? "ENABLE" : "DISABLE"}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableConfirm("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={isDisabled ? "bg-emerald-600 text-emerald-50 hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400" : "bg-amber-600 text-amber-50 hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"}
              disabled={disableConfirm !== (isDisabled ? "ENABLE" : "DISABLE") || isSubmitting}
              onClick={(e) => {
                e.preventDefault()
                handleToggle()
              }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDisabled ? "Enable Account" : "Disable Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation ───────────────────────────────────── */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteConfirm("") } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Data Account Permanently</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-foreground">This action is permanent and cannot be undone.</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/100 flex-shrink-0" />
                    All sync history will be permanently deleted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/100 flex-shrink-0" />
                    Linked apps will lose access to network data
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/100 flex-shrink-0" />
                    Credentials and configuration will be removed
                  </li>
                </ul>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="deleteConfirm" className="text-sm">
                    Type{" "}
                    <span className="font-mono font-semibold text-foreground">{account.name}</span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={account.name}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirm !== account.name || isDeleting}
              onClick={(e) => {
                e.preventDefault()
                handleDeleteAccount()
              }}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
