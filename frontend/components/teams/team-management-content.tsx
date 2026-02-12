"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Users, Loader2, FolderOpen, MoreHorizontal, ExternalLink, SquarePen, Trash2 } from "lucide-react"
import Link from "next/link"
import { userApi, type UserTeamWithMembers } from "@/lib/api/services"

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getMemberInitials(firstName?: string, lastName?: string, email?: string): string {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim()
  if (name) {
    const parts = name.split(" ").filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }
  if (email) return email[0].toUpperCase()
  return "U"
}

export function TeamManagementContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [teams, setTeams] = useState<UserTeamWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<UserTeamWithMembers | null>(null)
  const [teamName, setTeamName] = useState("")
  const [teamDescription, setTeamDescription] = useState("")

  // Fetch teams details from API (chỉ lấy các team mà user hiện tại đang nằm trong đó)
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Gọi API mới: /api/v1/user/teams
      const data = await userApi.getMyTeams()
      setTeams(data)
    } catch (err) {
      console.error("Failed to fetch teams:", err)
      setError("Failed to load teams")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  // Client-side search filter
  const filteredTeams = teams.filter((team) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return team.name.toLowerCase().includes(query) || team.description?.toLowerCase().includes(query)
  })

  // Handle Edit Team
  const handleEditTeam = (team: UserTeamWithMembers) => {
    setEditingTeam(team)
    setTeamName(team.name)
    setTeamDescription(team.description || "")
    setCreateModalOpen(true)
  }

  // Handle Close Modal
  const handleCloseModal = () => {
    setCreateModalOpen(false)
    setEditingTeam(null)
    setTeamName("")
    setTeamDescription("")
  }

  // Handle Create/Update Team
  const handleSaveTeam = async () => {
    // TODO: Implement API call to create/update team
    console.log("Save team:", { editingTeam, teamName, teamDescription })
    handleCloseModal()
    // Refresh teams list after save
    await fetchTeams()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <Badge variant="secondary" className="rounded-full">
            {teams.length} teams
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mt-1">Organize your team members into groups</p>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search teams..."
            className="pl-9 w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setEditingTeam(null)
            setTeamName("")
            setTeamDescription("")
            setCreateModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchTeams()}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* Content (Empty + List) */}
      {!loading && !error && (
        filteredTeams.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No teams yet</h3>
              <p className="text-sm text-slate-500 mb-4 text-center">
                {searchQuery ? "Try adjusting your search" : "You are not a member of any teams yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{team.name}</h3>
                      <p className="text-sm text-slate-500">{team.memberCount} members</p>
                    </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                            <SquarePen className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {team.description || "No description provided"}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 5).map((member, i) => (
                        <Avatar key={member.id ?? i} className="w-7 h-7 border-2 border-white">
                          {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {getMemberInitials(member.firstName, member.lastName, member.email)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {team.memberCount > 5 && (
                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-slate-600">+{team.memberCount - 5}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {team.memberCount === 1 ? "1 member" : `${team.memberCount} members`}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Created {formatDate(team.createdAt)}</span>
                  <Link
                    href={`/team-members?teamId=${team.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Team
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Create/Edit Team Modal */}
      <Dialog open={createModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Create New Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam
                ? "Update team information and manage permissions"
                : "Create a new team to organize users and manage permissions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g., Mobile Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (Optional)</Label>
              <Textarea
                id="team-description"
                placeholder="Describe the team's purpose..."
                rows={3}
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveTeam}>
              {editingTeam ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
