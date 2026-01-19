"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Edit, Camera, KeyRound, Shield, Monitor, ChevronDown } from "lucide-react"
import { ChangePasswordModal } from "./change-password-modal"

const myApps = [
  { name: "Weather Plus Pro", permission: "Owner" },
  { name: "Game Master", permission: "Edit" },
  { name: "Photo Editor Pro", permission: "View" },
  { name: "Fitness Tracker", permission: "Edit" },
]

const myTeams = [
  { name: "Mobile Team", role: "Admin" },
  { name: "Analytics Team", role: "Member" },
  { name: "Product Team", role: "Member" },
]

export function MyProfileContent() {
  const [isEditing, setIsEditing] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [showApps, setShowApps] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReport: true,
    teamActivity: false,
  })

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
                    <AvatarImage src="/professional-man-avatar.png" />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">JD</AvatarFallback>
                  </Avatar>
                  <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">John Doe</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-500">john.doe@company.com</span>
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
                    <span className="text-xs text-slate-400">Member since January 1, 2025</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="w-4 h-4 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">First Name</p>
                  <p className="text-sm font-medium text-slate-900">John</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Name</p>
                  <p className="text-sm font-medium text-slate-900">Doe</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-900">+1 234 567 8900</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Timezone</p>
                  <p className="text-sm font-medium text-slate-900">(UTC+7) Asia/Ho_Chi_Minh</p>
                </div>
              </div>
              {isEditing && (
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
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
              <Button variant="link" size="sm" className="text-blue-600 p-0 h-auto">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Chrome on Windows</p>
                  <p className="text-xs text-slate-500">Current session • Ho Chi Minh City</p>
                </div>
              </div>
              <Button variant="link" className="text-red-600 p-0 h-auto text-sm">
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
                {myApps.map((app) => (
                  <div key={app.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-slate-900">{app.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {app.permission}
                    </Badge>
                  </div>
                ))}
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
                {myTeams.map((team) => (
                  <div key={team.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-slate-900">{team.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {team.role}
                    </Badge>
                  </div>
                ))}
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
