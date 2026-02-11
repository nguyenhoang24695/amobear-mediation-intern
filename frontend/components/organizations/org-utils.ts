/**
 * Shared utility functions for organization components
 */

const ORG_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-red-100 text-red-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
]

export function getOrgInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export function getOrgColor(name: string): string {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return ORG_COLORS[hash % ORG_COLORS.length]
}

export function formatDate(dateString: string, format: "short" | "long" = "short"): string {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
        month: format === "long" ? "long" : "short",
        day: "numeric",
        year: "numeric",
    })
}

export function getRoleColor(role: string): string {
    const roleLower = role.toLowerCase()
    if (roleLower.includes('admin')) return 'bg-blue-500'
    if (roleLower.includes('editor')) return 'bg-cyan-500'
    if (roleLower.includes('viewer')) return 'bg-slate-400'
    return 'bg-gray-500'
}
