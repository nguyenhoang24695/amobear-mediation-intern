"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Search, Plus, Download, Users, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { OrganizationsTable } from "./organizations-table"
import { CreateOrganizationModal } from "./create-organization-modal"
import { OrganizationActionModal, type OrganizationActionType } from "./modals/organization-action-modal"
import { organizationsApi, type OrganizationListItem } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { UserRole } from "@/lib/enums/user-role"
import { NoPermissionView } from "@/components/shared/no-permission-view"

const SCREEN_ORGS = "s-orgs"
const FN_VIEW = "view"
const FN_VIEW_DETAILS = "view-details"
const FN_CREATE = "create"
const FN_EDIT = "edit"
const FN_DELETE = "delete"

export function OrganizationListContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action Modal State
  const [selectedOrg, setSelectedOrg] = useState<OrganizationListItem | null>(null)
  const [activeAction, setActiveAction] = useState<OrganizationActionType | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { toast } = useToast()
  const user = getCurrentUser()
  const isSuperAdmin = user?.role === UserRole.SuperAdmin

  const canView = hasScreenFunction(SCREEN_ORGS, FN_VIEW)
  const canViewDetails = hasScreenFunction(SCREEN_ORGS, FN_VIEW_DETAILS)
  const canCreate = hasScreenFunction(SCREEN_ORGS, FN_CREATE)
  const canEdit = hasScreenFunction(SCREEN_ORGS, FN_EDIT)
  const canDelete = hasScreenFunction(SCREEN_ORGS, FN_DELETE)

  // Fetch organizations from API
  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await organizationsApi.getAll()
      setOrganizations(data)
    } catch (err) {
      console.error("Failed to fetch organizations:", err)
      setError("Failed to load organizations")
      toast({
        title: "Error",
        description: "Failed to load organizations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  // Calculate stats
  const stats = useMemo(() => {
    const total = organizations.length
    const active = organizations.filter(org => org.isActive).length
    const inactive = total - active
    const totalUsers = organizations.reduce((sum, org) => sum + org.userCount, 0)
    return { total, active, inactive, totalUsers }
  }, [organizations])

  // Handle organization created
  const handleOrganizationCreated = () => {
    setCreateModalOpen(false)
    fetchOrganizations() // Refresh list
  }

  // Handle action confirmation
  const handleActionConfirm = async () => {
    if (!selectedOrg || !activeAction) return

    try {
      setActionLoading(true)

      if (activeAction === "deactivate") {
        await organizationsApi.deactivate(selectedOrg.id)
        toast({
          title: "Organization deactivated",
          description: `${selectedOrg.name} has been deactivated successfully.`
        })
      } else if (activeAction === "activate") {
        await organizationsApi.activate(selectedOrg.id)
        toast({
          title: "Organization activated",
          description: `${selectedOrg.name} has been activated successfully.`
        })
      } else if (activeAction === "delete") {
        await organizationsApi.delete(selectedOrg.id)
        toast({
          title: "Organization deleted",
          description: `${selectedOrg.name} has been permanently deleted.`
        })
      }

      fetchOrganizations() // Refresh list
      setActiveAction(null)
      setSelectedOrg(null)
    } catch (err: any) {
      console.error(`Failed to ${activeAction} organization:`, err)
      toast({
        title: "Error",
        description: err.message || `Failed to ${activeAction} organization. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Handle delete request
  const handleDeleteRequest = (org: OrganizationListItem) => {
    setSelectedOrg(org)
    setActiveAction("delete")
  }

  // Handle activate/deactivate request
  const handleToggleStatusRequest = (org: OrganizationListItem) => {
    setSelectedOrg(org)
    setActiveAction(org.isActive ? "deactivate" : "activate")
  }

  if (!canView) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
            <Badge variant="secondary" className="rounded-full">
              {stats.total} organizations
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">Manage all organizations in the platform</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Organization
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total Organizations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              <p className="text-sm text-slate-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
              <p className="text-sm text-slate-500">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
              <p className="text-sm text-slate-500">Total Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or slug..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchOrganizations}>Try Again</Button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <OrganizationsTable
          organizations={organizations}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onClearFilters={() => {
            setSearchQuery("")
            setStatusFilter("all")
          }}
          hasFilters={searchQuery !== "" || statusFilter !== "all"}
          onCreateOrg={() => setCreateModalOpen(true)}
          onDeleteOrg={handleDeleteRequest}
          onToggleStatus={handleToggleStatusRequest}
          isSuperAdmin={isSuperAdmin}
          canViewDetails={canViewDetails}
          canEdit={canEdit}
          canDelete={canDelete}
          canManageSettings={canEdit}
          canCreate={canCreate}
        />
      )}

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleOrganizationCreated}
      />

      {/* Shared Action Modal */}
      {selectedOrg && activeAction && (
        <OrganizationActionModal
          open={!!activeAction}
          onOpenChange={(open) => {
            if (!open) {
              setActiveAction(null)
              setSelectedOrg(null)
            }
          }}
          actionType={activeAction}
          organizationName={selectedOrg.name}
          organizationSlug={selectedOrg.slug}
          userCount={selectedOrg.userCount}
          onConfirm={handleActionConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
