"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  teamProfitApi,
  type TeamMonthlyProfitPlan,
  type TeamProfitAppOption,
} from "@/lib/api/services"
import { ChevronDown, Loader2, Save, Target } from "lucide-react"

interface TeamProfitPlanCardProps {
  teamId: string
}

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value ?? 0)
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStatus(completion?: number | null) {
  if (completion == null) return { label: "No target", className: "bg-slate-100 text-slate-600" }
  if (completion >= 100) return { label: "Achieved", className: "bg-green-100 text-green-700" }
  if (completion >= 80) return { label: "On track", className: "bg-blue-100 text-blue-700" }
  return { label: "Behind", className: "bg-amber-100 text-amber-700" }
}

export function TeamProfitPlanCard({ teamId }: TeamProfitPlanCardProps) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [plan, setPlan] = useState<TeamMonthlyProfitPlan | null>(null)
  const [appOptions, setAppOptions] = useState<TeamProfitAppOption[]>([])
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])
  const [plannedProfit, setPlannedProfit] = useState("")
  const [appsOpen, setAppsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [options, currentPlan] = await Promise.all([
          teamProfitApi.getAppOptions(teamId),
          teamProfitApi.getPlan(teamId, month),
        ])
        if (cancelled) return

        setAppOptions(options)
        setPlan(currentPlan)
        setSelectedAppIds(currentPlan?.appIds ?? [])
        setPlannedProfit(currentPlan ? String(currentPlan.plannedProfit) : "")
      } catch (err) {
        if (cancelled) return
        console.error("Failed to load team profit plan:", err)
        setPlan(null)
        setSelectedAppIds([])
        setPlannedProfit("")
        toast.error("Failed to load team profit plan")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [teamId, month])

  useEffect(() => {
    const valid = new Set(appOptions.map((app) => app.appId))
    setSelectedAppIds((prev) => prev.filter((id) => valid.has(id)))
  }, [appOptions])

  const selectedLabels = useMemo(() => {
    const byId = new Map(appOptions.map((app) => [app.appId, app]))
    return selectedAppIds.map((id) => byId.get(id)?.label ?? id)
  }, [appOptions, selectedAppIds])

  const completion = plan?.completionPercent ?? null
  const status = getStatus(completion)
  const progressValue = Math.max(0, Math.min(100, completion ?? 0))

  const toggleApp = (appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId],
    )
  }

  const handleSave = async () => {
    const value = Number(plannedProfit)
    if (Number.isNaN(value) || value < 0) {
      toast.error("Planned profit must be a non-negative number")
      return
    }
    if (selectedAppIds.length === 0) {
      toast.error("Select at least one app")
      return
    }

    setSaving(true)
    try {
      const saved = await teamProfitApi.upsertPlan(teamId, month, {
        plannedProfit: value,
        appIds: selectedAppIds,
      })
      setPlan(saved)
      setSelectedAppIds(saved.appIds)
      setPlannedProfit(String(saved.plannedProfit))
      toast.success("Team profit plan saved")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save team profit plan"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-blue-600" />
              Monthly Profit Plan
            </CardTitle>
            <CardDescription>
              Configure planned profit and selected apps for this team.
            </CardDescription>
          </div>
          <Badge className={cn("w-fit", status.className)}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[10rem_12rem_1fr_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="team-profit-month">Month</Label>
            <Input
              id="team-profit-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-planned-profit">Planned Profit</Label>
            <Input
              id="team-planned-profit"
              type="number"
              inputMode="decimal"
              min={0}
              value={plannedProfit}
              onChange={(event) => setPlannedProfit(event.target.value)}
              placeholder="0.00"
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Apps</Label>
            <Popover open={appsOpen} onOpenChange={setAppsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-between bg-white font-normal"
                  disabled={loading || appOptions.length === 0}
                >
                  <span className="truncate">
                    {selectedLabels.length === 0
                      ? "Select apps"
                      : selectedLabels.length === 1
                        ? selectedLabels[0]
                        : `${selectedLabels.length} apps selected`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command shouldFilter>
                  <CommandInput placeholder="Search apps..." />
                  <CommandList>
                    <CommandEmpty>No apps found.</CommandEmpty>
                    <CommandGroup>
                      <div className="flex gap-2 border-b border-slate-100 px-2 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedAppIds(appOptions.map((app) => app.appId))}
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedAppIds([])}
                        >
                          Clear
                        </Button>
                      </div>
                      {appOptions.map((app) => (
                        <CommandItem
                          key={app.appId}
                          value={`${app.label} ${app.appId} ${app.appStoreId ?? ""}`}
                          onSelect={() => toggleApp(app.appId)}
                          className="cursor-pointer"
                        >
                          <Checkbox checked={selectedAppIds.includes(app.appId)} className="mr-2" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{app.label}</div>
                            <div className="truncate text-xs text-slate-500">
                              {app.platform ?? "Unknown"} · {app.appStoreId || app.appId}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="button"
            className="h-10 bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading profit plan...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Planned Profit</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatCurrency(plan?.plannedProfit ?? Number(plannedProfit || 0))}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Actual Profit</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatCurrency(plan?.actualProfit ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Completion</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {completion == null ? "—" : `${completion.toFixed(2)}%`}
              </p>
              <Progress value={progressValue} className="mt-3" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
