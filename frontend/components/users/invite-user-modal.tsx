"use client"

import type React from "react"

import { useState } from "react"
import { teamMembersApi } from "@/lib/api/services"
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { X, Loader2, CheckCircle2, ChevronDown, Check, ChevronsUpDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { RoleSelector } from "./role-selector"
import { AppPermissionsSelector } from "./app-permissions-selector"

interface InviteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const teams = [
  { value: "mobile", label: "Mobile Team" },
  { value: "analytics", label: "Analytics Team" },
  { value: "product", label: "Product Team" },
  { value: "marketing", label: "Marketing Team" },
]

const apps = [
  { id: "1", name: "Weather Plus Pro", icon: "🌤️" },
  { id: "2", name: "Game Master", icon: "🎮" },
  { id: "3", name: "Photo Editor Pro", icon: "📷" },
  { id: "4", name: "Fitness Tracker", icon: "💪" },
  { id: "5", name: "Music Player", icon: "🎵" },
]

type ModalState = "form" | "loading" | "success" | "partial-error"

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const [state, setState] = useState<ModalState>("form")
  const [emailInput, setEmailInput] = useState("")
  const [emails, setEmails] = useState<string[]>([])
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer")
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [giveAllApps, setGiveAllApps] = useState(false)
  const [selectedApps, setSelectedApps] = useState<{ id: string; permission: string }[]>([])
  const [message, setMessage] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [inviteResults, setInviteResults] = useState<Array<{ email: string; success: boolean; error?: string }>>([])

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addEmail()
    }
  }

  const addEmail = () => {
    const email = emailInput.trim().replace(",", "")
    if (!email) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    if (emails.includes(email)) {
      setEmailError("This email has already been added")
      return
    }

    // Check if already a member
    if (email === "existing@company.com") {
      setEmailError(`${email} is already a member of this organization`)
      return
    }

    setEmails([...emails, email])
    setEmailInput("")
    setEmailError(null)
  }

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email))
  }

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) => (prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]))
  }

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) => {
      const exists = prev.find((a) => a.id === appId)
      if (exists) {
        return prev.filter((a) => a.id !== appId)
      }
      return [...prev, { id: appId, permission: "view" }]
    })
  }

  const updateAppPermission = (appId: string, permission: string) => {
    setSelectedApps((prev) => prev.map((a) => (a.id === appId ? { ...a, permission } : a)))
  }

  const removeApp = (appId: string) => {
    setSelectedApps((prev) => prev.filter((a) => a.id !== appId))
  }

  const handleSubmit = async () => {
    if (emails.length === 0) return

    setState("loading")

    // Prepare request data
    const teamIds = selectedTeams.length > 0 ? selectedTeams : undefined
    const appPermissions = giveAllApps 
      ? undefined // If giveAllApps is true, don't send appPermissions (backend will handle it)
      : selectedApps.length > 0 
        ? selectedApps.map(app => ({ AppId: app.id, Level: app.permission }))
        : undefined

    // Send invitation for each email
    const results: Array<{ email: string; success: boolean; error?: string }> = []
    
    for (const email of emails) {
      try {
        const response = await teamMembersApi.inviteUser({
          email,
          role,
          teamIds,
          appPermissions,
          message: message || undefined,
        })

        if (response.success) {
          results.push({ email, success: true })
        } else {
          results.push({ 
            email, 
            success: false, 
            error: (response as any).error?.message || "Failed to send invitation" 
          })
        }
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error?.message || error?.message || "Failed to send invitation"
        results.push({ email, success: false, error: errorMessage })
      }
    }

    // Store results for display
    setInviteResults(results)

    // Determine final state
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    if (failCount === 0) {
      // All succeeded
      setState("success")
    } else if (successCount > 0) {
      // Partial success
      setState("partial-error")
    } else {
      // All failed - show error
      setState("partial-error")
    }
  }

  const handleInviteMore = () => {
    setState("form")
    setEmails([])
    setEmailInput("")
    setRole("viewer")
    setSelectedTeams([])
    setGiveAllApps(false)
    setSelectedApps([])
    setMessage("")
    setInviteResults([])
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setState("form")
      setEmails([])
      setEmailInput("")
      setRole("viewer")
      setSelectedTeams([])
      setGiveAllApps(false)
      setSelectedApps([])
      setMessage("")
      setEmailError(null)
      setInviteResults([])
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {state === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>Send an invitation to join your organization</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Email Addresses */}
              <div className="space-y-2">
                <Label>Email addresses</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-10 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  {emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    type="email"
                    placeholder={emails.length === 0 ? "Enter email addresses..." : ""}
                    className="flex-1 border-0 shadow-none focus-visible:ring-0 min-w-32 h-6 p-0"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value)
                      setEmailError(null)
                    }}
                    onKeyDown={handleEmailKeyDown}
                    onBlur={addEmail}
                  />
                </div>
                {emailError ? (
                  <p className="text-xs text-red-500">{emailError}</p>
                ) : (
                  <p className="text-xs text-slate-500">Press Enter or comma to add multiple emails</p>
                )}
              </div>

              {/* Role Selection */}
              <RoleSelector
                value={role}
                onValueChange={setRole}
                label="Role"
                idPrefix="invite"
              />

              {/* Team Assignment */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-slate-500 text-xs uppercase tracking-wide">Team Assignment (Optional)</Label>
                <div className="space-y-2">
                  <Label>Add to teams</Label>
                  <Popover open={teamsOpen} onOpenChange={setTeamsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={teamsOpen}
                        className="w-full justify-between font-normal bg-transparent"
                      >
                        {selectedTeams.length > 0 ? `${selectedTeams.length} team(s) selected` : "Select teams..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search teams..." />
                        <CommandList>
                          <CommandEmpty>No team found.</CommandEmpty>
                          <CommandGroup>
                            {teams.map((team) => (
                              <CommandItem key={team.value} onSelect={() => toggleTeam(team.value)}>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTeams.includes(team.value) ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {team.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedTeams.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTeams.map((teamId) => {
                        const team = teams.find((t) => t.value === teamId)
                        return (
                          <Badge key={teamId} variant="secondary" className="gap-1">
                            {team?.label}
                            <button onClick={() => toggleTeam(teamId)} className="ml-1 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* App Permissions */}
              <AppPermissionsSelector
                apps={apps}
                giveAllApps={giveAllApps}
                onGiveAllAppsChange={setGiveAllApps}
                selectedApps={selectedApps}
                onToggleApp={toggleApp}
                onUpdateAppPermission={updateAppPermission}
                onRemoveApp={removeApp}
                label="App Permissions (Optional)"
                showOwnerPermission={false}
                mode="popover"
              />

              {/* Personal Message */}
              <div className="space-y-2 pt-2 border-t">
                <Label>Personal message (Optional)</Label>
                <Textarea
                  placeholder="Add a personal note to the invitation email..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 text-right">{message.length}/500</p>
              </div>

              {/* Preview */}
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showPreview && "rotate-180")} />
                  Preview invitation email
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="p-4 bg-slate-50 rounded-lg border text-sm space-y-3">
                    <p className="font-medium">Subject: You've been invited to join WeatherPlus Inc on Mediation Pro</p>
                    <div className="border-t pt-3 space-y-2 text-slate-600">
                      <p>Hi there,</p>
                      <p>
                        John Doe has invited you to join WeatherPlus Inc on Mediation Pro as a{" "}
                        <strong className="text-slate-900 capitalize">{role}</strong>.
                      </p>
                      {message && <div className="bg-white p-3 rounded border italic">"{message}"</div>}
                      <p>Click the button below to accept your invitation and create your account.</p>
                      <div className="py-2">
                        <Button size="sm" className="bg-blue-600">
                          Accept Invitation
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400">This invitation will expire in 7 days.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <p className="text-xs text-slate-500 flex-1">Invitations expire in 7 days</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={emails.length === 0}>
                  Send Invitation
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {state === "loading" && (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-slate-900">Sending invitations...</p>
            <p className="text-sm text-slate-500">Please wait</p>
          </div>
        )}

        {state === "success" && (
          <>
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Invitations sent!</h2>
              <p className="text-sm text-slate-500 mb-4">
                We've sent invitations to {emails.length} email address{emails.length > 1 ? "es" : ""}.
              </p>
              <div className="space-y-2 w-full max-w-sm">
                {emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-md px-3 py-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {email}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleInviteMore}>
                Invite More
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {state === "partial-error" && (
          <>
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Partial success</h2>
              <p className="text-sm text-slate-500 mb-4">
                {inviteResults.filter(r => r.success).length} of {inviteResults.length} invitation{inviteResults.length > 1 ? "s" : ""} sent.
                {inviteResults.filter(r => !r.success).length > 0 && ` ${inviteResults.filter(r => !r.success).length} failed:`}
              </p>
              <div className="space-y-2 w-full max-w-sm">
                {inviteResults.map((result) => (
                  <div
                    key={result.email}
                    className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                      result.success
                        ? "text-slate-600 bg-slate-50"
                        : "text-red-600 bg-red-50"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                    <span className="flex-1 text-left">{result.email}</span>
                    {result.error && (
                      <span className="text-xs text-red-500">- {result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleInviteMore}>
                Invite More
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
