"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Upload, X, AlertTriangle, Trash2 } from "lucide-react"

interface OrgSettingsTabProps {
  org: {
    name: string
    slug: string
    status: "active" | "inactive"
    users: number
    teams: number
  }
}

function getOrgInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function getOrgColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
  ]
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function OrgSettingsTab({ org }: OrgSettingsTabProps) {
  // Profile
  const [orgName, setOrgName] = useState(org.name)
  const [slug, setSlug] = useState(org.slug)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)

  // Settings
  const [defaultRole, setDefaultRole] = useState("viewer")
  const [selfRegistration, setSelfRegistration] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("4hours")
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsDirty, setSettingsDirty] = useState(false)

  // Danger Zone
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateConfirm, setDeactivateConfirm] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setProfileSaving(false)
    setProfileDirty(false)
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSettingsSaving(false)
    setSettingsDirty(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section 1: Organization Profile */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Organization Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-xl">
                <AvatarFallback className={`rounded-xl text-lg font-bold ${getOrgColor(org.name)}`}>
                  {getOrgInitials(org.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-transparent gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Change
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent text-red-600 hover:text-red-700 gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="settingsOrgName">Organization Name</Label>
            <Input
              id="settingsOrgName"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value)
                setProfileDirty(true)
              }}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="settingsSlug">Organization Slug</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-50 border border-r-0 border-slate-200 rounded-l-md">
                https://
              </span>
              <Input
                id="settingsSlug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  setProfileDirty(true)
                }}
                className="rounded-none"
              />
              <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-50 border border-l-0 border-slate-200 rounded-r-md whitespace-nowrap">
                .mediationpro.io
              </span>
            </div>
          </div>

          {profileDirty && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Settings */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default User Role */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Default role for new users</Label>
              <p className="text-xs text-slate-500 mt-0.5">Role assigned to users when invited without specifying a role</p>
            </div>
            <Select value={defaultRole} onValueChange={(v) => { setDefaultRole(v); setSettingsDirty(true) }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Self Registration */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow users to request access</Label>
              <p className="text-xs text-slate-500 mt-0.5">When enabled, users can request to join this organization</p>
            </div>
            <Switch checked={selfRegistration} onCheckedChange={(v) => { setSelfRegistration(v); setSettingsDirty(true) }} />
          </div>

          {/* Session Timeout */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Session Timeout</Label>
              <p className="text-xs text-slate-500 mt-0.5">Automatically log out users after period of inactivity</p>
            </div>
            <Select value={sessionTimeout} onValueChange={(v) => { setSessionTimeout(v); setSettingsDirty(true) }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30min">30 minutes</SelectItem>
                <SelectItem value="1hour">1 hour</SelectItem>
                <SelectItem value="4hours">4 hours</SelectItem>
                <SelectItem value="8hours">8 hours</SelectItem>
                <SelectItem value="24hours">24 hours</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settingsDirty && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveSettings} disabled={settingsSaving}>
              {settingsSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Danger Zone */}
      <Card className="border-red-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deactivate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {org.status === "active" ? "Deactivate Organization" : "Activate Organization"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {org.status === "active"
                  ? "Temporarily disable this organization. Users will not be able to log in."
                  : "Re-enable this organization and restore user access."}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => setDeactivateOpen(true)}
            >
              {org.status === "active" ? "Deactivate Organization" : "Activate Organization"}
            </Button>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Delete Organization</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently delete this organization and all its data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Organization
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateOpen} onOpenChange={(open) => { if (!open) { setDeactivateOpen(false); setDeactivateConfirm("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <AlertDialogTitle>Deactivate Organization</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Are you sure you want to deactivate <span className="font-semibold text-slate-900">{org.name}</span>?</p>
                <p className="text-slate-500">All {org.users} users will be logged out and unable to access the platform until the organization is reactivated.</p>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="deactivateConfirm" className="text-sm">
                    Type <span className="font-mono font-semibold text-slate-900">DEACTIVATE</span> to confirm
                  </Label>
                  <Input
                    id="deactivateConfirm"
                    value={deactivateConfirm}
                    onChange={(e) => setDeactivateConfirm(e.target.value)}
                    placeholder="DEACTIVATE"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeactivateConfirm("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deactivateConfirm !== "DEACTIVATE"}
              onClick={() => { setDeactivateOpen(false); setDeactivateConfirm("") }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteConfirm("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle>Delete Organization Permanently</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-slate-900">This action is permanent and cannot be undone.</p>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {org.users} users will be removed
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {org.teams} teams will be deleted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    All organization data will be permanently lost
                  </li>
                </ul>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="deleteConfirm" className="text-sm">
                    Type <span className="font-mono font-semibold text-slate-900">{org.slug}</span> (organization slug) to confirm
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={org.slug}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteConfirm !== org.slug}
              onClick={() => { setDeleteOpen(false); setDeleteConfirm("") }}
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
