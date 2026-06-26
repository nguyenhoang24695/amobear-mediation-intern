"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  KeyRound,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  Mail,
  Users,
  Loader2,

  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Pagination } from "@/components/shared/pagination"
import { AddUserToOrgModal } from "../add-user-to-org-modal"
import { AddEditUserModal } from "../modals/add-edit-user-modal"
import { AddUserToTeamModal } from "../add-user-to-team-modal"
import { organizationsApi, teamMembersApi, type OrgUserItem, type OrgTeam } from "@/lib/api/services"
import { getCurrentUser } from "@/lib/auth"
import { toast } from "sonner"
import { useRoles } from "@/hooks/use-roles"
import { hasPrivilegedRole, normalizeUserRoles } from "@/lib/enums/user-role"

interface OrgUsersTabProps {
  org: {
    name: string
    users: number
  }
  orgId: string
  canManage?: boolean
}

const roleColorConfig: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  editor: "bg-cyan-100 text-cyan-700",
  viewer: "bg-slate-100 text-slate-700",
}

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  active: { label: "Active", dotColor: "bg-green-500" },
  invited: { label: "Invited", dotColor: "bg-amber-500" },
  inactive: { label: "Inactive", dotColor: "bg-red-500" },
  locked: { label: "Locked", dotColor: "bg-orange-500" },
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatLastActive(lastLoginAt?: string): string {
  if (!lastLoginAt) return "Never"
  const date = new Date(lastLoginAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 5) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`
  return formatDate(lastLoginAt)
}

export function OrgUsersTab({ org, orgId, canManage = false }: OrgUsersTabProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleFromQuery = searchParams.get("role")
  const currentUser = getCurrentUser()
  const canAssignAdmin = currentUser?.role?.toLowerCase() === "super_admin"
  // RoleSelector will dynamically fetch the roles, we just need to pass canManage = canAssignAdmin
  // to let it know whether to allow assigning admin/super_admin roles.
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState(roleFromQuery || "all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const { data: rolesData } = useRoles()
  const roles = rolesData || []
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Teams list for filter
  const [teams, setTeams] = useState<OrgTeam[]>([])


  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editUser, setEditUser] = useState<OrgUserItem | null>(null)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [addToTeamUserIds, setAddToTeamUserIds] = useState<string[]>([])
  const [addToTeamUserNames, setAddToTeamUserNames] = useState<string[]>([])
  const [addToTeamOpen, setAddToTeamOpen] = useState(false)

  // API state
  const [users, setUsers] = useState<OrgUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stats from organization statistics API
  const [activeCount, setActiveCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Fetch teams for filter dropdown
  useEffect(() => {
    organizationsApi.getTeams(orgId)
      .then(setTeams)
      .catch(() => setTeams([]))
  }, [orgId])
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch users scoped to this organization.
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [usersResponse, stats] = await Promise.all([
        organizationsApi.getUsers(orgId, {
          page: currentPage,
          pageSize,
          search: debouncedSearch || undefined,
          role: roleFilter !== "all" ? roleFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          teamId: teamFilter !== "all" ? teamFilter : undefined,
        }),
        organizationsApi.getStatistics(orgId),
      ])
      setUsers(usersResponse.items ?? [])
      setTotal(usersResponse.total ?? 0)
      setTotalPages(usersResponse.totalPages ?? 1)
      setActiveCount(stats.activeUsers)
      setInactiveCount(stats.totalUsers - stats.activeUsers)
    } catch (err) {
      console.error("Failed to fetch organization users:", err)
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [orgId, currentPage, pageSize, debouncedSearch, roleFilter, statusFilter, teamFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    const matchedRole = roleFromQuery
      ? rolesData?.find(
          (role) =>
            role.roleKey.toLowerCase() === roleFromQuery.toLowerCase() ||
            role.name.toLowerCase() === roleFromQuery.toLowerCase(),
        )
      : undefined
    setRoleFilter(roleFromQuery ? matchedRole?.roleKey ?? roleFromQuery : "all")
    setCurrentPage(1)
  }, [roleFromQuery, rolesData])

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, statusFilter, teamFilter])

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) setSelectedUsers([])
    else setSelectedUsers(users.map((u) => u.id))
  }

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase()



  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Organization Users</h2>
            <Badge variant="secondary" className="rounded-full">
              {total}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Manage users in this organization</p>
        </div>
        {canManage && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setAddUserOpen(true)}>
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40">
            <Users className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map(r => (
              <SelectItem key={r.roleKey} value={r.roleKey}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Row */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span className="text-slate-500">Total: <span className="font-semibold text-slate-900">{total}</span></span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Active: <span className="font-semibold text-green-600">{activeCount}</span></span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Inactive: <span className="font-semibold text-red-600">{inactiveCount}</span></span>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-700">{selectedUsers.length} users selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-transparent"
              onClick={() => {
                // Get all selected users
                const selectedUserData = users
                  .filter((u) => selectedUsers.includes(u.id))
                  .map((u) => ({
                    id: u.id,
                    name: u.fullName || u.email,
                  }))

                if (selectedUserData.length > 0) {
                  setAddToTeamUserIds(selectedUserData.map((u) => u.id))
                  setAddToTeamUserNames(selectedUserData.map((u) => u.name))
                  setAddToTeamOpen(true)
                }
              }}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Add To Team
            </Button>
            <Select>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Change Role" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.roleKey} value={r.roleKey}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">Deactivate</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 bg-transparent">Remove</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedUsers([])}>Clear</Button>
          </div>
        </div>
      )}

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
            <Button onClick={fetchUsers}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && users.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No users found</h3>
            <p className="text-sm text-slate-500 mb-4">
              {debouncedSearch || roleFilter !== "all" || statusFilter !== "all" || teamFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first user to get started"}
            </p>
            {canManage && !debouncedSearch && roleFilter === "all" && statusFilter === "all" && teamFilter === "all" && (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setAddUserOpen(true)}>
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && users.length > 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-12">
                      <Checkbox checked={selectedUsers.length === users.length && users.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium uppercase tracking-wide">User</span>
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium uppercase tracking-wide">Role</span>
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium uppercase tracking-wide">Status</span>
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium uppercase tracking-wide">Joined</span>
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium uppercase tracking-wide">Last Active</span>
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userRoles = normalizeUserRoles(user.role, user.roles)
                    const status = statusConfig[user.status] || statusConfig.active
                    return (
                      <TableRow 
                        key={user.id} 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${user.status === "inactive" ? "opacity-60" : ""}`}
                        onClick={() => router.push(`/organizations/${orgId}/users/${user.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => setSelectedUsers((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">{getInitials(user.fullName || user.email)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{user.fullName || "—"}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userRoles.map((roleKey, index) => {
                              const roleLabel = user.roleNames?.[index] || roles.find((r) => r.roleKey === roleKey)?.name || roleKey
                              const roleColor = roleColorConfig[roleKey] || "bg-slate-100 text-slate-700"
                              return (
                                <Badge key={`${user.id}-${roleKey}`} className={roleColor}>
                                  {roleLabel}
                                </Badge>
                              )
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                            <span className="text-sm">{status.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-sm text-slate-500">{formatLastActive(user.lastLoginAt)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem asChild>
                                <Link href={`/organizations/${orgId}/users/${user.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              {canManage && (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                    if (!canAssignAdmin && hasPrivilegedRole(user.role, user.roles)) {
                                      toast.error("Only super admin can edit admin users")
                                      return
                                    }
                                    setEditUser(user)
                                    setEditUserOpen(true)
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setAddToTeamUserIds([user.id])
                                      setAddToTeamUserNames([user.fullName || user.email])
                                      setAddToTeamOpen(true)
                                    }}
                                  >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Add To Team
                                  </DropdownMenuItem>
                                  {/* <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {canManage && <DropdownMenuItem>Admin</DropdownMenuItem>}
                                      <DropdownMenuItem>Editor</DropdownMenuItem>
                                      <DropdownMenuItem>Viewer</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub> */}
                                  <DropdownMenuSeparator />
                                  {user.status === "invited" && (
                                    <DropdownMenuItem><Mail className="w-4 h-4 mr-2" />Resend Invitation</DropdownMenuItem>
                                  )}
                                  {/* <DropdownMenuItem><KeyRound className="w-4 h-4 mr-2" />Reset Password</DropdownMenuItem> */}
                                  {/* <DropdownMenuSeparator /> */}
                                  <DropdownMenuItem onClick={async () => {
                                    const newStatus = user.status === "active" ? "inactive" : "active"
                                    try {
                                      await teamMembersApi.updateUser(user.id, { status: newStatus })
                                      toast.success(newStatus === "active" ? "User activated" : "User deactivated")
                                      fetchUsers()
                                    } catch (err) {
                                      toast.error("Failed to update user status")
                                    }
                                  }}>
                                    {user.status === "active" ? (
                                      <><ToggleLeft className="w-4 h-4 mr-2" />Deactivate User</>
                                    ) : user.status === "inactive" ? (
                                      <><ToggleRight className="w-4 h-4 mr-2" />Activate User</>
                                    ) : null}
                                  </DropdownMenuItem>
                                  {user.status === "active" && (
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        await teamMembersApi.updateUser(user.id, { status: "locked" })
                                        toast.success("User locked")
                                        fetchUsers()
                                      } catch (err) {
                                        toast.error("Failed to lock user")
                                      }
                                    }}>
                                      <Lock className="w-4 h-4 mr-2" />Lock User
                                    </DropdownMenuItem>
                                  )}
                                  {user.status === "locked" && (
                                    <DropdownMenuItem onClick={async () => {
                                      try {
                                        await teamMembersApi.updateUser(user.id, { status: "active" })
                                        toast.success("User unlocked")
                                        fetchUsers()
                                      } catch (err) {
                                        toast.error("Failed to unlock user")
                                      }
                                    }}>
                                      <Unlock className="w-4 h-4 mr-2" />Unlock User
                                    </DropdownMenuItem>
                                  )}

                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(page) => { setCurrentPage(page); setSelectedUsers([]) }}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); setSelectedUsers([]) }}
              itemName="users"
            />
          </CardContent>
        </Card>
      )}



      {/* Add User Modal */}
      <AddUserToOrgModal open={addUserOpen} onOpenChange={setAddUserOpen} orgId={orgId} orgName={org.name} canManage={canManage} onUserCreated={fetchUsers} />

      {/* Edit User Modal */}
      <AddEditUserModal
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
        mode="edit"
        canManage={canAssignAdmin} // Pass canAssignAdmin to control admin role assignment
        user={editUser ? {
          id: editUser.id,
          name: editUser.fullName,
          email: editUser.email,
          firstName: editUser.firstName,
          lastName: editUser.lastName,
          role: editUser.role,
          roles: editUser.roles,
          status: editUser.status
        } : undefined}
        onSuccess={() => {
          fetchUsers()
          setEditUser(null)
        }}
      />

      {/* Add User to Team Modal */}
      {addToTeamUserIds.length > 0 && (
        <AddUserToTeamModal
          open={addToTeamOpen}
          onOpenChange={setAddToTeamOpen}
          orgId={orgId}
          userIds={addToTeamUserIds}
          userNames={addToTeamUserNames}
          onSuccess={() => {
            fetchUsers()
            setAddToTeamUserIds([])
            setAddToTeamUserNames([])
            setSelectedUsers([])
          }}
        />
      )}
    </div>
  )
}
