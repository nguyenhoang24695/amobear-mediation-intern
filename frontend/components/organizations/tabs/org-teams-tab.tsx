"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
    Search,
    Plus,
    Users,
    Loader2,
    FolderOpen,
    MoreHorizontal,
    Pencil,
    Trash2,
    ChevronRight,
    ChevronDown,
    ChevronsUpDown,
    Folder,
} from "lucide-react"
import { organizationsApi, teamMembersApi, type OrgTeam, type OrgTeamGroup, type OrgUserItem } from "@/lib/api/services"
import { buildTeamGroupSectionsFromOrg, type TeamGroupSection } from "@/lib/organizations/team-group"
import { CreateTeamGroupModal } from "../create-team-group-modal"
import { CreateTeamModal, TeamGroupSelect, TeamLeadCombobox } from "../create-team-modal"

interface OrgTeamsTabProps {
    orgId: string
    orgName?: string
    canManage?: boolean
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getInitials(name?: string | null, email?: string | null): string {
    const source = (name || email || "U").trim()
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return source.slice(0, 2).toUpperCase()
}

function teamMatchesSection(team: OrgTeam, sectionKey: string | null): boolean {
    return (team.teamGroup ?? null) === sectionKey
}

const TEAM_TABLE_COLUMN_COUNT = 9

function getTeamSelectionState(teamIds: string[], selectedTeamIds: Set<string>): boolean | "indeterminate" {
    if (teamIds.length === 0) return false
    const selectedCount = teamIds.filter((id) => selectedTeamIds.has(id)).length
    if (selectedCount === 0) return false
    if (selectedCount === teamIds.length) return true
    return "indeterminate"
}

interface TeamRowProps {
    team: OrgTeam
    canManage: boolean
    selected: boolean
    onSelectedChange: (checked: boolean) => void
    onRowClick: (teamId: string, e: React.MouseEvent) => void
    onEdit: (team: OrgTeam) => void
    onDelete: (team: OrgTeam) => void
}

function TeamRow({ team, canManage, selected, onSelectedChange, onRowClick, onEdit, onDelete }: TeamRowProps) {
    return (
        <TableRow
            className="hover:bg-slate-50 transition-colors cursor-pointer bg-white"
            onClick={(e) => onRowClick(team.id, e)}
        >
            <TableCell className="w-10" />
            <TableCell className="w-10 py-3" onClick={(e) => e.stopPropagation()}>
                {canManage && (
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(value) => onSelectedChange(value === true)}
                        aria-label={`Select ${team.name}`}
                    />
                )}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 pl-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-900">{team.name}</span>
                </div>
            </TableCell>
            <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                {team.description || "—"}
            </TableCell>
            <TableCell>
                {team.userId ? (
                    <div className="flex items-center gap-2 min-w-[180px]">
                        <Avatar className="h-8 w-8">
                            {team.teamLeadAvatarUrl ? (
                                <AvatarImage src={team.teamLeadAvatarUrl} alt={team.teamLeadName || team.teamLeadEmail || "Team lead"} />
                            ) : null}
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {getInitials(team.teamLeadName, team.teamLeadEmail)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">
                                {team.teamLeadName || team.teamLeadEmail || "Unknown user"}
                            </div>
                            {team.teamLeadEmail && (
                                <div className="text-xs text-slate-500 truncate">{team.teamLeadEmail}</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-sm text-slate-400">—</span>
                )}
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
                            <DropdownMenuItem onClick={() => onEdit(team)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(team)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </TableCell>
        </TableRow>
    )
}

interface TeamsGroupedTableProps {
    filteredTeams: OrgTeam[]
    teamGroups: OrgTeamGroup[]
    teamGroupSections: TeamGroupSection[]
    canManage: boolean
    expandedGroups: Set<string>
    selectedTeamIds: Set<string>
    bulkTeamGroup: string | null
    bulkApplying: boolean
    onBulkTeamGroupChange: (value: string | null) => void
    onApplyBulkGroup: () => void
    onClearSelection: () => void
    onToggleTeamSelection: (teamId: string, checked: boolean) => void
    onToggleSectionSelection: (teamIds: string[], checked: boolean) => void
    onToggleAllSelection: (checked: boolean) => void
    onToggleGroup: (label: string) => void
    onExpandAll: () => void
    onCollapseAll: () => void
    onRowClick: (teamId: string, e: React.MouseEvent) => void
    onEdit: (team: OrgTeam) => void
    onDelete: (team: OrgTeam) => void
}

function TeamsGroupedTable({
    filteredTeams,
    teamGroups,
    teamGroupSections,
    canManage,
    expandedGroups,
    selectedTeamIds,
    bulkTeamGroup,
    bulkApplying,
    onBulkTeamGroupChange,
    onApplyBulkGroup,
    onClearSelection,
    onToggleTeamSelection,
    onToggleSectionSelection,
    onToggleAllSelection,
    onToggleGroup,
    onExpandAll,
    onCollapseAll,
    onRowClick,
    onEdit,
    onDelete,
}: TeamsGroupedTableProps) {
    const selectedCount = selectedTeamIds.size
    const allFilteredIds = filteredTeams.map((t) => t.id)
    const allFilteredSelected = getTeamSelectionState(allFilteredIds, selectedTeamIds)

    return (
        <div className="space-y-2">
            {canManage && selectedCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-900 shrink-0">
                        {selectedCount} team{selectedCount !== 1 ? "s" : ""} selected
                    </span>
                    <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                        <span className="text-sm text-slate-600 shrink-0">Set group to</span>
                        <div className="w-full sm:max-w-[220px]">
                            <TeamGroupSelect
                                value={bulkTeamGroup}
                                onChange={onBulkTeamGroupChange}
                                groups={teamGroups}
                            />
                        </div>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                            onClick={onApplyBulkGroup}
                            disabled={bulkApplying}
                        >
                            {bulkApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {bulkApplying ? "Applying..." : "Apply"}
                        </Button>
                        <Button variant="ghost" className="shrink-0" onClick={onClearSelection} disabled={bulkApplying}>
                            Clear selection
                        </Button>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onExpandAll} className="text-xs">
                    <ChevronsUpDown className="w-3 h-3 mr-1" />
                    Expand all
                </Button>
                <Button variant="outline" size="sm" onClick={onCollapseAll} className="text-xs">
                    <ChevronsUpDown className="w-3 h-3 mr-1" />
                    Collapse all
                </Button>
            </div>
            <Card className="border-slate-200">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="w-10">
                                        <span className="sr-only">Expand</span>
                                    </TableHead>
                                    <TableHead className="w-10">
                                        {canManage ? (
                                            <Checkbox
                                                checked={
                                                    allFilteredSelected === "indeterminate"
                                                        ? "indeterminate"
                                                        : allFilteredSelected
                                                }
                                                onCheckedChange={(value) => onToggleAllSelection(value === true)}
                                                aria-label="Select all teams"
                                                disabled={filteredTeams.length === 0}
                                            />
                                        ) : (
                                            <span className="sr-only">Select</span>
                                        )}
                                    </TableHead>
                                    <TableHead>
                                        <span className="text-xs font-medium uppercase tracking-wide">Group / Team</span>
                                    </TableHead>
                                    <TableHead>
                                        <span className="text-xs font-medium uppercase tracking-wide">Description</span>
                                    </TableHead>
                                    <TableHead>
                                        <span className="text-xs font-medium uppercase tracking-wide">Team Lead</span>
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
                                {teamGroupSections.map((section) => {
                                    const sectionTeams = filteredTeams.filter((team) =>
                                        teamMatchesSection(team, section.key),
                                    )
                                    const isExpanded = expandedGroups.has(section.label)
                                    const activeInSection = sectionTeams.filter((t) => t.isActive).length
                                    const sectionTeamIds = sectionTeams.map((t) => t.id)
                                    const sectionSelection = getTeamSelectionState(sectionTeamIds, selectedTeamIds)

                                    return (
                                        <Fragment key={section.label}>
                                            <TableRow
                                                className="bg-slate-50/80 hover:bg-slate-100 cursor-pointer border-t border-slate-200 first:border-t-0"
                                                onClick={() => onToggleGroup(section.label)}
                                            >
                                                <TableCell className="w-10 py-3">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-5 h-5 text-slate-500" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-slate-500" />
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    className="w-10 py-3"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {canManage && sectionTeams.length > 0 && (
                                                        <Checkbox
                                                            checked={
                                                                sectionSelection === "indeterminate"
                                                                    ? "indeterminate"
                                                                    : sectionSelection
                                                            }
                                                            onCheckedChange={(value) =>
                                                                onToggleSectionSelection(sectionTeamIds, value === true)
                                                            }
                                                            aria-label={`Select all teams in ${section.label}`}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell colSpan={TEAM_TABLE_COLUMN_COUNT - 2} className="py-3">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {isExpanded ? (
                                                                <FolderOpen className="w-5 h-5 shrink-0 text-slate-600" />
                                                            ) : (
                                                                <Folder className="w-5 h-5 shrink-0 text-slate-600" />
                                                            )}
                                                            <span className="font-semibold text-slate-900">{section.label}</span>
                                                            <Badge variant="secondary" className="rounded-full shrink-0">
                                                                {sectionTeams.length} team{sectionTeams.length !== 1 ? "s" : ""}
                                                            </Badge>
                                                            {sectionTeams.length > 0 && activeInSection < sectionTeams.length && (
                                                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0">
                                                                    {activeInSection} active
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && sectionTeams.length === 0 && (
                                                <TableRow key={`${section.label}-empty`} className="hover:bg-transparent">
                                                    <TableCell className="w-10" />
                                                    <TableCell className="w-10" />
                                                    <TableCell
                                                        colSpan={TEAM_TABLE_COLUMN_COUNT - 2}
                                                        className="py-6 text-center text-sm text-slate-500"
                                                    >
                                                        No teams in this group
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {isExpanded &&
                                                sectionTeams.map((team) => (
                                                    <TeamRow
                                                        key={team.id}
                                                        team={team}
                                                        canManage={canManage}
                                                        selected={selectedTeamIds.has(team.id)}
                                                        onSelectedChange={(checked) =>
                                                            onToggleTeamSelection(team.id, checked)
                                                        }
                                                        onRowClick={onRowClick}
                                                        onEdit={onEdit}
                                                        onDelete={onDelete}
                                                    />
                                                ))}
                                        </Fragment>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function OrgTeamsTab({ orgId, orgName = "Organization", canManage = false }: OrgTeamsTabProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [teams, setTeams] = useState<OrgTeam[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [createGroupOpen, setCreateGroupOpen] = useState(false)
    const [teamGroups, setTeamGroups] = useState<OrgTeamGroup[]>([])

    const [editTeam, setEditTeam] = useState<OrgTeam | null>(null)
    const [editName, setEditName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editTeamGroup, setEditTeamGroup] = useState<string | null>(null)
    const [editTeamLeadUserId, setEditTeamLeadUserId] = useState<string | null>(null)
    const [editTeamLeadCandidates, setEditTeamLeadCandidates] = useState<OrgUserItem[]>([])
    const [editTeamLeadLoading, setEditTeamLeadLoading] = useState(false)
    const [editIsActive, setEditIsActive] = useState(true)
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState("")

    const [deleteTeam, setDeleteTeam] = useState<OrgTeam | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())

    const toggleGroup = (label: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev)
            if (next.has(label)) next.delete(label)
            else next.add(label)
            return next
        })
    }

    const teamGroupSections = buildTeamGroupSectionsFromOrg(teamGroups, teams)

    const expandAllGroups = () => {
        setExpandedGroups(new Set(teamGroupSections.map((s) => s.label)))
    }

    const collapseAllGroups = () => {
        setExpandedGroups(new Set())
    }

    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(() => new Set())
    const [bulkTeamGroup, setBulkTeamGroup] = useState<string | null>(null)
    const [bulkApplying, setBulkApplying] = useState(false)

    const toggleTeamSelection = (teamId: string, checked: boolean) => {
        setSelectedTeamIds((prev) => {
            const next = new Set(prev)
            if (checked) next.add(teamId)
            else next.delete(teamId)
            return next
        })
    }

    const toggleSectionSelection = (teamIds: string[], checked: boolean) => {
        setSelectedTeamIds((prev) => {
            const next = new Set(prev)
            for (const id of teamIds) {
                if (checked) next.add(id)
                else next.delete(id)
            }
            return next
        })
    }

    const toggleAllSelection = (checked: boolean) => {
        if (!checked) {
            setSelectedTeamIds(new Set())
            return
        }
        setSelectedTeamIds(new Set(filteredTeams.map((t) => t.id)))
    }

    const clearSelection = () => {
        setSelectedTeamIds(new Set())
    }

    const handleApplyBulkGroup = async () => {
        if (selectedTeamIds.size === 0 || !canManage) return
        setBulkApplying(true)
        try {
            const selected = teams.filter((t) => selectedTeamIds.has(t.id))
            await Promise.all(
                selected.map((team) =>
                    organizationsApi.updateTeam(orgId, team.id, {
                        name: team.name,
                        description: team.description,
                        userId: team.userId ?? null,
                        teamGroup: bulkTeamGroup,
                        isActive: team.isActive,
                    }),
                ),
            )
            clearSelection()
            await fetchTeams()
        } catch (err) {
            console.error("Failed to bulk update team groups:", err)
        } finally {
            setBulkApplying(false)
        }
    }

    const fetchTeamGroups = useCallback(async () => {
        try {
            const data = await organizationsApi.getTeamGroups(orgId)
            setTeamGroups(data)
        } catch (err) {
            console.error("Failed to fetch team groups:", err)
            setTeamGroups([])
        }
    }, [orgId])

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

    const refreshTeamsAndGroups = useCallback(async () => {
        await Promise.all([fetchTeamGroups(), fetchTeams()])
    }, [fetchTeamGroups, fetchTeams])

    useEffect(() => {
        void refreshTeamsAndGroups()
    }, [refreshTeamsAndGroups])

    const filteredTeams = teams.filter((team) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return team.name.toLowerCase().includes(query) || team.description?.toLowerCase().includes(query)
    })

    const activeCount = teams.filter((t) => t.isActive).length
    const inactiveCount = teams.filter((t) => t.isActive === false).length

    const openEdit = (team: OrgTeam) => {
        setEditTeam(team)
        setEditName(team.name)
        setEditDescription(team.description || "")
        setEditTeamGroup(team.teamGroup ?? null)
        setEditTeamLeadUserId(team.userId ?? null)
        setEditTeamLeadCandidates([])
        void fetchTeamLeadCandidates(team.id)
        setEditIsActive(team.isActive)
        setEditError("")
    }

    const fetchTeamLeadCandidates = async (teamId: string) => {
        setEditTeamLeadLoading(true)
        try {
            const response = await teamMembersApi.filterTeamMembers({ teamId, page: 1, pageSize: 500 })
            const candidates = (response.data?.items ?? []).map((user) => ({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status || "active",
                createdAt: "",
            }))
            setEditTeamLeadCandidates(candidates)
        } catch (err) {
            console.error("Failed to load team members for team lead selection:", err)
            setEditTeamLeadCandidates([])
        } finally {
            setEditTeamLeadLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!editTeam || !editName.trim()) return
        setEditSaving(true)
        setEditError("")
        try {
            await organizationsApi.updateTeam(orgId, editTeam.id, {
                name: editName.trim(),
                description: editDescription.trim() || undefined,
                userId: editTeamLeadUserId,
                teamGroup: editTeamGroup,
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

    const handleRowClick = (teamId: string, e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (
            target.closest('[role="menuitem"]') ||
            target.closest("button") ||
            target.closest('[data-slot="checkbox"]')
        ) {
            return
        }
        router.push(`/team-members?teamId=${teamId}`)
    }

    return (
        <div className="space-y-6">
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
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            className="gap-2 bg-white"
                            onClick={() => setCreateGroupOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Create Group
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4" />
                            Create Team
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search teams..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            clearSelection()
                        }}
                    />
                </div>
            </div>

            {!loading && !error && (
                <div className="flex flex-wrap items-center gap-6 text-sm">
                    <span className="text-slate-500">Total: <span className="font-semibold text-slate-900">{teams.length}</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Active: <span className="font-semibold text-green-600">{activeCount}</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Inactive: <span className="font-semibold text-red-600">{inactiveCount}</span></span>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            )}

            {error && !loading && (
                <Card className="border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={() => fetchTeams()}>Try Again</Button>
                    </CardContent>
                </Card>
            )}

            {!loading && !error && teams.length === 0 && (
                <Card className="border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FolderOpen className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">No teams found</h3>
                        <p className="text-sm text-slate-500 mb-4">Create your first team to get started</p>
                        {canManage && (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                                <Plus className="w-4 h-4" />
                                Create Team
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {!loading && !error && teams.length > 0 && (
                <>
                    {searchQuery && filteredTeams.length === 0 && (
                        <p className="text-sm text-slate-500">No teams match your search. Try adjusting your keywords.</p>
                    )}
                    <TeamsGroupedTable
                        filteredTeams={filteredTeams}
                        teamGroups={teamGroups}
                        teamGroupSections={teamGroupSections}
                        canManage={canManage}
                        expandedGroups={expandedGroups}
                        selectedTeamIds={selectedTeamIds}
                        bulkTeamGroup={bulkTeamGroup}
                        bulkApplying={bulkApplying}
                        onBulkTeamGroupChange={setBulkTeamGroup}
                        onApplyBulkGroup={handleApplyBulkGroup}
                        onClearSelection={clearSelection}
                        onToggleTeamSelection={toggleTeamSelection}
                        onToggleSectionSelection={toggleSectionSelection}
                        onToggleAllSelection={toggleAllSelection}
                        onToggleGroup={toggleGroup}
                        onExpandAll={expandAllGroups}
                        onCollapseAll={collapseAllGroups}
                        onRowClick={handleRowClick}
                        onEdit={openEdit}
                        onDelete={setDeleteTeam}
                    />
                </>
            )}

            <CreateTeamGroupModal
                open={createGroupOpen}
                onOpenChange={setCreateGroupOpen}
                orgId={orgId}
                orgName={orgName}
                onSuccess={fetchTeamGroups}
            />

            <CreateTeamModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                orgId={orgId}
                orgName={orgName}
                users={[]}
                teamGroups={teamGroups}
                onSuccess={refreshTeamsAndGroups}
            />

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
                        <div className="space-y-2">
                            <Label htmlFor="edit-team-group">Group <span className="text-slate-400">(optional)</span></Label>
                            <TeamGroupSelect
                                id="edit-team-group"
                                value={editTeamGroup}
                                onChange={setEditTeamGroup}
                                groups={teamGroups}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-team-lead">Team Lead <span className="text-slate-400">(optional)</span></Label>
                            <TeamLeadCombobox
                                users={editTeamLeadCandidates}
                                value={editTeamLeadUserId}
                                onChange={setEditTeamLeadUserId}
                                disabled={editTeamLeadLoading || editTeamLeadCandidates.length === 0}
                                emptyMessage={editTeamLeadLoading ? "Loading team members..." : "No team members found."}
                            />
                            <p className="text-xs text-slate-500">Only current team members can be selected.</p>
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
