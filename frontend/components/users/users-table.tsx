"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MoreHorizontal,
  User,
  Edit,
  Shield,
  Send,
  UserX,
  Trash2,
  Info,
  ChevronLeft,
  ChevronRight,
  Users,
  Search,
  X,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useApi } from "@/hooks/use-api"
import { teamMembersApi } from "@/lib/api/services"
import type { TeamMember } from "@/types/api"

interface UsersTableProps {
  searchQuery: string
  roleFilter: string
  statusFilter: string
  teamFilter: string
}

const roleColors = {
  admin: "bg-purple-100 text-purple-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-slate-100 text-slate-700",
}

const statusConfig = {
  active: { color: "bg-green-500", label: "Active" },
  invited: { color: "bg-amber-500", label: "Invited" },
  inactive: { color: "bg-slate-400", label: "Inactive" },
  pending: { color: "bg-blue-500", label: "Pending" },
}

export function UsersTable({ searchQuery, roleFilter, statusFilter, teamFilter }: UsersTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Build filter request
  const filterRequest = useMemo(() => ({
    page,
    pageSize,
    search: searchQuery || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    teamId: teamFilter !== "all" ? teamFilter : undefined,
  }), [page, pageSize, searchQuery, roleFilter, statusFilter, teamFilter])

  // Fetch team members from API
  const { data: filterResponse, loading, refetch } = useApi(
    () => teamMembersApi.filterTeamMembers(filterRequest),
    { 
      enabled: true,
      cacheKey: `team_members_filter_${JSON.stringify(filterRequest)}`
    }
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, roleFilter, statusFilter, teamFilter])

  // Transform API response to display format
  const filteredUsers = useMemo(() => {
    if (!filterResponse?.data?.items) return []
    
    return filterResponse.data.items.map((user: TeamMember) => {
      const appAccessCount = user.permissions ? Object.keys(user.permissions).length : 0
      const hasAllApps = appAccessCount === 0 || user.role === "super_admin" || user.role === "admin"
      
      // Get status from first team member status, or fallback to user status logic
      const teamMemberStatus = user.teams.length > 0 ? user.teams[0].status : null
      const displayStatus = teamMemberStatus || (user.organization?.id ? "active" : "invited")
      
      return {
        id: user.id,
        name: user.fullName || user.email,
        email: user.email,
        avatar: user.avatarUrl || "",
        isOnline: false, // TODO: Add online status if available
        role: user.role as "admin" | "editor" | "viewer",
        teams: user.teams.map(t => t.name),
        appAccess: hasAllApps ? "all" : appAccessCount,
        status: displayStatus as "active" | "invited" | "inactive" | "pending",
        lastActive: "N/A", // TODO: Get lastActive from API if available
      }
    })
  }, [filterResponse])

  const totalUsers = filterResponse?.data?.total || 0
  const totalPages = filterResponse?.data?.totalPages || 0

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize))
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  if (filteredUsers.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {searchQuery || roleFilter !== "all" || statusFilter !== "all" || teamFilter !== "all" ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No users found</h3>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <Button variant="link" className="text-blue-600">
                Clear all filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No team members yet</h3>
              <p className="text-sm text-slate-500 mb-4">Start by inviting your first team member</p>
              <Button className="bg-blue-600 hover:bg-blue-700">Invite User</Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="border-slate-200">
        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
            <span className="text-sm font-medium text-blue-700">{selectedUsers.length} users selected</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Change Role
              </Button>
              <Button variant="outline" size="sm">
                Add to Team
              </Button>
              <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700 bg-transparent">
                Deactivate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>App Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className={
                    user.status === "inactive" ? "opacity-60" : user.status === "invited" ? "bg-amber-50/30" : ""
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/team-members/${user.id}`} className="flex items-center gap-3 group">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          {user.avatar && <AvatarImage src={user.avatar} />}
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-blue-600">{user.name}</p>
                        <p
                          className={`text-xs ${user.status === "invited" ? "italic text-amber-600" : "text-slate-500"}`}
                        >
                          {user.status === "invited" ? "Pending" : user.email}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${roleColors[user.role]} capitalize`}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.teams.length === 0 ? (
                      <span className="text-sm text-slate-400">No teams</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.teams.slice(0, 2).map((team) => (
                          <Badge key={team} variant="outline" className="text-xs">
                            {team}
                          </Badge>
                        ))}
                        {user.teams.length > 2 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-xs">
                                +{user.teams.length - 2} more
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{user.teams.slice(2).join(", ")}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-sm">
                        {user.appAccess === "all" ? "All Apps" : `${user.appAccess} Apps`}
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {user.appAccess === "all" ? "Has access to all apps" : `Has access to ${user.appAccess} apps`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusConfig[user.status].color}`} />
                      <span className="text-sm">{statusConfig[user.status].label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{user.lastActive}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/team-members/${user.id}`}>
                            <User className="w-4 h-4 mr-2" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="w-4 h-4 mr-2" />
                          Manage Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === "invited" && (
                          <DropdownMenuItem>
                            <Send className="w-4 h-4 mr-2" />
                            Resend Invitation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <UserX className="w-4 h-4 mr-2" />
                          {user.status === "inactive" ? "Reactivate User" : "Deactivate User"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove from Organization
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalUsers)} of {totalUsers} users
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-transparent" 
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant="outline"
                    size="sm"
                    className={`h-8 min-w-8 ${page === pageNum ? "bg-blue-50 text-blue-600 border-blue-200" : ""}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-transparent" 
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}
