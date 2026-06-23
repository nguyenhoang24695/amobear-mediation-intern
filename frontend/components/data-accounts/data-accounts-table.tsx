"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  Key,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Plug,
  Plus,
  Loader2,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import { AddEditAccountModal, type DataAccount } from "./add-edit-account-modal"
import { dataAccountsApi, type DataAccountItem } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

interface DataAccountsTableProps {
  accounts: DataAccountItem[]
  loading: boolean
  searchQuery: string
  networkFilter: string
  statusFilter: string
  onClearFilters: () => void
  hasFilters: boolean
  onAddAccount: () => void
  onRefresh: () => void
  canEdit?: boolean
  canDelete?: boolean
}

type SortField = "name" | "network" | "accountId" | "status" | "createdAt"
type SortDir = "asc" | "desc"

const networkConfig: Record<string, { label: string; className: string; initials: string; bgColor: string }> = {
  admob: { label: "AdMob", className: "bg-amber-50 text-amber-700 border-amber-200", initials: "AM", bgColor: "bg-amber-100 text-amber-700" },
  applovin: { label: "AppLovin", className: "bg-violet-50 text-violet-700 border-violet-200", initials: "AL", bgColor: "bg-violet-100 text-violet-700" },
  xmp: { label: "XMP", className: "bg-blue-50 text-blue-700 border-blue-200", initials: "XM", bgColor: "bg-blue-100 text-blue-700" },
  appsflyer: { label: "AppsFlyer", className: "bg-sky-50 text-sky-800 border-sky-200", initials: "AF", bgColor: "bg-sky-100 text-sky-800" },
  qonversion: { label: "Qonversion", className: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200", initials: "QO", bgColor: "bg-fuchsia-100 text-fuchsia-800" },
  apple: { label: "Apple", className: "bg-slate-100 text-slate-800 border-slate-200", initials: "AP", bgColor: "bg-slate-200 text-slate-800" },
}

const statusConfig: Record<string, { label: string; dotColor: string }> = {
  active: { label: "Active", dotColor: "bg-green-500" },
  error: { label: "Error", dotColor: "bg-red-500" },
  disabled: { label: "Disabled", dotColor: "bg-slate-400" },
  pending: { label: "Pending", dotColor: "bg-amber-500" },
}

export function DataAccountsTable({
  accounts,
  loading,
  searchQuery,
  networkFilter,
  statusFilter,
  onClearFilters,
  hasFilters,
  onAddAccount,
  onRefresh,
  canEdit = true,
  canDelete = true,
}: DataAccountsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteAccount, setDeleteAccount] = useState<{ id: number; name: string; network: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editAccount, setEditAccount] = useState<DataAccount | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const handleEdit = (account: DataAccountItem) => {
    const mapped: DataAccount = {
      id: String(account.id),
      name: account.name,
      network: account.network,
      publisherId: account.network === "admob" ? account.accountId : undefined,
      defaultAppType: account.network === "admob" ? (account.defaultAppType ?? undefined) : undefined,
      reportKey: account.network === "applovin" ? account.reportKey : undefined,
      baseUrl:
        account.network === "applovin" || account.network === "appsflyer" ? account.baseUrl : undefined,
      xmpClientId: account.network === "xmp" ? account.xmpClientId : undefined,
      xmpClientSecret: account.network === "xmp" ? account.xmpClientSecret : undefined,
      isDefault:
        account.network === "appsflyer" || account.network === "qonversion" ? account.isDefault : undefined,
      qonProjectKey: account.network === "qonversion" ? account.qonProjectKey : undefined,
      qonApiBaseUrl: account.network === "qonversion" ? account.qonApiBaseUrl : undefined,
      qonGcsBucketName: account.network === "qonversion" ? account.qonGcsBucketName ?? undefined : undefined,
      qonHasGcsJson: account.network === "qonversion" ? account.qonHasGcsJson : undefined,
      appleVendorNumber: account.network === "apple" ? account.appleVendorNumber ?? undefined : undefined,
      appleAscKeyId: account.network === "apple" ? account.appleAscKeyId ?? undefined : undefined,
      appleAscIssuerId: account.network === "apple" ? account.appleAscIssuerId ?? undefined : undefined,
      appleHasAscPrivateKey: account.network === "apple" ? account.appleHasAscPrivateKey : undefined,
      appleIapKeyId: account.network === "apple" ? account.appleIapKeyId ?? undefined : undefined,
      appleIapIssuerId: account.network === "apple" ? account.appleIapIssuerId ?? undefined : undefined,
      appleHasIapPrivateKey: account.network === "apple" ? account.appleHasIapPrivateKey : undefined,
      appleUseSandboxStoreKit: account.network === "apple" ? account.appleUseSandboxStoreKit : undefined,
    }
    setEditAccount(mapped)
    setEditModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteAccount) return
    setDeleting(true)
    try {
      await dataAccountsApi.delete(deleteAccount.network, deleteAccount.id)
      toast({ title: "Account deleted", description: `"${deleteAccount.name}" has been deleted.` })
      onRefresh()
    } catch {
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" })
    } finally {
      setDeleting(false)
      setDeleteAccount(null)
    }
  }

  const handleToggleStatus = async (account: DataAccountItem) => {
    try {
      if (account.enabled) {
        await dataAccountsApi.disable(account.network, account.id)
        toast({ title: "Account disabled", description: `"${account.name}" has been disabled.` })
      } else {
        await dataAccountsApi.enable(account.network, account.id)
        toast({ title: "Account enabled", description: `"${account.name}" has been enabled.` })
      }
      onRefresh()
    } catch {
      toast({ title: "Error", description: "Failed to update account status.", variant: "destructive" })
    }
  }

  // Filter
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !account.name.toLowerCase().includes(q) &&
          !account.accountId.toLowerCase().includes(q)
        )
          return false
      }
      if (networkFilter !== "all" && account.network !== networkFilter) return false
      if (statusFilter !== "all" && account.status !== statusFilter) return false
      return true
    })
  }, [accounts, searchQuery, networkFilter, statusFilter])

  // Sort
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "network":
          cmp = a.network.localeCompare(b.network)
          break
        case "accountId":
          cmp = a.accountId.localeCompare(b.accountId)
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [filteredAccounts, sortField, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / pageSize))
  const paginatedAccounts = sortedAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  // Loading State
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-sm text-slate-500">Loading accounts...</p>
        </CardContent>
      </Card>
    )
  }

  // Empty State
  if (filteredAccounts.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center px-4 py-16 text-center">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No accounts found</h3>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <Button variant="link" className="text-blue-600" onClick={onClearFilters}>
                Clear all filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No data accounts yet</h3>
              <p className="text-sm text-slate-500 mb-4">Connect your first ad network account to start syncing data</p>
              <Button className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 min-[360px]:w-auto" onClick={onAddAccount}>
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const getNetworkInfo = (network: string) => networkConfig[network] || networkConfig.admob

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
                      Account
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("network")}
                    >
                      Network
                      <SortIcon field="network" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("accountId")}
                    >
                      Account ID
                      <SortIcon field="accountId" />
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
                      onClick={() => toggleSort("createdAt")}
                    >
                      Created
                      <SortIcon field="createdAt" />
                    </button>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccounts.map((account) => {
                  const net = getNetworkInfo(account.network)
                  const stat = statusConfig[account.status] || statusConfig.active
                  return (
                    <TableRow
                      key={`${account.network}-${account.id}`}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${!account.enabled ? "opacity-60" : ""}`}
                      onClick={() => router.push(`/data-accounts/${account.network}-${account.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-lg">
                            <AvatarFallback className={`rounded-lg text-sm font-semibold ${net.bgColor}`}>
                              {net.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900">{account.name}</p>
                            <p className="text-xs text-slate-500">{account.isDefault ? "Default" : ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-medium ${net.className}`}>
                          {net.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-mono">{account.accountId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                          <span className="text-sm">{stat.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem asChild>
                              <Link href={`/data-accounts/${account.network}-${account.id}`} className="flex items-center">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(account)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
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
            totalItems={sortedAccounts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
            }}
            itemName="accounts"
          />
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedAccounts.map((account) => {
          const net = getNetworkInfo(account.network)
          const stat = statusConfig[account.status] || statusConfig.active
          return (
            <Card
              key={`${account.network}-${account.id}`}
              className={`border-slate-200 cursor-pointer transition-colors hover:border-slate-300 ${!account.enabled ? "opacity-60" : ""}`}
              onClick={() => router.push(`/data-accounts/${account.network}-${account.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                      <AvatarFallback className={`rounded-lg text-sm font-semibold ${net.bgColor}`}>
                        {net.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{account.name}</p>
                      <p className="break-all text-xs text-slate-500">{account.accountId}</p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem asChild>
                          <Link href={`/data-accounts/${account.network}-${account.id}`} className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(account)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && <DropdownMenuSeparator />}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleToggleStatus(account)}>
                            {account.enabled ? (
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
                        )}
                        {canDelete && <DropdownMenuSeparator />}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteAccount({ id: account.id, name: account.name, network: account.network })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-3 ml-13 flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className={`font-medium ${net.className}`}>
                    {net.label}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
                    <span className="text-slate-600">{stat.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Mobile Pagination */}
        <div className="flex flex-col gap-2 py-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
          <p className="text-sm text-slate-500">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, sortedAccounts.length)} of{" "}
            {sortedAccounts.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-[360px]:flex-none"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-[360px]:flex-none"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAccount} onOpenChange={(open) => { if (!open) setDeleteAccount(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">{deleteAccount?.name}</span>? This action cannot be undone
              and will permanently remove the account and stop all data synchronization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      <AddEditAccountModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) setEditAccount(null)
        }}
        editAccount={editAccount}
        onSaved={onRefresh}
      />
    </>
  )
}
