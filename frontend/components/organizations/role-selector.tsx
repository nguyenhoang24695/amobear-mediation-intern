import React, { useEffect, useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import { permissionApi, type PermissionRoleDto } from "@/lib/api/services"

export interface RoleSelectorProps {
    value: string
    onChange: (value: string) => void
    canManage?: boolean
    availableRoles?: string[]
}

export function RoleSelector({ value, onChange, canManage = false, availableRoles }: RoleSelectorProps) {
    const [roles, setRoles] = useState<PermissionRoleDto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let isMounted = true
        const fetchRoles = async () => {
            setLoading(true)
            try {
                const fetchedRoles = await permissionApi.getRoles()
                if (isMounted) {
                    setRoles(fetchedRoles)
                    setError(false)
                }
            } catch (err) {
                console.error("Failed to fetch roles", err)
                if (isMounted) {
                    setError(true)
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }
        fetchRoles()
        return () => { isMounted = false }
    }, [])

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Fetching roles...
            </div>
        )
    }

    if (error || roles.length === 0) {
        return <div className="p-3 text-sm text-red-500">Failed to load roles.</div>
    }

    // Filter logic based on canManage or availableRoles constraint
    let filteredRoles = roles

    if (availableRoles && availableRoles.length > 0) {
        filteredRoles = roles.filter(r => availableRoles.includes(r.roleKey))
    } else if (!canManage) {
        // Basic fallback: if cannot manage, hide super_admin/admin unless specifically provided
        filteredRoles = roles.filter(r => r.roleKey !== "super_admin" && r.roleKey !== "admin")
    }

    return (
        <RadioGroup value={value} onValueChange={onChange} className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {filteredRoles.map(role => (
                <label
                    key={role.roleKey}
                    className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50/50"
                >
                    <RadioGroupItem value={role.roleKey} className="mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-slate-900">{role.name}</p>
                        <p className="text-xs text-slate-500">{role.description || "No description available"}</p>
                    </div>
                </label>
            ))}
        </RadioGroup>
    )
}
