"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { organizationsApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { OrganizationActionModal, type OrganizationActionType } from "../modals/organization-action-modal"

function parseSettingsObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore and fallback to empty object
  }
  return {}
}

function getSlackBotTokenFromSettings(raw: string): string {
  const settings = parseSettingsObject(raw)
  const slackSection = settings.slack
  if (!slackSection || typeof slackSection !== "object" || Array.isArray(slackSection)) return ""
  const token = (slackSection as Record<string, unknown>).botToken
  return typeof token === "string" ? token : ""
}

function updateSlackBotTokenInSettings(raw: string, slackBotToken: string): string {
  const settings = parseSettingsObject(raw)
  const slackSection =
    settings.slack && typeof settings.slack === "object" && !Array.isArray(settings.slack)
      ? { ...(settings.slack as Record<string, unknown>) }
      : {}

  const normalizedToken = slackBotToken.trim()
  if (normalizedToken) {
    slackSection.botToken = normalizedToken
    settings.slack = slackSection
  } else {
    delete slackSection.botToken
    if (Object.keys(slackSection).length === 0) {
      delete settings.slack
    } else {
      settings.slack = slackSection
    }
  }

  return JSON.stringify(settings)
}

interface OrgSettingsTabProps {
  org: {
    name: string
    slug: string
    settings: string
    status: "active" | "inactive"
    users: number
    teams: number
  }
  orgId: string
  onStatusChange?: () => void
  canEdit?: boolean
}

export function OrgSettingsTab({ org, orgId, onStatusChange, canEdit = false }: OrgSettingsTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  // Profile
  const [orgName, setOrgName] = useState(org.name)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [slackBotToken, setSlackBotToken] = useState(() => getSlackBotTokenFromSettings(org.settings))
  const [initialSlackBotToken, setInitialSlackBotToken] = useState(() => getSlackBotTokenFromSettings(org.settings))
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Danger Zone
  const [activeAction, setActiveAction] = useState<OrganizationActionType | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const settingsDirty = slackBotToken !== initialSlackBotToken

  useEffect(() => {
    setOrgName(org.name)
    setProfileDirty(false)
    const nextToken = getSlackBotTokenFromSettings(org.settings)
    setSlackBotToken(nextToken)
    setInitialSlackBotToken(nextToken)
  }, [org.name, org.settings])

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      await organizationsApi.update(orgId, { name: orgName })
      setProfileDirty(false)
      toast({
        title: "Profile updated",
        description: "Organization name has been updated successfully.",
      })
      onStatusChange?.()
    } catch (error) {
      console.error("Failed to update organization:", error)
      toast({
        title: "Update failed",
        description: "Failed to update organization name. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveNotificationSettings = async () => {
    setSettingsSaving(true)
    try {
      const nextSettings = updateSlackBotTokenInSettings(org.settings, slackBotToken)
      await organizationsApi.update(orgId, { settings: nextSettings })
      setInitialSlackBotToken(slackBotToken)
      toast({
        title: "Settings updated",
        description: "Slack Bot Token đã được lưu vào Organization Settings.",
      })
      onStatusChange?.()
    } catch (error) {
      console.error("Failed to update organization settings:", error)
      toast({
        title: "Update failed",
        description: "Không lưu được Slack Bot Token. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleActionConfirm = async () => {
    if (!activeAction) return

    try {
      setActionLoading(true)

      if (activeAction === "deactivate") {
        await organizationsApi.deactivate(orgId)
        toast({ title: "Organization deactivated", description: `${org.name} has been deactivated successfully.` })
        onStatusChange?.()
      } else if (activeAction === "activate") {
        await organizationsApi.activate(orgId)
        toast({ title: "Organization activated", description: `${org.name} has been activated successfully.` })
        onStatusChange?.()
      } else if (activeAction === "delete") {
        await organizationsApi.delete(orgId)
        toast({ title: "Organization deleted", description: `${org.name} has been permanently deleted.` })
        router.push("/organizations")
      }

      setActiveAction(null)
    } catch (err) {
      console.error(`Failed to ${activeAction} organization:`, err)
      toast({
        title: "Error",
        description: `Failed to ${activeAction} organization. Please try again.`,
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section 1: Organization Profile */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Organization Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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

          {profileDirty && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Danger Zone — only for users with edit permission */}
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="slackBotToken">Slack Bot Token</Label>
            <Input
              id="slackBotToken"
              type="password"
              autoComplete="off"
              value={slackBotToken}
              onChange={(e) => setSlackBotToken(e.target.value)}
              placeholder="xoxb-..."
            />
            <p className="text-xs text-slate-500">
              JSON key: `slack.botToken`.
            </p>
          </div>

          {settingsDirty && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveNotificationSettings}
              disabled={settingsSaving}
            >
              {settingsSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Notification Settings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Danger Zone — only for users with edit permission */}
      {canEdit && (
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
                onClick={() => setActiveAction(org.status === "active" ? "deactivate" : "activate")}
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
                onClick={() => setActiveAction("delete")}
              >
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Action Modal */}
      {activeAction && (
        <OrganizationActionModal
          open={!!activeAction}
          onOpenChange={(open) => !open && setActiveAction(null)}
          actionType={activeAction}
          organizationName={org.name}
          organizationSlug={org.slug}
          userCount={org.users}
          teamCount={org.teams}
          onConfirm={handleActionConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
