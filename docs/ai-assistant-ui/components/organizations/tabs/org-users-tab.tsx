"use client"

import { useState, useMemo } from "react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  KeyRound,
  UserMinus,
  ToggleLeft,
  ToggleRight,
  Mail,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import { AddUserToOrgModal } from "../add-user-to-org-modal"

interface OrgUsersTabProps {
  org: {
    name: string
    users: number
  }
}

type SortField = "name" | "role" | "status" | "joined" | "lastActive"
type SortDir = "asc" | "desc"

const orgUsersData = [
  { id: "1", name: "John Doe", email: "john@amobear.vn", avatar: "/professional-man-avatar.png", role: "admin" as const, status: "active" as const, joined: "2025-01-15", joinedLabel: "Jan 15, 2025", lastActive: "2 hours ago", lastActiveSort: "2026-02-09T10:00:00Z" },
  { id: "2", name: "Sarah Johnson", email: "sarah@amobear.vn", avatar: "", role: "admin" as const, status: "active" as const, joined: "2025-01-15", joinedLabel: "Jan 15, 2025", lastActive: "5 min ago", lastActiveSort: "2026-02-09T11:55:00Z" },
  { id: "3", name: "Michael Chen", email: "m.chen@amobear.vn", avatar: "", role: "editor" as const, status: "active" as const, joined: "2025-02-01", joinedLabel: "Feb 1, 2025", lastActive: "1 hour ago", lastActiveSort: "2026-02-09T11:00:00Z" },
  { id: "4", name: "Emily Parker", email: "emily@amobear.vn", avatar: "", role: "editor" as const, status: "invited" as const, joined: "", joinedLabel: "Pending", lastActive: "Never", lastActiveSort: "1970-01-01T00:00:00Z" },
  { id: "5", name: "David Wilson", email: "d.wilson@amobear.vn", avatar: "", role: "viewer" as const, status: "active" as const, joined: "2025-03-10", joinedLabel: "Mar 10, 2025", lastActive: "Yesterday", lastActiveSort: "2026-02-08T15:00:00Z" },
  { id: "6", name: "Lisa Anderson", email: "lisa@amobear.vn", avatar: "", role: "viewer" as const, status: "active" as const, joined: "2025-03-15", joinedLabel: "Mar 15, 2025", lastActive: "3 days ago", lastActiveSort: "2026-02-06T10:00:00Z" },
  { id: "7", name: "Robert Kim", email: "r.kim@amobear.vn", avatar: "", role: "editor" as const, status: "active" as const, joined: "2025-04-01", joinedLabel: "Apr 1, 2025", lastActive: "4 hours ago", lastActiveSort: "2026-02-09T08:00:00Z" },
  { id: "8", name: "Jennifer Lee", email: "j.lee@amobear.vn", avatar: "", role: "viewer" as const, status: "inactive" as const, joined: "2025-04-05", joinedLabel: "Apr 5, 2025", lastActive: "2 weeks ago", lastActiveSort: "2026-01-26T09:00:00Z" },
  { id: "9", name: "Thomas Brown", email: "t.brown@amobear.vn", avatar: "", role: "viewer" as const, status: "active" as const, joined: "2025-05-01", joinedLabel: "May 1, 2025", lastActive: "6 hours ago", lastActiveSort: "2026-02-09T06:00:00Z" },
  { id: "10", name: "Amanda Davis", email: "a.davis@amobear.vn", avatar: "", role: "editor" as const, status: "active" as const, joined: "2025-05-20", joinedLabel: "May 20, 2025", lastActive: "1 day ago", lastActiveSort: "2026-02-08T12:00:00Z" },
  { id: "11", name: "Chris Evans", email: "c.evans@amobear.vn", avatar: "", role: "viewer" as const, status: "invited" as const, joined: "", joinedLabel: "Pending", lastActive: "Never", lastActiveSort: "1970-01-01T00:00:00Z" },
]

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-blue-100 text-blue-700" },
  editor: { label: "Editor", color: "bg-cyan-100 text-cyan-700" },
  viewer: { label: "Viewer", color: "bg-slate-100 text-slate-700" },
}

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  active: { label: "Active", dotColor: "bg-green-500" },
  invited: { label: "Invited", dotColor: "bg-amber-500" },
  inactive: { label: "Inactive", dotColor: "bg-red-500" },
}

