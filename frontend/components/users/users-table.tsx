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
import { ManagePermissionsModal } from "./manage-permissions-modal"
import { getCurrentUser } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import type { TeamMember } from "@/types/api"

interface UsersTableProps {
  searchQuery: string
  roleFilter: string
  statusFilter: string
  teamId?: string
  onInviteClick?: () => void
  onTeamNameChange?: (name?: string) => void
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

export function UsersTable({ searchQuery, roleFilter, statusFilter, teamId, onInviteClick, onTeamNameChange }: UsersTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [permissionsUserId, setPermissionsUserId] = useState<string | null>(null)
  const [permissionsUserName, setPermissionsUserName] = useState<string>("")
  const [permissionsUserRole, setPermissionsUserRole] = useState<"admin" | "editor" | "viewer">("viewer")
  const [initialPermissions, setInitialPermissions] = useState<Record<string, string>>({})
  const [selfPermissionWarningOpen, setSelfPermissionWarningOpen] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [usersToRemove, setUsersToRemove] = useState<string[]>([])
  const [removing, setRemoving] = useState(false)
  const { toast } = useToast()

  // Build filter request
  const filterRequest = useMemo(() => ({
    page,
    pageSize,
    search: searchQuery || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    teamId: teamId || undefined,
  }), [page, pageSize, searchQuery, roleFilter, statusFilter, teamId])

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
  }, [searchQuery, roleFilter, statusFilter, teamId])

  // Nếu filter theo teamId, lấy tên team từ phần tử đầu tiên (teams[0].name)
  const teamNameFromItems = useMemo(() => {
    if (!teamId || !filterResponse?.data?.items || filterResponse.data.items.length === 0) return undefined
    const first = filterResponse.data.items[0] as TeamMember
    return first.teams && first.teams.length > 0 ? first.teams[0].name : undefined
  }, [teamId, filterResponse])

  // Đẩy teamName lên cho header sử dụng
  useEffect(() => {
    if (!onTeamNameChange) return
    onTeamNameChange(teamNameFromItems)
  }, [teamNameFromItems, onTeamNameChange])

  // Transform API response to display format
  const filteredUsers = useMemo(() => {
    if (!filterResponse?.data?.items) return []
    
    return filterResponse.data.items.map((user: TeamMember) => {
      const appAccessCount = user.permissions ? Object.keys(user.permissions).length : 0
      
      // Nếu đang filter theo teamId, ưu tiên role của user trong team đó; fallback về user.role tổng thể
      const teamRole = teamId ? user.teams.find((t) => t.id === teamId)?.role : undefined
      const effectiveRole = (teamRole || user.role || "viewer").toLowerCase()
      const roleKey: "admin" | "editor" | "viewer" =
        effectiveRole === "admin" || effectiveRole === "editor" || effectiveRole === "viewer"
          ? (effectiveRole as "admin" | "editor" | "viewer")
          : "viewer"
      
      // Get status from first team member status, or fallback to user status logic
      const teamMemberStatus = user.teams.length > 0 ? user.teams[0].status : null
      const displayStatus = teamMemberStatus || (user.organization?.id ? "active" : "invited")
      
      // Get joinedAt from team if filtering by teamId
      const teamJoinedAt = teamId ? user.teams.find((t) => t.id === teamId)?.joinedAt : undefined
      
      return {
        id: user.id,
        name: user.fullName || user.email,
        email: user.email,
        avatar: user.avatarUrl || "",
        isOnline: false, // TODO: Add online status if available
        role: roleKey,
        // hiển thị tên role theo effectiveRole (giữ nguyên chữ thường/hoa nếu sau này cần)
        teams: user.teams.map(t => t.name),
        appAccess: appAccessCount,
        status: displayStatus as "active" | "invited" | "inactive" | "pending",
        lastActive: "N/A", // TODO: Get lastActive from API if available
        joinedAt: teamJoinedAt, // JoinedAt from team membership
        permissions: user.permissions, // Store permissions for modal
      }
    })
  }, [filterResponse, teamId])

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

  const handleRemoveClick = (userIds: string[]) => {
    if (!teamId) {
      toast({
        title: "Error",
        description: "Team ID is required to remove users",
        variant: "destructive",
      })
      return
    }

    if (userIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user to remove",
        variant: "destructive",
      })
      return
    }

    // Update both states - React will batch these updates
    setUsersToRemove(userIds)
    // Use setTimeout to ensure state is updated before opening modal
    setTimeout(() => {
      setRemoveConfirmOpen(true)
    }, 0)
  }

  const handleConfirmRemove = async () => {
    if (!teamId || usersToRemove.length === 0) return

    setRemoving(true)
    try {
      const results: Array<{ userId: string; success: boolean; error?: string }> = []

      for (const userId of usersToRemove) {
        try {
          const response = await teamMembersApi.removeUserFromTeam(userId, teamId)
          if (response.success) {
            results.push({ userId, success: true })
          } else {
            results.push({
              userId,
              success: false,
              error: response.message || "Failed to remove user from team",
            })
          }
        } catch (err: any) {
          results.push({
            userId,
            success: false,
            error: err?.response?.data?.error?.message || err?.message || "Failed to remove user from team",
          })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length

      if (failCount > 0) {
        toast({
          title: "Partial success",
          description: `${successCount} of ${usersToRemove.length} users removed successfully. ${failCount} failed.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Users removed",
          description: `${successCount} user${successCount > 1 ? "s" : ""} removed from team successfully.`,
        })
      }

      // Refresh data
      refetch()
      setSelectedUsers([])
      setRemoveConfirmOpen(false)
      setUsersToRemove([])
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error?.message || err?.message || "Failed to remove users from team",
        variant: "destructive",
      })
    } finally {
      setRemoving(false)
    }
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
          {searchQuery || roleFilter !== "all" || statusFilter !== "all" ? (
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
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onInviteClick?.()}>Invite User</Button>
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
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 bg-transparent"
                onClick={() => handleRemoveClick(selectedUsers)}
                disabled={!teamId}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
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
                <TableHead>{teamId ? "Joined At" : "Last Active"}</TableHead>
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
                        {`${user.appAccess} Apps`}
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {`Has access to ${user.appAccess} apps`}
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
                  <TableCell className="text-sm text-slate-500">
                    {teamId && user.joinedAt
                      ? new Date(user.joinedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : user.lastActive}
                  </TableCell>
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
                        <DropdownMenuItem
                          disabled={!teamId}
                          onClick={() => {
                            if (!teamId) return
                            const currentUser = getCurrentUser()
                            if (currentUser && user.id === currentUser.id) {
                              // User is trying to manage their own permissions
                              setSelfPermissionWarningOpen(true)
                              return
                            }
                            // Find the user data from filteredUsers to get permissions
                            const userData = filteredUsers.find((u) => u.id === user.id)
                            setPermissionsUserId(user.id)
                            setPermissionsUserName(user.name)
                            setPermissionsUserRole(user.role)
                            setPermissionsModalOpen(true)
                            // Store initial permissions to pass to modal
                            setInitialPermissions((userData as any)?.permissions || {})
                          }}
                        >
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
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          disabled={!teamId}
                          onClick={() => handleRemoveClick([user.id])}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
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
      {/* Manage Permissions Modal */}
      {permissionsUserId && teamId && (
        <ManagePermissionsModal
          open={permissionsModalOpen}
          onOpenChange={setPermissionsModalOpen}
          userId={permissionsUserId}
          userName={permissionsUserName}
          initialRole={permissionsUserRole}
          teamId={teamId}
          initialPermissions={initialPermissions}
          onSuccess={() => {
            // Refresh the users table data
            refetch()
          }}
        />
      )}

      {/* Self Permission Warning Modal */}
      <Dialog open={selfPermissionWarningOpen} onOpenChange={setSelfPermissionWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cannot Change Own Permissions</DialogTitle>
            <DialogDescription>
              You cannot change your own permissions. Please contact an administrator if you need to update your access level.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelfPermissionWarningOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Modal */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {usersToRemove.length === 1 ? "User" : "Users"} from Team</AlertDialogTitle>
            <AlertDialogDescription>
              {usersToRemove.length === 1 ? (
                <>
                  Are you sure you want to remove this user from the team? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to remove {usersToRemove.length} users from the team? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {removing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {removing ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
