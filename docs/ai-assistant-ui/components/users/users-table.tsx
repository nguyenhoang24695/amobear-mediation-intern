"use client"

import { useState, useMemo } from "react"
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
  MoreHorizontal,
  User,
  Edit,
  KeyRound,
  Trash2,
  Search,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  Eye,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import Link from "next/link"

interface UsersTableProps {
  searchQuery: string
  roleFilter: string
  statusFilter: string
  onEdit: (user: { id: string; name: string; email: string; role: string; status: string }) => void
  onClearFilters: () => void
  hasFilters: boolean
}

type SortField = "name" | "email" | "role" | "status" | "lastLogin"
type SortDir = "asc" | "desc"

const usersData = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@company.com",
    avatar: "/professional-man-avatar.png",
    role: "admin" as const,
    status: "active" as const,
    lastLogin: "2026-02-09T08:30:00Z",
    lastLoginLabel: "Today, 8:30 AM",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.j@company.com",
    avatar: "",
    role: "manager" as const,
    status: "active" as const,
    lastLogin: "2026-02-08T14:22:00Z",
    lastLoginLabel: "Yesterday, 2:22 PM",
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "m.chen@company.com",
    avatar: "",
    role: "viewer" as const,
    status: "active" as const,
    lastLogin: "2026-02-07T09:15:00Z",
    lastLoginLabel: "Feb 7, 9:15 AM",
  },
  {
    id: "4",
    name: "Emily Parker",
    email: "emily.p@company.com",
    avatar: "",
    role: "admin" as const,
    status: "inactive" as const,
    lastLogin: "2026-01-20T16:45:00Z",
    lastLoginLabel: "Jan 20, 4:45 PM",
  },
  {
    id: "5",
    name: "David Wilson",
    email: "d.wilson@company.com",
    avatar: "",
    role: "viewer" as const,
    status: "inactive" as const,
    lastLogin: "2025-12-15T11:00:00Z",
    lastLoginLabel: "Dec 15, 2025",
  },
  {
    id: "6",
    name: "Lisa Anderson",
    email: "l.anderson@company.com",
    avatar: "",
    role: "super_admin" as const,
    status: "active" as const,
    lastLogin: "2026-02-09T10:05:00Z",
    lastLoginLabel: "Today, 10:05 AM",
  },
  {
    id: "7",
    name: "Robert Kim",
    email: "r.kim@company.com",
    avatar: "",
    role: "manager" as const,
    status: "active" as const,
    lastLogin: "2026-02-08T08:30:00Z",
    lastLoginLabel: "Yesterday, 8:30 AM",
  },
  {
    id: "8",
    name: "Jennifer Lee",
    email: "j.lee@company.com",
    avatar: "",
    role: "viewer" as const,
    status: "active" as const,
    lastLogin: "2026-02-06T13:10:00Z",
    lastLoginLabel: "Feb 6, 1:10 PM",
  },
  {
    id: "9",
    name: "Thomas Brown",
    email: "t.brown@company.com",
    avatar: "",
    role: "manager" as const,
    status: "active" as const,
    lastLogin: "2026-02-05T07:55:00Z",
    lastLoginLabel: "Feb 5, 7:55 AM",
  },
  {
    id: "10",
    name: "Amanda Davis",
    email: "a.davis@company.com",
    avatar: "",
    role: "admin" as const,
    status: "active" as const,
    lastLogin: "2026-02-09T09:00:00Z",
    lastLoginLabel: "Today, 9:00 AM",
  },
  {
    id: "11",
    name: "Kevin Martinez",
    email: "k.martinez@company.com",
    avatar: "",
    role: "viewer" as const,
    status: "inactive" as const,
    lastLogin: "2025-11-30T10:20:00Z",
    lastLoginLabel: "Nov 30, 2025",
  },
  {
    id: "12",
    name: "Rachel Green",
    email: "r.green@company.com",
    avatar: "",
    role: "manager" as const,
    status: "active" as const,
    lastLogin: "2026-02-08T16:40:00Z",
    lastLoginLabel: "Yesterday, 4:40 PM",
  },
]

