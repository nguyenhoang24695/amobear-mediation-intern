"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Eye,
  Edit,
  Trash2,
  Search,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  Users,
  Plus,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import Link from "next/link"

interface OrganizationsTableProps {
  searchQuery: string
  statusFilter: string
  onClearFilters: () => void
  hasFilters: boolean
  onCreateOrg: () => void
}

type SortField = "name" | "users" | "status" | "created" | "lastActivity"
type SortDir = "asc" | "desc"

const orgsData = [
  {
    id: "1",
    name: "Amobear Inc",
    slug: "Nexus",
    initials: "WP",
    bgColor: "bg-blue-100 text-blue-700",
    users: 45,
    status: "active" as const,
    created: "2025-01-15",
    createdLabel: "Jan 15, 2025",
    lastActivity: "2 hours ago",
    lastActivitySort: "2026-02-09T10:00:00Z",
  },
  {
    id: "2",
    name: "GameStudio Pro",
    slug: "gamestudio",
    initials: "GS",
    bgColor: "bg-green-100 text-green-700",
    users: 32,
    status: "active" as const,
    created: "2025-01-20",
    createdLabel: "Jan 20, 2025",
    lastActivity: "5 minutes ago",
    lastActivitySort: "2026-02-09T11:55:00Z",
  },
  {
    id: "3",
    name: "AdNetwork Solutions",
    slug: "adnetwork",
    initials: "AN",
    bgColor: "bg-amber-100 text-amber-700",
    users: 18,
    status: "active" as const,
    created: "2025-02-01",
    createdLabel: "Feb 1, 2025",
    lastActivity: "1 hour ago",
    lastActivitySort: "2026-02-09T11:00:00Z",
  },
  {
    id: "4",
    name: "MediaCorp Ltd",
    slug: "mediacorp",
    initials: "MC",
    bgColor: "bg-red-100 text-red-700",
    users: 8,
    status: "inactive" as const,
    created: "2025-02-10",
    createdLabel: "Feb 10, 2025",
    lastActivity: "Never",
    lastActivitySort: "1970-01-01T00:00:00Z",
  },
  {
    id: "5",
    name: "AppVenture Digital",
    slug: "appventure",
    initials: "AV",
    bgColor: "bg-cyan-100 text-cyan-700",
    users: 22,
    status: "active" as const,
    created: "2025-03-05",
    createdLabel: "Mar 5, 2025",
    lastActivity: "30 minutes ago",
    lastActivitySort: "2026-02-09T11:30:00Z",
  },
  {
    id: "6",
    name: "PixelForge Studios",
    slug: "pixelforge",
    initials: "PF",
    bgColor: "bg-indigo-100 text-indigo-700",
    users: 14,
    status: "active" as const,
    created: "2025-03-15",
    createdLabel: "Mar 15, 2025",
    lastActivity: "Yesterday",
    lastActivitySort: "2026-02-08T15:00:00Z",
  },
  {
    id: "7",
    name: "CloudMedia Group",
    slug: "cloudmedia",
    initials: "CM",
    bgColor: "bg-sky-100 text-sky-700",
    users: 6,
    status: "active" as const,
    created: "2025-04-01",
    createdLabel: "Apr 1, 2025",
    lastActivity: "3 days ago",
    lastActivitySort: "2026-02-06T10:00:00Z",
  },
  {
    id: "8",
    name: "TechBridge Analytics",
    slug: "techbridge",
    initials: "TB",
    bgColor: "bg-emerald-100 text-emerald-700",
    users: 3,
    status: "inactive" as const,
    created: "2025-04-20",
    createdLabel: "Apr 20, 2025",
    lastActivity: "2 weeks ago",
    lastActivitySort: "2026-01-26T09:00:00Z",
  },
  {
    id: "9",
    name: "MobileFirst Labs",
    slug: "mobilefirst",
    initials: "MF",
    bgColor: "bg-orange-100 text-orange-700",
    users: 11,
    status: "active" as const,
    created: "2025-05-10",
    createdLabel: "May 10, 2025",
    lastActivity: "4 hours ago",
    lastActivitySort: "2026-02-09T08:00:00Z",
  },
  {
    id: "10",
    name: "DataStream Corp",
    slug: "datastream",
    initials: "DS",
    bgColor: "bg-teal-100 text-teal-700",
    users: 9,
    status: "active" as const,
    created: "2025-06-01",
    createdLabel: "Jun 1, 2025",
    lastActivity: "1 day ago",
    lastActivitySort: "2026-02-08T12:00:00Z",
  },
  {
    id: "11",
    name: "AdMetrics Inc",
    slug: "admetrics",
    initials: "AM",
    bgColor: "bg-violet-100 text-violet-700",
    users: 7,
    status: "active" as const,
    created: "2025-07-15",
    createdLabel: "Jul 15, 2025",
    lastActivity: "6 hours ago",
    lastActivitySort: "2026-02-09T06:00:00Z",
  },
  {
    id: "12",
    name: "RevenuePeak Digital",
    slug: "revenuepeak",
    initials: "RP",
    bgColor: "bg-rose-100 text-rose-700",
    users: 5,
    status: "active" as const,
    created: "2025-08-01",
    createdLabel: "Aug 1, 2025",
    lastActivity: "12 hours ago",
    lastActivitySort: "2026-02-09T00:00:00Z",
  },
]

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  active: { label: "Active", dotColor: "bg-green-500" },
  inactive: { label: "Inactive", dotColor: "bg-red-500" },
}

