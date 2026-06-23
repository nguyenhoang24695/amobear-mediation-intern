"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import type { WaterfallRule } from "./waterfall-rules-content"

interface CreateEditRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: WaterfallRule | null
  onSave: (data: Omit<WaterfallRule, "id" | "updatedAt">) => void
}

const actionTypes = [
  "REMOVE",
  "KEEP",
  "TEST REDUCE",
  "INCREASE 10%",
  "INCREASE 20%",
  "ADD LAYER",
  "ADD HIGHER",
]

export function CreateEditRuleDialog({
  open,
  onOpenChange,
  rule,
  onSave,
}: CreateEditRuleDialogProps) {
  const isEditing = !!rule

  // Basic
  const [name, setName] = useState("")
  const [displayOrder, setDisplayOrder] = useState("1")
  const [active, setActive] = useState(true)
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium")

  // Conditions
  const [sowMin, setSowMin] = useState("")
  const [sowMax, setSowMax] = useState("")
  const [matchRateMin, setMatchRateMin] = useState("")
  const [matchRateMax, setMatchRateMax] = useState("")
  const [onlyOneInstance, setOnlyOneInstance] = useState(false)
  const [isHighestFloor, setIsHighestFloor] = useState<
    "yes" | "no" | "any" | ""
  >("")

  // Action
  const [actionType, setActionType] = useState("REMOVE")
  const [multiplier, setMultiplier] = useState("")
  const [useMidpoint, setUseMidpoint] = useState(false)
  const [reasonTemplate, setReasonTemplate] = useState("")

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (rule) {
        setName(rule.name)
        setDisplayOrder(String(rule.displayOrder))
        setActive(rule.active)
        setPriority(rule.priority)
        setSowMin(rule.sowMin !== null ? String(rule.sowMin) : "")
        setSowMax(rule.sowMax !== null ? String(rule.sowMax) : "")
        setMatchRateMin(
          rule.matchRateMin !== null ? String(rule.matchRateMin) : ""
        )
        setMatchRateMax(
          rule.matchRateMax !== null ? String(rule.matchRateMax) : ""
        )
        setOnlyOneInstance(rule.onlyOneInstance ?? false)
        setIsHighestFloor(rule.isHighestFloor || "")
        setActionType(rule.actionType)
        setMultiplier(rule.multiplier !== null ? String(rule.multiplier) : "")
        setUseMidpoint(rule.useMidpoint)
        setReasonTemplate(rule.reasonTemplate)
      } else {
        setName("")
        setDisplayOrder("1")
        setActive(true)
        setPriority("medium")
        setSowMin("")
        setSowMax("")
        setMatchRateMin("")
        setMatchRateMax("")
        setOnlyOneInstance(false)
        setIsHighestFloor("")
        setActionType("REMOVE")
        setMultiplier("")
        setUseMidpoint(false)
        setReasonTemplate("")
      }
      setErrors({})
      setSaving(false)
    }
  }, [open, rule])

  const showMultiplier =
    actionType === "INCREASE 10%" ||
    actionType === "INCREASE 20%" ||
    actionType === "ADD HIGHER"
  const showMidpoint = actionType === "ADD LAYER"

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Rule name is required"
    if (!displayOrder || Number(displayOrder) < 0)
      errs.displayOrder = "Must be a positive number"
    if (!actionType) errs.actionType = "Action type is required"
    if (showMultiplier && !multiplier)
      errs.multiplier = "Multiplier is required for this action"
    if (reasonTemplate.length > 512)
      errs.reasonTemplate = "Maximum 512 characters"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    setSaving(true)
    setTimeout(() => {
      onSave({
        name: name.trim(),
        displayOrder: Number(displayOrder),
        active,
        priority,
        sowMin: sowMin ? Number(sowMin) : null,
        sowMax: sowMax ? Number(sowMax) : null,
        matchRateMin: matchRateMin ? Number(matchRateMin) : null,
        matchRateMax: matchRateMax ? Number(matchRateMax) : null,
        onlyOneInstance: onlyOneInstance || null,
        isHighestFloor:
          isHighestFloor === "" ? null : (isHighestFloor as "yes" | "no" | "any"),
        actionType,
        multiplier: multiplier ? Number(multiplier) : null,
        useMidpoint,
        reasonTemplate,
      })
      setSaving(false)
    }, 600)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Rule" : "Create Rule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the rule configuration and conditions."
              : "Define a new recommendation rule with conditions and actions."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              Basic
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name *</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g. Remove Low SoW"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display-order">Display Order *</Label>
                  <Input
                    id="display-order"
                    type="number"
                    min={0}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Lower number = evaluated first
                  </p>
                  {errors.displayOrder && (
                    <p className="text-xs text-red-600">
                      {errors.displayOrder}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) =>
                      setPriority(v as "high" | "medium" | "low")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="rule-active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="rule-active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
          </div>

          {/* Conditions Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              Conditions
            </h4>
            <div className="space-y-4">
              {/* SoW Range */}
              <div className="space-y-2">
                <Label>SoW Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="number"
                      step={0.01}
                      placeholder="Min SoW %"
                      value={sowMin}
                      onChange={(e) => setSowMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step={0.01}
                      placeholder="Max SoW %"
                      value={sowMax}
                      onChange={(e) => setSowMax(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Leave empty to skip this condition
                </p>
              </div>

              {/* Match Rate Range */}
              <div className="space-y-2">
                <Label>Match Rate Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="number"
                      step={0.1}
                      placeholder="Min Match Rate %"
                      value={matchRateMin}
                      onChange={(e) => setMatchRateMin(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step={0.1}
                      placeholder="Max Match Rate %"
                      value={matchRateMax}
                      onChange={(e) => setMatchRateMax(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Special Conditions */}
              <div className="space-y-3">
                <Label>Special Conditions</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="only-one-instance"
                    checked={onlyOneInstance}
                    onCheckedChange={(checked) =>
                      setOnlyOneInstance(!!checked)
                    }
                  />
                  <label
                    htmlFor="only-one-instance"
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    Only when one instance left
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-700">
                    Is highest floor
                  </label>
                  <Select
                    value={isHighestFloor}
                    onValueChange={(v) =>
                      setIsHighestFloor(
                        v as "yes" | "no" | "any" | ""
                      )
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              Action
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Action Type *</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.actionType && (
                  <p className="text-xs text-red-600">{errors.actionType}</p>
                )}
              </div>

              {showMultiplier && (
                <div className="space-y-2">
                  <Label htmlFor="multiplier">Multiplier *</Label>
                  <Input
                    id="multiplier"
                    type="number"
                    step={0.01}
                    placeholder="e.g. 1.1"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Required for INCREASE and ADD HIGHER actions
                  </p>
                  {errors.multiplier && (
                    <p className="text-xs text-red-600">{errors.multiplier}</p>
                  )}
                </div>
              )}

              {showMidpoint && (
                <div className="flex items-center gap-3">
                  <Switch
                    id="use-midpoint"
                    checked={useMidpoint}
                    onCheckedChange={setUseMidpoint}
                  />
                  <div>
                    <Label htmlFor="use-midpoint" className="cursor-pointer">
                      Use Midpoint
                    </Label>
                    <p className="text-xs text-slate-500">
                      Use midpoint formula for ADD LAYER
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason-template">Reason Template</Label>
                <Textarea
                  id="reason-template"
                  placeholder={'e.g. SoW {sow}% is below threshold'}
                  value={reasonTemplate}
                  onChange={(e) => setReasonTemplate(e.target.value)}
                  maxLength={512}
                  rows={3}
                />
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Optional, max 512 characters</p>
                  <p className="text-xs text-slate-400">
                    {reasonTemplate.length}/512
                  </p>
                </div>
                {errors.reasonTemplate && (
                  <p className="text-xs text-red-600">
                    {errors.reasonTemplate}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
