"use client"

import { useState, useCallback } from "react"
import { ContextSidebar } from "./context-sidebar"
import { ChatMainPanel } from "./chat-main-panel"
import { CreateContextModal } from "./create-context-modal"

export interface AiContext {
  id: string
  name: string
  icon: string
  color: string
  appIds: string[]
  appScope: string
  focusAreas: string[]
  preferredProvider: "claude" | "gemini" | "chatgpt"
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

// Per-conversation mock messages store
const mockMessagesByConversation: Record<string, AiMessage[]> = {
  "1": [
    {
      id: "1",
      role: "user",
      content: "Show me the top 10 levels with the highest drop rate in the last 7 days for puzzle_blast",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      role: "assistant",
      content: "Query này lấy top 10 level có drop_rate cao nhất trong 7 ngày qua cho app puzzle_blast.",
      timestamp: new Date(Date.now() - 240000),
      metadata: {
        sql: `SELECT level_id,
       ROUND(drop_rate, 1) AS drop_rate,
       start_users
FROM gold.fact_level_performance_puzzle_blast
WHERE event_date >= DATE_SUB(CURDATE(), 7)
ORDER BY drop_rate DESC
LIMIT 10;`,
        detailedExplanation: {
          sqlBreakdown: [
            { clause: "SELECT level_id, ROUND(drop_rate, 1)", explain: "Lấy level_id và drop_rate làm tròn 1 chữ số thập phân." },
            { clause: "FROM gold.fact_level_performance_*", explain: "Gold layer: drop_rate đã tính sẵn." },
            { clause: "WHERE event_date >= DATE_SUB(...)", explain: "Partition pruning: chỉ scan 7 partitions." },
          ],
          performanceNotes: "Scan ~3,500 rows (partition pruning).",
          businessContext: "drop_rate = drop_users / start_users × 100. Level > 15% → cần điều chỉnh game design.",
          learningTips: ["Gold layer pre-calculate → luôn thử Gold trước", "DATE_SUB + CURDATE() → auto lấy data mới nhất"],
        },
        tables: ["fact_level_performance"],
        complexity: "Low",
        provider: "claude",
        usage: { tokens: 450, cost: 0.005 },
        suggestedChart: "Bar Chart",
        queryResult: {
          columns: ["level_id", "drop_rate", "start_users"],
          rows: [
            { level_id: 42, drop_rate: "28.5%", start_users: 1234 },
            { level_id: 87, drop_rate: "25.1%", start_users: 987 },
            { level_id: 156, drop_rate: "22.3%", start_users: 2456 },
            { level_id: 23, drop_rate: "19.8%", start_users: 3421 },
            { level_id: 201, drop_rate: "18.2%", start_users: 892 },
            { level_id: 78, drop_rate: "17.5%", start_users: 1567 },
            { level_id: 134, drop_rate: "16.9%", start_users: 2103 },
            { level_id: 99, drop_rate: "15.4%", start_users: 1890 },
            { level_id: 167, drop_rate: "14.8%", start_users: 756 },
            { level_id: 45, drop_rate: "13.2%", start_users: 2890 },
          ],
          rowCount: 10,
          executionTime: 0.23,
          provider: "claude",
        },
      },
    },
  ],
  "2": [
    {
      id: "3",
      role: "user",
      content: "Show me the level progression funnel for puzzle_blast",
      timestamp: new Date(Date.now() - 86400000 - 300000),
    },
    {
      id: "4",
      role: "assistant",
      content: "Here's the level progression funnel query for puzzle_blast showing how players move through levels.",
      timestamp: new Date(Date.now() - 86400000 - 240000),
      metadata: {
        sql: `SELECT level_id,
       COUNT(DISTINCT user_id) AS players,
       ROUND(COUNT(DISTINCT user_id) / LAG(COUNT(DISTINCT user_id)) OVER (ORDER BY level_id) * 100, 1) AS retention_rate
FROM gold.fact_level_progression
WHERE app_id = 'puzzle_blast'
GROUP BY level_id
ORDER BY level_id;`,
        tables: ["fact_level_progression"],
        complexity: "Medium",
        provider: "claude",
        usage: { tokens: 380, cost: 0.004 },
        suggestedChart: "Funnel Chart",
        queryResult: {
          columns: ["level_id", "players", "retention_rate"],
          rows: [
            { level_id: 1, players: 10000, retention_rate: "100%" },
            { level_id: 2, players: 8500, retention_rate: "85%" },
            { level_id: 3, players: 7200, retention_rate: "84.7%" },
            { level_id: 4, players: 6100, retention_rate: "84.7%" },
            { level_id: 5, players: 5200, retention_rate: "85.2%" },
          ],
          rowCount: 5,
          executionTime: 0.41,
          provider: "claude",
        },
      },
    },
  ],
}

// Mock data
const mockContexts: AiContext[] = [
  {
    id: "1",
    name: "Game Analytics",
    icon: "🎮",
    color: "#3B82F6",
    appIds: ["puzzle_blast"],
    appScope: "puzzle_blast",
    focusAreas: ["Level", "Retention"],
    preferredProvider: "claude",
    explainDetailDefault: false,
    isShared: false,
    pinnedMetrics: [
      { id: "1", name: "drop_rate", formula: "drop_users / start_users * 100" },
      { id: "2", name: "win_rate", formula: "win_count / start_count * 100" },
    ],
    savedQueries: [
      { id: "1", name: "Top drop levels", sql: "SELECT level_id, drop_rate FROM ..." },
    ],
    conversationCount: 3,
  },
  {
    id: "2",
    name: "Ad Revenue",
    icon: "💰",
    color: "#10B981",
    appIds: ["all_apps"],
    appScope: "all_apps",
    focusAreas: ["IAA"],
    preferredProvider: "chatgpt",
    explainDetailDefault: true,
    isShared: false,
    pinnedMetrics: [
      { id: "3", name: "eCPM", formula: "ad_revenue / impressions * 1000" },
    ],
    savedQueries: [],
    conversationCount: 7,
  },
  {
    id: "3",
    name: "IAP (cloned)",
    icon: "📊",
    color: "#8B5CF6",
    appIds: ["premium_games"],
    appScope: "premium_games",
    focusAreas: ["IAP"],
    preferredProvider: "gemini",
    explainDetailDefault: false,
    isShared: false,
    clonedFrom: "shared-1",
    pinnedMetrics: [],
    savedQueries: [],
    conversationCount: 1,
  },
]

const mockConversations: AiConversation[] = [
  {
    id: "1",
    contextId: "1",
    title: "Drop rate analysis for puzzle_blast",
    lastMessage: "Query này lấy top 10 level có drop_rate cao nhất...",
    timestamp: new Date(),
  },
  {
    id: "2",
    contextId: "1",
    title: "Level progression funnel",
    lastMessage: "Here's the funnel analysis...",
    timestamp: new Date(Date.now() - 86400000),
  },
]

const mockQuota: UserQuota = {
  dailyTokensUsed: 78000,
  dailyTokensLimit: 100000,
  dailyCostUsed: 1.56,
  dailyCostLimit: 2.0,
  monthlyTokensUsed: 640000,
  monthlyTokensLimit: 2000000,
  monthlyCostUsed: 9.6,
  monthlyCostLimit: 30.0,
  warning: "Approaching daily limit (78%)",
}

export function AiAssistantContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [contexts, setContexts] = useState<AiContext[]>(mockContexts)
  const [conversations, setConversations] = useState<AiConversation[]>(mockConversations)
  const [activeContextId, setActiveContextId] = useState<string>("1")
  const [activeConversationId, setActiveConversationId] = useState<string>("1")
  const [messages, setMessages] = useState<AiMessage[]>(mockMessagesByConversation["1"] ?? [])
  const [selectedProvider, setSelectedProvider] = useState<"claude" | "gemini" | "chatgpt">("claude")
  const [autoExplain, setAutoExplain] = useState(false)
  const [createContextOpen, setCreateContextOpen] = useState(false)

