"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { organizationsApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { OrganizationActionModal, type OrganizationActionType } from "../modals/organization-action-modal"

interface OrgSettingsTabProps {
  org: {
    name: string
    slug: string
    status: "active" | "inactive"
    users: number
    teams: number
  }
  orgId: string
  onStatusChange?: () => void
  isSuperAdmin?: boolean
}

export function OrgSettingsTab({ org, orgId, onStatusChange, isSuperAdmin = false }: OrgSettingsTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  // Profile
  const [orgName, setOrgName] = useState(org.name)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)

  // Danger Zone
  const [activeAction, setActiveAction] = useState<OrganizationActionType | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

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

      {/* Section 2: Danger Zone — only for super_admin */}
      {isSuperAdmin && (
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
