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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { PersonnelNode } from "@/lib/mock/org-personnel-mock"

interface PersonnelAssignManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: PersonnelNode | null
  candidates: PersonnelNode[]
  onAssign: (nodeId: string, managerId: string | null, managerName: string | null) => void
}

export function PersonnelAssignManagerDialog({
  open,
  onOpenChange,
  node,
  candidates,
  onAssign,
}: PersonnelAssignManagerDialogProps) {
  const [managerId, setManagerId] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!node || !open) return
    setManagerId(node.managerId ?? "")
    setSavedMessage(null)
  }, [node, open])

  const handleSave = async () => {
    if (!node) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    const manager = candidates.find((c) => c.id === managerId)
    onAssign(
      node.id,
      managerId || null,
      manager ? `${manager.name}${manager.title ? ` · ${manager.title}` : ""}` : null,
    )
    setSaving(false)
    setSavedMessage(managerId ? "Manager assigned (preview only)." : "Manager cleared (preview only).")
    setTimeout(() => {
      setSavedMessage(null)
      onOpenChange(false)
    }, 900)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>Assign manager</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Choose who {node?.name ?? "this member"} reports to in the org chart preview.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="text-slate-700 dark:text-slate-200">Manager</Label>
            <Select
              value={managerId || "__none__"}
              onValueChange={(v) => setManagerId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No manager (clear)</SelectItem>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.title ? ` — ${c.title}` : ""}
                    {c.type === "department" ? " (Dept)" : ""}
                  </SelectItem>
                ))}
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
