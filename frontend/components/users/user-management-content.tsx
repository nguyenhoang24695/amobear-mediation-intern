"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Plus, Users, UserCheck, Clock, Shield } from "lucide-react"
import { UsersTable } from "./users-table"
import { InviteUserModal } from "./invite-user-modal"

const statsData = [
  { label: "Total Users", value: 45, icon: Users, color: "text-slate-600" },
  { label: "Active", value: 42, icon: UserCheck, color: "text-green-600" },
  { label: "Pending Invitations", value: 3, icon: Clock, color: "text-amber-600" },
  { label: "Admins", value: 5, icon: Shield, color: "text-purple-600" },
]

interface UserManagementContentProps {
  teamId?: string
}

export function UserManagementContent({ teamId }: UserManagementContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [teamName, setTeamName] = useState<string | undefined>(undefined)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {teamName ? (
            <>
              Manage <span className="font-semibold text-slate-900">{teamName}</span>
              {"'s team members and their access"}
            </>
          ) : (
            "Manage your organization's team members and their access"
          )}
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setInviteModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats Cards - Temporarily hidden */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-slate-100 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div> */}

      {/* Users Table */}
      <UsersTable
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        teamId={teamId}
        onTeamNameChange={setTeamName}
        onInviteClick={() => setInviteModalOpen(true)}
      />

      {/* Invite User Modal */}
      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </div>
  )
}
