"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Users } from "lucide-react"
import { UsersTable } from "./users-table"
import { AddEditUserModal } from "./add-edit-user-modal"

export function UserManagementContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editUser, setEditUser] = useState<null | {
    id: string
    name: string
    email: string
    role: string
    status: string
  }>(null)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddUserOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
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

      {/* Users Table */}
      <UsersTable
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onEdit={(user) => setEditUser(user)}
        onClearFilters={() => {
          setSearchQuery("")
          setRoleFilter("all")
          setStatusFilter("all")
        }}
        hasFilters={searchQuery !== "" || roleFilter !== "all" || statusFilter !== "all"}
      />

      {/* Add User Modal */}
      <AddEditUserModal
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        mode="add"
      />

      {/* Edit User Modal */}
      {editUser && (
        <AddEditUserModal
          open={!!editUser}
          onOpenChange={(open) => { if (!open) setEditUser(null) }}
          mode="edit"
          user={editUser}
        />
      )}
    </div>
  )
}
