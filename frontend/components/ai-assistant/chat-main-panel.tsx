"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronRight,
  Send,
  Paperclip,
  ListFilter,
  Star,
  Zap,
  Check,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react"
import type { AiContext, AiMessage } from "./ai-assistant-content"
import { AiMessageBubble } from "./ai-message-bubble"
import { UserMessageBubble } from "./user-message-bubble"
import {
  aiAssistantApi,
  type AiProviderConfigDto,
  type DiscoveredModelDto,
  type ImageAttachmentRequest,
  type AttachedTableDataRequest,
} from "@/lib/api/ai-assistant"
import { getModelMeta } from "@/lib/ai-model-metadata"
import { useToast } from "@/hooks/use-toast"

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-amber-500",
  openai: "bg-emerald-500",
  gemini: "bg-blue-500",
}

const PROVIDER_SHORT_NAMES: Record<string, string> = {
  anthropic: "Claude",
  openai: "ChatGPT",
  gemini: "Gemini",
}

interface ChatMainPanelProps {
  context: AiContext
  messages: AiMessage[]
  selectedProvider: "claude" | "gemini" | "chatgpt"
  selectedModelId: string
  onProviderChange: (provider: "claude" | "gemini" | "chatgpt") => void
  onModelSelect: (providerKey: string, modelId: string) => void
  autoExplain: boolean
  onAutoExplainChange: (checked: boolean) => void
  onSendMessage: (content: string, options?: { images?: ImageAttachmentRequest[]; attachedTableData?: AttachedTableDataRequest }) => void
  sidebarOpen: boolean
  pendingAttachedTable?: AttachedTableDataRequest | null
  pendingPrefillQuestion?: string | null
  onAskAboutTable?: (result: { columns: string[]; rows: Record<string, unknown>[] }) => void
  sending?: boolean
}

const REVERSE_PROVIDER_KEY_MAP: Record<string, string> = {
  claude: "anthropic",
  chatgpt: "openai",
  gemini: "gemini",
}

function providerHasModel(provider: AiProviderConfigDto | undefined, modelId?: string | null) {
  if (!provider || !modelId) return false
  return provider.availableModels.some((model) => model.modelId === modelId)
}

function getFallbackModelId(provider: AiProviderConfigDto | undefined) {
  if (!provider || provider.availableModels.length === 0) return ""
  if (providerHasModel(provider, provider.defaultModel)) return provider.defaultModel ?? ""
  return provider.availableModels.find((model) => model.isRecommended)?.modelId ?? provider.availableModels[0]?.modelId ?? ""
}

function resolveEffectiveModelId(provider: AiProviderConfigDto | undefined, selectedModelId: string) {
  if (!provider) return selectedModelId
  if (providerHasModel(provider, selectedModelId)) return selectedModelId
  return getFallbackModelId(provider)
}

function StarRow({ count, filled, color }: { count: number; filled: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3 w-3", i < filled ? color : "text-slate-200 fill-slate-200")}
        />
      ))}
    </div>
  )
}

