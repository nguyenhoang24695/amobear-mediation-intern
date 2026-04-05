"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ContextSidebar } from "./context-sidebar"
import { ChatMainPanel } from "./chat-main-panel"
import { CreateContextModal } from "./create-context-modal"
import { ShareConversationModal } from "./share-conversation-modal"
import { ChooseContextForForkModal } from "./choose-context-for-fork-modal"
import { RenameModal } from "./rename-modal"
import { aiAssistantApi } from "@/lib/api/ai-assistant"
import type {
  AskResponse,
  AskAgenticResponse,
  MessageDto,
  DetailedExplanation,
  ImageAttachmentRequest,
  AttachedTableDataRequest,
} from "@/lib/api/ai-assistant"
import { useToast } from "@/hooks/use-toast"

export interface AiContext {
  id: string
  name: string
  icon: string
  color: string
  appIds: string[]
  appScope: string
  focusAreas: string[]
  preferredProvider: "claude" | "gemini" | "chatgpt"
  preferredModel?: string
  explainDetailDefault: boolean
  isShared: boolean
  clonedFrom?: string
  pinnedMetrics: PinnedMetric[]
  savedQueries: SavedQuery[]
  conversationCount: number
}

export interface PinnedMetric {
  id: string
  name: string
  formula: string
}

export interface SavedQuery {
  id: string
  name: string
  sql: string
}

export interface AiConversation {
  id: string
  contextId: string
  title: string
  lastMessage: string
  timestamp: Date
}

export interface ContextSummary {
  name: string
  appScope: string
  focusAreas: string[]
  pinnedMetrics: string[]
  savedQueries: number
}

export interface AiMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    sql?: string
    explanation?: string
    detailedExplanation?: DetailedExplanation
    suggestedChart?: string
    queryResult?: QueryResult
    provider?: string
    fallbackFrom?: string
    usage?: { tokens: number; cost: number }
    tables?: string[]
    complexity?: "Low" | "Medium" | "High"
    contextSummary?: ContextSummary
    agentic?: {
      status: string
      iterations: number
      mcpQueriesUsed: number
      toolCount: number
    }
  }
}

export interface DetailedExplanation {
  sqlBreakdown: { clause: string; explain: string }[]
  performanceNotes: string
  businessContext: string
  learningTips: string[]
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  executionTime: number
  provider: string
}

export interface UserQuota {
  dailyTokensUsed: number
  dailyTokensLimit: number
  dailyCostUsed: number
  dailyCostLimit: number
  monthlyTokensUsed: number
  monthlyTokensLimit: number
  monthlyCostUsed: number
  monthlyCostLimit: number
  warning?: string
}

const AI_ASSISTANT_LAST_CONTEXT_ID = "ai-assistant-last-context-id"
const AI_ASSISTANT_LAST_CONVERSATION_ID = "ai-assistant-last-conversation-id"

const PROVIDER_MAP = ["claude", "gemini", "chatgpt"] as const
function toProvider(s: string): "claude" | "gemini" | "chatgpt" {
  const p = s?.toLowerCase()
  return PROVIDER_MAP.includes(p as typeof PROVIDER_MAP[number]) ? (p as "claude" | "gemini" | "chatgpt") : "claude"
}

function dtoToContext(d: {
  id: string
  name: string
  icon: string
  color: string
  appIds: string[]
  focusAreas: string[]
  preferredProvider: string
  preferredModel?: string
  isShared: boolean
}, pinned: PinnedMetric[], saved: SavedQuery[], conversationCount: number): AiContext {
  return {
    id: d.id,
    name: d.name,
    icon: d.icon || "📊",
    color: d.color || "#3B82F6",
    appIds: d.appIds ?? [],
    appScope: d.appIds?.length ? d.appIds[0] : "all",
    focusAreas: d.focusAreas ?? [],
    preferredProvider: toProvider(d.preferredProvider),
    preferredModel: d.preferredModel ?? undefined,
    explainDetailDefault: false,
    isShared: d.isShared ?? false,
    pinnedMetrics: pinned,
    savedQueries: saved,
    conversationCount,
  }
}

function dtoToConversation(d: { id: string; contextId: string; title: string; summary?: string; updatedAt: string }): AiConversation {
  return {
    id: d.id,
    contextId: d.contextId,
    title: d.title,
    lastMessage: d.summary ?? d.title,
    timestamp: new Date(d.updatedAt),
  }
}

