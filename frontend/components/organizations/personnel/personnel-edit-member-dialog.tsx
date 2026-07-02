"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { PersonnelMemberPatch, PersonnelNode } from "@/lib/mock/org-personnel-mock"

interface PersonnelEditMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: PersonnelNode | null
  onSave: (nodeId: string, patch: PersonnelMemberPatch) => void
}

export function PersonnelEditMemberDialog({
  open,
  onOpenChange,
  node,
  onSave,
}: PersonnelEditMemberDialogProps) {
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"active" | "inactive" | "invited">("active")
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!node || !open) return
    setName(node.name)
    setTitle(node.title ?? "")
    setDepartment(node.department ?? "")
    setEmail(node.email ?? "")
    setStatus(node.status ?? "active")
    setSavedMessage(null)
  }, [node, open])

  const handleSave = async () => {
    if (!node) return
    if (!name.trim()) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    onSave(node.id, {
      name: name.trim(),
      title: title.trim() || undefined,
      department: department.trim() || undefined,
      email: email.trim() || undefined,
      status,
    })
    setSaving(false)
    setSavedMessage("Changes saved locally (preview only).")
    setTimeout(() => {
      setSavedMessage(null)
      onOpenChange(false)
    }, 900)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Update profile fields for this node. Changes apply to the preview chart only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="personnel-name" className="text-slate-700 dark:text-slate-200">Full name</Label>
            <Input
              id="personnel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="personnel-title" className="text-slate-700 dark:text-slate-200">Title</Label>
            <Input
              id="personnel-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="personnel-dept" className="text-slate-700 dark:text-slate-200">Department</Label>
            <Input
              id="personnel-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="personnel-email" className="text-slate-700 dark:text-slate-200">Email</Label>
            <Input
              id="personnel-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-slate-700 dark:text-slate-200">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {savedMessage && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/15 dark:text-green-200">
              {savedMessage}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
