"use client"

import { useState, useCallback, useEffect } from "react"
import { ContextSidebar } from "./context-sidebar"
import { ChatMainPanel } from "./chat-main-panel"
import { CreateContextModal } from "./create-context-modal"
import { aiAssistantApi } from "@/lib/api/ai-assistant"
import type {
  AskResponse,
  MessageDto,
  DetailedExplanation,
  ImageAttachmentRequest,
  AttachedTableDataRequest,
} from "@/lib/api/ai-assistant"

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
      queryResult: m.queryRowCount != null && m.queryExecutionMs != null ? {
        columns: [],
        rows: [],
        rowCount: m.queryRowCount,
        executionTime: m.queryExecutionMs / 1000,
        provider: m.provider ?? "",
      } : undefined,
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
  const [createContextOpen, setCreateContextOpen] = useState(false)
  const [loadingContexts, setLoadingContexts] = useState(true)
  const [sending, setSending] = useState(false)

  const activeContext = contexts.find((c) => c.id === activeContextId) ?? contexts[0] ?? null
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
        if (withExtras.length > 0 && !activeContextId) setActiveContextId(withExtras[0].id)
      } finally {
        if (!cancelled) setLoadingContexts(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load conversations when active context changes
  useEffect(() => {
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
      const first = convs[0]
      if (first) setActiveConversationId(first.id)
      else setActiveConversationId("new-" + Date.now())
    }).catch(() => {
      if (!cancelled) setConversations([])
    })
    return () => { cancelled = true }
  }, [activeContextId])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return
    if (activeConversationId.startsWith("new-")) {
      if (activeContext) setMessages([getWelcomeMessage(activeContext)])
      return
    }
    let cancelled = false
    aiAssistantApi.getConversation(activeConversationId).then((detail) => {
      if (cancelled || !detail?.messages) return
      setMessages(detail.messages.map(dtoToMessage))
    }).catch(() => {
      if (!cancelled) setMessages([])
    })
    return () => { cancelled = true }
  }, [activeConversationId, activeContext, getWelcomeMessage])

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
    setActiveContextId(contextId)
    const first = conversations.find((c) => c.contextId === contextId)
    if (first) setActiveConversationId(first.id)
    else setActiveConversationId("new-" + Date.now())
  }, [conversations])

  const PROVIDER_KEY_TO_SELECTED: Record<string, "claude" | "gemini" | "chatgpt"> = {
    anthropic: "claude",
    openai: "chatgpt",
    gemini: "gemini",
  }
  const handleModelSelect = useCallback(
    async (providerKey: string, modelId: string) => {
      const mapped = PROVIDER_KEY_TO_SELECTED[providerKey] ?? "claude"
      setSelectedProvider(mapped)
      setSelectedModelId(modelId)
      if (!activeContextId) return
      try {
        await aiAssistantApi.updateContext(activeContextId, {
          preferredProvider: mapped,
          preferredModel: modelId,
        })
        setContexts((prev) =>
          prev.map((c) =>
            c.id === activeContextId ? { ...c, preferredProvider: mapped, preferredModel: modelId } : c
          )
        )
      } catch {
        // keep UI state on error
      }
    },
    [activeContextId]
  )

  const handleConversationSelect = useCallback((convId: string) => {
    setActiveConversationId(convId)
  }, [])

  const handleNewChat = useCallback(() => {
    setActiveConversationId("new-" + Date.now())
    if (activeContext) setMessages([getWelcomeMessage(activeContext)])
  }, [activeContext, getWelcomeMessage])

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

  const handleSendMessage = useCallback(
    async (
      content: string,
      options?: { images?: ImageAttachmentRequest[]; attachedTableData?: AttachedTableDataRequest }
    ) => {
      if (!activeContextId || sending) return
      const userMsg: AiMessage = { id: "u-" + Date.now(), role: "user", content, timestamp: new Date() }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      const attachedTableData = options?.attachedTableData ?? pendingAttachedTable ?? undefined
      setPendingAttachedTable(null)
      setPendingPrefillQuestion(null)
      try {
        const res = await aiAssistantApi.ask({
          question: content,
          contextId: activeContextId,
          conversationId: activeConversationId.startsWith("new-") ? undefined : activeConversationId,
          provider: selectedProvider,
          explainDetails: autoExplain,
          images: options?.images?.length ? options.images : undefined,
          attachedTableData: attachedTableData ?? undefined,
        })
        setActiveConversationId(res.conversationId)
        setMessages((prev) => [...prev.slice(0, -1), userMsg, askResponseToMessage(res)])
        const list = await aiAssistantApi.getConversations(activeContextId).catch(() => [])
        setConversations((list ?? []).map(dtoToConversation))
        const q = await aiAssistantApi.getMyUsage().catch(() => null)
        if (q) setQuota(quotaStatusToQuota(q))
      } catch (err) {
        setMessages((prev) => prev.slice(0, -1))
        const errMsg: AiMessage = {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Xảy ra lỗi khi gửi câu hỏi. Vui lòng thử lại.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setSending(false)
      }
    },
    [activeContextId, activeConversationId, selectedProvider, autoExplain, sending, pendingAttachedTable]
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
          pinnedMetrics={activeContext?.pinnedMetrics ?? []}
          savedQueries={activeContext?.savedQueries ?? []}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewContext={() => setCreateContextOpen(true)}
          onNewChat={handleNewChat}
          onDeleteContext={handleDeleteContext}
          onDeleteConversation={handleDeleteConversation}
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
    </>
  )
}
