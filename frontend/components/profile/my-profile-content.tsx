"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Edit, Camera, KeyRound, Shield, Monitor, ChevronDown, Loader2 } from "lucide-react"
import { ChangePasswordModal } from "./change-password-modal"
import { authApi } from "@/lib/api/services"
import { authUserFromMeDto, clearAuthSessionData, getAccessToken, getRefreshToken, getUserInitials, setAuthData } from "@/lib/auth"
import { useApi } from "@/hooks/use-api"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { ActiveSession } from "@/types/api"

export function MyProfileContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [showApps, setShowApps] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReport: true,
    teamActivity: false,
  })
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [slackWebhookDraft, setSlackWebhookDraft] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)

  // Load current user
  const { data: userResponse, loading: userLoading, refetch: refetchCurrentUser } = useApi(
    () => authApi.getCurrentUser(),
    {
      enabled: typeof window !== "undefined" && !!localStorage.getItem("accessToken"),
      cacheKey: "auth-me-profile",
    }
  )

  const user = userResponse?.data
  const userFromStorage = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}')
    : null

  const displayUser = user || userFromStorage

  // Get apps and teams from user data
  const myApps = displayUser?.permissions ? Object.keys(displayUser.permissions) : []
  const myTeams = displayUser?.teams || []

  const getSessionSubtitle = (session: ActiveSession) => {
    if (session.isCurrent) return "Current session"
    const lastSeen = session.lastUsedAt || session.createdAt
    const formatted = new Date(lastSeen).toLocaleString()
    return `Last active ${formatted}`
  }

  const loadActiveSessions = async () => {
    try {
      setSessionsLoading(true)
      setSessionsError(null)
      const response = await authApi.getSessions()
      setActiveSessions(response.data ?? [])
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load active sessions")
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("accessToken")) return
    loadActiveSessions()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingSessionId(sessionId)
      await authApi.revokeSession(sessionId)
      await loadActiveSessions()
      toast({
        title: "Session revoked",
        description: "Selected device has been signed out.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to revoke session",
        variant: "destructive",
      })
    } finally {
      setRevokingSessionId(null)
    }
  }

  const openProfileEdit = () => {
    const u = userResponse?.data ?? userFromStorage
    const slack = (u as { slackWebhookUrl?: string })?.slackWebhookUrl ?? ""
    setSlackWebhookDraft(slack)
    setIsEditing(true)
  }

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true)
      const res = await authApi.updateMyProfile({
        slackWebhookUrl: slackWebhookDraft.trim(),
      })
      if (!res.success || !res.data) {
        throw new Error("Failed to update profile")
      }
      const token = getAccessToken()
      if (token) {
        setAuthData(token, getRefreshToken() ?? null, authUserFromMeDto(res.data))
      }
      await refetchCurrentUser()
      toast({
        title: "Profile updated",
        description: "Your Slack webhook URL has been saved.",
      })
      setIsEditing(false)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save profile",
        variant: "destructive",
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleLogoutAll = async () => {
    try {
      await authApi.logoutAll()
      clearAuthSessionData()
      router.push('/login')
      toast({
        title: "Logged out",
        description: "You have been logged out from all devices.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to logout",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    {displayUser?.avatarUrl && <AvatarImage src={displayUser.avatarUrl} />}
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                      {getUserInitials(displayUser)}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div>
                  {userLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-slate-900">
                        {displayUser?.fullName || displayUser?.firstName || displayUser?.email || "User"}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-500">{displayUser?.email || ""}</span>
                        {displayUser?.emailVerified && (
                          <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-700">
                          {displayUser?.role || "User"}
                        </Badge>
                        {displayUser?.organization && (
                          <span className="text-xs text-slate-400">
                            {displayUser.organization.name}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false)
                  } else {
                    openProfileEdit()
                  }
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">First Name</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.firstName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Name</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.lastName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="text-sm font-medium text-slate-900">
                    {displayUser?.role || "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Slack webhook URL</p>
                  {isEditing ? (
                    <Input
                      type="url"
                      className="mt-1.5"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackWebhookDraft}
                      onChange={(e) => setSlackWebhookDraft(e.target.value)}
                      autoComplete="off"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900 break-all mt-1">
                      {(displayUser as { slackWebhookUrl?: string })?.slackWebhookUrl || "—"}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">
                    Incoming Webhook for personal Slack alerts. Leave empty and save to remove a saved URL.
                  </p>
                </div>
              </div>
              {isEditing && (
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={profileSaving}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Security */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Password</p>
                    <p className="text-xs text-slate-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Not enabled</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Active Sessions</CardTitle>
              {activeSessions.length > 3 && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-blue-600 p-0 h-auto"
                  onClick={() => setShowAllSessions((prev) => !prev)}
                >
                  {showAllSessions ? "View Less" : "View All"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {sessionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading active sessions...
                </div>
              ) : sessionsError ? (
                <p className="text-sm text-red-600">{sessionsError}</p>
              ) : activeSessions.length === 0 ? (
                <p className="text-sm text-slate-500">No active remembered sessions found.</p>
              ) : (
                (showAllSessions ? activeSessions : activeSessions.slice(0, 3)).map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.isCurrent ? "bg-green-100" : "bg-slate-100"}`}>
                        <Monitor className={`w-5 h-5 ${session.isCurrent ? "text-green-600" : "text-slate-600"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{session.deviceInfo || "Unknown device"}</p>
                        <p className="text-xs text-slate-500">
                          {getSessionSubtitle(session)}
                          {session.ipAddress ? ` • IP ${session.ipAddress}` : ""}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSessionId === session.id}
                      >
                        {revokingSessionId === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign out"}
                      </Button>
                    )}
                  </div>
                ))
              )}
              <Button 
                variant="link" 
                className="text-red-600 p-0 h-auto text-sm"
                onClick={handleLogoutAll}
              >
                Sign out all other devices
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts" className="text-sm">
                  Email notifications for alerts
                </Label>
                <Switch
                  id="email-alerts"
                  checked={notifications.emailAlerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailAlerts: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-report" className="text-sm">
                  Weekly summary report
                </Label>
                <Switch
                  id="weekly-report"
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="team-activity" className="text-sm">
                  Team activity updates
                </Label>
                <Switch
                  id="team-activity"
                  checked={notifications.teamActivity}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, teamActivity: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Access */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">My Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible open={showApps} onOpenChange={setShowApps}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">Apps I can access</span>
                <Badge variant="secondary" className="text-xs">
                  {myApps.length}
                </Badge>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showApps ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {myApps.length > 0 ? (
                  Object.entries(displayUser?.permissions || {}).map(([appId, permission]) => (
                    <div key={appId} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm text-slate-900">{appId}</span>
                      <Badge variant="outline" className="text-xs">
                        {permission as string}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-2">No app permissions found</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showTeams} onOpenChange={setShowTeams}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">Teams I belong to</span>
                <Badge variant="secondary" className="text-xs">
                  {myTeams.length}
                </Badge>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTeams ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {myTeams.length > 0 ? (
                  myTeams.map((team: any) => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm text-slate-900">{team.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {team.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 col-span-2">No teams found</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  )
}
