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

type NetworkType = "admob" | "applovin" | "xmp"

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
}

const networkBadge: Record<NetworkType, string> = {
  admob: "bg-blue-100 text-blue-700 border-blue-200",
  applovin: "bg-green-100 text-green-700 border-green-200",
  xmp: "bg-purple-100 text-purple-700 border-purple-200",
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
      <Card className="border-red-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Disable / Enable */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {isDisabled ? "Enable Account" : "Disable Account"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
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
              <p className="text-sm font-medium text-slate-900">Delete Account</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently remove this data account and all its sync history. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent flex-shrink-0"
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDisabled ? 'bg-green-100' : 'bg-amber-100'}`}>
                {isDisabled ? (
                  <Upload className="w-5 h-5 text-green-600" />
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
                  <span className="font-semibold text-slate-900">{account.name}</span>?
                </p>
                <p className="text-slate-500">
                  {isDisabled
                    ? "The account will resume data syncing on schedule."
                    : "All scheduled syncs will be paused. Existing data will be preserved and the account can be re-enabled at any time."
                  }
                </p>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="disableConfirm" className="text-sm">
                    Type <span className="font-mono font-semibold text-slate-900">{isDisabled ? "ENABLE" : "DISABLE"}</span> to confirm
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
              className={isDisabled ? "bg-green-600 hover:bg-green-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}
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
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle>Delete Data Account Permanently</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-slate-900">This action is permanent and cannot be undone.</p>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    All sync history will be permanently deleted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    Linked apps will lose access to network data
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    Credentials and configuration will be removed
                  </li>
                </ul>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="deleteConfirm" className="text-sm">
                    Type{" "}
                    <span className="font-mono font-semibold text-slate-900">{account.name}</span>{" "}
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
              className="bg-red-600 hover:bg-red-700 text-white"
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