function ModelSelectorDropdown({
  providerConfigs,
  selectedProviderKey,
  selectedModelId,
  onSelect,
}: {
  providerConfigs: AiProviderConfigDto[]
  selectedProviderKey: string
  selectedModelId: string
  onSelect: (providerKey: string, modelId: string) => void
}) {
  const [hoveredProvider, setHoveredProvider] = useState<string>(selectedProviderKey)
  const hoveredProviderData = providerConfigs.find((p) => p.providerKey === hoveredProvider)

  const connectedProviders = providerConfigs.filter((p) => p.isConnected && p.availableModels.length > 0)

  if (connectedProviders.length === 0) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Chưa có provider nào được kết nối.</p>
        <p className="text-xs text-slate-400 mt-1">Vào Settings để cấu hình API Key</p>
      </div>
    )
  }

  const getSortedModels = (provider: AiProviderConfigDto, defaultModelId: string): DiscoveredModelDto[] => {
    const models = [...provider.availableModels]
    const withMeta = models.map(m => ({ model: m, meta: getModelMeta(m.modelId) }))
    withMeta.sort((a, b) => {
      // Default model lên đầu
      if (a.model.modelId === defaultModelId) return -1
      if (b.model.modelId === defaultModelId) return 1
      // Có metadata lên trước
      if (a.meta && !b.meta) return -1
      if (!a.meta && b.meta) return 1
      // Sort theo score (accuracy + speed)
      if (a.meta && b.meta) {
        const scoreA = a.meta.accuracy + a.meta.speed
        const scoreB = b.meta.accuracy + b.meta.speed
        if (scoreA !== scoreB) return scoreB - scoreA
      }
      if (a.model.isRecommended && !b.model.isRecommended) return -1
      if (!a.model.isRecommended && b.model.isRecommended) return 1
      return 0
    })
    return withMeta.map(x => x.model)
  }

  return (
    <div className="flex" style={{ minWidth: 520 }}>
      {/* Left: Provider list */}
      <div className="w-52 border-r border-slate-100 py-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Provider
        </div>
        {connectedProviders.map((provider) => {
          const isSelected = selectedProviderKey === provider.providerKey
          return (
            <div
              key={provider.providerKey}
              onMouseEnter={() => setHoveredProvider(provider.providerKey)}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors",
                hoveredProvider === provider.providerKey
                  ? "bg-slate-50"
                  : "hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", PROVIDER_COLORS[provider.providerKey] || "bg-gray-500")} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-blue-600" : "text-slate-800"
                    )}>
                      {PROVIDER_SHORT_NAMES[provider.providerKey] || provider.displayName}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{provider.displayName.split(" ").pop()}</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            </div>
          )
        })}
        <div className="border-t border-slate-100 mt-1 pt-1 px-1">
          <a
            href="/ai-assistant/settings"
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Manage providers
          </a>
        </div>
      </div>

      {/* Right: Sub-models for hovered provider */}
      {hoveredProviderData && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
            {PROVIDER_SHORT_NAMES[hoveredProviderData.providerKey] || hoveredProviderData.displayName} Models
            <span className="ml-1 font-normal normal-case">({hoveredProviderData.availableModels.length})</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {getSortedModels(hoveredProviderData, hoveredProviderData.defaultModel ?? "").map((model) => {
              const isSelected = selectedModelId === model.modelId && selectedProviderKey === hoveredProviderData.providerKey
              const isDefault = model.modelId === hoveredProviderData.defaultModel
              const meta = getModelMeta(model.modelId)
              return (
                <div
                  key={model.modelId}
                  onClick={() => onSelect(hoveredProviderData.providerKey, model.modelId)}
                  className={cn(
                    "px-3 py-2.5 cursor-pointer transition-colors mx-1 rounded-md",
                    isSelected
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-blue-700" : "text-slate-800"
                        )}>
                          {model.displayName}
                        </span>
                        {meta?.badge && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium", meta.badgeColor)}>
                            {meta.badge}
                          </span>
                        )}
                        {!meta?.badge && model.isRecommended && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                            Recommended
                          </span>
                        )}
                        {isDefault && !isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-400">
                            Default
                          </span>
                        )}
                      </div>
                      {(meta?.description || model.contextWindow) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {meta?.description ?? `${(model.contextWindow! / 1000).toFixed(0)}K context`}
                        </p>
                      )}
                      {meta && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            <StarRow count={5} filled={meta.accuracy} color="fill-amber-400 text-amber-400" />
                            <span className="text-xs text-slate-400 ml-1">Accuracy</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <StarRow count={5} filled={meta.speed} color="fill-blue-400 text-blue-400" />
                            <span className="text-xs text-slate-400 ml-1">Speed</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {meta?.inputPer1M ? (
                        <span className="text-xs text-slate-500 whitespace-nowrap">${meta.inputPer1M}/1M</span>
                      ) : model.contextWindow ? (
                        <span className="text-xs text-slate-400">{(model.contextWindow / 1000).toFixed(0)}K</span>
                      ) : null}
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 mt-1 ml-auto" />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChatMainPanel({
  context: _context,
  messages,
  selectedProvider,
  onProviderChange: _onProviderChange,
  autoExplain,
  onAutoExplainChange,
  onSendMessage,
  sidebarOpen,
  selectedModelId,
  onModelSelect,
  pendingAttachedTable = null,
  pendingPrefillQuestion = null,
  onAskAboutTable,
  sending = false,
}: ChatMainPanelProps) {
  const { toast } = useToast()
  const [inputValue, setInputValue] = useState("")
  const [pastedImages, setPastedImages] = useState<ImageAttachmentRequest[]>([])
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [providerConfigs, setProviderConfigs] = useState<AiProviderConfigDto[]>([])
  const [sendingStepIndex, setSendingStepIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pendingPrefillQuestion) setInputValue((prev) => prev || pendingPrefillQuestion)
  }, [pendingPrefillQuestion])

  const sendingSteps = [
    "Bước 1: Đang kiểm tra quota...",
    "Bước 2: Đang chuẩn bị context & hội thoại...",
    "Bước 3: Đang tải lịch sử chat...",
    "Bước 4: Đang xây dựng prompt...",
    `Bước 5: Đang gọi ${PROVIDER_SHORT_NAMES[REVERSE_PROVIDER_KEY_MAP[selectedProvider] ?? "anthropic"] ?? selectedProvider}...`,
    "Bước 6: Đang nhận và xử lý phản hồi...",
  ]
  useEffect(() => {
    if (!sending) {
      setSendingStepIndex(0)
      return
    }
    setSendingStepIndex(0)
    const t = setInterval(() => {
      setSendingStepIndex((i) => Math.min(i + 1, sendingSteps.length - 1))
    }, 1800)
    return () => clearInterval(t)
  }, [sending])

  const selectedProviderKey = REVERSE_PROVIDER_KEY_MAP[selectedProvider] || "anthropic"

  const fetchProviders = useCallback(async () => {
    try {
      const configs = await aiAssistantApi.getChatProviderConfigs()
      setProviderConfigs(configs)
    } catch {
      // API not available, will show empty state
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const currentProviderConfig = providerConfigs.find(p => p.providerKey === selectedProviderKey)
  const providerHasUsableModels = currentProviderConfig ? currentProviderConfig.availableModels.length > 0 : true
  // Khi context chưa có preferredModel thì dùng model mặc định của provider (chỉ hiển thị, không persist)
  const effectiveModelId = resolveEffectiveModelId(currentProviderConfig, selectedModelId)
  const currentModelData = currentProviderConfig?.availableModels.find(m => m.modelId === effectiveModelId)

  const handleModelSelect = (providerKey: string, modelId: string) => {
    onModelSelect(providerKey, modelId)
    setModelDropdownOpen(false)
  }

  useEffect(() => {
    if (!currentProviderConfig || !selectedModelId) return
    if (providerHasModel(currentProviderConfig, selectedModelId)) return

    const fallbackModelId = getFallbackModelId(currentProviderConfig)
    if (!fallbackModelId || fallbackModelId === selectedModelId) return

    onModelSelect(currentProviderConfig.providerKey, fallbackModelId)
    const fallbackModel = currentProviderConfig.availableModels.find((model) => model.modelId === fallbackModelId)
    toast({
      title: "AI model updated",
      description: `Model "${selectedModelId}" is no longer available. Switched to "${fallbackModel?.displayName ?? fallbackModelId}".`,
    })
  }, [currentProviderConfig, onModelSelect, selectedModelId, toast])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (currentProviderConfig && !providerHasUsableModels) return

    const text = inputValue.trim() || (pastedImages.length ? "Phân tích ảnh đính kèm." : "")
    if (!text) return
    onSendMessage(text, {
      images: pastedImages.length ? pastedImages : undefined,
      attachedTableData: pendingAttachedTable ?? undefined,
    })
    setInputValue("")
    setPastedImages([])
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const [header, base64] = dataUrl.split(",", 2)
          const m = header?.match(/data:([^;]+)/)
          const mediaType = m?.[1]?.trim() || file.type || "image/png"
          setPastedImages((prev) => {
            if (prev.length >= 4) return prev
            return [...prev, { base64Data: base64 ?? "", mediaType }]
          })
        }
        reader.readAsDataURL(file)
        return
      }
    }
  }, [])

  const removePastedImage = (index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const displayProviderName = PROVIDER_SHORT_NAMES[selectedProviderKey] || currentProviderConfig?.displayName || selectedProvider
  const displayModelName = currentModelData?.displayName || effectiveModelId || "Select model"

  return (
    <div className={cn("flex-1 flex flex-col bg-slate-50 transition-all overflow-hidden")}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) =>
            message.role === "user" ? (
              <UserMessageBubble key={message.id} message={message} />
            ) : (
              <AiMessageBubble key={message.id} message={message} onAskAboutTable={onAskAboutTable} />
            )
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Sending status — từng bước giống log backend */}
      {sending && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-t border-blue-100 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
          <span className="truncate">{sendingSteps[sendingStepIndex]}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          {/* Pasted images preview */}
          {pastedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pastedImages.map((img, i) => (
                <div key={i} className="relative inline-block rounded border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={`data:${img.mediaType};base64,${img.base64Data}`} alt="" className="h-14 w-14 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePastedImage(i)}
                    className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                    aria-label="Xóa ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {currentProviderConfig && !providerHasUsableModels && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>This provider currently has no usable models. Open AI Settings to refresh models or choose a new default model.</span>
            </div>
          )}
          {/* Text Input */}
          <div className="relative border border-slate-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={currentProviderConfig ? !providerHasUsableModels : false}
              placeholder="Ask anything about your data... (có thể dán ảnh trực tiếp)"
              className="min-h-[80px] max-h-[200px] border-0 focus-visible:ring-0 resize-none pr-12"
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 bg-blue-600 hover:bg-blue-700"
              onClick={handleSend}
              disabled={(!inputValue.trim() && pastedImages.length === 0) || (currentProviderConfig ? !providerHasUsableModels : false)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-slate-600">
                <Paperclip className="h-4 w-4 mr-1" />
                SQL
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-slate-600">
                    <ListFilter className="h-4 w-4 mr-1" />
                    Templates
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Top performers by metric</DropdownMenuItem>
                  <DropdownMenuItem>Retention cohort analysis</DropdownMenuItem>
                  <DropdownMenuItem>Revenue breakdown</DropdownMenuItem>
                  <DropdownMenuItem>Level funnel analysis</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="h-4 w-px bg-slate-200 mx-1" />
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoExplain"
                  checked={autoExplain}
                  onCheckedChange={(checked) => onAutoExplainChange(checked === true)}
                />
                <label
                  htmlFor="autoExplain"
                  className="text-sm text-slate-600 cursor-pointer"
                >
                  Auto-explain
                </label>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              {/* Model Selector */}
              <DropdownMenu open={modelDropdownOpen} onOpenChange={setModelDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-600 px-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", PROVIDER_COLORS[selectedProviderKey] || "bg-gray-500")} />
                    <span className="font-medium text-sm">{displayProviderName}</span>
                    <span className="text-slate-400 text-xs hidden sm:inline">
                      {displayModelName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-0" style={{ minWidth: 520 }}>
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Select AI Model</span>
                  </div>
                  <ModelSelectorDropdown
                    providerConfigs={providerConfigs}
                    selectedProviderKey={selectedProviderKey}
                    selectedModelId={effectiveModelId}
                    onSelect={handleModelSelect}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span className="text-xs text-slate-400">Ctrl + Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  )
}