  const activeContext = contexts.find((c) => c.id === activeContextId) || contexts[0]
  const contextConversations = conversations.filter((c) => c.contextId === activeContextId)

  // Generate welcome message for context
  const getWelcomeMessage = useCallback((context: AiContext): AiMessage => ({
    id: "welcome-" + Date.now(),
    role: "assistant",
    content: `Welcome to **${context.name}** context! I'm ready to help you analyze your data.`,
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

  // Switch context — reload first conversation of that context or show welcome
  const handleContextSelect = useCallback((contextId: string) => {
    setActiveContextId(contextId)
    const firstConv = conversations.find((c) => c.contextId === contextId)
    if (firstConv) {
      setActiveConversationId(firstConv.id)
      setMessages(mockMessagesByConversation[firstConv.id] ?? [])
    } else {
      const ctx = contexts.find((c) => c.id === contextId)!
      setActiveConversationId("new-" + Date.now())
      setMessages([getWelcomeMessage(ctx)])
    }
  }, [conversations, contexts, getWelcomeMessage])

  // Switch conversation — reload its messages
  const handleConversationSelect = useCallback((convId: string) => {
    setActiveConversationId(convId)
    setMessages(mockMessagesByConversation[convId] ?? [])
  }, [])

  // New chat — clear and show welcome
  const handleNewChat = useCallback(() => {
    const newId = "new-" + Date.now()
    setActiveConversationId(newId)
    setMessages([getWelcomeMessage(activeContext)])
  }, [activeContext, getWelcomeMessage])

  // Delete context
  const handleDeleteContext = useCallback((contextId: string) => {
    setContexts((prev) => prev.filter((c) => c.id !== contextId))
    if (activeContextId === contextId) {
      const remaining = contexts.filter((c) => c.id !== contextId)
      if (remaining.length > 0) handleContextSelect(remaining[0].id)
      else setMessages([])
    }
  }, [activeContextId, contexts, handleContextSelect])

  // Delete conversation
  const handleDeleteConversation = useCallback((convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    if (activeConversationId === convId) {
      const remaining = contextConversations.filter((c) => c.id !== convId)
      if (remaining.length > 0) handleConversationSelect(remaining[0].id)
      else handleNewChat()
    }
  }, [activeConversationId, contextConversations, handleConversationSelect, handleNewChat])

  // Create new context
  const handleCreateContext = (data: { name: string; appScope: string; prompt?: string; fromLibrary?: string }) => {
    const newContext: AiContext = {
      id: "new-" + Date.now(),
      name: data.name,
      icon: "📋",
      color: "#6366F1",
      appIds: [data.appScope],
      appScope: data.appScope,
      focusAreas: [],
      preferredProvider: "claude",
      explainDetailDefault: false,
      isShared: false,
      pinnedMetrics: [],
      savedQueries: [],
      conversationCount: 0,
    }
    setContexts((prev) => [...prev, newContext])
    setActiveContextId(newContext.id)
    setActiveConversationId("new-" + Date.now())
    setMessages([getWelcomeMessage(newContext)])
    setCreateContextOpen(false)
  }

  const handleSendMessage = (content: string) => {
    const newUserMessage: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newUserMessage])

    setTimeout(() => {
      const newAiMessage: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm analysing your query against the active context. Here's what I found.",
        timestamp: new Date(),
        metadata: {
          sql: `SELECT *\nFROM your_table\nWHERE condition = true\nLIMIT 20;`,
          tables: ["your_table"],
          complexity: "Low",
          provider: selectedProvider,
          usage: { tokens: 150, cost: 0.002 },
          suggestedChart: "Bar Chart",
          queryResult: {
            columns: ["id", "value", "count"],
            rows: [
              { id: 1, value: "A", count: 120 },
              { id: 2, value: "B", count: 95 },
              { id: 3, value: "C", count: 74 },
            ],
            rowCount: 3,
            executionTime: 0.18,
            provider: selectedProvider,
          },
        },
      }
      setMessages((prev) => [...prev, newAiMessage])
    }, 1000)
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
          pinnedMetrics={activeContext.pinnedMetrics}
          savedQueries={activeContext.savedQueries}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewContext={() => setCreateContextOpen(true)}
          onNewChat={handleNewChat}
          onDeleteContext={handleDeleteContext}
          onDeleteConversation={handleDeleteConversation}
          quota={mockQuota}
          selectedProvider={selectedProvider}
        />

        <ChatMainPanel
          context={activeContext}
          messages={messages}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          autoExplain={autoExplain}
          onAutoExplainChange={setAutoExplain}
          onSendMessage={handleSendMessage}
          sidebarOpen={sidebarOpen}
        />
      </div>

      <CreateContextModal
        open={createContextOpen}
        onOpenChange={setCreateContextOpen}
        onSubmit={handleCreateContext}
      />
    </>
  )
}
