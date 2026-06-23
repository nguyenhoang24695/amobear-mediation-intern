"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Library,
  MessageSquare,
  Pin,
  Save,
  AlertTriangle,
  TrendingUp,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react"
import type { AiContext, AiConversation, PinnedMetric, SavedQuery, UserQuota } from "./ai-assistant-content"
import Link from "next/link"

interface ContextSidebarProps {
  contexts: AiContext[]
  activeContextId: string
  onContextSelect: (id: string) => void
  conversations: AiConversation[]
  activeConversationId: string
  onConversationSelect: (id: string) => void
  pinnedMetrics: PinnedMetric[]
  savedQueries: SavedQuery[]
  isOpen: boolean
  onToggle: () => void
  onNewContext: () => void
  onNewChat: () => void
  onDeleteContext: (id: string) => void
  onDeleteConversation: (id: string) => void
  quota: UserQuota
  selectedProvider: "claude" | "gemini" | "chatgpt"
}

const providerColors = {
  claude: "bg-amber-500",
  gemini: "bg-blue-500",
  chatgpt: "bg-emerald-500",
}

const providerLabels = {
  claude: "Claude",
  gemini: "Gemini",
  chatgpt: "ChatGPT",
}

const MIN_WIDTH = 200
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 260

export function ContextSidebar({
  contexts,
  activeContextId,
  onContextSelect,
  conversations,
  activeConversationId,
  onConversationSelect,
  pinnedMetrics,
  savedQueries,
  isOpen,
  onToggle,
  onNewContext,
  onNewChat,
  onDeleteContext,
  onDeleteConversation,
  quota,
  selectedProvider,
}: ContextSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    isResizingRef.current = false
    setIsResizing(false)
  }, [])

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !sidebarRef.current) return
    const sidebarLeft = sidebarRef.current.getBoundingClientRect().left
    const newWidth = e.clientX - sidebarLeft
    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      setWidth(newWidth)
    }
  }, [])

  // Add mouse event listeners for resizing — stable deps, no loop
  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  // Quota calculations
  const dailyPercentage = (quota.dailyTokensUsed / quota.dailyTokensLimit) * 100
  const isWarning = dailyPercentage >= 60
  const isCritical = dailyPercentage >= 90

  if (!isOpen) {
    return (
      <div className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={sidebarRef}
      style={{ width }}
      className={cn(
        "bg-white border-r border-slate-200 flex flex-col overflow-hidden relative",
        isResizing && "select-none"
      )}
    >
      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-10 group"
        onMouseDown={startResizing}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 -mr-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
        <span className="font-semibold text-slate-900 text-sm">AI Assistant</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {/* My Contexts Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                My Contexts
              </span>
            </div>
            <div className="space-y-2">
              {contexts.map((context) => (
                <div
                  key={context.id}
                  className={cn(
                    "group relative rounded-lg border transition-all",
                    activeContextId === context.id
                      ? "border-blue-500 bg-blue-50 border-l-4"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <button
                    onClick={() => onContextSelect(context.id)}
                    className="w-full text-left p-3 pr-8"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{context.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-900 text-sm truncate">
                            {context.name}
                          </span>
                          {context.clonedFrom && (
                            <span className="text-xs text-slate-400">(cloned)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{context.appScope}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", providerColors[context.preferredProvider])} />
                            <span className="text-xs text-slate-500">{providerLabels[context.preferredProvider]}</span>
                          </div>
                          <span className="text-xs text-slate-400">{context.conversationCount} chats</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Context action menu */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs text-red-600 focus:text-red-600"
                          onClick={() => onDeleteContext(context.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onNewContext}>
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" asChild>
                <Link href="/ai-assistant/library">
                  <Library className="h-3 w-3 mr-1" />
                  Library
                </Link>
              </Button>
            </div>
          </div>

          {/* Conversations Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Conversations
              </span>
            </div>
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-start rounded-md transition-colors",
                    activeConversationId === conv.id
                      ? "bg-blue-50"
                      : "hover:bg-slate-50"
                  )}
                >
                  <button
                    onClick={() => onConversationSelect(conv.id)}
                    className={cn(
                      "flex-1 text-left p-2 pr-7 min-w-0",
                      activeConversationId === conv.id ? "text-blue-700" : "text-slate-700"
                    )}
                  >
                    <div className="text-sm font-medium truncate">{conv.title}</div>
                    <div className="text-xs text-slate-500">
                      {conv.timestamp.toLocaleDateString() === new Date().toLocaleDateString()
                        ? `Today ${conv.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : conv.timestamp.toLocaleDateString()}
                    </div>
                  </button>
                  {/* Conversation action menu */}
                  <div className="absolute top-1.5 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs text-red-600 focus:text-red-600"
                          onClick={() => onDeleteConversation(conv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full h-8 mt-2 text-xs text-slate-600" onClick={onNewChat}>
              <Plus className="h-3 w-3 mr-1" />
              New Chat
            </Button>
          </div>

          {/* Pinned Metrics Section */}
          {pinnedMetrics.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Pin className="h-3 w-3 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pinned Metrics
                </span>
              </div>
              <div className="space-y-1">
                {pinnedMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="text-xs text-slate-600 py-1 px-2 rounded bg-slate-50"
                  >
                    {metric.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Queries Section */}
          {savedQueries.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Save className="h-3 w-3 text-slate-500" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Saved Queries
                </span>
              </div>
              <div className="space-y-1">
                {savedQueries.map((query) => (
                  <div
                    key={query.id}
                    className="text-xs text-slate-600 py-1 px-2 rounded bg-slate-50 cursor-pointer hover:bg-slate-100"
                  >
                    {query.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quota Status Bar at Bottom */}
      <div className="border-t border-slate-200 p-3 bg-slate-50/50">
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <Progress
              value={dailyPercentage}
              className={cn(
                "flex-1 h-1.5",
                isCritical
                  ? "[&>div]:bg-red-500"
                  : isWarning
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-blue-500"
              )}
            />
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                isCritical
                  ? "text-red-600"
                  : isWarning
                  ? "text-amber-600"
                  : "text-slate-600"
              )}
            >
              {Math.round(dailyPercentage)}%
            </span>
          </div>

          {/* Token Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {(quota.dailyTokensUsed / 1000).toFixed(0)}K/{(quota.dailyTokensLimit / 1000).toFixed(0)}K tokens
            </span>
            <span className="text-slate-500">
              ${quota.dailyCostUsed.toFixed(2)}
            </span>
          </div>

          {/* Warning */}
          {quota.warning && (
            <div className="flex items-center gap-1 text-amber-600 text-xs">
              <AlertTriangle className="h-3 w-3" />
              <span className="truncate">{quota.warning}</span>
            </div>
          )}

          {/* Usage Link */}
          <Link
            href="/ai-assistant/usage"
            className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 text-xs py-1"
          >
            <TrendingUp className="h-3 w-3" />
            View Usage
          </Link>
        </div>
      </div>
    </div>
  )
}
