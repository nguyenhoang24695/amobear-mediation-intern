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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2, X, Search, UserPlus } from "lucide-react"

interface AddUserToOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgName: string
}

const existingUsers = [
  { id: "u1", name: "Alice Cooper", email: "alice@example.com", avatar: "", currentOrg: "GameStudio Pro" },
  { id: "u2", name: "Bob Miller", email: "bob@example.com", avatar: "", currentOrg: "AdNetwork Solutions" },
  { id: "u3", name: "Carol White", email: "carol@example.com", avatar: "", currentOrg: "PixelForge Studios" },
  { id: "u4", name: "Dan Harris", email: "dan@example.com", avatar: "", currentOrg: null },
  { id: "u5", name: "Eva Martinez", email: "eva@example.com", avatar: "", currentOrg: "CloudMedia Group" },
]

export function AddUserToOrgModal({ open, onOpenChange, orgName }: AddUserToOrgModalProps) {
  const [step, setStep] = useState<"form" | "success">("form")
  const [activeTab, setActiveTab] = useState("invite")
  const [saving, setSaving] = useState(false)

  // Invite Tab
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [personalMessage, setPersonalMessage] = useState("")

  // Existing Tab
  const [searchExisting, setSearchExisting] = useState("")
  const [selectedExisting, setSelectedExisting] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])

  const [addedCount, setAddedCount] = useState(0)

  useEffect(() => {
    if (open) {
      setStep("form")
      setActiveTab("invite")
      setEmails([])
      setEmailInput("")
      setEmailError("")
      setInviteRole("viewer")
      setPersonalMessage("")
      setSearchExisting("")
      setSelectedExisting([])
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

  const filteredExisting = existingUsers.filter((u) => {
    if (!searchExisting) return true
    const q = searchExisting.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const addExistingUser = (user: { id: string; name: string; email: string }) => {
    if (selectedExisting.some((u) => u.id === user.id)) return
    setSelectedExisting((prev) => [...prev, { ...user, role: "viewer" }])
  }

  const removeExistingUser = (id: string) => {
    setSelectedExisting((prev) => prev.filter((u) => u.id !== id))
  }

  const changeExistingRole = (id: string, role: string) => {
    setSelectedExisting((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
  }

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase()

  const handleSubmit = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    setAddedCount(activeTab === "invite" ? emails.length : selectedExisting.length)
    setStep("success")
  }

  const canSubmit = activeTab === "invite" ? emails.length > 0 : selectedExisting.length > 0

  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {activeTab === "invite" ? "Invitations sent!" : "Users added!"}
            </h2>
            <p className="text-sm text-slate-500">
              {addedCount} {addedCount === 1 ? "user has" : "users have"} been {activeTab === "invite" ? "invited to" : "added to"}{" "}
              <span className="font-medium text-slate-700">{orgName}</span>
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  setStep("form")
                  setEmails([])
                  setSelectedExisting([])
                  setEmailInput("")
                  setPersonalMessage("")
                  setSearchExisting("")
                }}
              >
                Add More
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
          <DialogTitle>Add User to Organization</DialogTitle>
          <DialogDescription>
            Add an existing user or invite someone new to {orgName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger value="invite">Invite New User</TabsTrigger>
            <TabsTrigger value="existing">Add Existing User</TabsTrigger>
          </TabsList>

          {/* Tab: Invite New */}
          <TabsContent value="invite" className="space-y-5 mt-4">
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
          </TabsContent>

          {/* Tab: Existing User */}
          <TabsContent value="existing" className="space-y-5 mt-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search for user</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={searchExisting}
                  onChange={(e) => setSearchExisting(e.target.value)}
                />
              </div>
              {/* Results */}
              {searchExisting && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {filteredExisting.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">No users found</div>
                  ) : (
                    filteredExisting.map((user) => {
                      const alreadySelected = selectedExisting.some((u) => u.id === user.id)
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition-colors ${alreadySelected ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => !alreadySelected && addExistingUser(user)}
                          disabled={alreadySelected}
                        >
                          <Avatar className="h-8 w-8">
                            {user.avatar && <AvatarImage src={user.avatar || "/placeholder.svg"} />}
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                          {user.currentOrg && (
                            <Badge variant="secondary" className="text-xs">{user.currentOrg}</Badge>
                          )}
                          {alreadySelected && (
                            <span className="text-xs text-slate-400">Selected</span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Users */}
            {selectedExisting.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Users ({selectedExisting.length})</Label>
                <div className="space-y-2">
                  {selectedExisting.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Select value={user.role} onValueChange={(role) => changeExistingRole(user.id, role)}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <button onClick={() => removeExistingUser(user.id)} className="text-slate-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedExisting.length === 0 && !searchExisting && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <UserPlus className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Search for users above to add them to this organization</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
              {saving
                ? activeTab === "invite"
                  ? "Sending..."
                  : "Adding..."
                : activeTab === "invite"
                  ? "Send Invitations"
                  : "Add Users"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
