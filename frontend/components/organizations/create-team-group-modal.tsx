"use client"

import { useState } from "react"
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
import { Loader2 } from "lucide-react"
import { organizationsApi } from "@/lib/api/services"

interface CreateTeamGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  orgName: string
  onSuccess?: () => void
}

export function CreateTeamGroupModal({
  open,
  onOpenChange,
  orgId,
  orgName,
  onSuccess,
}: CreateTeamGroupModalProps) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("")
      setError("")
      setSaving(false)
    }
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Group name is required")
      return
    }

    setSaving(true)
    setError("")
    try {
      await organizationsApi.createTeamGroup(orgId, { name: trimmed })
      handleOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { message?: string } } }
      if (apiError?.response?.status === 409) {
        setError(apiError.response.data?.message || "A group with this name already exists")
      } else {
        setError(apiError.response?.data?.message || "Failed to create group. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Add a business group for organizing teams in {orgName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">
              Group name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder="e.g. Production, Business, Platform..."
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError("")
              }}
              maxLength={100}
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim()}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
