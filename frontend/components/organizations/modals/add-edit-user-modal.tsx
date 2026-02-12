"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Loader2 } from "lucide-react"
import { teamMembersApi } from "@/lib/api/services"
import { toast } from "sonner" // Assuming we have sonner or some toast

interface AddEditUserModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "add" | "edit"
    isSuperAdmin?: boolean
    user?: {
        id: string
        name: string
        email: string
        role: string
        status: string
    }
    onSuccess?: () => void
}

export function AddEditUserModal({ open, onOpenChange, mode, isSuperAdmin = false, user, onSuccess }: AddEditUserModalProps) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("viewer")
    const [status, setStatus] = useState("active")
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (mode === "edit" && user) {
            // Split name if first/last not available separately (assuming user prop has full name)
            // Ideally we would fetch the user details to get exact first/last name,
            // but for now we'll split the display name as a starting point.
            const parts = user.name.split(" ")
            setFirstName(parts[0] || "")
            setLastName(parts.slice(1).join(" ") || "")
            setEmail(user.email)
            setRole(user.role)
            setStatus(user.status)
        } else {
            setFirstName("")
            setLastName("")
            setEmail("")
            setRole("viewer")
            setStatus("active")
        }
        setErrors({})
    }, [mode, user, open])

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!firstName.trim()) newErrors.firstName = "First name is required"
        if (!lastName.trim()) newErrors.lastName = "Last name is required"
        if (!email.trim()) {
            newErrors.email = "Email is required"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Invalid email address"
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setSaving(true)

        try {
            if (mode === "edit" && user) {
                await teamMembersApi.updateUser(user.id, {
                    firstName,
                    lastName,
                    role,
                    status
                })
                toast.success("User updated successfully")
                onSuccess?.()
                onOpenChange(false)
            } else {
                // Add mode implementation (if needed later)
                // For now, only Edit is fully supported via this modal for existing users
                console.warn("Add mode not fully implemented in this modal integration")
                onOpenChange(false)
            }
        } catch (error) {
            console.error("Failed to update user:", error)
            toast.error("Failed to update user")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
                    <DialogDescription>
                        {mode === "add"
                            ? "Create a new user account and assign a role."
                            : "Update the user's information and role."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* First & Last Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => { setFirstName(e.target.value); setErrors((prev) => ({ ...prev, firstName: "" })) }}
                                className={errors.firstName ? "border-red-500" : ""}
                            />
                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => { setLastName(e.target.value); setErrors((prev) => ({ ...prev, lastName: "" })) }}
                                className={errors.lastName ? "border-red-500" : ""}
                            />
                            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john.doe@company.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })) }}
                            className={errors.email ? "border-red-500" : ""}
                            disabled={mode === "edit"} // Email usually cannot be changed in edit mode
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status (only for edit mode) */}
                    {mode === "edit" && (
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {mode === "add" ? "Add User" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
