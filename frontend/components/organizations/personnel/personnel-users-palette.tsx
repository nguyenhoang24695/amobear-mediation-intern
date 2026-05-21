"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { organizationsApi, type OrgUserItem } from "@/lib/api/services"
import { isOrgUserPlacedInTree, type PersonnelNode } from "@/lib/mock/org-personnel-mock"
import { paletteDraggableId, type PersonnelDragData, PERSONNEL_DRAG_TYPE } from "./personnel-dnd"
import { ChevronLeft, ChevronRight, GripVertical, Loader2, Search, Users } from "lucide-react"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function DraggableUserRow({
  user,
  placed,
}: {
  user: OrgUserItem
  placed: boolean
}) {
  const dragData: PersonnelDragData = {
    type: PERSONNEL_DRAG_TYPE,
    user: {
      id: user.id,
      name: user.fullName || user.email,
      email: user.email,
      status: user.status,
    },
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: paletteDraggableId(user.id),
    data: dragData,
    disabled: placed,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors",
        placed
          ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
          : "border-slate-200 bg-white cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-blue-50/50",
        isDragging && "opacity-50 shadow-md ring-2 ring-blue-300",
      )}
      {...(placed ? {} : { ...listeners, ...attributes })}
    >
      {!placed && <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />}
      <Avatar className="h-8 w-8 shrink-0">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
        <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
          {getInitials(user.fullName || user.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{user.fullName || user.email}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      {placed && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          On chart
        </Badge>
      )}
    </div>
  )
}

interface PersonnelUsersPaletteProps {
  orgId: string
  tree: PersonnelNode
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** Render inside side panel tab without outer collapse chrome */
  embedded?: boolean
}

export function PersonnelUsersPalette({
  orgId,
  tree,
  expanded = true,
  onExpandedChange,
  embedded = false,
}: PersonnelUsersPaletteProps) {
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<OrgUserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async (query: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await organizationsApi.getUsers(orgId, {
        page: 1,
        pageSize: 200,
        search: query.trim() || undefined,
        status: "active",
      })
      setUsers(result.items ?? [])
    } catch (err) {
      console.error("Failed to load org users for palette:", err)
      setError("Could not load users")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    const t = setTimeout(() => void fetchUsers(search), 300)
    return () => clearTimeout(t)
  }, [fetchUsers, search])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q),
    )
  }, [users, search])

  const availableCount = filteredUsers.filter(
    (u) => !isOrgUserPlacedInTree(tree, u.id, u.email),
  ).length

  if (!embedded && !expanded) {
    return (
      <div className="flex w-11 shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Expand users list"
          onClick={() => onExpandedChange?.(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Users className="mt-2 h-4 w-4 text-slate-500" />
        <span className="mt-1 text-[10px] text-slate-500 [writing-mode:vertical-rl] rotate-180">
          Users
        </span>
      </div>
    )
  }

  const listContent = (
    <>
      <div className={cn("p-3 pb-2", embedded && "px-2")}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Drag a user onto someone in the chart to add as a direct report.
        </p>
      </div>

      <ScrollArea className={cn("flex-1 px-3 pb-3", embedded ? "min-h-[240px] max-h-[360px]" : "min-h-[280px] max-h-[520px]")}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-600">{error}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No users found</p>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <DraggableUserRow
                key={user.id}
                user={user}
                placed={isOrgUserPlacedInTree(tree, user.id, user.email)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  )

  if (embedded) {
    return <div className="flex flex-col">{listContent}</div>
  }

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 shrink-0 text-slate-600" />
          <span className="text-sm font-semibold text-slate-900 truncate">Users</span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {availableCount} available
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          title="Collapse"
          onClick={() => onExpandedChange?.(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      {listContent}
    </div>
  )
}
