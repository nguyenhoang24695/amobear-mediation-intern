"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Users } from "lucide-react"
import { organizationsApi, teamMembersApi, type OrgTeam } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { RoleSelector } from "@/components/users/role-selector"

interface AddUserToTeamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userIds: string[]
  userNames: string[]
  onSuccess?: () => void
}

export function AddUserToTeamModal({
  open,
  onOpenChange,
  orgId,
  userIds,
  userNames,
  onSuccess,
}: AddUserToTeamModalProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch teams from API
  const { data: teams, loading: teamsLoading } = useApi(
    () => organizationsApi.getTeams(orgId),
    { enabled: open, cacheKey: `org_teams_${orgId}` }
  )

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTeamId("")
      setRole("viewer")
      setError(null)
    }
  }, [open])

  const handleSave = async () => {
    if (!selectedTeamId) {
      setError("Please select a team")
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Add each user to the team
      const results: Array<{ userId: string; success: boolean; error?: string }> = []
      
      for (const userId of userIds) {
        try {
          const response = await teamMembersApi.addUserToTeam(userId, {
            teamId: selectedTeamId,
            role: role,
          })
          
          if (response.success) {
            results.push({ userId, success: true })
          } else {
            results.push({
              userId,
              success: false,
              error: response.message || "Failed to add user to team"
            })
          }
        } catch (err: any) {
          results.push({
            userId,
            success: false,
            error: err?.response?.data?.error?.message || err?.message || "Failed to add user to team"
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      if (failCount > 0) {
        setError(`${successCount} of ${userIds.length} users added successfully. ${failCount} failed.`)
        // Still call onSuccess to refresh the list
        onSuccess?.()
      } else {
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to add users to team")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {userIds.length === 1 ? "User" : "Users"} to Team</DialogTitle>
          <DialogDescription>
            {userIds.length === 1 ? (
              <>
                Select a team to add <span className="font-semibold text-slate-900">{userNames[0]}</span> to.
              </>
            ) : (
              <>
                Select a team to add <span className="font-semibold text-slate-900">{userIds.length} users</span> to.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Team Selection */}
          <div className="space-y-4">
            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Team</label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-1">
                            <p className="font-medium">{team.name}</p>
                            {team.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{team.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 ml-4">
                            <Users className="w-4 h-4" />
                            <span>{team.memberCount}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">No teams available</p>
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="border-t pt-4">
            <RoleSelector
              value={role}
              onValueChange={setRole}
              label="Role in team"
              idPrefix="add-to-team"
              adminDescription="Full access to all features including user and permissions management for this team."
              editorDescription="Can view and edit apps and reports assigned to this team."
              viewerDescription="Read-only access to apps and reports for this team."
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving || !selectedTeamId}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving
              ? `Adding ${userIds.length > 1 ? `${userIds.length} users` : "user"}...`
              : `Add ${userIds.length > 1 ? `${userIds.length} Users` : "User"} to Team`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

