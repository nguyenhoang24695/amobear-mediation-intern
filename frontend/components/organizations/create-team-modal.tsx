"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { organizationsApi, type OrgUserItem } from "@/lib/api/services"
import { TEAM_GROUP_VALUES } from "@/lib/organizations/team-group"
import { cn } from "@/lib/utils"

const NO_TEAM_LEAD_VALUE = "__none__"
const UNCATEGORIZED_TEAM_GROUP_VALUE = "__uncategorized__"

interface TeamGroupSelectProps {
    value: string | null
    onChange: (value: string | null) => void
    id?: string
}

export function TeamGroupSelect({ value, onChange, id }: TeamGroupSelectProps) {
    return (
        <Select
            value={value ?? UNCATEGORIZED_TEAM_GROUP_VALUE}
            onValueChange={(next) => onChange(next === UNCATEGORIZED_TEAM_GROUP_VALUE ? null : next)}
        >
            <SelectTrigger id={id} className="w-full bg-white">
                <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
                {TEAM_GROUP_VALUES.map((group) => (
                    <SelectItem key={group} value={group}>
                        {group}
                    </SelectItem>
                ))}
                <SelectItem value={UNCATEGORIZED_TEAM_GROUP_VALUE}>Uncategorized</SelectItem>
            </SelectContent>
        </Select>
    )
}

interface TeamLeadComboboxProps {
    users: OrgUserItem[]
    value: string | null
    onChange: (value: string | null) => void
    disabled?: boolean
    emptyMessage?: string
}

export function TeamLeadCombobox({
    users,
    value,
    onChange,
    disabled = false,
    emptyMessage = "No users found.",
}: TeamLeadComboboxProps) {
    const [open, setOpen] = useState(false)
    const selectedUser = value ? users.find((user) => user.id === value) : null

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between bg-white font-normal"
                >
                    <span className="truncate">
                        {selectedUser
                            ? `${selectedUser.fullName || selectedUser.email} (${selectedUser.email})`
                            : "No team lead"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value={`${NO_TEAM_LEAD_VALUE} no team lead`}
                                onSelect={() => {
                                    onChange(null)
                                    setOpen(false)
                                }}
                            >
                                <Check className={cn("mr-2 h-4 w-4", value == null ? "opacity-100" : "opacity-0")} />
                                No team lead
                            </CommandItem>
                            {users.map((user) => {
                                const label = `${user.fullName || user.email} (${user.email})`
                                return (
                                    <CommandItem
                                        key={user.id}
                                        value={`${user.fullName ?? ""} ${user.email}`}
                                        onSelect={() => {
                                            onChange(user.id)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", value === user.id ? "opacity-100" : "opacity-0")} />
                                        <div className="min-w-0">
                                            <div className="truncate text-sm">{user.fullName || user.email}</div>
                                            <div className="truncate text-xs text-slate-500">{user.email}</div>
                                        </div>
                                        <span className="sr-only">{label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

interface CreateTeamModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orgId: string
    orgName: string
    users?: OrgUserItem[]
    onSuccess?: () => void
}

export function CreateTeamModal({ open, onOpenChange, orgId, orgName, users = [], onSuccess }: CreateTeamModalProps) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [teamLeadUserId, setTeamLeadUserId] = useState<string | null>(null)
    const [teamGroup, setTeamGroup] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setName("")
            setDescription("")
            setTeamLeadUserId(null)
            setTeamGroup(null)
            setError("")
            setSaving(false)
        }
        onOpenChange(open)
    }

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Team name is required")
            return
        }

        setSaving(true)
        setError("")
        try {
            await organizationsApi.createTeam(orgId, {
                name: name.trim(),
                description: description.trim() || undefined,
                userId: teamLeadUserId,
                teamGroup,
            })
            handleOpenChange(false)
            onSuccess?.()
        } catch (err: unknown) {
            const apiError = err as { response?: { status?: number; data?: { message?: string } } }
            if (apiError?.response?.status === 409) {
                setError(apiError.response.data?.message || "A team with this name already exists")
            } else {
                setError("Failed to create team. Please try again.")
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Team</DialogTitle>
                    <DialogDescription>
                        Create a new team in {orgName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="team-name">Team name <span className="text-red-500">*</span></Label>
                        <Input
                            id="team-name"
                            placeholder="e.g. Engineering, Marketing, Analytics..."
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError("") }}
                            maxLength={100}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="team-desc">
                            Description <span className="text-slate-400">(optional)</span>
                        </Label>
                        <Textarea
                            id="team-desc"
                            placeholder="What does this team work on?"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                            maxLength={500}
                        />
                        <p className="text-xs text-slate-400 text-right">{description.length}/500</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="team-group">
                            Group <span className="text-slate-400">(optional)</span>
                        </Label>
                        <TeamGroupSelect id="team-group" value={teamGroup} onChange={setTeamGroup} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="team-lead">
                            Team Lead <span className="text-slate-400">(optional)</span>
                        </Label>
                        <TeamLeadCombobox
                            users={users}
                            value={teamLeadUserId}
                            onChange={setTeamLeadUserId}
                            disabled={users.length === 0}
                            emptyMessage="Add team members before assigning a team lead."
                        />
                        {users.length === 0 && (
                            <p className="text-xs text-slate-500">Add team members before assigning a team lead.</p>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" className="bg-transparent" onClick={() => handleOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleSubmit}
                        disabled={saving || !name.trim()}
                    >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {saving ? "Creating..." : "Create Team"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
