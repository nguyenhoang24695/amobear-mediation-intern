"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertTriangle, AlertCircle, Info, ChevronRight, ChevronLeft, Check, Zap } from "lucide-react"
import { alertsApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

interface ManualAlertCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const metrics = [
  { value: "ecpm", label: "eCPM" },
  { value: "revenue", label: "Revenue" },
  { value: "fill_rate", label: "Fill Rate" },
  { value: "impressions", label: "Impressions" },
  { value: "dau", label: "DAU" },
  { value: "d1_retention", label: "D1 Retention" },
  { value: "d7_retention", label: "D7 Retention" },
]

const apps = [
  { id: "all", name: "All Apps" },
  { id: "puzzle-blast", name: "Puzzle Blast" },
  { id: "word-hero", name: "Word Hero" },
  { id: "color-match", name: "Color Match" },
  { id: "ai-mail", name: "AI Mail" },
]

const conditionTypes = [
  { value: "threshold", label: "Threshold", description: "Alert when metric crosses a fixed value" },
  { value: "percent_change", label: "% Change", description: "Alert when metric changes by percentage vs baseline" },
  { value: "consecutive", label: "Consecutive Days", description: "Alert after N consecutive days below/above value" },
]

export function ManualAlertCreatorModal({ open, onOpenChange, onCreated }: ManualAlertCreatorModalProps) {
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    metric: "",
    selectedApps: ["all"],
    alertName: "",
    conditionType: "threshold",
    operator: "less_than",
    thresholdValue: "",
    percentChange: "",
    consecutiveDays: "3",
    severity: "warning",
    channels: { inApp: true, telegram: false, lark: false, email: false },
    frequency: "daily",
    autoResolve: true,
  })

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleCreate = async () => {
    try {
      setCreating(true)
      const name = (formData.alertName || generateAlertName()).trim()
      const channels = Object.entries(formData.channels)
        .filter(([, enabled]) => enabled)
        .map(([channel]) => {
          if (channel === "inApp") return "IN_APP"
          return channel.toUpperCase()
        })

      const ruleExpression =
        formData.conditionType === "threshold"
          ? `${formData.metric} ${formData.operator === "less_than" ? "<" : ">"} ${formData.thresholdValue || "0"}`
          : formData.conditionType === "percent_change"
            ? `${formData.metric} ${formData.operator === "less_than" ? "drop" : "increase"} ${formData.percentChange || "0"}%`
            : `${formData.metric} consecutive ${formData.consecutiveDays} days`

      await alertsApi.createAlertRule({
        name,
        description: "Created from manual alert wizard",
        ruleType: "MANUAL",
        severity: formData.severity.toUpperCase(),
        ruleExpression,
        thresholdValue: formData.conditionType === "threshold" ? Number(formData.thresholdValue || 0) : null,
        timeWindowHours: formData.frequency === "daily" ? 24 : 1,
        comparisonPeriodHours: formData.conditionType === "percent_change" ? 24 : null,
        filterConditions: JSON.stringify({
          selectedApps: formData.selectedApps,
          metric: formData.metric,
          conditionType: formData.conditionType,
          operator: formData.operator,
          percentChange: formData.percentChange,
          consecutiveDays: formData.consecutiveDays,
          autoResolve: formData.autoResolve,
        }),
        messageTemplate: `${name} triggered`,
        isEnabled: true,
        cooldownMinutes: 60,
        notificationChannels: channels.length > 0 ? channels.join(",") : "IN_APP",
        telegramTopics: null,
        emailRecipients: null,
        slackChannels: null,
        priority: formData.severity === "critical" ? 10 : formData.severity === "warning" ? 5 : 1,
      })

      toast({ title: "Đã tạo alert rule" })
      onCreated?.()
      onOpenChange(false)
      setStep(1)
    } catch (error: any) {
      toast({
        title: "Không thể tạo alert",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const generateAlertName = () => {
    const metricLabel = metrics.find((m) => m.value === formData.metric)?.label || "Metric"
    if (formData.conditionType === "threshold") {
      return `${metricLabel} ${formData.operator === "less_than" ? "<" : ">"} ${formData.thresholdValue || "?"}`
    }
    if (formData.conditionType === "percent_change") {
      return `${metricLabel} ${formData.operator === "less_than" ? "drops" : "increases"} ${formData.percentChange || "?"}%`
    }
    return `${metricLabel} below threshold for ${formData.consecutiveDays} days`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Alert Rule</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? "bg-indigo-600 text-white"
                    : s < step
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm ${s === step ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                {s === 1 ? "What to Monitor" : s === 2 ? "Condition" : "Notifications"}
              </span>
              {s < 3 && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Metric *</Label>
                  <Select value={formData.metric} onValueChange={(v) => setFormData({ ...formData, metric: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a metric to monitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select App(s) *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {apps.map((app) => (
                      <label
                        key={app.id}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                          formData.selectedApps.includes(app.id) ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <Checkbox
                          checked={formData.selectedApps.includes(app.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (app.id === "all") {
                                setFormData({ ...formData, selectedApps: ["all"] })
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedApps: [...formData.selectedApps.filter((a) => a !== "all"), app.id],
                                })
                              }
                            } else {
                              setFormData({
                                ...formData,
                                selectedApps: formData.selectedApps.filter((a) => a !== app.id),
                              })
                            }
                          }}
                        />
                        <span className="text-sm">{app.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alert Name</Label>
                  <Input
                    placeholder="Auto-generated or enter custom name"
                    value={formData.alertName || generateAlertName()}
                    onChange={(e) => setFormData({ ...formData, alertName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Condition Type *</Label>
                  <RadioGroup
                    value={formData.conditionType}
                    onValueChange={(v) => setFormData({ ...formData, conditionType: v })}
                    className="grid grid-cols-1 gap-3"
                  >
                    {conditionTypes.map((ct) => (
                      <label
                        key={ct.value}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                          formData.conditionType === ct.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <RadioGroupItem value={ct.value} />
                        <div>
                          <p className="font-medium text-slate-900">{ct.label}</p>
                          <p className="text-sm text-slate-500">{ct.description}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {formData.conditionType === "threshold" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select value={formData.operator} onValueChange={(v) => setFormData({ ...formData, operator: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="less_than">Less than (&lt;)</SelectItem>
                          <SelectItem value="greater_than">Greater than (&gt;)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 5.00"
                        value={formData.thresholdValue}
                        onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.conditionType === "percent_change" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Change Direction</Label>
                      <Select value={formData.operator} onValueChange={(v) => setFormData({ ...formData, operator: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="less_than">Decreases by</SelectItem>
                          <SelectItem value="greater_than">Increases by</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Percentage (%)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 20"
                        value={formData.percentChange}
                        onChange={(e) => setFormData({ ...formData, percentChange: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.conditionType === "consecutive" && (
                  <div className="space-y-2">
                    <Label>Consecutive Days</Label>
                    <Select
                      value={formData.consecutiveDays}
                      onValueChange={(v) => setFormData({ ...formData, consecutiveDays: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 5, 7].map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Severity *</Label>
                  <RadioGroup
                    value={formData.severity}
                    onValueChange={(v) => setFormData({ ...formData, severity: v })}
                    className="flex gap-4"
                  >
                    <label
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                        formData.severity === "critical" ? "border-red-500 bg-red-50" : "border-slate-200"
                      }`}
                    >
                      <RadioGroupItem value="critical" />
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Critical</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                        formData.severity === "warning" ? "border-amber-500 bg-amber-50" : "border-slate-200"
                      }`}
                    >
                      <RadioGroupItem value="warning" />
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm">Warning</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                        formData.severity === "info" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                      }`}
                    >
                      <RadioGroupItem value="info" />
                      <Info className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Info</span>
                    </label>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Notification Channels</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">In-app Notification</span>
                      <Switch
                        checked={formData.channels.inApp}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, inApp: c } })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Telegram</span>
                      <Switch
                        checked={formData.channels.telegram}
                        onCheckedChange={(c) =>
                          setFormData({ ...formData, channels: { ...formData.channels, telegram: c } })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Lark</span>
                      <Switch
                        checked={formData.channels.lark}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, lark: c } })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Email</span>
                      <Switch
                        checked={formData.channels.email}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, email: c } })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evaluation Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily (after pipeline)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Auto-resolve</Label>
                    <Switch
                      checked={formData.autoResolve}
                      onCheckedChange={(c) => setFormData({ ...formData, autoResolve: c })}
                    />
                  </div>
                  {formData.autoResolve && (
                    <p className="text-sm text-slate-500">
                      Alert will auto-resolve when metric recovers to normal range
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1">
            <Card className="border-amber-300 bg-amber-50 sticky top-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Alert Preview</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span>
                    <p className="font-medium">{formData.alertName || generateAlertName() || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Metric:</span>
                    <p className="font-medium">{metrics.find((m) => m.value === formData.metric)?.label || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Apps:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.selectedApps.map((appId) => (
                        <Badge key={appId} variant="secondary" className="text-xs">
                          {apps.find((a) => a.id === appId)?.name || appId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Severity:</span>
                    <Badge
                      className={`ml-2 ${
                        formData.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : formData.severity === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {formData.severity}
                    </Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4 gap-2 bg-white">
                  <Zap className="w-4 h-4" />
                  Test Rule
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700" disabled={creating}>
                <Check className="w-4 h-4 mr-1" />
                {creating ? "Creating..." : "Create Alert"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

