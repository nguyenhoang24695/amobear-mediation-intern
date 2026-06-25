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
                <Shield className="h-6 w-6" />
                AI System Configuration
              </h1>
              <p className="text-sm">
                Quản lý base rules, CRAFT defaults, scoring config và data context
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="base-rules" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Base Rules
            </TabsTrigger>
            <TabsTrigger value="craft-defaults" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              CRAFT Defaults
            </TabsTrigger>
            <TabsTrigger value="scoring-config" className="gap-1.5">
              <Sliders className="h-4 w-4" />
              Scoring Config
            </TabsTrigger>
            <TabsTrigger value="data-context" className="gap-1.5">
              <Database className="h-4 w-4" />
              Data Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base-rules">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Global Base Rules</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Version: v{baseRulesConfig?.version || 1} • Updated: {baseRulesConfig?.updatedAt ? new Date(baseRulesConfig.updatedAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadVersions("base_rules")}>
                    <History className="h-4 w-4 mr-1" />
                    Version History
                  </Button>
                  {isEditingRules ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingRules(false)
                        setBaseRules(baseRulesOriginal)
                        setChangeNote("")
                      }}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingRules(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
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
                  className={cn("min-h-[320px] font-mono text-sm", !isEditingRules && "bg-slate-50 cursor-default")}
                />
                {isEditingRules && (
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Change Note</Label>
                      <Input placeholder="Describe what changed..." value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
                    </div>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSaving || baseRules === baseRulesOriginal}
                      onClick={() => handleSaveConfig("base_rules", baseRules, changeNote)}
                    >
                      {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      <Save className="h-4 w-4 mr-1" />
                      Save as v{(baseRulesConfig?.version || 0) + 1}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="craft-defaults">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-medium">Format Default</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">Định dạng output mặc định cho AI response</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-slate-500">
                      v{formatConfig?.version || 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea value={formatDefault} onChange={(e) => setFormatDefault(e.target.value)} className="min-h-[220px] font-mono text-sm" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-medium">Tone Default</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">Tone & style mặc định cho AI response</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-slate-500">
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
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSaving || (formatDefault === formatDefaultOriginal && toneDefault === toneDefaultOriginal)}
                  onClick={handleSaveCraftDefaults}
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Save className="h-4 w-4 mr-1" />
                  Save CRAFT Defaults
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scoring-config">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Knowledge Base Scoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>kb_token_budget</Label>
                      <Input type="number" value={scoringConfig.kb_token_budget ?? ""} onChange={(e) => updateScoringField("kb_token_budget", e.target.value)} />
                      <p className="text-xs text-slate-500">Max tokens cho KB injection</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_max_candidates</Label>
                      <Input type="number" value={scoringConfig.kb_max_candidates ?? ""} onChange={(e) => updateScoringField("kb_max_candidates", e.target.value)} />
                      <p className="text-xs text-slate-500">Số candidates tối đa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_max_inject</Label>
                      <Input type="number" value={scoringConfig.kb_max_inject ?? ""} onChange={(e) => updateScoringField("kb_max_inject", e.target.value)} />
                      <p className="text-xs text-slate-500">Số articles inject tối đa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_tag_boost</Label>
                      <Input type="number" step="0.1" value={scoringConfig.kb_tag_boost ?? ""} onChange={(e) => updateScoringField("kb_tag_boost", e.target.value)} />
                      <p className="text-xs text-slate-500">Tag match boost multiplier</p>
                    </div>
                    <div className="space-y-2">
                      <Label>kb_focus_boost</Label>
                      <Input type="number" step="0.1" value={scoringConfig.kb_focus_boost ?? ""} onChange={(e) => updateScoringField("kb_focus_boost", e.target.value)} />
                      <p className="text-xs text-slate-500">Focus area boost multiplier</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Model & Prompt Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>default_max_history</Label>
                      <Input type="number" value={scoringConfig.default_max_history ?? ""} onChange={(e) => updateScoringField("default_max_history", e.target.value)} />
                      <p className="text-xs text-slate-500">Số messages history tối đa</p>
                    </div>
                    <div className="space-y-2">
                      <Label>default_temperature</Label>
                      <Input type="number" step="0.05" value={scoringConfig.default_temperature ?? ""} onChange={(e) => updateScoringField("default_temperature", e.target.value)} />
                      <p className="text-xs text-slate-500">Model temperature (0-1)</p>
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
                      <p className="text-xs text-slate-500">AI provider mặc định</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Token Budgets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>max_prompt_tokens</Label>
                      <Input type="number" value={scoringConfig.max_prompt_tokens ?? ""} onChange={(e) => updateScoringField("max_prompt_tokens", e.target.value)} />
                      <p className="text-xs text-slate-500">Max tokens cho toàn bộ prompt</p>
                    </div>
                    <div className="space-y-2">
                      <Label>data_context_budget</Label>
                      <Input type="number" value={scoringConfig.data_context_budget ?? ""} onChange={(e) => updateScoringField("data_context_budget", e.target.value)} />
                      <p className="text-xs text-slate-500">Budget cho data context</p>
                    </div>
                    <div className="space-y-2">
                      <Label>schema_injection_budget</Label>
                      <Input type="number" value={scoringConfig.schema_injection_budget ?? ""} onChange={(e) => updateScoringField("schema_injection_budget", e.target.value)} />
                      <p className="text-xs text-slate-500">Budget cho schema injection</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetScoringToOriginal}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={isSaving} onClick={handleSaveScoringConfig}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Save className="h-4 w-4 mr-1" />
                  Save Config
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data-context">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Data Context Content</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Version: v{dataContextConfig?.version || 1} • Updated: {dataContextConfig?.updatedAt ? new Date(dataContextConfig.updatedAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => loadVersions("system_data_context")}>
                    <History className="h-4 w-4 mr-1" />
                    Version History
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Token Usage (estimated)</span>
                    <span className={cn("font-medium", tokenPercentage >= 90 ? "text-red-600" : tokenPercentage >= 70 ? "text-amber-600" : "text-emerald-600")}>
                      ~{Math.round(dataContextTokens).toLocaleString()} / {dataContextBudget.toLocaleString()} tokens ({tokenPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", tokenPercentage >= 90 ? "bg-red-500" : tokenPercentage >= 70 ? "bg-amber-500" : "bg-emerald-500")}
                      style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <Textarea value={dataContext} onChange={(e) => setDataContext(e.target.value)} className="min-h-[400px] font-mono text-sm" />

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSaving || dataContext === dataContextOriginal}
                    onClick={() => handleSaveConfig("system_data_context", dataContext, "Updated data context")}
                  >
                    {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    <Save className="h-4 w-4 mr-1" />
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
            <DialogTitle>Version History — {versionHistoryKey}</DialogTitle>
          </DialogHeader>
          {isLoadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No version history yet</p>
          ) : (
            <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
              {versions.map((v, idx) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">v{v.version}</span>
                      {idx === 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Previous</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{v.changeNote || "No note"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {v.createdByEmail || "System"} • {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled={isSaving} onClick={() => handleRollback(v.version)}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
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
          <div className="overflow-y-auto max-h-[60vh] p-4 bg-slate-50 rounded-lg">
            <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">{dataContext}</pre>
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
