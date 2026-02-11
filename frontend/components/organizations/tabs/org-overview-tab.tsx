"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UsersRound, Layers, Smartphone, Edit, Loader2 } from "lucide-react"
import { organizationsApi, type OrganizationStatistics } from "@/lib/api/services"
import { formatDate, getRoleColor } from "../org-utils"

interface OrgOverviewTabProps {
  org: {
    name: string
    slug: string
    status: "active" | "inactive"
    createdAt: string
    updatedAt: string
    users: number
    activeUsers: number
    teams: number
    appsAccess: number
  }
  orgId: string
}

export function OrgOverviewTab({ org, orgId }: OrgOverviewTabProps) {
  const [statistics, setStatistics] = useState<OrganizationStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        const data = await organizationsApi.getStatistics(orgId)
        setStatistics(data)
      } catch (err) {
        console.error("Failed to fetch organization statistics:", err)
        setError("Failed to load statistics")
      } finally {
        setLoading(false)
      }
    }
    fetchStatistics()
  }, [orgId])

  const totalRoleUsers = statistics?.roleDistribution.reduce((sum, r) => sum + r.count, 0) || 0

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
                <p className="text-sm text-slate-900">{formatDate(org.createdAt, "long")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-900">{formatDate(org.updatedAt, "long")}</p>
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600 text-sm">{error}</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{statistics?.totalUsers || 0}</p>
                    <p className="text-xs text-slate-500">Total Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 rounded-lg bg-green-50">
                    <UsersRound className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{statistics?.activeUsers || 0}</p>
                    <p className="text-xs text-slate-500">Active Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <Layers className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{statistics?.totalTeams || 0}</p>
                    <p className="text-xs text-slate-500">Teams</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Smartphone className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{statistics?.appsWithAccess || 0}</p>
                    <p className="text-xs text-slate-500">Apps with Access</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column (2/5) */}
      <div className="lg:col-span-2 space-y-6">

        {/* Users by Role */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600 text-sm">{error}</div>
            ) : statistics?.roleDistribution && statistics.roleDistribution.length > 0 ? (
              <>
                {/* Bar */}
                <div className="h-3 rounded-full overflow-hidden flex mb-4">
                  {statistics.roleDistribution.map((role) => (
                    <div
                      key={role.role}
                      className={`${getRoleColor(role.role)} first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${(role.count / totalRoleUsers) * 100}%` }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-2">
                  {statistics.roleDistribution.map((role) => (
                    <div key={role.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-sm ${getRoleColor(role.role)}`} />
                        <span className="text-sm text-slate-600">{role.role}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">{role.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">No users yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
