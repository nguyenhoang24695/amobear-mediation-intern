"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreHorizontal, Edit, Users, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"

const teamsData = [
  {
    id: "1",
    name: "Mobile Team",
    description: "Team responsible for mobile app development and AdMob integrations",
    memberCount: 8,
    members: [
      { name: "John Doe", avatar: "/professional-man-avatar.png" },
      { name: "Sarah Johnson", avatar: "" },
      { name: "Michael Chen", avatar: "" },
      { name: "Emily Parker", avatar: "" },
      { name: "David Wilson", avatar: "" },
    ],
    appAccess: 12,
    createdAt: "Jan 1, 2025",
  },
  {
    id: "2",
    name: "Analytics Team",
    description: "Data analysis and reporting specialists",
    memberCount: 5,
    members: [
      { name: "Lisa Anderson", avatar: "" },
      { name: "Robert Kim", avatar: "" },
      { name: "Jennifer Lee", avatar: "" },
    ],
    appAccess: "all",
    createdAt: "Jan 5, 2025",
  },
  {
    id: "3",
    name: "Product Team",
    description: "Product management and strategy",
    memberCount: 6,
    members: [
      { name: "John Doe", avatar: "/professional-man-avatar.png" },
      { name: "Lisa Anderson", avatar: "" },
    ],
    appAccess: 8,
    createdAt: "Jan 10, 2025",
  },
  {
    id: "4",
    name: "Marketing Team",
    description: "Marketing campaigns and user acquisition",
    memberCount: 4,
    members: [{ name: "Emily Parker", avatar: "" }],
    appAccess: 5,
    createdAt: "Jan 15, 2025",
  },
]

export function TeamManagementContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const filteredTeams = teamsData.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <Badge variant="secondary" className="rounded-full">
            {teamsData.length} teams
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
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No teams yet</h3>
            <p className="text-sm text-slate-500 mb-4 text-center">
              Create teams to organize your users and manage app permissions efficiently
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateModalOpen(true)}>
              Create First Team
            </Button>
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
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Users className="w-4 h-4 mr-2" />
                        Manage Members
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-500 line-clamp-2">{team.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {team.members.slice(0, 5).map((member, i) => (
                      <Avatar key={i} className="w-7 h-7 border-2 border-white">
                        {member.avatar && <AvatarImage src={member.avatar || "/placeholder.svg"} />}
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                          {getInitials(member.name)}
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
                    {team.appAccess === "all" ? "All apps" : `${team.appAccess} apps`}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex items-center justify-between">
                <span className="text-xs text-slate-400">Created {team.createdAt}</span>
                <Link
                  href={`/teams/${team.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Team
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>Create a new team to organize users and manage permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input id="team-name" placeholder="e.g., Mobile Team" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (Optional)</Label>
              <Textarea id="team-description" placeholder="Describe the team's purpose..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