export function OrgUsersTab({ org }: OrgUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [removeUser, setRemoveUser] = useState<{ id: string; name: string } | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)

  const filteredUsers = useMemo(() => {
    return orgUsersData.filter((user) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false
      }
      if (roleFilter !== "all" && user.role !== roleFilter) return false
      if (statusFilter !== "all" && user.status !== statusFilter) return false
      return true
    })
  }, [searchQuery, roleFilter, statusFilter])

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "role": cmp = a.role.localeCompare(b.role); break
        case "status": cmp = a.status.localeCompare(b.status); break
        case "joined": cmp = a.joined.localeCompare(b.joined); break
        case "lastActive": cmp = a.lastActiveSort.localeCompare(b.lastActiveSort); break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredUsers, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize))
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-600" />
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) setSelectedUsers([])
    else setSelectedUsers(paginatedUsers.map((u) => u.id))
  }

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase()

  const activeCount = orgUsersData.filter((u) => u.status === "active").length
  const invitedCount = orgUsersData.filter((u) => u.status === "invited").length
  const inactiveCount = orgUsersData.filter((u) => u.status === "inactive").length

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Organization Users</h2>
            <Badge variant="secondary" className="rounded-full">
              {orgUsersData.length}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Manage users in this organization</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setAddUserOpen(true)}>
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <span className="text-slate-500">Total: <span className="font-semibold text-slate-900">{orgUsersData.length}</span></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">Active: <span className="font-semibold text-green-600">{activeCount}</span></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">Invited: <span className="font-semibold text-amber-600">{invitedCount}</span></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">Inactive: <span className="font-semibold text-red-600">{inactiveCount}</span></span>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-700">{selectedUsers.length} users selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Select>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Change Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">Deactivate</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 bg-transparent">Remove</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedUsers([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {filteredUsers.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No users in this organization</h3>
            <p className="text-sm text-slate-500 mb-4">Add your first user to get started</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setAddUserOpen(true)}>
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-12">
                      <Checkbox checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort("name")}>
                        User <SortIcon field="name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort("role")}>
                        Role <SortIcon field="role" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort("status")}>
                        Status <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort("joined")}>
                        Joined <SortIcon field="joined" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900" onClick={() => toggleSort("lastActive")}>
                        Last Active <SortIcon field="lastActive" />
                      </button>
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id} className={`hover:bg-slate-50 transition-colors ${user.status === "inactive" ? "opacity-60" : ""}`}>
                      <TableCell>
                        <Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => setSelectedUsers((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {user.avatar && <AvatarImage src={user.avatar || "/placeholder.svg"} />}
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleConfig[user.role].color}>{roleConfig[user.role].label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusConfig[user.status].dotColor}`} />
                          <span className="text-sm">{statusConfig[user.status].label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{user.joinedLabel}</TableCell>
                      <TableCell className="text-sm text-slate-500">{user.lastActive}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem><Eye className="w-4 h-4 mr-2" />View Profile</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit User</DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem>Admin</DropdownMenuItem>
                                <DropdownMenuItem>Editor</DropdownMenuItem>
                                <DropdownMenuItem>Viewer</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            {user.status === "invited" && (
                              <DropdownMenuItem><Mail className="w-4 h-4 mr-2" />Resend Invitation</DropdownMenuItem>
                            )}
                            <DropdownMenuItem><KeyRound className="w-4 h-4 mr-2" />Reset Password</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              {user.status === "active" ? (
                                <><ToggleLeft className="w-4 h-4 mr-2" />Deactivate User</>
                              ) : user.status === "inactive" ? (
                                <><ToggleRight className="w-4 h-4 mr-2" />Activate User</>
                              ) : null}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setRemoveUser({ id: user.id, name: user.name })}>
                              <UserMinus className="w-4 h-4 mr-2" />Remove from Organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedUsers.length}
              pageSize={pageSize}
              onPageChange={(page) => { setCurrentPage(page); setSelectedUsers([]) }}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); setSelectedUsers([]) }}
              itemName="users"
            />
          </CardContent>
        </Card>
      )}

      {/* Remove User Confirmation */}
      <AlertDialog open={!!removeUser} onOpenChange={(open) => { if (!open) setRemoveUser(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <AlertDialogTitle>Remove User from Organization</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <span>Are you sure you want to remove <span className="font-semibold text-slate-900">{removeUser?.name}</span> from <span className="font-semibold text-slate-900">{org.name}</span>?</span>
              <span className="block text-slate-500">This user will lose access to all organization resources. This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setRemoveUser(null)}>
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Modal */}
      <AddUserToOrgModal open={addUserOpen} onOpenChange={setAddUserOpen} orgName={org.name} />
    </div>
  )
}
