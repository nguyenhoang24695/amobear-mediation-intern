"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Search, Plus, Users, Loader2, FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { organizationsApi, type OrgTeam } from "@/lib/api/services"
import { CreateTeamModal } from "../create-team-modal"

interface OrgTeamsTabProps {
    orgId: string
    orgName?: string
    canManage?: boolean
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function OrgTeamsTab({ orgId, orgName = "Organization", canManage = false }: OrgTeamsTabProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [teams, setTeams] = useState<OrgTeam[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    // Edit state
    const [editTeam, setEditTeam] = useState<OrgTeam | null>(null)
    const [editName, setEditName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editIsActive, setEditIsActive] = useState(true)
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState("")

    // Delete state
    const [deleteTeam, setDeleteTeam] = useState<OrgTeam | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchTeams = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await organizationsApi.getTeams(orgId)
            setTeams(data)
        } catch (err) {
            console.error("Failed to fetch teams:", err)
            setError("Failed to load teams")
        } finally {
            setLoading(false)
        }
    }, [orgId])

    useEffect(() => {
        fetchTeams()
    }, [fetchTeams])

    // Client-side search filter
    const filteredTeams = teams.filter((team) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return team.name.toLowerCase().includes(query) || team.description?.toLowerCase().includes(query)
    })

    const activeCount = teams.filter((t) => t.isActive).length
    const inactiveCount = teams.filter((t) => t.isActive === false).length

    // Edit handlers
    const openEdit = (team: OrgTeam) => {
        setEditTeam(team)
        setEditName(team.name)
        setEditDescription(team.description || "")
        setEditIsActive(team.isActive)
        setEditError("")
    }

    const handleUpdate = async () => {
        if (!editTeam || !editName.trim()) return
        setEditSaving(true)
        setEditError("")
        try {
            await organizationsApi.updateTeam(orgId, editTeam.id, {
                name: editName.trim(),
                description: editDescription.trim() || undefined,
                isActive: editIsActive,
            })
            setEditTeam(null)
            fetchTeams()
        } catch (err: unknown) {
            const apiError = err as { response?: { status?: number; data?: { message?: string } } }
            if (apiError?.response?.status === 409) {
                setEditError(apiError.response.data?.message || "A team with this name already exists")
            } else {
                setEditError("Failed to update team. Please try again.")
            }
        } finally {
            setEditSaving(false)
        }
    }

    // Delete handler
    const handleDelete = async () => {
        if (!deleteTeam) return
        setDeleting(true)
        try {
            await organizationsApi.deleteTeam(orgId, deleteTeam.id)
            setDeleteTeam(null)
            fetchTeams()
        } catch (err) {
            console.error("Failed to delete team:", err)
        } finally {
            setDeleting(false)
        }
    }

    // Navigate to team members page
    const handleRowClick = (teamId: string, e: React.MouseEvent) => {
        // Don't navigate if clicking on action button
        const target = e.target as HTMLElement
        if (target.closest('[role="menuitem"]') || target.closest('button')) {
            return
        }
        router.push(`/team-members?teamId=${teamId}`)
    }

    return (
        <div className="space-y-6">
            {/* Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
                        <Badge variant="secondary" className="rounded-full">
                            {teams.length}
                        </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Manage teams in this organization</p>
                </div>
                {canManage && (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4" />
                        Create Team
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search teams..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>

            {/* Stats Row */}
            {!loading && !error && (
                <div className="flex flex-wrap items-center gap-6 text-sm">
                    <span className="text-slate-500">Total: <span className="font-semibold text-slate-900">{teams.length}</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Active: <span className="font-semibold text-green-600">{activeCount}</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Inactive: <span className="font-semibold text-red-600">{inactiveCount}</span></span>
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
                        <Button onClick={() => fetchTeams()}>Try Again</Button>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!loading && !error && filteredTeams.length === 0 && (
                <Card className="border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FolderOpen className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">No teams found</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            {searchQuery ? "Try adjusting your search" : "Create your first team to get started"}
                        </p>
                        {canManage && !searchQuery && (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                                <Plus className="w-4 h-4" />
                                Create Team
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            {!loading && !error && filteredTeams.length > 0 && (
                <Card className="border-slate-200">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead>
                                            <span className="text-xs font-medium uppercase tracking-wide">Team Name</span>
                                        </TableHead>
                                        <TableHead>
                                            <span className="text-xs font-medium uppercase tracking-wide">Description</span>
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <span className="text-xs font-medium uppercase tracking-wide">Members</span>
                                        </TableHead>
                                        <TableHead>
                                            <span className="text-xs font-medium uppercase tracking-wide">Status</span>
                                        </TableHead>
                                        <TableHead>
                                            <span className="text-xs font-medium uppercase tracking-wide">Created</span>
                                        </TableHead>
                                        <TableHead className="w-12">
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTeams.map((team) => (
                                        <TableRow
                                            key={team.id}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={(e) => handleRowClick(team.id, e)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <Users className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <span className="font-medium text-slate-900">{team.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                                                {team.description || "—"}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="rounded-full">
                                                    {team.memberCount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {team.isActive ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">{formatDate(team.createdAt)}</TableCell>
                                            <TableCell>
                                                {canManage && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => openEdit(team)}>
                                                                <Pencil className="w-4 h-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTeam(team)}>
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Team Modal */}
            <CreateTeamModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                orgId={orgId}
                orgName={orgName}
                onSuccess={fetchTeams}
            />

            {/* Edit Team Dialog */}
            <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) setEditTeam(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Team</DialogTitle>
                        <DialogDescription>Update team details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Team name <span className="text-red-500">*</span></Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => { setEditName(e.target.value); setEditError("") }}
                                maxLength={100}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-desc">Description <span className="text-slate-400">(optional)</span></Label>
                            <Textarea
                                id="edit-desc"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value.slice(0, 500))}
                                rows={3}
                                maxLength={500}
                            />
                            <p className="text-xs text-slate-400 text-right">{editDescription.length}/500</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="edit-active">Active</Label>
                            <Switch id="edit-active" checked={editIsActive} onCheckedChange={setEditIsActive} />
                        </div>
                        {editError && <p className="text-sm text-red-500">{editError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="bg-transparent" onClick={() => setEditTeam(null)} disabled={editSaving}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdate} disabled={editSaving || !editName.trim()}>
                            {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTeam} onOpenChange={(open) => { if (!open) setDeleteTeam(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteTeam?.name}</span>?
                            This action cannot be undone. All team memberships will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {deleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
