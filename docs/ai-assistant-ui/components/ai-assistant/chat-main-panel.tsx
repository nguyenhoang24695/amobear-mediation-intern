"use client"

import { useState, useRef, useEffect } from "react"
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
} from "lucide-react"
import type { AiContext, AiMessage } from "./ai-assistant-content"
import { AiMessageBubble } from "./ai-message-bubble"
import { UserMessageBubble } from "./user-message-bubble"

interface SubModel {
  id: string
  name: string
  description: string
  cost: string
  tag?: string
  tagColor?: string
  accuracyStars: number
  speedStars: number
}

interface Provider {
  id: "claude" | "gemini" | "chatgpt"
  name: string
  company: string
  color: string
  textColor: string
  hint: string
  cost: string
  accuracyStars: number
  speedStars: number
  subModels: SubModel[]
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

const providers: Provider[] = [
  {
    id: "claude",
    name: "Claude",
    company: "Anthropic",
    color: "bg-amber-500",
    textColor: "text-amber-600",
    hint: "Best SQL accuracy",
    cost: "from $0.003/query",
    accuracyStars: 5,
    speedStars: 4,
    subModels: [
      { id: "claude-opus", name: "Claude Opus 4", description: "Most powerful, best reasoning", cost: "$0.015/1K tokens", tag: "Best", tagColor: "bg-violet-100 text-violet-700", accuracyStars: 5, speedStars: 2 },
      { id: "claude-sonnet", name: "Claude Sonnet 4.5", description: "Balanced performance & cost", cost: "$0.005/1K tokens", tag: "Recommended", tagColor: "bg-blue-100 text-blue-700", accuracyStars: 5, speedStars: 4 },
      { id: "claude-haiku", name: "Claude Haiku 3.5", description: "Fastest, most compact", cost: "$0.001/1K tokens", tag: "Fastest", tagColor: "bg-emerald-100 text-emerald-700", accuracyStars: 4, speedStars: 5 },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    company: "Google",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    hint: "Fastest & cheapest",
    cost: "from $0.001/query",
    accuracyStars: 4,
    speedStars: 5,
    subModels: [
      { id: "gemini-pro", name: "Gemini 1.5 Pro", description: "Advanced reasoning, 2M context", cost: "$0.007/1K tokens", tag: "Powerful", tagColor: "bg-violet-100 text-violet-700", accuracyStars: 5, speedStars: 3 },
      { id: "gemini-flash", name: "Gemini 2.0 Flash", description: "Speed + quality balance", cost: "$0.002/1K tokens", tag: "Recommended", tagColor: "bg-blue-100 text-blue-700", accuracyStars: 4, speedStars: 5 },
      { id: "gemini-nano", name: "Gemini 1.5 Flash", description: "Ultra-fast, low cost", cost: "$0.001/1K tokens", tag: "Cheapest", tagColor: "bg-emerald-100 text-emerald-700", accuracyStars: 3, speedStars: 5 },
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    company: "OpenAI",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
    hint: "Great all-rounder",
    cost: "from $0.002/query",
    accuracyStars: 4,
    speedStars: 4,
    subModels: [
      { id: "gpt-o1", name: "o1", description: "Deep reasoning, complex logic", cost: "$0.015/1K tokens", tag: "Reasoning", tagColor: "bg-violet-100 text-violet-700", accuracyStars: 5, speedStars: 2 },
      { id: "gpt-4o", name: "GPT-4o", description: "Most capable, multimodal", cost: "$0.005/1K tokens", tag: "Recommended", tagColor: "bg-blue-100 text-blue-700", accuracyStars: 5, speedStars: 4 },
      { id: "gpt-4o-mini", name: "GPT-4o mini", description: "Fast & affordable", cost: "$0.002/1K tokens", tag: "Fast", tagColor: "bg-emerald-100 text-emerald-700", accuracyStars: 4, speedStars: 5 },
    ],
  },
]

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
  providers,
  selectedProvider,
  selectedSubModel,
  onSelect,
}: {
  providers: Provider[]
  selectedProvider: "claude" | "gemini" | "chatgpt"
  selectedSubModel: string
  onSelect: (providerId: "claude" | "gemini" | "chatgpt", subModelId: string) => void
}) {
  const [hoveredProvider, setHoveredProvider] = useState<string>(selectedProvider)
  const hoveredProviderData = providers.find((p) => p.id === hoveredProvider)

  return (
    <div className="flex" style={{ minWidth: 480 }}>
      {/* Left: Provider list */}
      <div className="w-52 border-r border-slate-100 py-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Provider
        </div>
        {providers.map((provider) => (
          <div
            key={provider.id}
            onMouseEnter={() => setHoveredProvider(provider.id)}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors",
              hoveredProvider === provider.id
                ? "bg-slate-50"
                : "hover:bg-slate-50"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", provider.color)} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-sm font-medium",
                    selectedProvider === provider.id ? "text-blue-600" : "text-slate-800"
                  )}>
                    {provider.name}
                  </span>
                  {selectedProvider === provider.id && (
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </div>
                <span className="text-xs text-slate-400">{provider.company}</span>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          </div>
        ))}
        <div className="border-t border-slate-100 mt-1 pt-1 px-1">
          <button className="w-full flex items-center gap-2 px-2 py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
            <Zap className="h-3.5 w-3.5" />
            Compare providers
          </button>
        </div>
      </div>

      {/* Right: Sub-models for hovered provider */}
      {hoveredProviderData && (
        <div className="flex-1 py-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {hoveredProviderData.name} Models
          </div>
          {hoveredProviderData.subModels.map((model) => {
            const isSelected = selectedSubModel === model.id
            return (
              <div
                key={model.id}
                onClick={() => onSelect(hoveredProviderData.id, model.id)}
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
                        {model.name}
                      </span>
                      {model.tag && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", model.tagColor)}>
                          {model.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <StarRow count={5} filled={model.accuracyStars} color="fill-amber-400 text-amber-400" />
                        <span className="text-xs text-slate-400 ml-1">Accuracy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <StarRow count={5} filled={model.speedStars} color="fill-blue-400 text-blue-400" />
                        <span className="text-xs text-slate-400 ml-1">Speed</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-slate-500 whitespace-nowrap">{model.cost}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 mt-1 ml-auto" />}
                  </div>
                </div>
              </div>
            )
          })}
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
  const [selectedSubModel, setSelectedSubModel] = useState("claude-sonnet")
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedProviderData = providers.find((p) => p.id === selectedProvider)!
  const selectedSubModelData = selectedProviderData.subModels.find((m) => m.id === selectedSubModel)
    ?? selectedProviderData.subModels[1]

  const handleModelSelect = (providerId: "claude" | "gemini" | "chatgpt", subModelId: string) => {
    onProviderChange(providerId)
    setSelectedSubModel(subModelId)
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
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", selectedProviderData.color)} />
                    <span className="font-medium text-sm">{selectedProviderData.name}</span>
                    <span className="text-slate-400 text-xs hidden sm:inline">
                      {selectedSubModelData?.name}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-0" style={{ minWidth: 480 }}>
                  <div className="px-3 py-2.5 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Select AI Model</span>
                  </div>
                  <ModelSelectorDropdown
                    providers={providers}
                    selectedProvider={selectedProvider}
                    selectedSubModel={selectedSubModel}
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