function dtoToMessage(m: MessageDto): AiMessage {
  const detailedExplanation = m.detailedExplanation ? {
    sqlBreakdown: (m.detailedExplanation.breakdown ?? []).map((b: { clause: string; explanation: string }) => ({ clause: b.clause, explain: b.explanation })),
    performanceNotes: (m.detailedExplanation as { performance?: { partitionUsage?: string; indexUsage?: string } })?.performance?.partitionUsage ?? "",
    businessContext: (m.detailedExplanation as { businessContext?: string })?.businessContext ?? "",
    learningTips: (m.detailedExplanation as { tips?: string[] })?.tips ?? [],
  } : undefined
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    timestamp: new Date(m.createdAt),
    metadata: {
      sql: m.sql,
      explanation: m.explanation,
      detailedExplanation,
      suggestedChart: m.suggestedChart,
      tables: m.tablesUsed,
      complexity: m.estimatedComplexity as "Low" | "Medium" | "High" | undefined,
      provider: m.provider,
      usage: m.inputTokens != null ? { tokens: m.inputTokens + m.outputTokens, cost: m.cost } : undefined,
      queryResult: m.queryRowCount != null && m.queryExecutionMs != null && (m.queryResultColumns != null || m.queryResultRows != null)
        ? {
            columns: m.queryResultColumns ?? (m.queryResultRows?.[0] ? Object.keys(m.queryResultRows[0]) : []),
            rows: m.queryResultRows ?? [],
            rowCount: m.queryRowCount,
            executionTime: (m.queryExecutionMs ?? 0) / 1000,
            provider: m.provider ?? "",
          }
        : m.queryRowCount != null && m.queryExecutionMs != null
        ? {
            columns: [],
            rows: [],
            rowCount: m.queryRowCount,
            executionTime: m.queryExecutionMs / 1000,
            provider: m.provider ?? "",
          }
        : undefined,
    },
  }
}