export function OrganizationsTable({
  searchQuery,
  statusFilter,
  onClearFilters,
  hasFilters,
  onCreateOrg,
}: OrganizationsTableProps) {
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteOrg, setDeleteOrg] = useState<{ id: string; name: string } | null>(null)

  // Filter
  const filteredOrgs = useMemo(() => {
    return orgsData.filter((org) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!org.name.toLowerCase().includes(q) && !org.slug.toLowerCase().includes(q)) return false
      }
      if (statusFilter !== "all" && org.status !== statusFilter) return false
      return true
    })
  }, [searchQuery, statusFilter])

  // Sort
  const sortedOrgs = useMemo(() => {
    const sorted = [...filteredOrgs]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "users":
          cmp = a.users - b.users
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "created":
          cmp = a.created.localeCompare(b.created)
          break
        case "lastActivity":
          cmp = a.lastActivitySort.localeCompare(b.lastActivitySort)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredOrgs, sortField, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedOrgs.length / pageSize))
  const paginatedOrgs = sortedOrgs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  // Empty State
  if (filteredOrgs.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No organizations found</h3>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <Button variant="link" className="text-blue-600" onClick={onClearFilters}>
                Clear all filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No organizations yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first organization to get started</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={onCreateOrg}>
                <Plus className="w-4 h-4" />
                Create Organization
              </Button>
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
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("name")}
                    >
                      Organization
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("users")}
                    >
                      Users
                      <SortIcon field="users" />
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
                      onClick={() => toggleSort("created")}
                    >
                      Created
                      <SortIcon field="created" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("lastActivity")}
                    >
                      Last Activity
                      <SortIcon field="lastActivity" />
                    </button>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrgs.map((org) => (
                  <TableRow
                    key={org.id}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${org.status === "inactive" ? "opacity-60" : ""}`}
                  >
                    <TableCell>
                      <Link href={`/organizations/${org.id}`} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-lg">
                          <AvatarFallback className={`rounded-lg text-sm font-semibold ${org.bgColor}`}>
                            {org.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900">{org.name}</p>
                          <p className="text-xs text-slate-500">{org.slug}.mediationpro.io</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {org.users} users
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusConfig[org.status].dotColor}`} />
                        <span className="text-sm">{statusConfig[org.status].label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{org.createdLabel}</TableCell>
                    <TableCell className="text-sm text-slate-500">{org.lastActivity}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem asChild>
                            <Link href={`/organizations/${org.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/organizations/${org.id}?tab=settings`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Organization
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            {org.status === "active" ? (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-2" />
                                Deactivate Organization
                              </>
                            ) : (
                              <>
                                <ToggleRight className="w-4 h-4 mr-2" />
                                Activate Organization
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteOrg({ id: org.id, name: org.name })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Organization
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
            totalItems={sortedOrgs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
            }}
            itemName="organizations"
          />
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedOrgs.map((org) => (
          <Card key={org.id} className={`border-slate-200 ${org.status === "inactive" ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <Link href={`/organizations/${org.id}`} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarFallback className={`rounded-lg text-sm font-semibold ${org.bgColor}`}>
                      {org.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">{org.name}</p>
                    <p className="text-xs text-slate-500">{org.slug}.mediationpro.io</p>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <Link href={`/organizations/${org.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/organizations/${org.id}?tab=settings`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Organization
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      {org.status === "active" ? (
                        <>
                          <ToggleLeft className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleRight className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setDeleteOrg({ id: org.id, name: org.name })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 ml-13 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {org.users} users
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusConfig[org.status].dotColor}`} />
                  <span className="text-slate-600">{statusConfig[org.status].label}</span>
                </div>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{org.lastActivity}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Mobile Pagination */}
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-slate-500">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedOrgs.length)} of{" "}
            {sortedOrgs.length}
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
      <AlertDialog open={!!deleteOrg} onOpenChange={(open) => { if (!open) setDeleteOrg(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">{deleteOrg?.name}</span>? This action cannot be undone
              and will permanently remove the organization and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setDeleteOrg(null)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
