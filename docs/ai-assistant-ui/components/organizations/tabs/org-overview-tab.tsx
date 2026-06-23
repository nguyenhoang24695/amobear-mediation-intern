"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UsersRound, Layers, Smartphone, Edit, ArrowRight } from "lucide-react"

interface OrgOverviewTabProps {
  org: {
    name: string
    slug: string
    status: "active" | "inactive"
    created: string
    users: number
    activeUsers: number
    teams: number
    appsAccess: number
  }
}

const recentActivity = [
  { id: "1", text: "John Doe was added to the organization", time: "2 hours ago" },
  { id: "2", text: "Organization settings updated", time: "Yesterday" },
  { id: "3", text: "New team 'Mobile Team' created", time: "3 days ago" },
  { id: "4", text: "Sarah Johnson's role changed to Admin", time: "5 days ago" },
  { id: "5", text: "App 'Weather Widget' access granted", time: "1 week ago" },
]

const roleDistribution = [
  { role: "Admins", count: 5, color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
  { role: "Editors", count: 15, color: "bg-cyan-500", textColor: "text-cyan-700", bgColor: "bg-cyan-50" },
  { role: "Viewers", count: 25, color: "bg-slate-400", textColor: "text-slate-700", bgColor: "bg-slate-50" },
]

export function OrgOverviewTab({ org }: OrgOverviewTabProps) {
  const totalRoleUsers = roleDistribution.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column (3/5) */}
      <div className="lg:col-span-3 space-y-6">
        {/* Organization Information */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Organization Information</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-medium text-slate-900">{org.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Slug</p>
                <p className="text-sm font-medium text-slate-900">{org.slug}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <Badge
                  className={
                    org.status === "active"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }
                >
                  {org.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-sm text-slate-900">{org.created}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-900">January 20, 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{org.users}</p>
                  <p className="text-xs text-slate-500">Total Users</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="p-2 rounded-lg bg-green-50">
                  <UsersRound className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{org.activeUsers}</p>
                  <p className="text-xs text-slate-500">Active Users</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Layers className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{org.teams}</p>
                  <p className="text-xs text-slate-500">Teams</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="p-2 rounded-lg bg-slate-100">
                  <Smartphone className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{org.appsAccess}</p>
                  <p className="text-xs text-slate-500">Apps with Access</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column (2/5) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Recent Activity */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-4 font-medium">
              View all activity
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-4">
              {roleDistribution.map((role) => (
                <div
                  key={role.role}
                  className={`${role.color} first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(role.count / totalRoleUsers) * 100}%` }}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="space-y-2">
              {roleDistribution.map((role) => (
                <div key={role.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${role.color}`} />
                    <span className="text-sm text-slate-600">{role.role}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{role.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
