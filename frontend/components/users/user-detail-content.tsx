"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  KeyRound,
  UserX,
  Trash2,
  Copy,
  CheckCircle2,
  Plus,
  X,
  LogIn,
  Shield,
  UserCog,
  Monitor,
  Smartphone,
} from "lucide-react"
import Link from "next/link"

const userTeams = [
  { name: "Mobile Team", role: "Admin" },
  { name: "Analytics Team", role: "Member" },
  { name: "Product Team", role: "Member" },
]

const directPermissions = [
  {
    app: "Weather Plus Pro",
    icon: "🌤️",
    package: "com.weather.plus",
    level: "Owner",
    grantedBy: "System Admin",
    grantedAt: "Jan 1, 2025",
    expires: "Never",
  },
  {
    app: "Game Master",
    icon: "🎮",
    package: "com.game.master",
    level: "Edit",
    grantedBy: "John Doe",
    grantedAt: "Jan 5, 2025",
    expires: "Never",
  },
  {
    app: "Photo Editor Pro",
    icon: "📷",
    package: "com.photo.editor",
    level: "View",
    grantedBy: "Sarah Johnson",
    grantedAt: "Jan 10, 2025",
    expires: "Dec 31, 2025",
  },
]

const inheritedPermissions = [
  { app: "Fitness Tracker", icon: "💪", level: "Edit", team: "Mobile Team", teamRole: "Admin" },
  { app: "Music Player", icon: "🎵", level: "View", team: "Analytics Team", teamRole: "Member" },
]

const activityLog = [
  { action: "Logged in", details: "from 192.168.1.1", time: "2 hours ago", icon: LogIn },
  { action: "Updated mediation group", details: "Banner Ads - US Region", time: "5 hours ago", icon: Edit },
  { action: "Changed role", details: "to Admin by System Admin", time: "Yesterday", icon: Shield },
  { action: "Added to team", details: "Product Team", time: "2 days ago", icon: UserCog },
]

const sessions = [
  {
    device: "Chrome on Windows",
    ip: "192.168.1.1",
    location: "Ho Chi Minh City, Vietnam",
    lastActive: "2 minutes ago",
    isCurrent: true,
  },
  {
    device: "Safari on iPhone",
    ip: "192.168.1.45",
    location: "Ho Chi Minh City, Vietnam",
    lastActive: "1 hour ago",
    isCurrent: false,
  },
  {
    device: "Firefox on MacOS",
    ip: "10.0.0.15",
    location: "Hanoi, Vietnam",
    lastActive: "3 days ago",
    isCurrent: false,
  },
]

export function UserDetailContent() {
  const [activeTab, setActiveTab] = useState("overview")
  const [copiedEmail, setCopiedEmail] = useState(false)

  const copyEmail = () => {
    navigator.clipboard.writeText("john.doe@company.com")
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link href="/team-members" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Team Members
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/professional-man-avatar.png" />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">JD</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">John Doe</h1>
              <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
              <Badge variant="outline" className="border-green-200 text-green-700">
                Active
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">john.doe@company.com</span>
              <button onClick={copyEmail} className="text-slate-400 hover:text-slate-600">
                {copiedEmail ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit User
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <KeyRound className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserX className="w-4 h-4 mr-2" />
                Deactivate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-3 space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
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
                      <p className="text-xs text-slate-500">Email</p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-slate-900">john.doe@company.com</p>
                        <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-medium text-slate-900">+1 234 567 8900</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Role</p>
                      <Select defaultValue="admin">
                        <SelectTrigger className="w-32 h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm font-medium text-slate-900">January 1, 2025</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Created By</p>
                      <p className="text-sm font-medium text-slate-900">System Admin</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Teams */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">Teams</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      3
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Team
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userTeams.map((team) => (
                      <div key={team.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">{team.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {team.role}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <X className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Status</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium text-slate-900">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Last Login</span>
                    <span className="text-sm text-slate-900">Jan 17, 2026 at 10:30 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Last Login IP</span>
                    <span className="text-sm text-slate-900">192.168.1.1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Failed Login Attempts</span>
                    <span className="text-sm text-slate-900">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Password Last Changed</span>
                    <span className="text-sm text-slate-900">Dec 15, 2025</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Must Change Password</span>
                    <span className="text-sm text-slate-900">No</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Apps with Access</span>
                    <span className="text-sm font-medium text-slate-900">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Direct Permissions</span>
                    <span className="text-sm font-medium text-slate-900">5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Team-inherited</span>
                    <span className="text-sm font-medium text-slate-900">7</span>
                  </div>
                  <Button variant="link" className="p-0 h-auto text-blue-600 text-sm">
                    View all permissions →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6 mt-6">
          {/* Direct Permissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Direct Permissions</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {directPermissions.length}
                </Badge>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />
                Grant Permission
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>App</TableHead>
                    <TableHead>Permission Level</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead>Granted At</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directPermissions.map((perm) => (
                    <TableRow key={perm.app}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{perm.icon}</span>
                          <div>
                            <p className="font-medium text-slate-900">{perm.app}</p>
                            <p className="text-xs text-slate-500">{perm.package}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={perm.level.toLowerCase()}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                            <SelectItem value="manage">Manage</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{perm.grantedBy}</TableCell>
                      <TableCell className="text-sm text-slate-600">{perm.grantedAt}</TableCell>
                      <TableCell className="text-sm text-slate-600">{perm.expires}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Inherited Permissions */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Inherited from Teams</CardTitle>
                <Badge variant="outline" className="text-xs">
                  Read-only
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                These permissions are inherited from team memberships and cannot be modified directly.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>App</TableHead>
                    <TableHead>Permission Level</TableHead>
                    <TableHead>Source Team</TableHead>
                    <TableHead>Team Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inheritedPermissions.map((perm) => (
                    <TableRow key={perm.app}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{perm.icon}</span>
                          <span className="font-medium text-slate-900">{perm.app}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{perm.level}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href="#" className="text-blue-600 hover:underline">
                          {perm.team}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{perm.teamRole}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Activity Log</CardTitle>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="permission">Permission Changes</SelectItem>
                    <SelectItem value="profile">Profile Updates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLog.map((activity, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <activity.icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{activity.action}</span>{" "}
                        <span className="text-slate-500">{activity.details}</span>
                      </p>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Active Sessions</CardTitle>
              <Button variant="destructive" size="sm">
                Revoke All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        {session.device.includes("iPhone") ? (
                          <Smartphone className="w-5 h-5 text-slate-600" />
                        ) : (
                          <Monitor className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{session.device}</p>
                          {session.isCurrent && (
                            <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                              Current session
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {session.ip} • {session.location}
                        </p>
                        <p className="text-xs text-slate-400">Last active: {session.lastActive}</p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
