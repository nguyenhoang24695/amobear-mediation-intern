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
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Loader2, Users, Check, ChevronsUpDown, X } from "lucide-react"
import { organizationsApi, teamMembersApi, type OrgTeam } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { RoleSelector } from "@/components/users/role-selector"
import { cn } from "@/lib/utils"

interface AddUserToTeamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userIds: string[]
  userNames: string[]
  excludedTeamIds?: string[]
  onSuccess?: () => void
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
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Fetch teams from API
  const { data: teams, loading: teamsLoading } = useApi(
    () => organizationsApi.getTeams(orgId),
    { enabled: open, cacheKey: `org_teams_${orgId}` }
  )
  const availableTeams = teams?.filter((team) => !excludedTeamIds.includes(team.id)) ?? []
  const excludedTeams = teams?.filter((team) => excludedTeamIds.includes(team.id)) ?? []

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedTeamIds([])
      setRole("viewer")
      setError(null)
      setPopoverOpen(false)
    }
  }, [open])

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  const removeTeam = (teamId: string) => {
    setSelectedTeamIds(prev => prev.filter(id => id !== teamId))
  }

  const getSelectedTeams = () => {
    return availableTeams.filter(team => selectedTeamIds.includes(team.id))
  }

  const handleSave = async () => {
    if (selectedTeamIds.length === 0) {
      setError("Please select at least one team")
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Add each user to each selected team
      const results: Array<{ userId: string; teamId: string; success: boolean; error?: string }> = []
      
      for (const userId of userIds) {
        for (const teamId of selectedTeamIds) {
          try {
            const response = await teamMembersApi.addUserToTeam(userId, {
              teamId: teamId,
              role: role,
            })
            
            if (response.success) {
              results.push({ userId, teamId, success: true })
            } else {
              results.push({
                userId,
                teamId,
                success: false,
                error: response.message || "Failed to add user to team"
              })
            }
          } catch (err: any) {
            results.push({
              userId,
              teamId,
              success: false,
              error: err?.response?.data?.error?.message || err?.message || "Failed to add user to team"
            })
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      const totalOperations = userIds.length * selectedTeamIds.length
      
      if (failCount > 0) {
        setError(`${successCount} of ${totalOperations} operations completed. ${failCount} failed.`)
        // Still call onSuccess to refresh the list
        onSuccess?.()
      } else {
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to add users to teams")
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
          <DialogTitle>Add {userIds.length === 1 ? "User" : "Users"} to Team{selectedTeamIds.length > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            {userIds.length === 1 ? (
              <>
                Select one or more teams to add <span className="font-semibold text-slate-900">{userNames[0]}</span> to.
              </>
            ) : (
              <>
                Select one or more teams to add <span className="font-semibold text-slate-900">{userIds.length} users</span> to.
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
            ) : teams && availableTeams.length > 0 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Teams</label>
                {excludedTeams.length > 0 && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">Already assigned</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {excludedTeams.map((team) => (
                        <Badge key={team.id} variant="outline" className="text-xs">
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div
                      role="combobox"
                      aria-expanded={popoverOpen}
                      className="flex items-center justify-between w-full min-h-10 px-3 py-2 text-sm border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    >
                      {selectedTeamIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 flex-1">
                          {getSelectedTeams().map((team) => (
                            <Badge
                              key={team.id}
                              variant="secondary"
                              className="mr-1 mb-0.5"
                            >
                              {team.name}
                              <span
                                role="button"
                                tabIndex={0}
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeTeam(team.id)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    removeTeam(team.id)
                                  }
                                }}
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </span>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select teams...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search teams..." />
                      <CommandList>
                        <CommandEmpty>No team found.</CommandEmpty>
                        <CommandGroup>
                          {availableTeams.map((team) => (
                            <CommandItem
                              key={team.id}
                              value={team.name}
                              onSelect={() => toggleTeam(team.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTeamIds.includes(team.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{team.name}</p>
                                {team.description && (
                                  <p className="text-xs text-slate-500 truncate">{team.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
                                <Users className="w-3.5 h-3.5" />
                                <span>{team.memberCount}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">
                  {teams && teams.length > 0 && excludedTeamIds.length > 0
                    ? "This user is already assigned to all available teams"
                    : "No teams available"}
                </p>
                {excludedTeams.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {excludedTeams.map((team) => (
                      <Badge key={team.id} variant="outline" className="text-xs">
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                )}
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
            disabled={saving || selectedTeamIds.length === 0}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving
              ? `Adding ${userIds.length > 1 ? `${userIds.length} users` : "user"}...`
              : `Add ${userIds.length > 1 ? `${userIds.length} Users` : "User"} to ${selectedTeamIds.length > 1 ? `${selectedTeamIds.length} Teams` : "Team"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

