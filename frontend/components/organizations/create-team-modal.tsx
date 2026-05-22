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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { organizationsApi, type OrgUserItem } from "@/lib/api/services"

const NO_TEAM_LEAD_VALUE = "__none__"

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
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setName("")
            setDescription("")
            setTeamLeadUserId(null)
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
                        <Label htmlFor="team-lead">
                            Team Lead <span className="text-slate-400">(optional)</span>
                        </Label>
                        <Select
                            value={teamLeadUserId ?? NO_TEAM_LEAD_VALUE}
                            onValueChange={(value) => setTeamLeadUserId(value === NO_TEAM_LEAD_VALUE ? null : value)}
                        >
                            <SelectTrigger id="team-lead" className="bg-white">
                                <SelectValue placeholder="Select team lead" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_TEAM_LEAD_VALUE}>No team lead</SelectItem>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.fullName || user.email} ({user.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