const PROVIDER_KEY_TO_SELECTED: Record<string, "claude" | "gemini" | "chatgpt"> = {
  anthropic: "claude",
  openai: "chatgpt",
  gemini: "gemini",
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function agenticResponseToMessage(res: AskAgenticResponse): AiMessage {
  return {
    id: `agentic-${Date.now()}`,
    role: "assistant",
    content: res.content,
    timestamp: new Date(),
    metadata: {
      agentic: {
        status: res.status,
        iterations: res.iterations,
        mcpQueriesUsed: res.mcpQueriesUsed,
        toolCount: res.toolExecutions?.length ?? 0,
      },
    },
  }
}

function askResponseToMessage(res: AskResponse): AiMessage {
  const det = res.detailedExplanation as { breakdown?: { clause: string; explanation: string }[]; performance?: { partitionUsage?: string }; businessContext?: string; tips?: string[] } | undefined
  return {
    id: res.messageId,
    role: "assistant",
    content: res.content,
    timestamp: new Date(),
    metadata: {
      sql: res.sql,
      explanation: res.explanation,
      detailedExplanation: det ? {
        sqlBreakdown: (det.breakdown ?? []).map(b => ({ clause: b.clause, explain: b.explanation })),
        performanceNotes: det.performance?.partitionUsage ?? "",
        businessContext: det.businessContext ?? "",
        learningTips: det.tips ?? [],
      } : undefined,
      suggestedChart: res.suggestedChart,
      tables: res.tablesUsed,
      complexity: res.estimatedComplexity as "Low" | "Medium" | "High" | undefined,
      provider: res.provider,
      usage: { tokens: res.inputTokens + res.outputTokens, cost: res.cost },
    },
  }
}

function quotaStatusToQuota(s: {
  dailyTokensUsed: number
  dailyTokenLimit: number
  dailyCostUsed: number
  dailyCostLimit: number
  monthlyTokensUsed: number
  monthlyTokenLimit: number
  monthlyCostUsed: number
  monthlyCostLimit: number
  isNearLimit?: boolean
  isOverLimit?: boolean
}): UserQuota {
  let warning: string | undefined
  if (s.isOverLimit) warning = "Đã vượt giới hạn"
  else if (s.isNearLimit) warning = `Gần đạt giới hạn (${Math.round((s.dailyTokensUsed / s.dailyTokenLimit) * 100)}%)`
  return {
    dailyTokensUsed: s.dailyTokensUsed,
    dailyTokensLimit: s.dailyTokenLimit,
    dailyCostUsed: s.dailyCostUsed,
    dailyCostLimit: s.dailyCostLimit,
    monthlyTokensUsed: s.monthlyTokensUsed,
    monthlyTokensLimit: s.monthlyTokenLimit,
    monthlyCostUsed: s.monthlyCostUsed,
    monthlyCostLimit: s.monthlyCostLimit,
    warning,
  }
}

const defaultQuota: UserQuota = {
  dailyTokensUsed: 0,
  dailyTokensLimit: 100000,
  dailyCostUsed: 0,
  dailyCostLimit: 2,
  monthlyTokensUsed: 0,
  monthlyTokensLimit: 2000000,
  monthlyCostUsed: 0,
  monthlyCostLimit: 30,
}

export function AiAssistantContent() {
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [contexts, setContexts] = useState<AiContext[]>([])
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeContextId, setActiveContextId] = useState<string>("")
  const [activeConversationId, setActiveConversationId] = useState<string>("")
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [quota, setQuota] = useState<UserQuota>(defaultQuota)
  const [selectedProvider, setSelectedProvider] = useState<"claude" | "gemini" | "chatgpt">("claude")
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [autoExplain, setAutoExplain] = useState(false)
  const [deepAnalysis, setDeepAnalysis] = useState(false)
  const [createContextOpen, setCreateContextOpen] = useState(false)
  const [loadingContexts, setLoadingContexts] = useState(true)
  const [sending, setSending] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareModalConversationId, setShareModalConversationId] = useState<string>("")
  const [chooseContextModalOpen, setChooseContextModalOpen] = useState(false)
  const [pendingAskAfterFork, setPendingAskAfterFork] = useState<{
    content: string
    options?: {
      images?: ImageAttachmentRequest[]
      attachedTableData?: AttachedTableDataRequest
      deepAnalysis?: boolean
    }
  } | null>(null)
  const [conversationDetail, setConversationDetail] = useState<{ isOwner: boolean; isShared: boolean } | null>(null)
  const [sharedLinkContextFallback, setSharedLinkContextFallback] = useState<{ id: string; name: string } | null>(null)
  const [renameModal, setRenameModal] = useState<{
    type: "context" | "conversation"
    id: string
    currentName: string
  } | null>(null)
  const searchParams = useSearchParams()
  const conversationIdFromUrl = searchParams.get("conversationId")

  const activeContext =
    contexts.find((c) => c.id === activeContextId) ??
    (sharedLinkContextFallback?.id === activeContextId && sharedLinkContextFallback
      ? {
          id: sharedLinkContextFallback.id,
          name: sharedLinkContextFallback.name,
          icon: "📊",
          color: "#3B82F6",
          appIds: [],
          appScope: "",
          focusAreas: [],
          preferredProvider: "claude" as const,
          preferredModel: undefined,
          explainDetailDefault: false,
          isShared: true,
          pinnedMetrics: [],
          savedQueries: [],
          conversationCount: 0,
        }
      : null) ??
    contexts[0] ??
    null
  const contextConversations = conversations.filter((c) => c.contextId === activeContextId)

  // Đồng bộ provider + model từ context khi đổi context
  useEffect(() => {
    if (!activeContext) return
    setSelectedProvider(activeContext.preferredProvider)
    setSelectedModelId(activeContext.preferredModel ?? "")
  }, [activeContext?.id, activeContext?.preferredProvider, activeContext?.preferredModel])

  const getWelcomeMessage = useCallback((context: AiContext): AiMessage => ({
    id: "welcome-" + Date.now(),
    role: "assistant",
    content: `Chào bạn đến với context **${context.name}**. Tôi sẵn sàng hỗ trợ phân tích dữ liệu.`,
    timestamp: new Date(),
    metadata: {
      provider: context.preferredProvider,
      contextSummary: {
        name: context.name,
        appScope: context.appScope,
        focusAreas: context.focusAreas,
        pinnedMetrics: context.pinnedMetrics.map((m) => m.name),
        savedQueries: context.savedQueries.length,
      },
    },
  }), [])

  // Load contexts and quota on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingContexts(true)
      try {
        const [contextsRes, quotaRes] = await Promise.all([
          aiAssistantApi.getContexts(),
          aiAssistantApi.getMyUsage().catch(() => null),
        ])
        if (cancelled) return
        if (quotaRes) setQuota(quotaStatusToQuota(quotaRes))
        const list = contextsRes ?? []
        const withExtras: AiContext[] = await Promise.all(
          list.map(async (d) => {
            const [pinned, saved, convs] = await Promise.all([
              aiAssistantApi.getPinnedMetrics(d.id).catch(() => []),
              aiAssistantApi.getSavedQueries(d.id).catch(() => []),
              aiAssistantApi.getConversations(d.id).catch(() => []),
            ])
            const pinnedM: PinnedMetric[] = (pinned ?? []).map((p: { id: string; metricName: string; metricFormula: string }) => ({
              id: p.id,
              name: p.metricName,
              formula: p.metricFormula,
            }))
            const savedQ: SavedQuery[] = (saved ?? []).map((s: { id: string; name: string; sql: string }) => ({ id: s.id, name: s.name, sql: s.sql }))
            return dtoToContext(d, pinnedM, savedQ, (convs ?? []).length)
          })
        )
        setContexts(withExtras)
        if (conversationIdFromUrl) return
        if (withExtras.length > 0 && !activeContextId) {
          const lastContextId = typeof window !== "undefined" ? localStorage.getItem(AI_ASSISTANT_LAST_CONTEXT_ID) : null
          const resolved = lastContextId && withExtras.some((c) => c.id === lastContextId) ? lastContextId : withExtras[0].id
          setActiveContextId(resolved)
        }
      } finally {
        if (!cancelled) setLoadingContexts(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [conversationIdFromUrl])

  // Load conversations when active context changes (chỉ skip khi đang xem đúng context của share link)
  useEffect(() => {
    const viewingSharedContext = conversationIdFromUrl && sharedLinkContextFallback?.id === activeContextId
    if (viewingSharedContext) return
    if (!activeContextId) {
      setConversations([])
      setActiveConversationId("")
      return
    }
    let cancelled = false
    aiAssistantApi.getConversations(activeContextId).then((list) => {
      if (cancelled) return
      const convs = (list ?? []).map(dtoToConversation)
      setConversations(convs)
      const lastConvId = typeof window !== "undefined" ? localStorage.getItem(AI_ASSISTANT_LAST_CONVERSATION_ID) : null
      const inList = lastConvId && convs.some((c) => c.id === lastConvId)
      if (inList && lastConvId) setActiveConversationId(lastConvId)
      else if (convs[0]) setActiveConversationId(convs[0].id)
      else setActiveConversationId("new-" + Date.now())
    }).catch(() => {
      if (!cancelled) setConversations([])
    })
    return () => { cancelled = true }
  }, [activeContextId, conversationIdFromUrl, sharedLinkContextFallback?.id])

  // Load messages when active conversation changes (skip nếu đã load từ share link)
  useEffect(() => {
    if (!activeConversationId) return
    if (activeConversationId.startsWith("new-")) {
      if (activeContext) setMessages([getWelcomeMessage(activeContext)])
      setConversationDetail(null)
      return
    }
    if (conversationIdFromUrl === activeConversationId) return
    let cancelled = false
    aiAssistantApi.getConversation(activeConversationId).then((detail) => {
      if (cancelled || !detail?.messages) return
      setMessages(detail.messages.map(dtoToMessage))
      setConversationDetail({
        isOwner: detail.isOwner ?? true,
        isShared: detail.isShared ?? false,
      })
    }).catch(() => {
      if (!cancelled) setMessages([])
      setConversationDetail(null)
    })
    return () => { cancelled = true }
  }, [activeConversationId, activeContext, getWelcomeMessage, conversationIdFromUrl])

  // Deep link: mở conversation từ link ?conversationId=... (dependency theo giá trị string để chỉ chạy 1 lần)
  useEffect(() => {
    if (!conversationIdFromUrl) return
    let cancelled = false
    aiAssistantApi.getConversation(conversationIdFromUrl).then((detail) => {
      if (cancelled || !detail) return
      setActiveContextId(detail.contextId)
      setActiveConversationId(detail.id)
      setMessages(detail.messages.map(dtoToMessage))
      setConversationDetail({
        isOwner: detail.isOwner ?? true,
        isShared: detail.isShared ?? false,
      })
      setSharedLinkContextFallback({ id: detail.contextId, name: detail.contextName })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [conversationIdFromUrl])

  // Refresh quota periodically — luôn map API (dailyTokenLimit) sang UserQuota (dailyTokensLimit)
  useEffect(() => {
    const t = setInterval(() => {
      aiAssistantApi.getMyUsage().then((q) => q != null && setQuota(quotaStatusToQuota(q))).catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [])

  const refreshContexts = useCallback(async () => {
    const list = await aiAssistantApi.getContexts().catch(() => [])
    const withExtras: AiContext[] = await Promise.all(
      (list ?? []).map(async (d: { id: string; name: string; icon: string; color: string; appIds: string[]; focusAreas: string[]; preferredProvider: string; preferredModel?: string; isShared: boolean }) => {
        const [pinned, saved, convs] = await Promise.all([
          aiAssistantApi.getPinnedMetrics(d.id).catch(() => []),
          aiAssistantApi.getSavedQueries(d.id).catch(() => []),
          aiAssistantApi.getConversations(d.id).catch(() => []),
        ])
        const pinnedM: PinnedMetric[] = (pinned ?? []).map((p: { id: string; metricName: string; metricFormula: string }) => ({ id: p.id, name: p.metricName, formula: p.metricFormula }))
        const savedQ: SavedQuery[] = (saved ?? []).map((s: { id: string; name: string; sql: string }) => ({ id: s.id, name: s.name, sql: s.sql }))
        return dtoToContext(d, pinnedM, savedQ, (convs ?? []).length)
      })
    )
    setContexts(withExtras)
    if (activeContextId && !withExtras.find((c) => c.id === activeContextId) && withExtras.length > 0) setActiveContextId(withExtras[0].id)
  }, [activeContextId])

  const handleContextSelect = useCallback((contextId: string) => {
    if (typeof window !== "undefined") localStorage.setItem(AI_ASSISTANT_LAST_CONTEXT_ID, contextId)
    setActiveContextId(contextId)
    const first = conversations.find((c) => c.contextId === contextId)
    if (first) {
      setActiveConversationId(first.id)
      if (typeof window !== "undefined") localStorage.setItem(AI_ASSISTANT_LAST_CONVERSATION_ID, first.id)
    } else {
      const newId = "new-" + Date.now()
      setActiveConversationId(newId)
      if (typeof window !== "undefined") localStorage.removeItem(AI_ASSISTANT_LAST_CONVERSATION_ID)
    }
  }, [conversations])

  const persistModelSelection = useCallback(
    async (provider: "claude" | "gemini" | "chatgpt", modelId: string) => {
      setSelectedProvider(provider)
      setSelectedModelId(modelId)
      if (!activeContextId) return
      try {
        await aiAssistantApi.updateContext(activeContextId, {
          preferredProvider: provider,
          preferredModel: modelId,
        })
        setContexts((prev) =>
          prev.map((c) =>
            c.id === activeContextId ? { ...c, preferredProvider: provider, preferredModel: modelId } : c
          )
        )
      } catch {
        // keep UI state on error
      }
    },
    [activeContextId]
  )

  const handleModelSelect = useCallback(
    async (providerKey: string, modelId: string) => {
      const mapped = PROVIDER_KEY_TO_SELECTED[providerKey] ?? "claude"
      await persistModelSelection(mapped, modelId)
    },
    [persistModelSelection]
  )

  const handleConversationSelect = useCallback((convId: string) => {
    setActiveConversationId(convId)
    if (typeof window !== "undefined") {
      localStorage.setItem(AI_ASSISTANT_LAST_CONVERSATION_ID, convId)
      if (activeContextId) localStorage.setItem(AI_ASSISTANT_LAST_CONTEXT_ID, activeContextId)
    }
  }, [activeContextId])

  const handleNewChat = useCallback(() => {
    const newId = "new-" + Date.now()
    setActiveConversationId(newId)
    if (activeContext) setMessages([getWelcomeMessage(activeContext)])
    if (typeof window !== "undefined") {
      if (activeContextId) localStorage.setItem(AI_ASSISTANT_LAST_CONTEXT_ID, activeContextId)
      localStorage.removeItem(AI_ASSISTANT_LAST_CONVERSATION_ID)
    }
  }, [activeContext, activeContextId, getWelcomeMessage])

  const handleDeleteContext = useCallback(async (contextId: string) => {
    try {
      await aiAssistantApi.deleteContext(contextId)
      await refreshContexts()
      if (activeContextId === contextId) {
        const remaining = contexts.filter((c) => c.id !== contextId)
        if (remaining.length > 0) handleContextSelect(remaining[0].id)
        else setActiveContextId("")
      }
    } catch {
      // keep UI state on error
    }
  }, [activeContextId, contexts, refreshContexts, handleContextSelect])

  const handleDeleteConversation = useCallback(async (convId: string) => {
    try {
      await aiAssistantApi.deleteConversation(convId)
      const list = await aiAssistantApi.getConversations(activeContextId).catch(() => [])
      setConversations((list ?? []).map(dtoToConversation))
      if (activeConversationId === convId) {
        const remaining = (list ?? []).filter((c: { id: string }) => c.id !== convId)
        if (remaining.length > 0) setActiveConversationId(remaining[0].id)
        else handleNewChat()
      }
    } catch {
      // keep UI state on error
    }
  }, [activeContextId, activeConversationId, handleNewChat])

  const handleOpenRenameContext = useCallback((context: AiContext) => {
    setRenameModal({ type: "context", id: context.id, currentName: context.name })
  }, [])

  const handleOpenRenameConversation = useCallback((conv: AiConversation) => {
    setRenameModal({ type: "conversation", id: conv.id, currentName: conv.title })
  }, [])

  const handleRenameApply = useCallback(
    async (newName: string) => {
      if (!renameModal) return
      if (renameModal.type === "context") {
        await aiAssistantApi.updateContext(renameModal.id, { name: newName })
        setContexts((prev) =>
          prev.map((c) => (c.id === renameModal.id ? { ...c, name: newName } : c))
        )
      } else {
        await aiAssistantApi.updateConversationTitle(renameModal.id, newName)
        setConversations((prev) =>
          prev.map((c) => (c.id === renameModal.id ? { ...c, title: newName } : c))
        )
      }
      setRenameModal(null)
    },
    [renameModal]
  )

  const handleShareConversation = useCallback(async (convId: string) => {
    try {
      await aiAssistantApi.shareConversation(convId)
      setShareModalConversationId(convId)
      setShareModalOpen(true)
    } catch {
      // keep UI state on error
    }
  }, [])

  const handleCreateContext = useCallback(async (data: { name: string; appScope: string; prompt?: string; fromLibrary?: string }) => {
    try {
      if (data.fromLibrary) {
        const cloned = await aiAssistantApi.cloneContext(data.fromLibrary)
        await refreshContexts()
        setActiveContextId(cloned.id)
        setActiveConversationId("new-" + Date.now())
        const ctx = dtoToContext(cloned, [], [], 0)
        setMessages([getWelcomeMessage(ctx)])
      } else {
        const created = await aiAssistantApi.createContext({
          name: data.name,
          appIds: data.appScope ? [data.appScope] : [],
          preferredProvider: "claude",
        })
        await refreshContexts()
        setActiveContextId(created.id)
        setActiveConversationId("new-" + Date.now())
        const ctx = dtoToContext(created, [], [], 0)
        setMessages([getWelcomeMessage(ctx)])
      }
      setCreateContextOpen(false)
    } catch {
      // keep modal open on error
    }
  }, [refreshContexts, getWelcomeMessage])

  const [pendingAttachedTable, setPendingAttachedTable] = useState<AttachedTableDataRequest | null>(null)
  const [pendingPrefillQuestion, setPendingPrefillQuestion] = useState<string | null>(null)

  const handleChooseContextForFork = useCallback(
    async (targetContextId: string) => {
      const pending = pendingAskAfterFork
      setPendingAskAfterFork(null)
      if (!pending || !activeConversationId || activeConversationId.startsWith("new-")) return
      setSending(true)
      try {
        const forked = await aiAssistantApi.forkConversation(activeConversationId, targetContextId)
        if (!forked?.id || !forked?.messages) return
        setActiveContextId(targetContextId)
        const listForContext = await aiAssistantApi.getConversations(targetContextId).catch(() => [])
        setConversations((listForContext ?? []).map(dtoToConversation))
        setActiveConversationId(forked.id)
        setMessages(forked.messages.map(dtoToMessage))
        setConversationDetail({ isOwner: true, isShared: false })
        const userMsg: AiMessage = { id: "u-" + Date.now(), role: "user", content: pending.content, timestamp: new Date() }
        setMessages((prev) => [...prev, userMsg])
        const attachedTableData = pending.options?.attachedTableData ?? pendingAttachedTable ?? undefined
        setPendingAttachedTable(null)
        setPendingPrefillQuestion(null)
        const useAgentic = pending.options?.deepAnalysis === true && !pending.options?.images?.length
        const res = useAgentic
          ? await aiAssistantApi.askAgentic({
              question: pending.content,
              contextId: targetContextId,
              conversationId: forked.id,
              provider: selectedProvider,
              useSmartRouting: true,
            })
          : await aiAssistantApi.ask({
              question: pending.content,
              contextId: targetContextId,
              conversationId: forked.id,
              provider: selectedProvider,
              explainDetails: autoExplain,
              images: pending.options?.images?.length ? pending.options.images : undefined,
              attachedTableData: attachedTableData ?? undefined,
              useSmartRouting: true,
            })
        setActiveConversationId(res.conversationId)
        setMessages((prev) => [
          ...prev.slice(0, -1),
          userMsg,
          useAgentic ? agenticResponseToMessage(res as AskAgenticResponse) : askResponseToMessage(res as AskResponse),
        ])
        if (!useAgentic) {
          const askRes = res as AskResponse
          const responseProvider = toProvider(askRes.provider)
          if (askRes.model && (responseProvider !== selectedProvider || askRes.model !== selectedModelId)) {
            setSelectedProvider(responseProvider)
            setSelectedModelId(askRes.model)
            void aiAssistantApi
              .updateContext(targetContextId, {
                preferredProvider: responseProvider,
                preferredModel: askRes.model,
              })
              .then(() => {
                setContexts((prev) =>
                  prev.map((c) =>
                    c.id === targetContextId
                      ? { ...c, preferredProvider: responseProvider, preferredModel: askRes.model }
                      : c
                  )
                )
              })
              .catch(() => {})
          }
        }
        const list = await aiAssistantApi.getConversations(targetContextId).catch(() => [])
        setConversations((list ?? []).map(dtoToConversation))
        const q = await aiAssistantApi.getMyUsage().catch(() => null)
        if (q) setQuota(quotaStatusToQuota(q))
        if (typeof window !== "undefined") {
          localStorage.setItem(AI_ASSISTANT_LAST_CONVERSATION_ID, res.conversationId)
          localStorage.setItem(AI_ASSISTANT_LAST_CONTEXT_ID, targetContextId)
        }
      } catch (err) {
        setMessages((prev) => prev.slice(0, -1))
        const message = getErrorMessage(err, "Unable to fork the conversation or send the request. Please try again.")
        toast({ title: "AI request failed", description: message, variant: "destructive" })
        const errMsg: AiMessage = {
          id: "err-" + Date.now(),
          role: "assistant",
          content: message,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setSending(false)
      }
    },
    [activeConversationId, pendingAskAfterFork, selectedProvider, selectedModelId, autoExplain, pendingAttachedTable, toast]
  )

  const handleSendMessage = useCallback(
    async (
      content: string,
      options?: {
        images?: ImageAttachmentRequest[]
        attachedTableData?: AttachedTableDataRequest
        deepAnalysis?: boolean
      }
    ) => {
      if (!activeContextId || sending) return
      const viewingSharedNotOwner =
        conversationDetail && !conversationDetail.isOwner && conversationDetail.isShared
      const conversationIdToUse = activeConversationId.startsWith("new-") ? undefined : activeConversationId

      if (viewingSharedNotOwner && conversationIdToUse) {
        setPendingAskAfterFork({ content, options: { ...options, deepAnalysis } })
        setChooseContextModalOpen(true)
        return
      }

      const userMsg: AiMessage = { id: "u-" + Date.now(), role: "user", content, timestamp: new Date() }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      const attachedTableData = options?.attachedTableData ?? pendingAttachedTable ?? undefined
      setPendingAttachedTable(null)
      setPendingPrefillQuestion(null)
      try {
        const useAgentic = options?.deepAnalysis === true && !options?.images?.length
        if (options?.deepAnalysis && options?.images?.length) {
          toast({
            title: "Phân tích sâu không kèm ảnh",
            description: "Đang gửi ở chế độ chat thường (MCP agentic chưa hỗ trợ ảnh đính kèm).",
          })
        }
        const res = useAgentic
          ? await aiAssistantApi.askAgentic({
              question: content,
              contextId: activeContextId,
              conversationId: conversationIdToUse,
              provider: selectedProvider,
              useSmartRouting: true,
            })
          : await aiAssistantApi.ask({
              question: content,
              contextId: activeContextId,
              conversationId: conversationIdToUse,
              provider: selectedProvider,
              explainDetails: autoExplain,
              images: options?.images?.length ? options.images : undefined,
              attachedTableData: attachedTableData ?? undefined,
              useSmartRouting: true,
            })
        setActiveConversationId(res.conversationId)
        setMessages((prev) => [
          ...prev.slice(0, -1),
          userMsg,
          useAgentic ? agenticResponseToMessage(res as AskAgenticResponse) : askResponseToMessage(res as AskResponse),
        ])
        if (!useAgentic) {
          const askRes = res as AskResponse
          const responseProvider = toProvider(askRes.provider)
          if (askRes.model && (responseProvider !== selectedProvider || askRes.model !== selectedModelId)) {
            setSelectedProvider(responseProvider)
            setSelectedModelId(askRes.model)
            void aiAssistantApi
              .updateContext(activeContextId, {
                preferredProvider: responseProvider,
                preferredModel: askRes.model,
              })
              .then(() => {
                setContexts((prev) =>
                  prev.map((c) =>
                    c.id === activeContextId
                      ? { ...c, preferredProvider: responseProvider, preferredModel: askRes.model }
                      : c
                  )
                )
              })
              .catch(() => {})
          }
        }
        const list = await aiAssistantApi.getConversations(activeContextId).catch(() => [])
        setConversations((list ?? []).map(dtoToConversation))
        const q = await aiAssistantApi.getMyUsage().catch(() => null)
        if (q) setQuota(quotaStatusToQuota(q))
        if (typeof window !== "undefined") {
          localStorage.setItem(AI_ASSISTANT_LAST_CONVERSATION_ID, res.conversationId)
          localStorage.setItem(AI_ASSISTANT_LAST_CONTEXT_ID, activeContextId)
        }
      } catch (err) {
        setMessages((prev) => prev.slice(0, -1))
        const message = getErrorMessage(err, "Unable to send the AI request. Please try again.")
        toast({ title: "AI request failed", description: message, variant: "destructive" })
        const errMsg: AiMessage = {
          id: "err-" + Date.now(),
          role: "assistant",
          content: message,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setSending(false)
      }
    },
    [
      activeContextId,
      activeConversationId,
      conversationDetail,
      selectedProvider,
      selectedModelId,
      autoExplain,
      deepAnalysis,
      sending,
      pendingAttachedTable,
      toast,
    ]
  )

  const handleAskAboutTable = useCallback((result: QueryResult) => {
    setPendingAttachedTable({ columns: result.columns, rows: result.rows })
    setPendingPrefillQuestion("Phân tích giúp tôi bảng kết quả bên dưới.")
  }, [])

  if (loadingContexts && contexts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)] text-slate-500">
        Đang tải...
      </div>
    )
  }

  return (
    <>
      <div className="flex bg-white overflow-hidden h-[calc(100vh-5rem)] -m-6">
        <ContextSidebar
          contexts={contexts}
          activeContextId={activeContextId}
          onContextSelect={handleContextSelect}
          conversations={contextConversations}
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onShareConversation={handleShareConversation}
          pinnedMetrics={activeContext?.pinnedMetrics ?? []}
          savedQueries={activeContext?.savedQueries ?? []}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewContext={() => setCreateContextOpen(true)}
          onNewChat={handleNewChat}
          onDeleteContext={handleDeleteContext}
          onDeleteConversation={handleDeleteConversation}
          onOpenRenameContext={handleOpenRenameContext}
          onOpenRenameConversation={handleOpenRenameConversation}
          quota={quota}
          selectedProvider={selectedProvider}
        />

        {activeContext ? (
          <ChatMainPanel
            context={activeContext}
            messages={messages}
            selectedProvider={selectedProvider}
            selectedModelId={selectedModelId}
            onProviderChange={setSelectedProvider}
            onModelSelect={handleModelSelect}
            autoExplain={autoExplain}
            onAutoExplainChange={setAutoExplain}
            deepAnalysis={deepAnalysis}
            onDeepAnalysisChange={setDeepAnalysis}
            onSendMessage={handleSendMessage}
            sidebarOpen={sidebarOpen}
            pendingAttachedTable={pendingAttachedTable}
            pendingPrefillQuestion={pendingPrefillQuestion}
            onAskAboutTable={handleAskAboutTable}
            sending={sending}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-500">
            <p>Chưa có context. Tạo context mới hoặc clone từ thư viện để bắt đầu.</p>
          </div>
        )}
      </div>

      <CreateContextModal
        open={createContextOpen}
        onOpenChange={setCreateContextOpen}
        onSubmit={handleCreateContext}
      />

      <ShareConversationModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        conversationId={shareModalConversationId}
      />

      <ChooseContextForForkModal
        open={chooseContextModalOpen}
        onOpenChange={(open) => {
          setChooseContextModalOpen(open)
          if (!open) setPendingAskAfterFork(null)
        }}
        contexts={contexts}
        onSelect={handleChooseContextForFork}
      />

      <RenameModal
        open={renameModal !== null}
        onOpenChange={(open) => !open && setRenameModal(null)}
        title={renameModal?.type === "context" ? "Đổi tên context" : "Đổi tên cuộc hội thoại"}
        currentName={renameModal?.currentName ?? ""}
        onApply={handleRenameApply}
      />
    </>
  )
}
