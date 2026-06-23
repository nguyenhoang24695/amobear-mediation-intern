"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, ChevronRight } from "lucide-react"
import type { Role } from "./permission-management-content"

interface RoleSelectorProps {
  roles: Role[]
  selectedRoleId: string
  onSelectRole: (id: string) => void
}

export function RoleSelector({ roles, selectedRoleId, onSelectRole }: RoleSelectorProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {roles.map((role) => {
            const isSelected = role.id === selectedRoleId
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelectRole(role.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "bg-blue-50 border-l-2 border-l-blue-600"
                    : "hover:bg-slate-50 border-l-2 border-l-transparent",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? "text-blue-700" : "text-slate-700",
                      )}
                    >
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500">
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{role.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Users className="w-3 h-3" />
                    {role.userCount}
                  </div>
                  {isSelected && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
