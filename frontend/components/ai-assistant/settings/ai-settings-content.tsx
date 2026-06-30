"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Eye, EyeOff, Save, RefreshCw, CheckCircle, XCircle, 
  Loader2, Lock, GripVertical, AlertTriangle, Zap, ArrowUp, ArrowDown
} from "lucide-react"
import { 
  aiAssistantApi, 
  type AiProviderConfigDto, 
  type DiscoveredModelDto,
  type GlobalSettingsDto
} from "@/lib/api/ai-assistant"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-amber-500",
  openai: "bg-green-500",
  gemini: "bg-blue-500",
}

const PROVIDER_BORDER_COLORS: Record<string, string> = {
  anthropic: "border-l-amber-500",
  openai: "border-l-green-500",
  gemini: "border-l-blue-500",
}

import { getModelMeta } from "@/lib/ai-model-metadata"

function StarRating({ rating, max = 5, label }: { rating: number; max?: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground w-16">{label}</span>
      <div className="flex">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`text-xs ${i < rating ? "text-amber-400" : "text-gray-300"}`}>
            ★
          </span>
        ))}
      </div>
    </div>
  )
}

interface ProviderFormState {
  apiKey: string
  endpointUrl: string
  extraConfig: string
  defaultModel: string
  costPerInputToken: string
  costPerOutputToken: string
  isEnabled: boolean
  organizationId?: string
  projectId?: string
}

