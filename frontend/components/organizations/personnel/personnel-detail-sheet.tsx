"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Mail, Users, Building2, Briefcase, UserCog } from "lucide-react"
import type { PersonnelMemberPatch, PersonnelNode } from "@/lib/mock/org-personnel-mock"
import { PersonnelEditMemberDialog } from "./personnel-edit-member-dialog"
import { PersonnelAssignManagerDialog } from "./personnel-assign-manager-dialog"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const typeLabel: Record<PersonnelNode["type"], string> = {
  organization: "Organization",
  department: "Department",
  member: "Team member",
}

interface PersonnelDetailSheetProps {
  node: PersonnelNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage?: boolean
  isEditMode?: boolean
  managerCandidates?: PersonnelNode[]
  onEditMember?: (nodeId: string, patch: PersonnelMemberPatch) => void
  onAssignManager?: (nodeId: string, managerId: string | null, managerName: string | null) => void
}

export function PersonnelDetailSheet({
  node,
  open,
  onOpenChange,
  canManage = false,
  isEditMode = false,
  managerCandidates = [],
  onEditMember,
  onAssignManager,
}: PersonnelDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  if (!node) return null

  const showMemberActions = canManage && isEditMode && node.type === "member"

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                  {getInitials(node.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{node.name}</span>
            </SheetTitle>
            <SheetDescription>
              {typeLabel[node.type]}
              {node.title ? ` · ${node.title}` : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {node.managerName && (
              <div className="flex items-start gap-3 text-sm">
                <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Reports to</p>
                  <p className="text-slate-600">{node.managerName}</p>
                </div>
              </div>
            )}
            {node.department && (
              <div className="flex items-start gap-3 text-sm">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Department</p>
                  <p className="text-slate-600">{node.department}</p>
                </div>
              </div>
            )}
            {node.email && (
              <div className="flex items-start gap-3 text-sm">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Email</p>
                  <p className="text-slate-600 break-all">{node.email}</p>
                </div>
              </div>
            )}
            {node.title && node.type === "member" && (
              <div className="flex items-start gap-3 text-sm">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Title</p>
                  <p className="text-slate-600">{node.title}</p>
                </div>
              </div>
            )}
            {typeof node.directReports === "number" && (
              <div className="flex items-start gap-3 text-sm">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Direct reports</p>
                  <p className="text-slate-600">{node.directReports}</p>
                </div>
              </div>
            )}
            {node.status && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Status</p>
                <Badge className="capitalize">{node.status}</Badge>
              </div>
            )}
            <p className="text-xs text-slate-400 border-t pt-4">
              Preview data — not synced with live users yet.
            </p>
          </div>

          {showMemberActions && (
            <div className="mt-8 flex flex-col gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit member
              </Button>
              <Button variant="outline" onClick={() => setAssignOpen(true)}>
                Assign manager
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <PersonnelEditMemberDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        node={node}
        onSave={(nodeId, patch) => {
          onEditMember?.(nodeId, patch)
        }}
      />

      <PersonnelAssignManagerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        node={node}
        candidates={managerCandidates}
        onAssign={(nodeId, managerId, managerName) => {
          onAssignManager?.(nodeId, managerId, managerName)
        }}
      />
    </>
  )
}
