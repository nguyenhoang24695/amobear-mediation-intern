"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { alertsApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import type { AlertRule } from "@/types/api"
import { ManualAlertCreatorModal } from "./manual-alert-creator-modal"
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react"

interface AlertRulesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseJsonArray(input?: string | null): string[] {
  if (!input) return []
  try {
    const parsed = JSON.parse(input)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

export function AlertRulesPanel({ open, onOpenChange }: AlertRulesPanelProps) {
  const canEditAlertRule = useMemo(() => hasScreenFunction("s-alerts", "edit-rule"), [])
  const canDeleteAlertRule = useMemo(() => hasScreenFunction("s-alerts", "delete-rule"), [])
  const { toast } = useToast()
  const [enabledFilter, setEnabledFilter] = useState<"all" | "enabled" | "disabled">("all")
  const [manualEditorOpen, setManualEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const enabledValue = useMemo(() => {
    if (enabledFilter === "all") return undefined
    return enabledFilter === "enabled"
  }, [enabledFilter])

  const { data: rules, loading, refetch } = useApi(
    () => alertsApi.getAlertRules(enabledValue, "ORG"),
    {
      enabled: open,
      cacheKey: `alert_rules_org_${enabledFilter}`,
    },
  )

  const openEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setManualEditorOpen(true)
  }

  const handleToggle = async (rule: AlertRule) => {
    setTogglingId(rule.id)
    try {
      await alertsApi.toggleAlertRule(rule.id)
      await refetch()
      toast({
        title: "Updated",
        description: `Rule ${rule.name} đã ${rule.isEnabled ? "tắt" : "bật"}.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đổi trạng thái rule."
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (rule: AlertRule) => {
    const confirmed = window.confirm(`Xóa alert rule "${rule.name}"?`)
    if (!confirmed) return

    setDeletingId(rule.id)
    try {
      await alertsApi.deleteAlertRule(rule.id)
      await refetch()
      toast({ title: "Deleted", description: `Rule ${rule.name} đã được xóa.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xóa alert rule."
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full px-4 sm:max-w-5xl sm:px-6">
          <SheetHeader>
            <SheetTitle>Alert Rules</SheetTitle>
            <SheetDescription>Manage alert rules and notification channels for the alert system.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 flex items-center gap-2">
              <Select value={enabledFilter} onValueChange={(value) => setEnabledFilter(value as "all" | "enabled" | "disabled")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rules</SelectItem>
                  <SelectItem value="enabled">Enabled only</SelectItem>
                  <SelectItem value="disabled">Disabled only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
          </div>

          <div className="mt-5 space-y-3 overflow-y-auto pb-4 pr-1">
            {loading ? (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading rules...
                </CardContent>
              </Card>
            ) : (rules ?? []).length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center text-sm text-slate-500">
                  No alert rules found.
                </CardContent>
              </Card>
            ) : (
              (rules ?? []).map((rule) => {
                const channels = parseJsonArray(rule.notificationChannels)
                const telegramTopics = parseJsonArray(rule.telegramTopics)
                const emailRecipients = parseJsonArray(rule.emailRecipients)
                const slackChannels = parseJsonArray(rule.slackChannels)

                return (
                  <Card key={rule.id} className="border-slate-200">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                            <Badge variant="outline">{rule.ruleType}</Badge>
                            <Badge variant="outline">{rule.severity}</Badge>
                            <Badge className={rule.isEnabled ? "bg-green-100 text-green-700 border-0" : "bg-slate-100 text-slate-600 border-0"}>
                              {rule.isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          {rule.description ? (
                            <p className="text-sm text-slate-600">{rule.description}</p>
                          ) : null}
                          <p className="text-xs text-slate-500">
                            Priority {rule.priority} • Cooldown {rule.cooldownMinutes}m • Window {rule.timeWindowHours}h
                          </p>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs text-slate-500">Channels:</span>
                            {channels.length > 0 ? (
                              channels.map((channel) => (
                                <Badge key={`${rule.id}-${channel}`} variant="outline" className="text-[11px]">
                                  {channel}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">None</span>
                            )}
                          </div>
                          {telegramTopics.length > 0 ? (
                            <p className="text-xs text-slate-500">Telegram: {telegramTopics.join(", ")}</p>
                          ) : null}
                          {emailRecipients.length > 0 ? (
                            <p className="text-xs text-slate-500">Email: {emailRecipients.join(", ")}</p>
                          ) : null}
                          {slackChannels.length > 0 ? (
                            <p className="text-xs text-slate-500">Slack: {slackChannels.join(", ")}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          {canEditAlertRule ? (
                            <Switch
                              checked={rule.isEnabled}
                              disabled={togglingId === rule.id}
                              onCheckedChange={() => void handleToggle(rule)}
                            />
                          ) : null}
                          {canEditAlertRule ? (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(rule)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDeleteAlertRule ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleDelete(rule)}
                              disabled={deletingId === rule.id}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ManualAlertCreatorModal
        open={manualEditorOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen && !canEditAlertRule) return
          setManualEditorOpen(nextOpen)
          if (!nextOpen) setEditingRule(null)
        }}
        onCreated={() => {
          void refetch()
          setEditingRule(null)
        }}
        rule={editingRule}
      />
    </>
  )
}

