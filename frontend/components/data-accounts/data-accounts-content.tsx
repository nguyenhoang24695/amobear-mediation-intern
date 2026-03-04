"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Key, Search, Plus, Download, CheckCircle2, AlertTriangle, Smartphone, Layers, X, Loader2 } from "lucide-react"
import { DataAccountsTable } from "./data-accounts-table"
import { AddEditAccountModal } from "./add-edit-account-modal"
import { useApi } from "@/hooks/use-api"
import { dataAccountsApi, type DataAccountItem } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

const SCREEN_DATA_ACCOUNTS = "s-data-accounts"
const FN_VIEW = "view"
const FN_CREATE = "create"
const FN_EDIT = "edit"
const FN_DELETE = "delete"

interface ActiveFilter {
  type: string
  value: string
}

export function DataAccountsContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [networkFilter, setNetworkFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Permission checks
  const canView = hasScreenFunction(SCREEN_DATA_ACCOUNTS, FN_VIEW)
  const canCreate = hasScreenFunction(SCREEN_DATA_ACCOUNTS, FN_CREATE)
  const canEdit = hasScreenFunction(SCREEN_DATA_ACCOUNTS, FN_EDIT)
  const canDelete = hasScreenFunction(SCREEN_DATA_ACCOUNTS, FN_DELETE)

  const { data: accounts, loading, refetch } = useApi<DataAccountItem[]>(
    () => dataAccountsApi.getAll(),
    { cacheKey: "data-accounts-list" }
  )

  // Compute stats from real data
  const stats = useMemo(() => {
    if (!accounts) return { total: 0, active: 0, errors: 0, admob: 0, applovin: 0, xmp: 0 }
    return {
      total: accounts.length,
      active: accounts.filter((a) => a.status === "active").length,
      errors: accounts.filter((a) => a.status === "error").length,
      admob: accounts.filter((a) => a.network === "admob").length,
      applovin: accounts.filter((a) => a.network === "applovin").length,
      xmp: accounts.filter((a) => a.network === "xmp").length,
    }
  }, [accounts])

  const handleFilterChange = (type: string, value: string) => {
    if (value === "all") {
      setActiveFilters(activeFilters.filter((f) => f.type !== type))
    } else {
      const existing = activeFilters.find((f) => f.type === type)
      if (existing) {
        setActiveFilters(activeFilters.map((f) => (f.type === type ? { ...f, value } : f)))
      } else {
        setActiveFilters([...activeFilters, { type, value }])
      }
    }

    switch (type) {
      case "Network":
        setNetworkFilter(value)
        break
      case "Status":
        setStatusFilter(value)
        break
    }
  }

  const removeFilter = (type: string) => {
    setActiveFilters(activeFilters.filter((f) => f.type !== type))
    switch (type) {
      case "Network":
        setNetworkFilter("all")
        break
      case "Status":
        setStatusFilter("all")
        break
    }
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setNetworkFilter("all")
    setStatusFilter("all")
    setSearchQuery("")
  }

  const hasFilters = searchQuery !== "" || networkFilter !== "all" || statusFilter !== "all"

  if (!canView) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Data Accounts</h1>
            <Badge variant="secondary" className="rounded-full">
              {loading ? "..." : `${stats.total} accounts`}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage external ad network accounts for data synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* TODO: Add export functionality */}
          {false && <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>}
          {canCreate && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2" 
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <Key className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.total}</p>
              <p className="text-sm text-slate-500">Total Accounts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.active}</p>
              <p className="text-sm text-slate-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.errors}</p>
              <p className="text-sm text-slate-500">Errors</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Smartphone className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.admob}</p>
              <p className="text-sm text-slate-500">AdMob Accounts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.applovin}</p>
              <p className="text-sm text-slate-500">AppLovin Accounts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.xmp}</p>
              <p className="text-sm text-slate-500">XMP Accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email or account ID..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={networkFilter} onValueChange={(v) => handleFilterChange("Network", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Networks</SelectItem>
            <SelectItem value="admob">AdMob</SelectItem>
            <SelectItem value="applovin">AppLovin</SelectItem>
            <SelectItem value="xmp">XMP</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => handleFilterChange("Status", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.type}
              variant="secondary"
              className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1"
            >
              {filter.type}: {filter.value}
              <button onClick={() => removeFilter(filter.type)} className="ml-1 hover:bg-blue-100 rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <button onClick={clearAllFilters} className="text-sm text-blue-600 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <DataAccountsTable
        accounts={accounts || []}
        loading={loading}
        searchQuery={searchQuery}
        networkFilter={networkFilter}
        statusFilter={statusFilter}
        onClearFilters={clearAllFilters}
        hasFilters={hasFilters}
        onAddAccount={() => setAddModalOpen(true)}
        onRefresh={refetch}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <AddEditAccountModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSaved={refetch}
      />
    </div>
  )
}
