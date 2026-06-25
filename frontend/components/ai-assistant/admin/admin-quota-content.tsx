"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Trash2,
  Settings,
  Users,
  DollarSign,
  Zap,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { aiAssistantApi } from "@/lib/api/ai-assistant"
import type {
  TeamUsageResponse,
  TeamMemberUsage,
  QuotaConfig,
} from "@/lib/api/ai-assistant"

function scopeDisplayLabel(c: QuotaConfig): string {
  if (c.scopeType === "global") return "Global"
  if (c.scopeType === "role") return `Role: ${c.scopeValue ?? ""}`
  if (c.scopeType === "user") return c.userEmail ? `User: ${c.userEmail}` : `User: ${c.userId ?? ""}`
  return c.scopeValue ?? c.scopeType
}

export function AdminQuotaContent() {
  const [teamUsage, setTeamUsage] = useState<TeamUsageResponse | null>(null)
  const [quotaConfigs, setQuotaConfigs] = useState<QuotaConfig[]>([])
  const [quotaUsers, setQuotaUsers] = useState<{ id: string; email: string; fullName: string; role: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingConfig, setEditingConfig] = useState<QuotaConfig | null>(null)
  const [editForm, setEditForm] = useState({ dailyTokenLimit: 0, monthlyTokenLimit: 0, dailyCostLimit: 0 })
  const [showAddOverride, setShowAddOverride] = useState(false)
  const [addUserId, setAddUserId] = useState("")
  const [addForm, setAddForm] = useState({ dailyTokenLimit: 100000, monthlyTokenLimit: 2000000, dailyCostLimit: 2 })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [teamRes, quotasRes, usersRes] = await Promise.all([
        aiAssistantApi.getTeamUsage(),
        aiAssistantApi.getQuotaConfigs(),
        aiAssistantApi.getQuotaUsers(),
      ])
      setTeamUsage(teamRes)
      setQuotaConfigs(quotasRes)
      setQuotaUsers(usersRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const members = teamUsage?.members ?? []
  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalTodayTokens = teamUsage?.totalTodayTokens ?? 0
  const totalTodayCost = teamUsage?.totalTodayCost ?? 0
  const totalMonthTokens = teamUsage?.totalMonthTokens ?? 0
  const totalMonthCost = teamUsage?.totalMonthCost ?? 0

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

  const handleOpenEdit = (config: QuotaConfig) => {
    setEditingConfig(config)
    setEditForm({
      dailyTokenLimit: config.dailyTokenLimit,
      monthlyTokenLimit: config.monthlyTokenLimit,
      dailyCostLimit: config.dailyCostLimit,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingConfig) return
    setSaving(true)
    try {
      await aiAssistantApi.updateQuota(editingConfig.id, {
        dailyTokenLimit: editForm.dailyTokenLimit,
        monthlyTokenLimit: editForm.monthlyTokenLimit,
        dailyCostLimit: editForm.dailyCostLimit,
      })
      setEditingConfig(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cấu hình quota này?")) return
    setDeletingId(id)
    try {
      await aiAssistantApi.deleteQuota(id)
      await load()
      if (editingConfig?.id === id) setEditingConfig(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại")
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddOverride = async () => {
    if (!addUserId) return
    setSaving(true)
    try {
      await aiAssistantApi.createQuota({
        scopeType: "user",
        userId: addUserId,
        dailyTokenLimit: addForm.dailyTokenLimit,
        monthlyTokenLimit: addForm.monthlyTokenLimit,
        dailyCostLimit: addForm.dailyCostLimit,
      })
      setShowAddOverride(false)
      setAddUserId("")
      setAddForm({ dailyTokenLimit: 100000, monthlyTokenLimit: 2000000, dailyCostLimit: 2 })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thêm override thất bại")
    } finally {
      setSaving(false)
    }
  }

  const userQuotaIds = new Set(quotaConfigs.filter((q) => q.scopeType === "user" && q.userId).map((q) => q.userId!))
  const usersForOverride = quotaUsers.filter((u) => !userQuotaIds.has(u.id))

  if (loading && !teamUsage) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold  flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Token Quota Management
              </h1>
              <p className="text-sm text-slate-500">
                Admin dashboard for managing team AI usage quotas
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center gap-2 text-red-800">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => setError(null)}>Đóng</Button>
            </CardContent>
          </Card>
        )}

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
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">Chưa có user nào có usage trong tháng hoặc có quota override.</p>
            ) : (
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
                  {filteredMembers.map((m: TeamMemberUsage) => {
                    const todayPct = m.dailyTokenLimit > 0 ? (m.todayTokens / m.dailyTokenLimit) * 100 : 0
                    return (
                      <TableRow key={m.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                {m.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("") || m.email[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{m.fullName || m.email}</p>
                              <p className="text-xs text-slate-500">{m.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{(m.todayTokens / 1000).toFixed(0)}K</TableCell>
                        <TableCell className="text-right">{(m.monthTokens / 1000).toFixed(0)}K</TableCell>
                        <TableCell className="text-right">{(m.dailyTokenLimit / 1000).toFixed(0)}K/d</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress
                              value={todayPct}
                              className={cn("w-16 h-2", getProgressColor(todayPct))}
                            />
                            <span className={cn("text-sm font-medium", getStatusColor(todayPct))}>
                              {todayPct.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quota Configuration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Quota Configuration</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddOverride(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add User Override
              </Button>
              <Button variant="outline" size="sm" onClick={load}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quotaConfigs.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">Chưa có cấu hình quota. Chạy migration seed để có global default.</p>
            ) : (
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
                  {quotaConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{scopeDisplayLabel(config)}</span>
                          {config.scopeType === "user" && (
                            <Badge variant="outline" className="text-xs">Override</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{(config.dailyTokenLimit / 1000).toFixed(0)}K</TableCell>
                      <TableCell className="text-right">
                        {config.monthlyTokenLimit >= 1000000
                          ? `${(config.monthlyTokenLimit / 1000000).toFixed(0)}M`
                          : `${(config.monthlyTokenLimit / 1000).toFixed(0)}K`}
                      </TableCell>
                      <TableCell className="text-right">${config.dailyCostLimit.toFixed(2)}</TableCell>
                      <TableCell className="text-right flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(config)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {config.scopeType !== "global" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === config.id}
                            onClick={() => handleDelete(config.id)}
                          >
                            {deletingId === config.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Config Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quota: {editingConfig ? scopeDisplayLabel(editingConfig) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Daily Token Limit</Label>
              <Input
                type="number"
                value={editingConfig ? editForm.dailyTokenLimit : 0}
                onChange={(e) => setEditForm((f) => ({ ...f, dailyTokenLimit: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Token Limit</Label>
              <Input
                type="number"
                value={editingConfig ? editForm.monthlyTokenLimit : 0}
                onChange={(e) => setEditForm((f) => ({ ...f, monthlyTokenLimit: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Daily Cost Limit ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={editingConfig ? editForm.dailyCostLimit : 0}
                onChange={(e) => setEditForm((f) => ({ ...f, dailyCostLimit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
            {editingConfig && editingConfig.scopeType !== "global" && (
              <Button variant="outline" onClick={() => editingConfig && handleDelete(editingConfig.id)} className="text-red-600">
                Delete
              </Button>
            )}
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
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
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn user..." />
                </SelectTrigger>
                <SelectContent>
                  {usersForOverride.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || u.email} ({u.email})
                    </SelectItem>
                  ))}
                  {usersForOverride.length === 0 && (
                    <SelectItem value="_none" disabled>Tất cả user đã có override</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Token Limit</Label>
              <Input
                type="number"
                value={addForm.dailyTokenLimit}
                onChange={(e) => setAddForm((f) => ({ ...f, dailyTokenLimit: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Token Limit</Label>
              <Input
                type="number"
                value={addForm.monthlyTokenLimit}
                onChange={(e) => setAddForm((f) => ({ ...f, monthlyTokenLimit: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Daily Cost Limit ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={addForm.dailyCostLimit}
                onChange={(e) => setAddForm((f) => ({ ...f, dailyCostLimit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOverride(false)}>Cancel</Button>
            <Button onClick={handleAddOverride} disabled={saving || !addUserId || addUserId === "_none"}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