interface SortableItemProps {
  id: string
  idx: number
  provider: AiProviderConfigDto | undefined
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

function SortableItem({ id, idx, provider, onMoveUp, onMoveDown, isFirst, isLast }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!provider) return null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-muted/50 p-3 sm:gap-3"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="w-6 text-center font-medium">{idx + 1}.</span>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${PROVIDER_COLORS[id] || "bg-gray-500"}`} />
            <span className="min-w-0 break-words font-medium leading-6 sm:truncate">{provider.displayName}</span>
          </div>
          {!provider.isConnected && (
            <Badge variant="secondary" className="w-fit shrink-0 text-xs">not connected</Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onMoveUp}
          disabled={isFirst}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onMoveDown}
          disabled={isLast}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function AiSettingsContent() {
  const { toast } = useToast()
  const [providers, setProviders] = useState<AiProviderConfigDto[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [forms, setForms] = useState<Record<string, ProviderFormState>>({})
  const [globalSettings, setGlobalSettings] = useState<GlobalSettingsDto>({
    defaultTemperature: 0.1,
    defaultMaxTokens: 4096,
    requestTimeoutSeconds: 60
  })
  const [fallbackOrder, setFallbackOrder] = useState<string[]>([])
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [savingFallback, setSavingFallback] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [providersData, settingsData] = await Promise.all([
        aiAssistantApi.getProviderConfigs(),
        aiAssistantApi.getGlobalSettings().catch(() => ({
          defaultTemperature: 0.1,
          defaultMaxTokens: 4096,
          requestTimeoutSeconds: 60
        }))
      ])
      
      setProviders(providersData)
      setGlobalSettings(settingsData)
      setFallbackOrder(providersData.sort((a, b) => a.priority - b.priority).map(p => p.providerKey))
      
      const initialForms: Record<string, ProviderFormState> = {}
      for (const p of providersData) {
        const extraConfig = p.extraConfig ? JSON.parse(p.extraConfig || '{}') : {}
        initialForms[p.providerKey] = {
          apiKey: "",
          endpointUrl: p.endpointUrl || "",
          extraConfig: p.extraConfig || "",
          defaultModel: p.defaultModel || "",
          costPerInputToken: (p.costPerInputToken * 1000000).toFixed(2),
          costPerOutputToken: (p.costPerOutputToken * 1000000).toFixed(2),
          isEnabled: p.isEnabled,
          organizationId: extraConfig.organization_id || "",
          projectId: extraConfig.project_id || ""
        }
      }
      setForms(initialForms)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải cấu hình AI providers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTestAndFetch = async (providerKey: string) => {
    const form = forms[providerKey]
    if (!form?.apiKey) {
      toast({
        title: "Thiếu API Key",
        description: "Vui lòng nhập API Key trước khi test",
        variant: "destructive",
      })
      return
    }

    try {
      setTesting(providerKey)
      
      let extraConfig: string | undefined
      if (providerKey === "openai" && (form.organizationId || form.projectId)) {
        extraConfig = JSON.stringify({
          organization_id: form.organizationId || undefined,
          project_id: form.projectId || undefined
        })
      }

      const result = await aiAssistantApi.testProvider({
        providerKey,
        apiKey: form.apiKey,
        extraConfig
      })

      if (result.isSuccess) {
        toast({
          title: "Kết nối thành công",
          description: `Đã tìm thấy ${result.models.length} models`,
        })
        fetchData()
      } else {
        throw new Error(result.errorMessage || "Test failed")
      }
    } catch (error) {
      console.error("Test failed:", error)
      toast({
        title: "Kết nối thất bại",
        description: error instanceof Error ? error.message : "Vui lòng kiểm tra lại API Key",
        variant: "destructive",
      })
    } finally {
      setTesting(null)
    }
  }

  const handleSaveProvider = async (providerKey: string) => {
    const form = forms[providerKey]
    if (!form) return

    try {
      setSaving(providerKey)
      
      let extraConfig: string | undefined
      if (providerKey === "openai" && (form.organizationId || form.projectId)) {
        extraConfig = JSON.stringify({
          organization_id: form.organizationId || undefined,
          project_id: form.projectId || undefined
        })
      }

      await aiAssistantApi.saveProviderConfig(providerKey, {
        apiKey: form.apiKey || undefined,
        endpointUrl: form.endpointUrl || undefined,
        extraConfig: extraConfig,
        defaultModel: form.defaultModel || undefined,
        costPerInputToken: parseFloat(form.costPerInputToken) / 1000000,
        costPerOutputToken: parseFloat(form.costPerOutputToken) / 1000000,
        isEnabled: form.isEnabled
      })

      toast({
        title: "Đã lưu",
        description: "Cấu hình provider đã được cập nhật",
      })

      setForms(prev => ({
        ...prev,
        [providerKey]: { ...prev[providerKey], apiKey: "" }
      }))
    } catch (error) {
      console.error("Save failed:", error)
      toast({
        title: "Lỗi",
        description: "Không thể lưu cấu hình",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  const handleSaveGlobalSettings = async () => {
    try {
      setSavingGlobal(true)
      await aiAssistantApi.updateGlobalSettings(globalSettings)
      toast({
        title: "Đã lưu",
        description: "Global settings đã được cập nhật",
      })
    } catch (error) {
      console.error("Save global failed:", error)
      toast({
        title: "Lỗi",
        description: "Không thể lưu global settings",
        variant: "destructive",
      })
    } finally {
      setSavingGlobal(false)
    }
  }

  const updateForm = (providerKey: string, field: keyof ProviderFormState, value: string | boolean) => {
    setForms(prev => ({
      ...prev,
      [providerKey]: { ...prev[providerKey], [field]: value }
    }))
  }

  const saveFallbackOrder = async (newOrder: string[]) => {
    try {
      setSavingFallback(true)
      await aiAssistantApi.updateFallbackOrder({ providerKeys: newOrder })
      toast({
        title: "Đã lưu",
        description: "Thứ tự ưu tiên đã được cập nhật",
      })
    } catch (error) {
      console.error("Save fallback order failed:", error)
      toast({
        title: "Lỗi",
        description: "Không thể lưu thứ tự ưu tiên",
        variant: "destructive",
      })
    } finally {
      setSavingFallback(false)
    }
  }

  const moveFallback = async (providerKey: string, direction: "up" | "down") => {
    const idx = fallbackOrder.indexOf(providerKey)
    if (idx === -1) return
    
    const newOrder = [...fallbackOrder]
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= newOrder.length) return
    
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]]
    setFallbackOrder(newOrder)
    await saveFallbackOrder(newOrder)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fallbackOrder.indexOf(active.id as string)
      const newIndex = fallbackOrder.indexOf(over.id as string)
      const newOrder = arrayMove(fallbackOrder, oldIndex, newIndex)
      setFallbackOrder(newOrder)
      await saveFallbackOrder(newOrder)
    }
  }

  const getProvider = (key: string) => providers.find(p => p.providerKey === key)

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    
    if (diffMin < 1) return "vừa xong"
    if (diffMin < 60) return `${diffMin} phút trước`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} giờ trước`
    return `${Math.floor(diffHour / 24)} ngày trước`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6 max-w-4xl">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Providers</h1>
        <p className="text-muted-foreground">
          Cấu hình AI providers cho SQL Assistant, Daily Briefing và các tính năng AI khác.
        </p>
      </div>

      {providers.sort((a, b) => a.priority - b.priority).map(provider => {
        const form = forms[provider.providerKey]
        if (!form) return null
        
        return (
          <Card key={provider.providerKey} className={`border-l-4 ${PROVIDER_BORDER_COLORS[provider.providerKey] || "border-l-gray-500"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${PROVIDER_COLORS[provider.providerKey] || "bg-gray-500"}`} />
                  <CardTitle className="text-lg">{provider.displayName}</CardTitle>
                  {provider.isConnected ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> Connected
                    </Badge>
                  ) : provider.hasApiKey ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Not Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="w-3 h-3 mr-1" /> Not Connected
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(checked) => updateForm(provider.providerKey, "isEnabled", checked)}
                />
              </div>
              <CardDescription>
                {provider.isConnected && provider.availableModels.length > 0 && (
                  <span className="text-green-600">
                    {provider.availableModels.length} models — {formatTimeAgo(provider.lastTestAt)}
                  </span>
                )}
                {provider.lastTestError && (
                  <span className="text-red-600 text-sm">{provider.lastTestError}</span>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`apiKey-${provider.providerKey}`}>
                    <Lock className="w-3 h-3 inline mr-1" />
                    API Key
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`apiKey-${provider.providerKey}`}
                        type={showApiKey[provider.providerKey] ? "text" : "password"}
                        placeholder={provider.apiKeyHint || "Nhập API key..."}
                        value={form.apiKey}
                        onChange={(e) => updateForm(provider.providerKey, "apiKey", e.target.value)}
                        className="pr-10 font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowApiKey(prev => ({ ...prev, [provider.providerKey]: !prev[provider.providerKey] }))}
                      >
                        {showApiKey[provider.providerKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleTestAndFetch(provider.providerKey)}
                      disabled={testing === provider.providerKey || !form.apiKey}
                    >
                      {testing === provider.providerKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-1" />
                          Test & Fetch
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {provider.providerKey === "openai" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`orgId-${provider.providerKey}`}>Organization ID (optional)</Label>
                    <Input
                      id={`orgId-${provider.providerKey}`}
                      placeholder="org-xxx"
                      value={form.organizationId || ""}
                      onChange={(e) => updateForm(provider.providerKey, "organizationId", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`projId-${provider.providerKey}`}>Project ID (optional)</Label>
                    <Input
                      id={`projId-${provider.providerKey}`}
                      placeholder="proj-xxx"
                      value={form.projectId || ""}
                      onChange={(e) => updateForm(provider.providerKey, "projectId", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {provider.isConnected && provider.availableModels.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`model-${provider.providerKey}`}>Default Model</Label>
                    <Select
                      value={form.defaultModel}
                      onValueChange={(value) => updateForm(provider.providerKey, "defaultModel", value)}
                    >
                      <SelectTrigger id={`model-${provider.providerKey}`}>
                        <SelectValue placeholder="Chọn model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {provider.availableModels.map((model: DiscoveredModelDto) => {
                          const meta = getModelMeta(model.modelId)
                          return (
                            <SelectItem key={model.modelId} value={model.modelId}>
                              <div className="flex items-center gap-2">
                                <span>{model.displayName}</span>
                                {meta?.badge && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${meta.badgeColor}`}>
                                    {meta.badge}
                                  </span>
                                )}
                                {!meta?.badge && model.isRecommended && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Recommended</Badge>
                                )}
                                {model.contextWindow && (
                                  <span className="text-xs text-muted-foreground">
                                    {(model.contextWindow / 1000).toFixed(0)}K
                                  </span>
                                )}
                                {meta?.inputPer1M && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ${meta.inputPer1M}/1M
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Model</th>
                          <th className="text-center p-2 font-medium w-24">Context</th>
                          <th className="text-center p-2 font-medium w-20">Price</th>
                          <th className="text-center p-2 font-medium w-28">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provider.availableModels.slice(0, 8).map((model: DiscoveredModelDto) => {
                          const meta = getModelMeta(model.modelId)
                          return (
                            <tr 
                              key={model.modelId} 
                              className={`border-t cursor-pointer transition-colors hover:bg-muted/50 ${
                                form.defaultModel === model.modelId ? "bg-blue-50 dark:bg-blue-950/30" : ""
                              }`}
                              onClick={() => updateForm(provider.providerKey, "defaultModel", model.modelId)}
                            >
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="radio" 
                                    name={`model-radio-${provider.providerKey}`}
                                    checked={form.defaultModel === model.modelId}
                                    onChange={() => updateForm(provider.providerKey, "defaultModel", model.modelId)}
                                    className="w-4 h-4 accent-blue-600"
                                  />
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium">{model.displayName}</span>
                                      {meta?.badge && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${meta.badgeColor}`}>
                                          {meta.badge}
                                        </span>
                                      )}
                                      {!meta?.badge && model.isRecommended && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Recommended</Badge>
                                      )}
                                    </div>
                                    {meta && (
                                      <span className="text-[11px] text-muted-foreground">{meta.description}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 text-center text-muted-foreground text-xs">
                                {model.contextWindow ? `${(model.contextWindow / 1000).toFixed(0)}K` : "—"}
                              </td>
                              <td className="p-2 text-center text-xs">
                                {meta?.inputPer1M ? (
                                  <span className="text-muted-foreground">${meta.inputPer1M}/{meta.outputPer1M}</span>
                                ) : "—"}
                              </td>
                              <td className="p-2">
                                {meta ? (
                                  <div className="flex flex-col">
                                    <StarRating rating={meta.accuracy} label="Accuracy" />
                                    <StarRating rating={meta.speed} label="Speed" />
                                  </div>
                                ) : (
                                  <span className="text-center block text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {provider.availableModels.length > 8 && (
                      <div className="text-center py-2 text-xs text-muted-foreground border-t">
                        +{provider.availableModels.length - 8} more models available
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pricing (USD per 1M tokens)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Input</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.costPerInputToken}
                        onChange={(e) => updateForm(provider.providerKey, "costPerInputToken", e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Output</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.costPerOutputToken}
                        onChange={(e) => updateForm(provider.providerKey, "costPerOutputToken", e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`endpoint-${provider.providerKey}`}>Endpoint URL</Label>
                  <Input
                    id={`endpoint-${provider.providerKey}`}
                    placeholder={provider.endpointUrl || "Default endpoint"}
                    value={form.endpointUrl}
                    onChange={(e) => updateForm(provider.providerKey, "endpointUrl", e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              {!form.isEnabled && (
                <Button variant="outline" size="sm" onClick={() => updateForm(provider.providerKey, "isEnabled", false)}>
                  Disable Provider
                </Button>
              )}
              <Button
                onClick={() => handleSaveProvider(provider.providerKey)}
                disabled={saving === provider.providerKey}
              >
                {saving === provider.providerKey ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </CardFooter>
          </Card>
        )
      })}

      <Separator className="my-8" />

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Fallback Order</CardTitle>
              <CardDescription>
                Kéo để sắp xếp thứ tự ưu tiên khi một provider gặp lỗi
              </CardDescription>
            </div>
            {savingFallback && (
              <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang lưu...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fallbackOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {fallbackOrder.map((key, idx) => (
                  <SortableItem
                    key={key}
                    id={key}
                    idx={idx}
                    provider={getProvider(key)}
                    onMoveUp={() => moveFallback(key, "up")}
                    onMoveDown={() => moveFallback(key, "down")}
                    isFirst={idx === 0}
                    isLast={idx === fallbackOrder.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            Cấu hình chung cho tất cả AI providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="globalTemp">Default Temperature</Label>
              <Select
                value={globalSettings.defaultTemperature.toString()}
                onValueChange={(v) => setGlobalSettings(prev => ({ ...prev, defaultTemperature: parseFloat(v) }))}
              >
                <SelectTrigger id="globalTemp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(t => (
                    <SelectItem key={t} value={t.toString()}>{t.toFixed(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="globalMaxTokens">Max Tokens</Label>
              <Select
                value={globalSettings.defaultMaxTokens.toString()}
                onValueChange={(v) => setGlobalSettings(prev => ({ ...prev, defaultMaxTokens: parseInt(v) }))}
              >
                <SelectTrigger id="globalMaxTokens">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1024, 2048, 4096, 8192, 16384, 32768].map(t => (
                    <SelectItem key={t} value={t.toString()}>{t.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="globalTimeout">Request Timeout (sec)</Label>
              <Input
                id="globalTimeout"
                type="number"
                min={10}
                max={300}
                value={globalSettings.requestTimeoutSeconds}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, requestTimeoutSeconds: parseInt(e.target.value) || 60 }))}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button onClick={handleSaveGlobalSettings} disabled={savingGlobal}>
            {savingGlobal ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save All</>
            )}
          </Button>
        </CardFooter>
      </Card>
      </div>
    </DashboardLayout>
  )
}
