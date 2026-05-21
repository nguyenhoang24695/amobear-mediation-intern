"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OrganizationLogoMark } from "./organization-logo-mark"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import type { OrganizationListItem } from "@/lib/api/services"
import { formatDate } from "./org-utils"

interface OrganizationsTableProps {
  organizations: OrganizationListItem[]
  searchQuery: string
  statusFilter: string
  onClearFilters: () => void
  hasFilters: boolean
  onCreateOrg: () => void
  onDeleteOrg: (org: OrganizationListItem) => void
  onToggleStatus: (org: OrganizationListItem) => void
  isSuperAdmin?: boolean
  canViewDetails?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canManageSettings?: boolean
  canCreate?: boolean
}

type SortField = "name" | "users" | "status" | "created"
type SortDir = "asc" | "desc"

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  active: { label: "Active", dotColor: "bg-green-500" },
  inactive: { label: "Inactive", dotColor: "bg-red-500" },
}

export function OrganizationsTable({
  organizations,
  searchQuery,
  statusFilter,
  onClearFilters,
  hasFilters,
  onCreateOrg,
  onDeleteOrg,
  onToggleStatus,
  isSuperAdmin = false,
  canViewDetails = true,
  canEdit = true,
  canDelete = true,
  canManageSettings = true,
  canCreate = true,
}: OrganizationsTableProps) {
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!org.name.toLowerCase().includes(q) && !org.slug.toLowerCase().includes(q)) return false
      }
      if (statusFilter !== "all") {
        const status = org.isActive ? "active" : "inactive"
        if (status !== statusFilter) return false
      }
      return true
    })
  }, [organizations, searchQuery, statusFilter])

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
          cmp = a.userCount - b.userCount
          break
        case "status":
          cmp = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)
          break
        case "created":
          cmp = a.createdAt.localeCompare(b.createdAt)
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
              {canCreate && (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={onCreateOrg}>
                  <Plus className="w-4 h-4" />
                  Create Organization
                </Button>
              )}
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
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrgs.map((org) => {
                  const status = org.isActive ? "active" : "inactive"
                  return (
                    <TableRow
                      key={org.id}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${!org.isActive ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        {canViewDetails ? (
                          <Link href={`/organizations/${org.id}`} className="flex items-center gap-3">
                            <OrganizationLogoMark orgName={org.name} logoUrl={org.logoUrl} size="md" />
                            <div>
                              <p className="font-semibold text-slate-900">{org.name}</p>
                              <p className="text-xs text-slate-500">{org.slug}.mediationpro.io</p>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3">
                            <OrganizationLogoMark orgName={org.name} logoUrl={org.logoUrl} size="md" />
                            <div>
                              <p className="font-semibold text-slate-900">{org.name}</p>
                              <p className="text-xs text-slate-500">{org.slug}.mediationpro.io</p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {org.userCount} users
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusConfig[status].dotColor}`} />
                          <span className="text-sm">{statusConfig[status].label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(org.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {canViewDetails && (
                              <DropdownMenuItem asChild>
                                <Link href={`/organizations/${org.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem asChild>
                                <Link href={`/organizations/${org.id}?tab=settings`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Organization
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {(canManageSettings || canDelete) && <DropdownMenuSeparator />}
                            {canManageSettings && (
                              <DropdownMenuItem onClick={() => onToggleStatus(org)}>
                                {org.isActive ? (
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
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => onDeleteOrg(org)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Organization
                              </DropdownMenuItem>
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
        {paginatedOrgs.map((org) => {
          const status = org.isActive ? "active" : "inactive"
          return (
            <Card key={org.id} className={`border-slate-200 ${!org.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {canViewDetails ? (
                    <Link href={`/organizations/${org.id}`} className="flex items-center gap-3">
                      <OrganizationLogoMark orgName={org.name} logoUrl={org.logoUrl} size="md" />
                      <div>
                        <p className="font-semibold text-slate-900">{org.name}</p>
                        <p className="text-xs text-slate-500">{org.slug}.mediationpro.io</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      <OrganizationLogoMark orgName={org.name} logoUrl={org.logoUrl} size="md" />
                      <div>
                        <p className="font-semibold text-slate-900">{org.name}</p>
                        <p className="text-xs text-slate-500">{org.slug}.mediationpro.io</p>
                      </div>
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {canViewDetails && (
                        <DropdownMenuItem asChild>
                          <Link href={`/organizations/${org.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {canEdit && (
                        <DropdownMenuItem asChild>
                          <Link href={`/organizations/${org.id}?tab=settings`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(canManageSettings || canDelete) && <DropdownMenuSeparator />}
                      {canManageSettings && (
                        <DropdownMenuItem onClick={() => onToggleStatus(org)}>
                          {org.isActive ? (
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
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => onDeleteOrg(org)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 ml-13 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {org.userCount} users
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusConfig[status].dotColor}`} />
                    <span className="text-slate-600">{statusConfig[status].label}</span>
                  </div>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">{formatDate(org.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}

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


    </>
  )
}
