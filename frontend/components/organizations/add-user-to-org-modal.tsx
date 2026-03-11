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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle2, X, Eye, EyeOff, Mail, UserPlus } from "lucide-react"
import { organizationsApi, permissionApi, type PermissionRoleDto } from "@/lib/api/services"
import { RoleSelector } from "./role-selector"

interface AddUserToOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  orgName: string
  canManage?: boolean
  onUserCreated?: () => void
}

type ActiveTab = "invite" | "create"
type Step = "form" | "success"

export function AddUserToOrgModal({ open, onOpenChange, orgId, orgName, canManage = false, onUserCreated }: AddUserToOrgModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create")
  const [step, setStep] = useState<Step>("form")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Invite fields
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("viewer")
  const [personalMessage, setPersonalMessage] = useState("")

  // Create user fields
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [createFirstName, setCreateFirstName] = useState("")
  const [createLastName, setCreateLastName] = useState("")
  const [createRole, setCreateRole] = useState<string>("viewer")
  const [mustChangePassword, setMustChangePassword] = useState(true)
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true)

  const [addedCount, setAddedCount] = useState(0)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (open) {
      setStep("form")
      setError("")
      // Reset invite fields
      setEmails([])
      setEmailInput("")
      setEmailError("")
      setInviteRole("viewer")
      setPersonalMessage("")
      // Reset create fields
      setCreateEmail("")
      setCreatePassword("")
      setShowPassword(false)
      setCreateFirstName("")
      setCreateLastName("")
      setCreateRole("viewer")
      setMustChangePassword(true)
      setSendWelcomeEmail(true)
      setSaving(false)
      setAddedCount(0)
      // Set default initial roles, RoleSelector will manage its own fetch
      // If we strictly need the default role from the API mapped right away, 
      // we can leave it as "viewer" and let the backend default to "viewer" 
      // or we can just pass the value down.
    }
  }, [open])

  // --- Invite tab handlers ---
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

  const handleInviteSubmit = async () => {
    setSaving(true)
    setError("")
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    setAddedCount(emails.length)
    setSuccessMessage(`${emails.length} ${emails.length === 1 ? "user has" : "users have"} been invited to`)
    setStep("success")
  }

  const canInvite = emails.length > 0

  // --- Create tab handlers ---
  const handleCreateSubmit = async () => {
    setError("")

    // Validation
    if (!createEmail.trim()) {
      setError("Email is required")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
      setError("Invalid email format")
      return
    }
    if (!createPassword) {
      setError("Password is required")
      return
    }
    if (createPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setSaving(true)
    try {
      await organizationsApi.createUser({
        organizationId: orgId,
        email: createEmail.trim(),
        password: createPassword,
        firstName: createFirstName.trim() || undefined,
        lastName: createLastName.trim() || undefined,
        role: createRole,
        mustChangePassword,
        sendWelcomeEmail,
      })
      setAddedCount(1)
      setSuccessMessage("User has been created in")
      setStep("success")
      onUserCreated?.()
    } catch (err: any) {
      const message = err?.response?.data?.error?.message
        || err?.message
        || "Failed to create user. Please try again."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const canCreate = createEmail.trim().length > 0 && createPassword.length >= 8

  // --- Success screen ---
  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {activeTab === "invite" ? "Invitations sent!" : "User created!"}
            </h2>
            <p className="text-sm text-slate-500">
              {successMessage}{" "}
              <span className="font-medium text-slate-700">{orgName}</span>
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  setStep("form")
                  setError("")
                  if (activeTab === "invite") {
                    setEmails([])
                    setEmailInput("")
                    setPersonalMessage("")
                  } else {
                    setCreateEmail("")
                    setCreatePassword("")
                    setCreateFirstName("")
                    setCreateLastName("")
                    setMustChangePassword(true)
                    setSendWelcomeEmail(true)
                  }
                }}
              >
                {activeTab === "invite" ? "Invite More" : "Create Another"}
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add User to Organization</DialogTitle>
          <DialogDescription>
            Add someone to {orgName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ActiveTab); setError("") }} className="mt-2">
          <TabsList className="hidden w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-2">
              <Mail className="w-4 h-4" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Create
            </TabsTrigger>
          </TabsList>

          {/* ===== INVITE TAB ===== */}
          <TabsContent value="invite" className="hidden">
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
              <RoleSelector value={inviteRole} onChange={setInviteRole} canManage={canManage} />
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
          </TabsContent>

          {/* ===== CREATE TAB ===== */}
          <TabsContent value="create" className="space-y-5 mt-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="create-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={createEmail}
                onChange={(e) => { setCreateEmail(e.target.value); setError("") }}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="create-password">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={createPassword}
                  onChange={(e) => { setCreatePassword(e.target.value); setError("") }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {createPassword.length > 0 && createPassword.length < 8 && (
                <p className="text-xs text-amber-500">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-firstname">First name</Label>
                <Input
                  id="create-firstname"
                  placeholder="John"
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-lastname">Last name</Label>
                <Input
                  id="create-lastname"
                  placeholder="Doe"
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-3">
              <Label>Role</Label>
              <RoleSelector value={createRole} onChange={setCreateRole} canManage={canManage} />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="must-change-pw"
                  checked={mustChangePassword}
                  onCheckedChange={(v) => setMustChangePassword(v === true)}
                />
                <Label htmlFor="must-change-pw" className="text-sm font-normal cursor-pointer">
                  Require password change on first login
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="send-welcome"
                  checked={sendWelcomeEmail}
                  onCheckedChange={(v) => setSendWelcomeEmail(v === true)}
                />
                <Label htmlFor="send-welcome" className="text-sm font-normal cursor-pointer">
                  Send welcome email with login details
                </Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
        )}

        <DialogFooter className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-500">
            {activeTab === "invite" ? "Users will receive a notification email" : "User will be created with active status"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            {activeTab === "invite" ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleInviteSubmit}
                disabled={saving || !canInvite}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? "Sending..." : "Send Invitations"}
              </Button>
            ) : (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleCreateSubmit}
                disabled={saving || !canCreate}
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? "Creating..." : "Create User"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
