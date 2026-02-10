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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, CheckCircle2, X } from "lucide-react"

interface AddUserToOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgName: string
}

export function AddUserToOrgModal({ open, onOpenChange, orgName }: AddUserToOrgModalProps) {
  const [step, setStep] = useState<"form" | "success">("form")
  const [saving, setSaving] = useState(false)

  // Invite fields
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [personalMessage, setPersonalMessage] = useState("")

  const [addedCount, setAddedCount] = useState(0)

  useEffect(() => {
    if (open) {
      setStep("form")
      setEmails([])
      setEmailInput("")
      setEmailError("")
      setInviteRole("viewer")
      setPersonalMessage("")
      setSaving(false)
      setAddedCount(0)
    }
  }, [open])

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const email = emailInput.trim().replace(/,/g, "")
      if (!email) return
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError("Invalid email format")
        return
      }
      if (emails.includes(email)) {
        setEmailError("Email already added")
        return
      }
      setEmails((prev) => [...prev, email])
      setEmailInput("")
      setEmailError("")
    }
  }

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email))
  }

  const handleSubmit = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    setAddedCount(emails.length)
    setStep("success")
  }

  const canSubmit = emails.length > 0

  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invitations sent!</h2>
            <p className="text-sm text-slate-500">
              {addedCount} {addedCount === 1 ? "user has" : "users have"} been invited to{" "}
              <span className="font-medium text-slate-700">{orgName}</span>
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  setStep("form")
                  setEmails([])
                  setEmailInput("")
                  setPersonalMessage("")
                }}
              >
                Invite More
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite User to Organization</DialogTitle>
          <DialogDescription>
            Invite someone new to {orgName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Email Addresses */}
          <div className="space-y-2">
            <Label>Email addresses</Label>
            <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 p-2 border border-slate-200 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              {emails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  {email}
                  <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <input
                className="flex-1 min-w-[200px] outline-none text-sm bg-transparent"
                placeholder={emails.length === 0 ? "Enter email addresses..." : ""}
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError("") }}
                onKeyDown={handleEmailKeyDown}
              />
            </div>
            <p className="text-xs text-slate-500">Press Enter or comma to add multiple emails</p>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
          </div>

          {/* Role */}
          <div className="space-y-3">
            <Label>Role</Label>
            <RadioGroup value={inviteRole} onValueChange={setInviteRole} className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50/50">
                <RadioGroupItem value="admin" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Admin</p>
                  <p className="text-xs text-slate-500">Full access to organization settings and user management</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50/50">
                <RadioGroupItem value="editor" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Editor</p>
                  <p className="text-xs text-slate-500">Can view and edit apps, reports, and mediation settings</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50/50">
                <RadioGroupItem value="viewer" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Viewer</p>
                  <p className="text-xs text-slate-500">Read-only access to assigned apps and reports</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="personalMsg">
              Personal message <span className="text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="personalMsg"
              placeholder="Add a note to the invitation email..."
              rows={2}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value.slice(0, 300))}
              maxLength={300}
            />
            <p className="text-xs text-slate-400 text-right">{personalMessage.length}/300</p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-500">Users will receive a notification email</p>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
