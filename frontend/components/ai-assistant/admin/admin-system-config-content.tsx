"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  Shield,
  Save,
  Edit2,
  RotateCcw,
  History,
  Eye,
  FileText,
  Sliders,
  Database,
  Sparkles,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { aiAdminApi, SystemConfigDto, SystemConfigVersionDto } from "@/lib/api/ai-admin"

const SCORING_KEYS = [
  "kb_token_budget",
  "kb_max_candidates",
  "kb_max_inject",
  "kb_tag_boost",
  "kb_focus_boost",
  "default_max_history",
  "default_temperature",
  "default_provider",
  "max_prompt_tokens",
  "data_context_budget",
  "schema_injection_budget",
]

export function AdminSystemConfigContent() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("base-rules")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [configs, setConfigs] = useState<SystemConfigDto[]>([])
  const [versions, setVersions] = useState<SystemConfigVersionDto[]>([])
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versionHistoryKey, setVersionHistoryKey] = useState("")
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  const [baseRules, setBaseRules] = useState("")
  const [baseRulesOriginal, setBaseRulesOriginal] = useState("")
  const [isEditingRules, setIsEditingRules] = useState(false)
  const [changeNote, setChangeNote] = useState("")

  const [formatDefault, setFormatDefault] = useState("")
  const [formatDefaultOriginal, setFormatDefaultOriginal] = useState("")
  const [toneDefault, setToneDefault] = useState("")
  const [toneDefaultOriginal, setToneDefaultOriginal] = useState("")

  const [scoringConfig, setScoringConfig] = useState<Record<string, string | number>>({})
  const [scoringConfigOriginal, setScoringConfigOriginal] = useState<Record<string, string | number>>({})

  const [dataContext, setDataContext] = useState("")
  const [dataContextOriginal, setDataContextOriginal] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const getConfig = useCallback((key: string) => configs.find((c) => c.configKey === key), [configs])
  const baseRulesConfig = getConfig("base_rules")
  const formatConfig = getConfig("craft_format_default")
  const toneConfig = getConfig("craft_tone_default")
  const dataContextConfig = getConfig("system_data_context")
  const dataContextBudget = Number(getConfig("data_context_budget")?.configValue || 15000)

  const dataContextTokens = dataContext.length / 4
  const tokenPercentage = Math.round((dataContextTokens / dataContextBudget) * 100)

  const loadConfigs = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await aiAdminApi.getSystemConfigs()
      setConfigs(data)

      const baseRulesVal = data.find((c) => c.configKey === "base_rules")?.configValue || ""
      setBaseRules(baseRulesVal)
      setBaseRulesOriginal(baseRulesVal)

      const formatVal = data.find((c) => c.configKey === "craft_format_default")?.configValue || ""
      setFormatDefault(formatVal)
      setFormatDefaultOriginal(formatVal)

      const toneVal = data.find((c) => c.configKey === "craft_tone_default")?.configValue || ""
      setToneDefault(toneVal)
      setToneDefaultOriginal(toneVal)

      const dataCtxVal = data.find((c) => c.configKey === "system_data_context")?.configValue || ""
      setDataContext(dataCtxVal)
      setDataContextOriginal(dataCtxVal)

      const scoringValues: Record<string, string | number> = {}
      SCORING_KEYS.forEach((key) => {
        const cfg = data.find((c) => c.configKey === key)
        if (cfg) {
          scoringValues[key] = cfg.configType === "number" ? parseFloat(cfg.configValue) : cfg.configValue
        }
      })
      setScoringConfig(scoringValues)
      setScoringConfigOriginal({ ...scoringValues })
    } catch (error) {
      console.error("Failed to load configs", error)
      toast({ title: "Error", description: "Failed to load system configs", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const loadVersions = async (key: string) => {
    setVersionHistoryKey(key)
    setIsLoadingVersions(true)
    setShowVersionHistory(true)
    try {
      const data = await aiAdminApi.getSystemConfigVersions(key)
      setVersions(data)
    } catch (error) {
      console.error("Failed to load versions", error)
      toast({ title: "Error", description: "Failed to load version history", variant: "destructive" })
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleSaveConfig = async (key: string, value: string, note?: string) => {
    try {
      setIsSaving(true)
      await aiAdminApi.updateSystemConfig(key, { configValue: value, changeNote: note })
      toast({ title: "Saved", description: `Config "${key}" saved successfully` })
      await loadConfigs()
      setIsEditingRules(false)
      setChangeNote("")
    } catch (error) {
      console.error("Failed to save config", error)
      toast({ title: "Error", description: "Failed to save config", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCraftDefaults = async () => {
    try {
      setIsSaving(true)
      if (formatDefault !== formatDefaultOriginal) {
        await aiAdminApi.updateSystemConfig("craft_format_default", {
          configValue: formatDefault,
          changeNote: "Updated format default",
        })
      }
      if (toneDefault !== toneDefaultOriginal) {
        await aiAdminApi.updateSystemConfig("craft_tone_default", {
          configValue: toneDefault,
          changeNote: "Updated tone default",
        })
      }
      toast({ title: "Saved", description: "CRAFT defaults saved successfully" })
      await loadConfigs()
    } catch (error) {
      console.error("Failed to save CRAFT defaults", error)
      toast({ title: "Error", description: "Failed to save CRAFT defaults", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveScoringConfig = async () => {
    try {
      setIsSaving(true)
      for (const key of SCORING_KEYS) {
        const currentVal = String(scoringConfig[key] ?? "")
        const originalVal = String(scoringConfigOriginal[key] ?? "")
        if (currentVal !== originalVal) {
          await aiAdminApi.updateSystemConfig(key, {
            configValue: currentVal,
            changeNote: `Updated ${key}`,
          })
        }
      }
      toast({ title: "Saved", description: "Scoring config saved successfully" })
      await loadConfigs()
    } catch (error) {
      console.error("Failed to save scoring config", error)
      toast({ title: "Error", description: "Failed to save scoring config", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRollback = async (version: number) => {
    try {
      setIsSaving(true)
      await aiAdminApi.rollbackSystemConfig(versionHistoryKey, version)
      toast({ title: "Rolled back", description: `Rolled back to version ${version}` })
      setShowVersionHistory(false)
      await loadConfigs()
    } catch (error) {
      console.error("Failed to rollback", error)
      toast({ title: "Error", description: "Failed to rollback config", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const resetScoringToOriginal = () => {
    setScoringConfig({ ...scoringConfigOriginal })
  }

  const updateScoringField = (field: string, value: string) => {
    const cfg = configs.find((c) => c.configKey === field)
    const numVal = cfg?.configType === "number" ? parseFloat(value) : value
    setScoringConfig((prev) => ({ ...prev, [field]: numVal }))
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 overflow-hidden px-4 pb-28 pt-6 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="flex items-start gap-2 text-2xl font-semibold text-foreground sm:items-center">
                <Shield className="mt-0.5 h-6 w-6 shrink-0 sm:mt-0" />
                AI System Configuration
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                Quản lý base rules, CRAFT defaults, scoring config và data context
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="mb-6 w-max min-w-full justify-start sm:min-w-0">
              <TabsTrigger value="base-rules" className="gap-1.5 px-3">
                <FileText className="h-4 w-4" />
                Base Rules
              </TabsTrigger>
              <TabsTrigger value="craft-defaults" className="gap-1.5 px-3">
                <Sparkles className="h-4 w-4" />
                CRAFT Defaults
              </TabsTrigger>
              <TabsTrigger value="scoring-config" className="gap-1.5 px-3">
                <Sliders className="h-4 w-4" />
                Scoring Config
              </TabsTrigger>
              <TabsTrigger value="data-context" className="gap-1.5 px-3">
                <Database className="h-4 w-4" />
                Data Context
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="base-rules">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base font-medium">Global Base Rules</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Version: v{baseRulesConfig?.version || 1} - Updated: {baseRulesConfig?.updatedAt ? new Date(baseRulesConfig.updatedAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                  <Button variant="outline" size="sm" className="min-w-0 flex-1 sm:flex-none" onClick={() => loadVersions("base_rules")}>
                    <History className="mr-1 h-4 w-4 shrink-0" />
                    Version History
                  </Button>
                  {isEditingRules ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-0 flex-1 sm:flex-none"
                      onClick={() => {
                        setIsEditingRules(false)
                        setBaseRules(baseRulesOriginal)
                        setChangeNote("")
                      }}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="min-w-0 flex-1 sm:flex-none" onClick={() => setIsEditingRules(true)}>
                      <Edit2 className="mr-1 h-4 w-4 shrink-0" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={baseRules}
                  onChange={(e) => setBaseRules(e.target.value)}
                  readOnly={!isEditingRules}
                  className={cn("min-h-[320px] font-mono text-sm", !isEditingRules && "cursor-default bg-muted")}
                />
                {isEditingRules && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label>Change Note</Label>
                      <Input placeholder="Describe what changed..." value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={isSaving || baseRules === baseRulesOriginal}
                      onClick={() => handleSaveConfig("base_rules", baseRules, changeNote)}
                    >
                      {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      <Save className="mr-1 h-4 w-4" />
                      Save as v{(baseRulesConfig?.version || 0) + 1}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="craft-defaults">
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-medium">Format Default</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">Định dạng output mặc định cho AI response</p>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs text-muted-foreground">
                      v{formatConfig?.version || 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea value={formatDefault} onChange={(e) => setFormatDefault(e.target.value)} className="min-h-[220px] font-mono text-sm" />
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-medium">Tone Default</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">Tone & style mặc định cho AI response</p>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs text-muted-foreground">
                      v{toneConfig?.version || 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea value={toneDefault} onChange={(e) => setToneDefault(e.target.value)} className="min-h-[160px] font-mono text-sm" />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  className="w-full sm:w-auto"
                  disabled={isSaving || (formatDefault === formatDefaultOriginal && toneDefault === toneDefaultOriginal)}
                  onClick={handleSaveCraftDefaults}
                >
                  {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  <Save className="mr-1 h-4 w-4" />
                  Save CRAFT Defaults
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scoring-config">
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-medium">Knowledge Base Scoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>kb_token_budget</Label>
                      <Input type="number" value={scoringConfig.kb_token_budget ?? ""} onChange={(e) => updateScoringField("kb_token_budget", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Max tokens cho KB injection</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_max_candidates</Label>
                      <Input type="number" value={scoringConfig.kb_max_candidates ?? ""} onChange={(e) => updateScoringField("kb_max_candidates", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Số candidates tối đa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_max_inject</Label>
                      <Input type="number" value={scoringConfig.kb_max_inject ?? ""} onChange={(e) => updateScoringField("kb_max_inject", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Số articles inject tối đa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_tag_boost</Label>
                      <Input type="number" step="0.1" value={scoringConfig.kb_tag_boost ?? ""} onChange={(e) => updateScoringField("kb_tag_boost", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Tag match boost multiplier</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_focus_boost</Label>
                      <Input type="number" step="0.1" value={scoringConfig.kb_focus_boost ?? ""} onChange={(e) => updateScoringField("kb_focus_boost", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Focus area boost multiplier</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-medium">Model & Prompt Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>default_max_history</Label>
                      <Input type="number" value={scoringConfig.default_max_history ?? ""} onChange={(e) => updateScoringField("default_max_history", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Số messages history tối đa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>default_temperature</Label>
                      <Input type="number" step="0.05" value={scoringConfig.default_temperature ?? ""} onChange={(e) => updateScoringField("default_temperature", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Model temperature (0-1)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>default_provider</Label>
                      <Select value={String(scoringConfig.default_provider ?? "claude")} onValueChange={(val) => updateScoringField("default_provider", val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="chatgpt">ChatGPT</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">AI provider mặc định</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base font-medium">Token Budgets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>max_prompt_tokens</Label>
                      <Input type="number" value={scoringConfig.max_prompt_tokens ?? ""} onChange={(e) => updateScoringField("max_prompt_tokens", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Max tokens cho toàn bộ prompt</p>
                    </div>
                    <div className="space-y-2">
                      <Label>data_context_budget</Label>
                      <Input type="number" value={scoringConfig.data_context_budget ?? ""} onChange={(e) => updateScoringField("data_context_budget", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Budget cho data context</p>
                    </div>
                    <div className="space-y-2">
                      <Label>schema_injection_budget</Label>
                      <Input type="number" value={scoringConfig.schema_injection_budget ?? ""} onChange={(e) => updateScoringField("schema_injection_budget", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Budget cho schema injection</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={resetScoringToOriginal}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset
                </Button>
                <Button className="w-full sm:w-auto" disabled={isSaving} onClick={handleSaveScoringConfig}>
                  {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  <Save className="mr-1 h-4 w-4" />
                  Save Config
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data-context">
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-medium">Data Context Content</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Version: v{dataContextConfig?.version || 1} - Updated: {dataContextConfig?.updatedAt ? new Date(dataContextConfig.updatedAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => loadVersions("system_data_context")}>
                    <History className="mr-1 h-4 w-4" />
                    Version History
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Token Usage (estimated)</span>
                    <span className={cn("font-medium", tokenPercentage >= 90 ? "text-red-600" : tokenPercentage >= 70 ? "text-amber-600" : "text-emerald-600")}>
                      ~{Math.round(dataContextTokens).toLocaleString()} / {dataContextBudget.toLocaleString()} tokens ({tokenPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", tokenPercentage >= 90 ? "bg-red-500" : tokenPercentage >= 70 ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <Textarea value={dataContext} onChange={(e) => setDataContext(e.target.value)} className="min-h-[400px] font-mono text-sm" />

                <div className="flex flex-col justify-end gap-2 sm:flex-row">
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                    <Eye className="mr-1 h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={isSaving || dataContext === dataContextOriginal}
                    onClick={() => handleSaveConfig("system_data_context", dataContext, "Updated data context")}
                  >
                    {isSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    <Save className="mr-1 h-4 w-4" />
                    Save as v{(dataContextConfig?.version || 0) + 1}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Version History - {versionHistoryKey}</DialogTitle>
          </DialogHeader>
          {isLoadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No version history yet</p>
          ) : (
            <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
              {versions.map((v, idx) => (
                <div key={v.id} className="flex flex-col gap-3 rounded-lg border bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">v{v.version}</span>
                      {idx === 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Previous</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{v.changeNote || "No note"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.createdByEmail || "System"} - {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={isSaving} onClick={() => handleRollback(v.version)}>
                    {isSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}
                    Rollback
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Data Context Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] p-4 bg-muted rounded-lg">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{dataContext}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
