"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { organizationsApi, type OrganizationEmailSettings } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type OrgEmailSettingsSectionProps = {
  orgId: string
  canEdit: boolean
}

const EMPTY_FORM: OrganizationEmailSettings & { appPassword: string } = {
  host: "smtp.gmail.com",
  port: 587,
  username: "",
  displayName: "",
  enableSsl: true,
  hasAppPassword: false,
  appPassword: "",
}

export function OrgEmailSettingsSection({ orgId, canEdit }: OrgEmailSettingsSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void organizationsApi
      .getEmailSettings(orgId)
      .then((settings) => {
        if (cancelled) return
        setForm({
          host: settings.host || "smtp.gmail.com",
          port: settings.port || 587,
          username: settings.username || "",
          displayName: settings.displayName || "",
          enableSsl: settings.enableSsl ?? true,
          hasAppPassword: settings.hasAppPassword,
          appPassword: "",
        })
        setDirty(false)
      })
      .catch((error) => {
        console.error("Failed to load organization email settings:", error)
        if (!cancelled) {
          toast({
            title: "Could not load email settings",
            description: "Please refresh the page and try again.",
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orgId, toast])

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    if (!form.host.trim() || !form.username.trim()) {
      toast({
        title: "Missing required fields",
        description: "Host and Username are required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const saved = await organizationsApi.updateEmailSettings(orgId, {
        host: form.host.trim(),
        port: Number(form.port) || 587,
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        enableSsl: form.enableSsl,
        appPassword: form.appPassword.trim() || undefined,
      })
      setForm((prev) => ({
        ...prev,
        host: saved.host,
        port: saved.port,
        username: saved.username,
        displayName: saved.displayName,
        enableSsl: saved.enableSsl,
        hasAppPassword: saved.hasAppPassword,
        appPassword: "",
      }))
      setDirty(false)
      toast({
        title: "Email settings saved",
        description: "SMTP configuration has been updated for this organization.",
      })
    } catch (error) {
      console.error("Failed to save organization email settings:", error)
      toast({
        title: "Save failed",
        description: "Could not update email settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-slate-900">Email Settings</CardTitle>
        <CardDescription>
          SMTP configuration used when this organization sends emails (reports, alerts, invitations).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading email settings…
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgEmailHost">Host</Label>
                <Input
                  id="orgEmailHost"
                  value={form.host}
                  onChange={(e) => updateField("host", e.target.value)}
                  placeholder="smtp.gmail.com"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmailPort">Port</Label>
                <Input
                  id="orgEmailPort"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => updateField("port", Number(e.target.value))}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmailUsername">Username</Label>
                <Input
                  id="orgEmailUsername"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="yourname@gmail.com"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmailDisplayName">Display name</Label>
                <Input
                  id="orgEmailDisplayName"
                  value={form.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  placeholder="My Organization"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="orgEmailAppPassword">App password</Label>
                <Input
                  id="orgEmailAppPassword"
                  type="password"
                  value={form.appPassword}
                  onChange={(e) => updateField("appPassword", e.target.value)}
                  placeholder={form.hasAppPassword ? "•••••••••••••••• (unchanged)" : "Gmail app password"}
                  disabled={!canEdit}
                  autoComplete="new-password"
                />
                {form.hasAppPassword ? (
                  <p className="text-xs text-slate-500">
                    Leave blank to keep the current app password.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Enable SSL/TLS</p>
                <p className="text-xs text-slate-500">Recommended for port 587 (STARTTLS).</p>
              </div>
              <Switch
                checked={form.enableSsl}
                onCheckedChange={(checked) => updateField("enableSsl", checked)}
                disabled={!canEdit}
              />
            </div>

            {canEdit && dirty ? (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Email Settings
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