const roleConfig: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-blue-100 text-blue-700" },
  admin: { label: "Admin", color: "bg-blue-100 text-blue-700" },
  manager: { label: "Manager", color: "bg-purple-100 text-purple-700" },
  viewer: { label: "Viewer", color: "bg-slate-100 text-slate-700" },
}

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  active: { label: "Active", dotColor: "bg-green-500" },
  inactive: { label: "Inactive", dotColor: "bg-red-500" },
}

export function UsersTable({ searchQuery, roleFilter, statusFilter, onEdit, onClearFilters, hasFilters }: UsersTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteUser, setDeleteUser] = useState<{ id: string; name: string } | null>(null)

  // Filter
  const filteredUsers = useMemo(() => {
    return usersData.filter((user) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false
      }
      if (roleFilter !== "all" && user.role !== roleFilter) return false
      if (statusFilter !== "all" && user.status !== statusFilter) return false
      return true
    })
  }, [searchQuery, roleFilter, statusFilter])

  // Sort
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "email":
          cmp = a.email.localeCompare(b.email)
          break
        case "role":
          cmp = a.role.localeCompare(b.role)
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "lastLogin":
          cmp = a.lastLogin.localeCompare(b.lastLogin)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredUsers, sortField, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize))
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-600" />
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(paginatedUsers.map((u) => u.id))
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()

  // Empty State
  if (filteredUsers.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No users found</h3>
              <p className="text-sm text-slate-500 mb-4">No users match your current filters. Try adjusting your search or filters.</p>
              <Button variant="link" className="text-blue-600" onClick={onClearFilters}>
                Clear all filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No users yet</h3>
              <p className="text-sm text-slate-500 mb-4">Start by adding your first user</p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop / Tablet Table */}
      <Card className="border-slate-200 hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("name")}
                    >
                      User
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("email")}
                    >
                      Email
                      <SortIcon field="email" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("role")}
                    >
                      Role
                      <SortIcon field="role" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("status")}
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("lastLogin")}
                    >
                      Last Login
                      <SortIcon field="lastLogin" />
                    </button>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`hover:bg-slate-50 transition-colors ${user.status === "inactive" ? "opacity-60" : ""}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {user.avatar && <AvatarImage src={user.avatar || "/placeholder.svg"} />}
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${roleConfig[user.role].color}`}>
                        {roleConfig[user.role].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusConfig[user.status].dotColor}`} />
                        <span className="text-sm">{statusConfig[user.status].label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{user.lastLoginLabel}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/users/${user.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onEdit({
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                                status: user.status,
                              })
                            }
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <KeyRound className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {user.status === "active" ? (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <ToggleRight className="w-4 h-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteUser({ id: user.id, name: user.name })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedUsers.length}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page)
              setSelectedUsers([])
            }}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
              setSelectedUsers([])
            }}
            itemName="users"
          />
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedUsers.map((user) => (
          <Card key={user.id} className={`border-slate-200 ${user.status === "inactive" ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleSelectUser(user.id)}
                  />
                  <Avatar className="h-10 w-10">
                    {user.avatar && <AvatarImage src={user.avatar || "/placeholder.svg"} />}
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/users/${user.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onEdit({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role,
                          status: user.status,
                        })
                      }
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {user.status === "active" ? (
                        <>
                          <ToggleLeft className="w-4 h-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleRight className="w-4 h-4 mr-2" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setDeleteUser({ id: user.id, name: user.name })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 ml-14 flex flex-wrap items-center gap-2">
                <Badge className={`${roleConfig[user.role].color}`}>
                  {roleConfig[user.role].label}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusConfig[user.status].dotColor}`} />
                  <span className="text-xs text-slate-600">{statusConfig[user.status].label}</span>
                </div>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-500">{user.lastLoginLabel}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Mobile Pagination */}
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-slate-500">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedUsers.length)} of{" "}
            {sortedUsers.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => { if (!open) setDeleteUser(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteUser?.name}</span>? This
              action cannot be undone and will permanently remove the user and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setDeleteUser(null)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
