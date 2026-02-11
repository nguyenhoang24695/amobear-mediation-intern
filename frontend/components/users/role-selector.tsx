"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface RoleSelectorProps {
  value: "admin" | "editor" | "viewer"
  onValueChange: (value: "admin" | "editor" | "viewer") => void
  label?: string
  idPrefix?: string
  adminDescription?: string
  editorDescription?: string
  viewerDescription?: string
}

export function RoleSelector({
  value,
  onValueChange,
  label = "Role",
  idPrefix = "role",
  adminDescription = "Full access to all features including user management",
  editorDescription = "Can view and edit apps, mediation groups, and reports",
  viewerDescription = "Read-only access to assigned apps and reports",
}: RoleSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <RadioGroup value={value} onValueChange={onValueChange} className="space-y-3">
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
          <RadioGroupItem value="admin" id={`${idPrefix}-admin`} className="mt-0.5" />
          <div>
            <Label htmlFor={`${idPrefix}-admin`} className="font-medium cursor-pointer">
              Admin
            </Label>
            <p className="text-xs text-slate-500">{adminDescription}</p>
          </div>
        </div>
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
          <RadioGroupItem value="editor" id={`${idPrefix}-editor`} className="mt-0.5" />
          <div>
            <Label htmlFor={`${idPrefix}-editor`} className="font-medium cursor-pointer">
              Editor
            </Label>
            <p className="text-xs text-slate-500">{editorDescription}</p>
          </div>
        </div>
        <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
          <RadioGroupItem value="viewer" id={`${idPrefix}-viewer`} className="mt-0.5" />
          <div>
            <Label htmlFor={`${idPrefix}-viewer`} className="font-medium cursor-pointer">
              Viewer
            </Label>
            <p className="text-xs text-slate-500">{viewerDescription}</p>
          </div>
        </div>
      </RadioGroup>
    </div>
  )
}

