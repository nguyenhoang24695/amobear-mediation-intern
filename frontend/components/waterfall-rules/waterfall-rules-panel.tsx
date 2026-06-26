"use client"

import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, Download, ListChecks, Plus, RefreshCw, Search, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { waterfallRecommendationSettingsApi } from "@/lib/api/services"
import type { WaterfallRecommendationRuleDto } from "@/types/api"
import { CreateEditGroupDialog } from "./create-edit-group-dialog"
import { CreateEditRuleDialog } from "./create-edit-rule-dialog"
import { RulesGroupedView } from "./rules-grouped-view"
import type { RuleGroup, WaterfallRule } from "./waterfall-rule-types"

interface WaterfallRulesPanelProps {
  canManageRules: boolean
}

export function WaterfallRulesPanel({ canManageRules }: WaterfallRulesPanelProps) {
  const { toast } = useToast()
  const [ruleSearch, setRuleSearch] = useState("")
  const [ruleStatusFilter, setRuleStatusFilter] = useState("all")
  const [rulePriorityFilter, setRulePriorityFilter] = useState("all")
  const [ruleActionFilter, setRuleActionFilter] = useState("all")
  const [editRule, setEditRule] = useState<WaterfallRule | null>(null)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [savingRule, setSavingRule] = useState(false)
  const [createRuleGroupId, setCreateRuleGroupId] = useState<number | null | undefined>(undefined)
  const [editGroup, setEditGroup] = useState<RuleGroup | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)

  const { data: rulesData, loading: rulesLoading, refetch: refetchRules } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRules(),
    { enabled: true, cacheKey: "waterfall_recommendation_rules" }
  )

  const { data: ruleGroupsData, loading: ruleGroupsLoading, refetch: refetchRuleGroups } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRuleGroups(),
    { enabled: true, cacheKey: "waterfall_recommendation_rule_groups" }
  )

  const rules = useMemo<WaterfallRule[]>(() => {
    if (!rulesData) return []

    return rulesData.map((dto) => {
      let isHighestFloor: "yes" | "no" | "any" | null = null
      if (dto.conditionIsHighestFloor === true) {
        isHighestFloor = "yes"
      } else if (dto.conditionIsHighestFloor === false) {
        isHighestFloor = "no"
      }

      return {
        id: dto.id.toString(),
        name: dto.name,
        displayOrder: dto.displayOrder,
        active: dto.isActive,
        priority: dto.priority as "high" | "medium" | "low",
        sowMin: dto.conditionSowMin ? Number(dto.conditionSowMin) : null,
        sowMax: dto.conditionSowMax ? Number(dto.conditionSowMax) : null,
        matchRateMin: dto.conditionMatchRateMin ? Number(dto.conditionMatchRateMin) : null,
        matchRateMax: dto.conditionMatchRateMax ? Number(dto.conditionMatchRateMax) : null,
        onlyOneInstance: dto.conditionOnlyOneInstance ?? null,
        isHighestFloor,
        actionType: dto.action,
        multiplier: dto.actionMultiplier ? Number(dto.actionMultiplier) : null,
        useMidpoint: dto.actionUseMidpoint,
        reasonTemplate: dto.reasonTemplate || "",
        groupId: dto.groupId ?? null,
        groupName: dto.groupName ?? null,
        updatedAt: dto.updatedAt,
      }
    })
  }, [rulesData])

  const ruleGroups = useMemo<RuleGroup[]>(() => {
    if (!ruleGroupsData) return []
    return ruleGroupsData.map((dto) => ({
      id: dto.id,
      name: dto.name,
      description: dto.description ?? null,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive,
      isDefault: dto.isDefault,
      color: dto.color ?? null,
      ruleCount: dto.ruleCount,
      appCount: dto.appCount,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    }))
  }, [ruleGroupsData])

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (ruleSearch && !rule.name.toLowerCase().includes(ruleSearch.toLowerCase())) return false
      if (ruleStatusFilter === "active" && !rule.active) return false
      if (ruleStatusFilter === "inactive" && rule.active) return false
      if (rulePriorityFilter !== "all" && rule.priority !== rulePriorityFilter) return false
      if (ruleActionFilter !== "all" && rule.actionType !== ruleActionFilter) return false
      return true
    })
  }, [ruleActionFilter, rulePriorityFilter, ruleSearch, ruleStatusFilter, rules])

  const totalRules = rules.length
  const activeRulesCount = rules.filter((rule) => rule.active).length
  const inactiveRulesCount = rules.filter((rule) => !rule.active).length
  const totalGroups = ruleGroups.length
  const activeGroupsCount = ruleGroups.filter((group) => group.isActive).length
  const inactiveGroupsCount = ruleGroups.filter((group) => !group.isActive).length

  const mapRulePayload = useCallback((rule: Omit<WaterfallRule, "id" | "updatedAt"> | WaterfallRule): Omit<WaterfallRecommendationRuleDto, "id" | "createdAt" | "updatedAt"> => {
    let conditionIsHighestFloor: boolean | null = null
    if (rule.isHighestFloor === "yes") {
      conditionIsHighestFloor = true
    } else if (rule.isHighestFloor === "no") {
      conditionIsHighestFloor = false
    }

    return {
      displayOrder: rule.displayOrder,
      name: rule.name,
      isActive: rule.active,
      conditionSowMin: rule.sowMin,
      conditionSowMax: rule.sowMax,
      conditionMatchRateMin: rule.matchRateMin,
      conditionMatchRateMax: rule.matchRateMax,
      conditionOnlyOneInstance: rule.onlyOneInstance,
      conditionIsHighestFloor,
      action: rule.actionType,
      actionMultiplier: rule.multiplier,
      actionUseMidpoint: rule.useMidpoint,
      reasonTemplate: rule.reasonTemplate || null,
      priority: rule.priority,
      groupId: rule.groupId,
    }
  }, [])

  const handleSaveRule = useCallback(async (data: Omit<WaterfallRule, "id" | "updatedAt">) => {
    setSavingRule(true)
    try {
      const payload = mapRulePayload(data)
      if (editRule) {
        await waterfallRecommendationSettingsApi.updateRule(Number(editRule.id), payload)
        toast({ title: "Success", description: "Rule updated successfully" })
        setEditRule(null)
      } else {
        await waterfallRecommendationSettingsApi.createRule(payload)
        toast({ title: "Success", description: "Rule created successfully" })
        setCreateRuleOpen(false)
      }
      await refetchRules()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save rule", variant: "destructive" })
    } finally {
      setSavingRule(false)
    }
  }, [editRule, mapRulePayload, refetchRules, toast])

  const handleDeleteRule = useCallback(async (id: string) => {
    try {
      await waterfallRecommendationSettingsApi.deleteRule(Number(id))
      toast({ title: "Success", description: "Rule deleted successfully" })
      await refetchRules()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete rule", variant: "destructive" })
    }
  }, [refetchRules, toast])

  const handleDuplicateRule = useCallback(async (id: string) => {
    const rule = rules.find((item) => item.id === id)
    if (!rule) return

    setSavingRule(true)
    try {
      await waterfallRecommendationSettingsApi.createRule({
        ...mapRulePayload(rule),
        displayOrder: Math.max(...rules.map((item) => item.displayOrder), 0) + 1,
        name: `${rule.name} (Copy)`,
      })
      toast({ title: "Success", description: "Rule duplicated successfully" })
      await refetchRules()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to duplicate rule", variant: "destructive" })
    } finally {
      setSavingRule(false)
    }
  }, [mapRulePayload, refetchRules, rules, toast])

  const handleToggleRule = useCallback(async (id: string) => {
    const rule = rules.find((item) => item.id === id)
    if (!rule) return

    try {
      await waterfallRecommendationSettingsApi.updateRule(Number(id), {
        ...mapRulePayload(rule),
        isActive: !rule.active,
      })
      toast({ title: "Success", description: `Rule ${!rule.active ? "enabled" : "disabled"} successfully` })
      await refetchRules()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to toggle rule", variant: "destructive" })
    }
  }, [mapRulePayload, refetchRules, rules, toast])

  const handleSaveGroup = useCallback(async (data: {
    name: string
    description: string | null
    displayOrder: number
    isActive: boolean
    color: string | null
  }) => {
    setSavingGroup(true)
    try {
      const payload = {
        name: data.name,
        description: data.description,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
        color: data.color,
      }
      if (editGroup) {
        await waterfallRecommendationSettingsApi.updateRuleGroup(editGroup.id, payload)
        toast({ title: "Success", description: "Group updated successfully" })
        setEditGroup(null)
      } else {
        await waterfallRecommendationSettingsApi.createRuleGroup(payload)
        toast({ title: "Success", description: "Group created successfully" })
        setCreateGroupOpen(false)
      }
      await refetchRuleGroups()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save group", variant: "destructive" })
    } finally {
      setSavingGroup(false)
    }
  }, [editGroup, refetchRuleGroups, toast])

  const handleDeleteGroup = useCallback(async (id: number) => {
    try {
      await waterfallRecommendationSettingsApi.deleteRuleGroup(id)
      toast({ title: "Success", description: "Group deleted successfully" })
      await Promise.all([refetchRuleGroups(), refetchRules()])
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete group", variant: "destructive" })
    }
  }, [refetchRuleGroups, refetchRules, toast])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-muted/25">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Groups</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{totalGroups}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{totalRules} rules</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Active Groups</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-300">{activeGroupsCount}</p>
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-300">{activeRulesCount} active rules</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-background p-2.5">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/25">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive Groups</p>
                <p className="mt-1 text-2xl font-bold text-muted-foreground">{inactiveGroupsCount}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{inactiveRulesCount} inactive rules</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={ruleSearch} onChange={(event) => setRuleSearch(event.target.value)} placeholder="Search rules..." className="pl-9" />
          </div>
          <Select value={ruleStatusFilter} onValueChange={setRuleStatusFilter}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rulePriorityFilter} onValueChange={setRulePriorityFilter}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ruleActionFilter} onValueChange={setRuleActionFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="REMOVE">REMOVE</SelectItem>
              <SelectItem value="KEEP">KEEP</SelectItem>
              <SelectItem value="TEST REDUCE">TEST REDUCE</SelectItem>
              <SelectItem value="INCREASE 10%">INCREASE 10%</SelectItem>
              <SelectItem value="INCREASE 20%">INCREASE 20%</SelectItem>
              <SelectItem value="ADD LAYER">ADD LAYER</SelectItem>
              <SelectItem value="ADD HIGHER">ADD HIGHER</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {canManageRules && (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateGroupOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              void Promise.all([refetchRules(), refetchRuleGroups()])
              toast({ title: "Refreshed", description: "Rules refreshed" })
            }}
            disabled={rulesLoading || ruleGroupsLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${rulesLoading || ruleGroupsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" className="bg-transparent" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <RulesGroupedView
        rules={filteredRules}
        ruleGroups={ruleGroups}
        onEdit={setEditRule}
        onDelete={handleDeleteRule}
        onDuplicate={handleDuplicateRule}
        onToggle={handleToggleRule}
        hasFilters={ruleSearch !== "" || ruleStatusFilter !== "all" || rulePriorityFilter !== "all" || ruleActionFilter !== "all"}
        onClearFilters={() => {
          setRuleSearch("")
          setRuleStatusFilter("all")
          setRulePriorityFilter("all")
          setRuleActionFilter("all")
        }}
        onCreateNew={(groupId) => {
          setCreateRuleGroupId(groupId)
          setCreateRuleOpen(true)
        }}
        onCreateGroup={() => setCreateGroupOpen(true)}
        onEditGroup={setEditGroup}
        onDeleteGroup={handleDeleteGroup}
        canManage={canManageRules}
      />

      <CreateEditRuleDialog
        open={createRuleOpen || !!editRule}
        onOpenChange={(open) => {
          if (!open) {
            setCreateRuleOpen(false)
            setEditRule(null)
            setCreateRuleGroupId(undefined)
          }
        }}
        rule={editRule}
        ruleGroups={ruleGroups}
        onSave={handleSaveRule}
        saving={savingRule}
        defaultGroupId={createRuleGroupId}
      />

      <CreateEditGroupDialog
        open={createGroupOpen || !!editGroup}
        onOpenChange={(open) => {
          if (!open) {
            setCreateGroupOpen(false)
            setEditGroup(null)
          }
        }}
        group={editGroup}
        onSave={handleSaveGroup}
        saving={savingGroup}
        nextDisplayOrder={Math.max(...ruleGroups.map((group) => group.displayOrder), 0) + 1}
      />
    </div>
  )
}

