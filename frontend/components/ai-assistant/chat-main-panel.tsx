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
} from "lucide-react"
import type { AiContext, AiMessage } from "./ai-assistant-content"
import { AiMessageBubble } from "./ai-message-bubble"
import { UserMessageBubble } from "./user-message-bubble"
import {
  aiAssistantApi,
  type AiProviderConfigDto,
  type DiscoveredModelDto,
} from "@/lib/api/ai-assistant"
import { getModelMeta, getProviderHint } from "@/lib/ai-model-metadata"

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
  onProviderChange: (provider: "claude" | "gemini" | "chatgpt") => void
  autoExplain: boolean
  onAutoExplainChange: (checked: boolean) => void
  onSendMessage: (content: string) => void
  sidebarOpen: boolean
}

const PROVIDER_KEY_MAP: Record<string, "claude" | "gemini" | "chatgpt"> = {
  anthropic: "claude",
  openai: "chatgpt",
  gemini: "gemini",
}

const REVERSE_PROVIDER_KEY_MAP: Record<string, string> = {
  claude: "anthropic",
  chatgpt: "openai",
  gemini: "gemini",
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
          const providerHint = getProviderHint(provider.providerKey)
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
  context,
  messages,
  selectedProvider,
  onProviderChange,
  autoExplain,
  onAutoExplainChange,
  onSendMessage,
  sidebarOpen,
}: ChatMainPanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [selectedModelId, setSelectedModelId] = useState("")
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [providerConfigs, setProviderConfigs] = useState<AiProviderConfigDto[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedProviderKey = REVERSE_PROVIDER_KEY_MAP[selectedProvider] || "anthropic"

  const fetchProviders = useCallback(async () => {
    try {
      const configs = await aiAssistantApi.getProviderConfigs()
      setProviderConfigs(configs)

      // Chỉ auto-select nếu chưa có model nào được chọn
      if (selectedModelId) return

      // Ưu tiên defaultModel của provider hiện tại
      const currentProviderKey = REVERSE_PROVIDER_KEY_MAP[selectedProvider] || "anthropic"
      const currentProvider = configs.find(c => c.providerKey === currentProviderKey && c.isConnected)
      if (currentProvider?.defaultModel) {
        setSelectedModelId(currentProvider.defaultModel)
        return
      }

      // Fallback: provider connected đầu tiên có defaultModel (theo priority)
      const sorted = [...configs]
        .filter(c => c.isConnected && c.availableModels.length > 0)
        .sort((a, b) => a.priority - b.priority)
      const fallback = sorted.find(c => c.defaultModel) ?? sorted[0]
      if (fallback) {
        setSelectedModelId(fallback.defaultModel ?? fallback.availableModels[0]?.modelId ?? "")
        const mappedKey = PROVIDER_KEY_MAP[fallback.providerKey]
        if (mappedKey) onProviderChange(mappedKey)
      }
    } catch {
      // API not available, will show empty state
    }
  }, [selectedProvider, selectedModelId, onProviderChange])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const currentProviderConfig = providerConfigs.find(p => p.providerKey === selectedProviderKey)
  const currentModelData = currentProviderConfig?.availableModels.find(m => m.modelId === selectedModelId)
  const currentModelMeta = selectedModelId ? getModelMeta(selectedModelId) : null

  const handleModelSelect = (providerKey: string, modelId: string) => {
    const mappedKey = PROVIDER_KEY_MAP[providerKey]
    if (mappedKey) onProviderChange(mappedKey)
    setSelectedModelId(modelId)
    setModelDropdownOpen(false)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim()) return
    onSendMessage(inputValue.trim())
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const displayProviderName = PROVIDER_SHORT_NAMES[selectedProviderKey] || currentProviderConfig?.displayName || selectedProvider
  const displayModelName = currentModelData?.displayName || selectedModelId || "Select model"

  return (
    <div className={cn("flex-1 flex flex-col bg-slate-50 transition-all overflow-hidden")}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) =>
            message.role === "user" ? (
              <UserMessageBubble key={message.id} message={message} />
            ) : (
              <AiMessageBubble key={message.id} message={message} />
            )
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          {/* Text Input */}
          <div className="relative border border-slate-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your data..."
              className="min-h-[80px] max-h-[200px] border-0 focus-visible:ring-0 resize-none pr-12"
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 bg-blue-600 hover:bg-blue-700"
              onClick={handleSend}
              disabled={!inputValue.trim()}
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
                    selectedModelId={selectedModelId}
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
