"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Users, Plus, X } from "lucide-react"
import { organizationsApi, teamMembersApi, type OrgTeam } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"

type TeamRole = "admin" | "editor" | "viewer"

interface TeamRoleAssignment {
  id: string
  teamId: string
  role: TeamRole
}

interface UserTeamMembership {
  userId: string
  userName: string
  teams: Array<{ id: string; name: string; role: string; isTeamLead?: boolean }>
}

interface AddUserToTeamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userIds: string[]
  userNames: string[]
  excludedTeamIds?: string[]
  onSuccess?: () => void
}

const TEAM_ROLES: Array<{ value: TeamRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
]

function createAssignmentRow(): TeamRoleAssignment {
  return {
    id: crypto.randomUUID(),
    teamId: "",
    role: "viewer",
  }
}

export function AddUserToTeamModal({
  open,
  onOpenChange,
  orgId,
  userIds,
  userNames,
  excludedTeamIds = [],
  onSuccess,
}: AddUserToTeamModalProps) {
  const [assignments, setAssignments] = useState<TeamRoleAssignment[]>([createAssignmentRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<UserTeamMembership[]>([])
  const [membershipsLoading, setMembershipsLoading] = useState(false)

  const { data: teams, loading: teamsLoading } = useApi(
    () => organizationsApi.getTeams(orgId),
    { enabled: open, cacheKey: `org_teams_${orgId}` },
  )

  useEffect(() => {
    if (!open || userIds.length === 0) {
      setMemberships([])
      setMembershipsLoading(false)
      return
    }

    let cancelled = false
    setMembershipsLoading(true)

    void Promise.all(
      userIds.map(async (userId, index) => {
        try {
          const response = await teamMembersApi.viewProfile(userId)
          return {
            userId,
            userName: userNames[index] || userId,
            teams: response.success && response.data?.teams
              ? response.data.teams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  role: team.role,
                  isTeamLead: team.isTeamLead,
                }))
              : [],
          }
        } catch {
          return {
            userId,
            userName: userNames[index] || userId,
            teams: [],
          }
        }
      }),
    )
      .then((results) => {
        if (!cancelled) setMemberships(results)
      })
      .finally(() => {
        if (!cancelled) setMembershipsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, userIds.join(","), userNames.join("|")])

  const resolvedExcludedTeamIds = useMemo(() => {
    if (userIds.length !== 1 || memberships.length !== 1) {
      return excludedTeamIds
    }

    const fetchedTeamIds = memberships[0].teams.map((team) => team.id)
    return [...new Set([...excludedTeamIds, ...fetchedTeamIds])]
  }, [userIds.length, memberships, excludedTeamIds])

  const selectableTeams = useMemo(
    () => teams?.filter((team) => !resolvedExcludedTeamIds.includes(team.id)) ?? [],
    [teams, resolvedExcludedTeamIds],
  )

  const hasExistingMemberships = memberships.some((membership) => membership.teams.length > 0)

  useEffect(() => {
    if (!open) {
      setAssignments([createAssignmentRow()])
      setError(null)
    }
  }, [open])

  const getTeamsForRow = useCallback(
    (rowId: string, currentTeamId: string): OrgTeam[] => {
      const usedTeamIds = new Set(
        assignments
          .filter((row) => row.id !== rowId && row.teamId)
          .map((row) => row.teamId),
      )

      return selectableTeams.filter(
        (team) => team.id === currentTeamId || !usedTeamIds.has(team.id),
      )
    },
    [assignments, selectableTeams],
  )

  const validAssignments = useMemo(
    () => assignments.filter((row) => row.teamId),
    [assignments],
  )

  const canAddAssignmentRow =
    validAssignments.length < selectableTeams.length &&
    assignments.length < selectableTeams.length

  const updateAssignment = (rowId: string, patch: Partial<TeamRoleAssignment>) => {
    setAssignments((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )
  }

  const addAssignmentRow = () => {
    if (!canAddAssignmentRow) return
    setAssignments((prev) => [...prev, createAssignmentRow()])
  }

  const removeAssignmentRow = (rowId: string) => {
    setAssignments((prev) => {
      if (prev.length <= 1) return [createAssignmentRow()]
      return prev.filter((row) => row.id !== rowId)
    })
  }

  const handleSave = async () => {
    if (validAssignments.length === 0) {
      setError("Please select at least one team")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const results: Array<{ userId: string; teamId: string; success: boolean; error?: string }> = []

      for (const userId of userIds) {
        for (const assignment of validAssignments) {
          try {
            const response = await teamMembersApi.addUserToTeam(userId, {
              teamId: assignment.teamId,
              role: assignment.role,
            })

            if (response.success) {
              results.push({ userId, teamId: assignment.teamId, success: true })
            } else {
              results.push({
                userId,
                teamId: assignment.teamId,
                success: false,
                error: response.message || "Failed to add user to team",
              })
            }
          } catch (err: unknown) {
            const message =
              (err as { response?: { data?: { error?: { message?: string } } }; message?: string })
                ?.response?.data?.error?.message ||
              (err as { message?: string })?.message ||
              "Failed to add user to team"
            results.push({
              userId,
              teamId: assignment.teamId,
              success: false,
              error: message,
            })
          }
        }
      }

      const successCount = results.filter((result) => result.success).length
      const failCount = results.filter((result) => !result.success).length
      const totalOperations = userIds.length * validAssignments.length

      if (failCount > 0) {
        setError(`${successCount} of ${totalOperations} operations completed. ${failCount} failed.`)
        onSuccess?.()
      } else {
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } }; message?: string })
          ?.response?.data?.error?.message ||
        (err as { message?: string })?.message ||
        "Failed to add users to teams"
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    onOpenChange(false)
  }

  const renderExistingMemberships = () => {
    const shouldShow =
      membershipsLoading || userIds.length > 1 || hasExistingMemberships
    if (!shouldShow) return null

    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
        <p className="text-xs font-medium text-slate-700">Current team memberships</p>
        {membershipsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : (
          memberships.map((membership) => (
            <div key={membership.userId} className="space-y-1.5">
              {userIds.length > 1 && (
                <p className="text-xs font-medium text-slate-600">{membership.userName}</p>
              )}
              {membership.teams.length === 0 ? (
                <p className="text-xs text-slate-500">No teams assigned</p>
              ) : (
                <div className="space-y-1">
                  {membership.teams.map((team) => (
                    <div
                      key={`${membership.userId}-${team.id}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-2"
                    >
                      <span className="text-sm font-medium text-slate-900">{team.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {team.isTeamLead && (
                          <Badge variant="secondary" className="text-xs">
                            Lead
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {team.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  const assignmentPairCount = validAssignments.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Add {userIds.length === 1 ? "User" : "Users"} to Team
            {assignmentPairCount > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            {userIds.length === 1 ? (
              <>
                Configure team and role pairs for{" "}
                <span className="font-semibold text-slate-900">{userNames[0]}</span>.
              </>
            ) : (
              <>
                Configure team and role pairs for{" "}
                <span className="font-semibold text-slate-900">{userIds.length} users</span>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {renderExistingMemberships()}

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Team assignments</label>

            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : selectableTeams.length > 0 ? (
              <div className="space-y-2">
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_140px_72px] sm:gap-2 sm:px-0">
                  <span className="text-xs text-slate-500">Team</span>
                  <span className="text-xs text-slate-500">Role in team</span>
                  <span className="sr-only">Actions</span>
                </div>

                {assignments.map((row, index) => {
                  const rowTeams = getTeamsForRow(row.id, row.teamId)
                  const isLastRow = index === assignments.length - 1

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_72px] sm:items-center"
                    >
                      <div className="space-y-1 sm:space-y-0">
                        <span className="text-xs text-slate-500 sm:hidden">Team</span>
                        <Select
                          value={row.teamId || undefined}
                          onValueChange={(teamId) => updateAssignment(row.id, { teamId })}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rowTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 sm:space-y-0">
                        <span className="text-xs text-slate-500 sm:hidden">Role in team</span>
                        <Select
                          value={row.role}
                          onValueChange={(role) =>
                            updateAssignment(row.id, { role: role as TeamRole })
                          }
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_ROLES.map((teamRole) => (
                              <SelectItem key={teamRole.value} value={teamRole.value}>
                                {teamRole.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        {isLastRow ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={addAssignmentRow}
                            disabled={!canAddAssignmentRow}
                            aria-label="Add team assignment"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="hidden h-9 w-9 shrink-0 sm:block" aria-hidden="true" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-600"
                          onClick={() => removeAssignmentRow(row.id)}
                          aria-label="Remove team assignment"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-200 py-8 text-center">
                <Users className="mb-2 h-10 w-10 text-slate-400" />
                <p className="text-sm text-slate-500">
                  {teams && teams.length > 0 && resolvedExcludedTeamIds.length > 0
                    ? userIds.length === 1
                      ? "This user is already assigned to all available teams"
                      : "No additional teams available for this selection"
                    : "No teams available"}
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving || validAssignments.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving
              ? `Adding ${userIds.length > 1 ? `${userIds.length} users` : "user"}...`
              : `Add ${userIds.length > 1 ? `${userIds.length} users` : "user"} to ${assignmentPairCount || ""} team${assignmentPairCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
