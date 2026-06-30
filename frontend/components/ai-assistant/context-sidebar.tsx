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
  Share2,
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
  onShareConversation: (id: string) => void
  pinnedMetrics: PinnedMetric[]
  savedQueries: SavedQuery[]
  isOpen: boolean
  onToggle: () => void
  onNewContext: () => void
  onNewChat: () => void
  onDeleteContext: (id: string) => void
  onDeleteConversation: (id: string) => void
  onOpenRenameContext: (context: AiContext) => void
  onOpenRenameConversation: (conv: AiConversation) => void
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
  onShareConversation,
  pinnedMetrics,
  savedQueries,
  isOpen,
  onToggle,
  onNewContext,
  onNewChat,
  onDeleteContext,
  onDeleteConversation,
  onOpenRenameContext,
  onOpenRenameConversation,
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

  // Quota calculations (guard: limit có thể 0/undefined nếu API chưa map đúng)
  const dailyLimit = Number(quota.dailyTokensLimit) || 0
  const dailyPercentage = dailyLimit > 0 ? (Number(quota.dailyTokensUsed) / dailyLimit) * 100 : 0
  const isWarning = dailyPercentage >= 60
  const isCritical = dailyPercentage >= 90

  if (!isOpen) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-card py-4">
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
      style={{ width: `min(${width}px, calc(100vw - 1.5rem))` }}
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden border-r border-border bg-card text-card-foreground",
        isResizing && "select-none"
      )}
    >
      {/* Resize Handle */}
      <div
        className="group absolute bottom-0 right-0 top-0 z-10 hidden w-1 cursor-col-resize transition-colors hover:bg-primary active:bg-primary/80 md:block"
        onMouseDown={startResizing}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 -mr-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold text-foreground">AI Assistant</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4 min-w-0">
          {/* My Contexts Section */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Contexts
              </span>
            </div>
            <div className="space-y-2 min-w-0">
              {contexts.map((context) => (
                <div
                  key={context.id}
                  className={cn(
                    "group relative rounded-lg border transition-all min-w-0",
                    activeContextId === context.id
                      ? "border-primary bg-primary/10 border-l-4"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <button
                    onClick={() => onContextSelect(context.id)}
                    className="w-full text-left p-3 pr-8 min-w-0"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="flex-shrink-0 text-lg">{context.icon}</span>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {context.name}
                          </span>
                          {context.clonedFrom && (
                            <span className="flex-shrink-0 text-xs text-muted-foreground">(cloned)</span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{context.appScope}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", providerColors[context.preferredProvider])} />
                            <span className="text-xs text-muted-foreground">{providerLabels[context.preferredProvider]}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{context.conversationCount} chats</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Context action menu */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => onOpenRenameContext(context)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs text-destructive focus:text-destructive"
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
            <div className="flex gap-2 mt-3 min-w-0">
              <Button variant="outline" size="sm" className="flex-1 min-w-0 h-8 text-xs overflow-hidden" onClick={onNewContext}>
                <Plus className="h-3 w-3 mr-1 shrink-0" />
                <span className="truncate">New</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 min-w-0 h-8 text-xs overflow-hidden" asChild>
                <Link href="/ai-assistant/library" className="flex items-center justify-center min-w-0 overflow-hidden">
                  <Library className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate">Library</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Conversations Section */}
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2 min-w-0">
              <span className="flex items-center gap-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3 w-3 shrink-0" />
                Conversations
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-stretch gap-1 rounded-md transition-colors min-w-0",
                    activeConversationId === conv.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <button
                    onClick={() => onConversationSelect(conv.id)}
                    className={cn(
                      "flex-1 text-left p-2 py-1.5 min-w-0 overflow-hidden",
                      activeConversationId === conv.id ? "text-primary" : "text-foreground"
                    )}
                  >
                    <div className="text-sm font-medium break-words text-left">{conv.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {conv.timestamp.toLocaleDateString() === new Date().toLocaleDateString()
                        ? `Today ${conv.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : conv.timestamp.toLocaleDateString()}
                    </div>
                  </button>
                  {/* Conversation action menu — luôn ở góc phải */}
                  <div className="flex-shrink-0 flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => onShareConversation(conv.id)}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share với team
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-xs"
                          onClick={() => onOpenRenameConversation(conv)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-xs text-destructive focus:text-destructive"
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
            <Button variant="ghost" size="sm" className="mt-2 h-8 w-full min-w-0 text-xs text-muted-foreground hover:text-foreground" onClick={onNewChat}>
              <Plus className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">New Chat</span>
            </Button>
          </div>

          {/* Pinned Metrics Section */}
          {pinnedMetrics.length > 0 && (
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-2 min-w-0">
                <Pin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pinned Metrics
                </span>
              </div>
              <div className="space-y-1">
                {pinnedMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                  >
                    {metric.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Queries Section */}
          {savedQueries.length > 0 && (
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-2 min-w-0">
                <Save className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Queries
                </span>
              </div>
              <div className="space-y-1">
                {savedQueries.map((query) => (
                  <div
                    key={query.id}
                    className="cursor-pointer rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
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
      <div className="min-w-0 overflow-hidden border-t border-border bg-muted/30 p-3">
        <div className="space-y-2 min-w-0">
          {/* Progress Bar */}
          <div className="flex items-center gap-2 min-w-0">
            <Progress
              value={dailyPercentage}
              className={cn(
                "flex-1 min-w-0 h-1.5",
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
                  : "text-muted-foreground"
              )}
            >
              {Math.round(dailyPercentage)}%
            </span>
          </div>

          {/* Token Info */}
          <div className="flex items-center justify-between gap-2 text-xs min-w-0">
            <span className="min-w-0 truncate text-muted-foreground">
              {(Number(quota.dailyTokensUsed) / 1000).toFixed(0)}K/{(dailyLimit / 1000).toFixed(0)}K tokens
            </span>
            <span className="shrink-0 text-muted-foreground">
              ${Number(quota.dailyCostUsed).toFixed(2)}
              {quota.dailyCostLimit != null && quota.dailyCostLimit > 0 && (
                <span className="text-muted-foreground/70"> / ${Number(quota.dailyCostLimit).toFixed(2)}</span>
              )}
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
            className="flex items-center justify-center gap-1 py-1 text-xs text-primary hover:text-primary/80"
          >
            <TrendingUp className="h-3 w-3" />
            View Usage
          </Link>
        </div>
      </div>
    </div>
  )
}
