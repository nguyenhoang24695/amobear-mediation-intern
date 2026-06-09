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
import { toast } from "sonner"
import { RoleSelector } from "../role-selector"
import { hasSuperAdminRole, normalizeUserRoles } from "@/lib/enums/user-role"

interface AddEditUserModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "add" | "edit"
    canManage?: boolean
    user?: {
        id: string
        name: string
        email: string
        firstName?: string
        lastName?: string
        phone?: string
        role: string
        roles?: string[]
        status: string
    }
    onSuccess?: () => void
}

export function AddEditUserModal({
    open,
    onOpenChange,
    mode,
    canManage = false,
    user,
    onSuccess,
}: AddEditUserModalProps) {
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [roles, setRoles] = useState<string[]>(["viewer"])
    const [status, setStatus] = useState("active")
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const roleEditDisabled = mode === "edit" && hasSuperAdminRole(user?.role, user?.roles)

    useEffect(() => {
        if (mode === "edit" && user) {
            const parts = user.name.split(" ")
            setFirstName(user.firstName ?? parts[0] ?? "")
            setLastName(user.lastName ?? parts.slice(1).join(" ") ?? "")
            setEmail(user.email)
            setPhone(user.phone ?? "")
            setRoles(normalizeUserRoles(user.role, user.roles))
            setStatus(user.status)
        } else {
            setFirstName("")
            setLastName("")
            setEmail("")
            setPhone("")
            setRoles(["viewer"])
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
        if (!roleEditDisabled && roles.length === 0) {
            newErrors.roles = "Select at least one role"
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
                    phone: phone.trim() || undefined,
                    ...(roleEditDisabled ? {} : { roles }),
                    status,
                })
                toast.success("User updated successfully")
                onSuccess?.()
                onOpenChange(false)
            } else {
                console.warn("Add mode not fully implemented in this modal integration")
                onOpenChange(false)
            }
        } catch (error) {
            console.error("Failed to update user:", error)
            toast.error(error instanceof Error ? error.message : "Failed to update user")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{mode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
                    <DialogDescription>
                        {mode === "add"
                            ? "Create a new user account and assign roles."
                            : roleEditDisabled
                              ? "Update the user's information. Roles are locked for super_admin users."
                              : "Update the user's information and roles."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2 flex-1 overflow-y-auto pr-2 min-h-0">
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

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john.doe@company.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })) }}
                            className={errors.email ? "border-red-500" : ""}
                            disabled={mode === "edit"}
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 234 567 890"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Roles</Label>
                        {roleEditDisabled ? (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Role assignment is locked for super_admin users.
                            </p>
                        ) : null}
                        <RoleSelector
                            value={roles}
                            onChange={setRoles}
                            canManage={canManage}
                            disabled={roleEditDisabled}
                        />
                        {errors.roles && <p className="text-xs text-red-500">{errors.roles}</p>}
                    </div>

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
                                    <SelectItem value="locked">Locked</SelectItem>
                                    <SelectItem value="invited">Invited</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter className="pt-4 mt-auto">
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
