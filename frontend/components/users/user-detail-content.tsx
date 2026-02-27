"use client"

import { useState, useEffect } from "react"
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
  Loader2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { useApi } from "@/hooks/use-api"
import { teamMembersApi } from "@/lib/api/services"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Mock data for sections not yet in API
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

interface UserDetailContentProps {
  userId?: string
  backHref?: string
}

export function UserDetailContent({ userId, backHref = "/team-members" }: UserDetailContentProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [copiedEmail, setCopiedEmail] = useState(false)

  const { data: userResponse, loading, error } = useApi(
    () => userId ? teamMembersApi.viewProfile(userId) : Promise.resolve({ success: false, data: undefined }),
    { enabled: !!userId, cacheKey: `user-profile-${userId}` }
  )

  const user = userResponse?.data

  const copyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !user) {
    if (!userId) {
      // Should not happen if parent handles empty userId, but good for safety
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No user ID provided.</AlertDescription>
        </Alert>
      )
    }
    return (
      <div className="space-y-6">
        <Link href={backHref} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load user profile. The user may not exist or you don't have permission to view them."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Parse permissions if they are not already an object (API might return JSON string or object)
  // The interface says Record<string, string>, assuming it's already an object.
  const permissionsList = Object.entries(user.permissions || {}).map(([appId, level]) => ({
    appId,
    level,
    // Mocking missing data for now
    appName: `App ${appId}`,
    icon: "📱",
    grantedBy: "System",
    grantedAt: "N/A",
    expires: "Never"
  }))

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link href={backHref} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online status mock */}
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{user.fullName || "User"}</h1>
              <Badge className="bg-purple-100 text-purple-700 capitalize">{user.role}</Badge>
              {user.teams?.length > 0 && user.teams[0].status === 'active' && (
                <Badge variant="outline" className="border-green-200 text-green-700">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{user.email}</span>
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
                      <p className="text-sm font-medium text-slate-900">{user.firstName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Name</p>
                      <p className="text-sm font-medium text-slate-900">{user.lastName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-slate-900">{user.email}</p>
                        <Badge variant="outline" className="text-xs border-green-200 text-green-700">
                          Verified
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-medium text-slate-900">-</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Role</p>
                      <Select defaultValue={user.role} disabled>
                        <SelectTrigger className="w-32 h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Organization</p>
                      <p className="text-sm font-medium text-slate-900">{user.organization?.name || "-"}</p>
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
                      {user.teams?.length || 0}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Team
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {user.teams?.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">{team.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {team.role}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <X className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!user.teams || user.teams.length === 0) && (
                      <p className="text-sm text-slate-500 text-center py-2">No teams assigned</p>
                    )}
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
                      <span className={`w-2 h-2 rounded-full ${user.teams?.[0]?.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-slate-900 capitalize">{user.teams?.[0]?.status || "Unknown"}</span>
                    </div>
                  </div>
                  {/* Mock Data for now */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Last Login</span>
                    <span className="text-sm text-slate-900">Jan 17, 2026 at 10:30 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Last Login IP</span>
                    <span className="text-sm text-slate-900">192.168.1.1</span>
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
                    <span className="text-sm font-medium text-slate-900">{permissionsList.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Direct Permissions</span>
                    <span className="text-sm font-medium text-slate-900">{permissionsList.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Team-inherited</span>
                    <span className="text-sm font-medium text-slate-900">0</span>
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
                  {permissionsList.length}
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
                  {permissionsList.map((perm) => (
                    <TableRow key={perm.appId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{perm.icon}</span>
                          <div>
                            <p className="font-medium text-slate-900">{perm.appName}</p>
                            <p className="text-xs text-slate-500">{perm.appId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={perm.level.toLowerCase()} disabled>
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
                  {permissionsList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-6">
                        No direct permissions granted
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mocking Inherited Permissions for now as API doesn't fully return it in detail yet */}
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
