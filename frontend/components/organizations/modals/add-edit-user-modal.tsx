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
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ShieldCheck, UserRoundPen, Users } from "lucide-react"
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
            <DialogContent className="w-[calc(100vw-1rem)] max-h-[95vh] max-w-[min(96vw,42rem)] overflow-hidden border-border bg-background p-0 shadow-2xl">
                <div className="flex max-h-[95vh] flex-col bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
                    <DialogHeader className="border-b border-slate-200 px-6 pb-5 pt-6 text-left dark:border-slate-800">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/15 dark:ring-primary/20">
                                {mode === "add" ? (
                                    <Users className="h-6 w-6" />
                                ) : (
                                    <UserRoundPen className="h-6 w-6" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <DialogTitle className="text-xl text-slate-900 dark:text-slate-50">
                                        {mode === "add" ? "Add New User" : "Edit User"}
                                    </DialogTitle>
                                    <Badge
                                        variant="outline"
                                        className={
                                            mode === "add"
                                                ? "border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10"
                                                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                        }
                                    >
                                        {mode === "add" ? "New member" : "Profile update"}
                                    </Badge>
                                </div>
                                <DialogDescription className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                    {mode === "add"
                                        ? "Create a new user account and assign roles."
                                        : roleEditDisabled
                                          ? "Update the user's information. Roles are locked for super_admin users."
                                          : "Update the user's information and roles."}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5 min-h-0">
                        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
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

                        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
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

                        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1 234 567 890"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-slate-900 dark:text-slate-100">Roles</Label>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>Access control</span>
                                </div>
                            </div>
                            {roleEditDisabled ? (
                                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                    <p>Role assignment is locked for super_admin users.</p>
                                </div>
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
                            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
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

                        <DialogFooter className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === "add" ? "Add User" : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
