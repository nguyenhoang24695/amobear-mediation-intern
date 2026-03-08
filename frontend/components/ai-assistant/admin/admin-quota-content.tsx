"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  Search,
  Plus,
  Edit2,
  Download,
  Settings,
  Users,
  DollarSign,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface UserQuotaData {
  id: string
  name: string
  avatar?: string
  role: string
  todayTokens: number
  monthTokens: number
  dailyLimit: number
  monthlyLimit: number
}

interface QuotaConfig {
  scope: string
  scopeType: "global" | "role" | "user"
  dailyTokens: number
  monthlyTokens: number
  dailyCost: number
}

const mockUsers: UserQuotaData[] = [
  {
    id: "1",
    name: "Nguyen A",
    role: "DA",
    todayTokens: 78000,
    monthTokens: 640000,
    dailyLimit: 100000,
    monthlyLimit: 2000000,
  },
  {
    id: "2",
    name: "Tran B",
    role: "DA",
    todayTokens: 45000,
    monthTokens: 420000,
    dailyLimit: 100000,
    monthlyLimit: 2000000,
  },
  {
    id: "3",
    name: "Le C",
    role: "Senior DA",
    todayTokens: 92000,
    monthTokens: 1100000,
    dailyLimit: 200000,
    monthlyLimit: 5000000,
  },
  {
    id: "4",
    name: "Admin D",
    role: "Admin",
    todayTokens: 120000,
    monthTokens: 1500000,
    dailyLimit: 500000,
    monthlyLimit: 10000000,
  },
]

const mockQuotaConfigs: QuotaConfig[] = [
  { scope: "Global", scopeType: "global", dailyTokens: 100000, monthlyTokens: 2000000, dailyCost: 2.0 },
  { scope: "Role: Admin", scopeType: "role", dailyTokens: 500000, monthlyTokens: 10000000, dailyCost: 10.0 },
  { scope: "Role: Sr DA", scopeType: "role", dailyTokens: 200000, monthlyTokens: 5000000, dailyCost: 5.0 },
  { scope: "Role: DA", scopeType: "role", dailyTokens: 100000, monthlyTokens: 2000000, dailyCost: 2.0 },
  { scope: "User: Le C", scopeType: "user", dailyTokens: 200000, monthlyTokens: 5000000, dailyCost: 5.0 },
]

export function AdminQuotaContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingConfig, setEditingConfig] = useState<QuotaConfig | null>(null)
  const [showAddOverride, setShowAddOverride] = useState(false)

  const totalTodayTokens = mockUsers.reduce((sum, u) => sum + u.todayTokens, 0)
  const totalTodayCost = totalTodayTokens * 0.00002 // Rough estimate
  const totalMonthTokens = mockUsers.reduce((sum, u) => sum + u.monthTokens, 0)
  const totalMonthCost = totalMonthTokens * 0.00002

  const filteredUsers = mockUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600"
    if (percentage >= 60) return "text-amber-600"
    return "text-emerald-600"
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "[&>div]:bg-red-500"
    if (percentage >= 60) return "[&>div]:bg-amber-500"
    return "[&>div]:bg-emerald-500"
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Token Quota Management
              </h1>
              <p className="text-sm text-slate-500">
                Admin dashboard for managing team AI usage quotas
              </p>
            </div>
          </div>
        </div>

        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Today</p>
                  <p className="text-xl font-bold text-slate-900">
                    {(totalTodayTokens / 1000).toFixed(0)}K tokens
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cost Today</p>
                  <p className="text-xl font-bold text-slate-900">
                    ${totalTodayCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total This Month</p>
                  <p className="text-xl font-bold text-slate-900">
                    {(totalMonthTokens / 1000000).toFixed(1)}M tokens | ${totalMonthCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">User Usage</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Today</TableHead>
                  <TableHead className="text-right">Month</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const todayPct = (user.todayTokens / user.dailyLimit) * 100
                  const monthPct = (user.monthTokens / user.monthlyLimit) * 100
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(user.todayTokens / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell className="text-right">
                        {(user.monthTokens / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell className="text-right">
                        {(user.dailyLimit / 1000).toFixed(0)}K/d
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress
                            value={todayPct}
                            className={cn("w-16 h-2", getProgressColor(todayPct))}
                          />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              getStatusColor(todayPct)
                            )}
                          >
                            {todayPct.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quota Configuration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              Quota Configuration
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddOverride(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add User Override
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Cost Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Daily Tokens</TableHead>
                  <TableHead className="text-right">Monthly Tokens</TableHead>
                  <TableHead className="text-right">$/day</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockQuotaConfigs.map((config) => (
                  <TableRow key={config.scope}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {config.scope}
                        </span>
                        {config.scopeType === "user" && (
                          <Badge variant="outline" className="text-xs">
                            Override
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {(config.dailyTokens / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right">
                      {config.monthlyTokens >= 1000000
                        ? `${(config.monthlyTokens / 1000000).toFixed(0)}M`
                        : `${(config.monthlyTokens / 1000).toFixed(0)}K`}
                    </TableCell>
                    <TableCell className="text-right">
                      ${config.dailyCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingConfig(config)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Config Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quota: {editingConfig?.scope}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Daily Token Limit</Label>
              <Input
                type="number"
                defaultValue={editingConfig?.dailyTokens}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Token Limit</Label>
              <Input
                type="number"
                defaultValue={editingConfig?.monthlyTokens}
              />
            </div>
            <div className="space-y-2">
              <Label>Daily Cost Limit ($)</Label>
              <Input
                type="number"
                step="0.01"
                defaultValue={editingConfig?.dailyCost}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              Cancel
            </Button>
            <Button>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Override Dialog */}
      <Dialog open={showAddOverride} onOpenChange={setShowAddOverride}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Token Limit</Label>
              <Input type="number" placeholder="100000" />
            </div>
            <div className="space-y-2">
              <Label>Monthly Token Limit</Label>
              <Input type="number" placeholder="2000000" />
            </div>
            <div className="space-y-2">
              <Label>Daily Cost Limit ($)</Label>
              <Input type="number" step="0.01" placeholder="2.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOverride(false)}>
              Cancel
            </Button>
            <Button>Add Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
