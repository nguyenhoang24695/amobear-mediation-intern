import { apiClient } from './client'

const API_PREFIX = '/api/v1/ai-assistant'

// Types
export interface ImageAttachmentRequest {
  base64Data: string
  mediaType: string
}

export interface AttachedTableDataRequest {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface AskRequest {
  question: string
  contextId?: string
  conversationId?: string
  provider?: string
  explainDetails?: boolean
  images?: ImageAttachmentRequest[]
  attachedTableData?: AttachedTableDataRequest
}

export interface AskResponse {
  messageId: string
  conversationId: string
  content: string
  sql?: string
  explanation?: string
  detailedExplanation?: DetailedExplanation
  tablesUsed?: string[]
  estimatedComplexity?: string
  suggestedChart?: string
  warnings?: string[]
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  latencyMs: number
}

export interface DetailedExplanation {
  summary: string
  breakdown: SqlBreakdownItem[]
  performance: PerformanceAnalysis
  businessContext: string
  tips: string[]
}

export interface SqlBreakdownItem {
  clause: string
  explanation: string
  table?: string
  column?: string
}

export interface PerformanceAnalysis {
  estimatedCost: string
  partitionUsage: string
  indexUsage: string
  recommendations: string[]
}

export interface ExecuteSqlRequest {
  sql: string
  messageId?: string
  limit?: number
}

export interface ExecuteSqlResponse {
  success: boolean
  data?: Record<string, unknown>[]
  columns?: ColumnMetadata[]
  rowCount: number
  executionMs: number
  error?: string
  warning?: string
}

export interface ColumnMetadata {
  name: string
  type: string
}

export interface AiContextDto {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  appIds: string[]
  focusAreas: string[]
  preferredProvider: string
  preferredModel?: string
  rolePromptId?: string
  rolePromptName?: string
  isDefault: boolean
  isShared: boolean
  cloneCount: number
  rating: number
  createdAt: string
  updatedAt: string
  // Template-specific fields
  isSystemTemplate?: boolean
  systemContextKey?: string
  isApproved?: boolean
  includeDataContext?: boolean
  sharedBy?: string
  sharedByEmail?: string
  reviewCount?: number
}

export interface TemplateStatsDto {
  totalTemplates: number
  systemTemplates: number
  communityApproved: number
  communityPending: number
  totalClones: number
}

export interface CreateSystemTemplateRequest {
  systemContextKey: string
  name: string
  description?: string
  icon?: string
  color?: string
  appIds?: string[]
  focusAreas?: string[]
  preferredProvider?: string
  rolePromptId?: string
  includeDataContext?: boolean
  pinnedMetrics?: CreatePinnedMetricRequest[]
}

export interface UpdateSystemTemplateRequest {
  name?: string
  description?: string
  icon?: string
  color?: string
  appIds?: string[]
  focusAreas?: string[]
  preferredProvider?: string
  rolePromptId?: string
  includeDataContext?: boolean
  pinnedMetrics?: CreatePinnedMetricRequest[]
}

export interface CreateContextRequest {
  name: string
  description?: string
  icon?: string
  color?: string
  appIds?: string[]
  focusAreas?: string[]
  preferredProvider?: string
  preferredModel?: string
  rolePromptId?: string
  isDefault?: boolean
  pinnedMetrics?: CreatePinnedMetricRequest[]
}

export interface UpdateContextRequest {
  name?: string
  description?: string
  icon?: string
  color?: string
  appIds?: string[]
  focusAreas?: string[]
  preferredProvider?: string
  preferredModel?: string
  rolePromptId?: string
  isDefault?: boolean
  pinnedMetrics?: CreatePinnedMetricRequest[]
}

export interface PinnedMetricDto {
  id: string
  metricName: string
  metricFormula: string
  description?: string
  sourceTable?: string
  sortOrder: number
}

export interface CreatePinnedMetricRequest {
  metricName: string
  metricFormula: string
  description?: string
  sourceTable?: string
}

export interface SavedQueryDto {
  id: string
  name: string
  sql: string
  description?: string
  tags: string[]
  useCount: number
  createdAt: string
  lastUsedAt?: string
}

export interface CreateSavedQueryRequest {
  name: string
  sql: string
  description?: string
  tags?: string[]
}

export interface ConversationDto {
  id: string
  contextId: string
  title: string
  summary?: string
  messageCount: number
  totalTokens: number
  totalCost: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface ConversationDetailDto extends ConversationDto {
  contextName: string
  messages: MessageDto[]
  isShared?: boolean
  isOwner?: boolean
}

export interface MessageDto {
  id: string
  role: string
  content: string
  sql?: string
  explanation?: string
  tablesUsed?: string[]
  estimatedComplexity?: string
  suggestedChart?: string
  warnings?: string[]
  provider?: string
  model?: string
  inputTokens: number
  outputTokens: number
  cost: number
  latencyMs: number
  queryExecuted: boolean
  queryRowCount?: number
  queryExecutionMs?: number
  queryResultColumns?: string[]
  queryResultRows?: Record<string, unknown>[]
  rating?: number
  feedback?: string
  createdAt: string
}

export interface UserQuotaStatus {
  dailyTokensUsed: number
  dailyTokenLimit: number
  dailyCostUsed: number
  dailyCostLimit: number
  monthlyTokensUsed: number
  monthlyTokenLimit: number
  monthlyCostUsed: number
  monthlyCostLimit: number
  dailyPercentUsed: number
  monthlyPercentUsed: number
  isNearLimit: boolean
  isOverLimit: boolean
}

export interface UsageSummary {
  todayTokens: number
  todayCost: number
  todayRequests: number
  last7DaysTokens: number
  last7DaysCost: number
  last7DaysRequests: number
  thisMonthTokens: number
  thisMonthCost: number
  thisMonthRequests: number
  dailyBreakdown: UsageStatistics[]
  byProvider: ProviderUsage[]
}

export interface UsageStatistics {
  date: string
  provider?: string
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cost: number
  requestCount: number
}

export interface ProviderUsage {
  provider: string
  totalTokens: number
  cost: number
  requestCount: number
}

export interface KnowledgeBaseEntry {
  id: string
  title: string
  category: string
  content: string
  tags: string[]
  focusAreas: string[]
  priority: number
  tokenCount: number
  isActive: boolean
  isUserSubmitted: boolean
  isReviewed: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateKnowledgeBaseRequest {
  title: string
  category: string
  content: string
  tags?: string[]
  focusAreas?: string[]
  priority?: number
}

export interface TeamMemberUsage {
  userId: string
  email: string
  fullName: string
  role: string
  todayTokens: number
  todayCost: number
  monthTokens: number
  monthCost: number
  dailyTokenLimit: number
  monthlyTokenLimit: number
}

export interface QuotaUser {
  id: string
  email: string
  fullName: string
  role: string
}

export interface TeamUsageResponse {
  members: TeamMemberUsage[]
  totalTodayTokens: number
  totalTodayCost: number
  totalMonthTokens: number
  totalMonthCost: number
}

export interface QuotaConfig {
  id: string
  scopeType: string
  scopeValue?: string
  userId?: string
  userEmail?: string
  dailyTokenLimit: number
  monthlyTokenLimit: number
  dailyCostLimit: number
  monthlyCostLimit: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateQuotaRequest {
  scopeType: string
  scopeValue?: string
  userId?: string
  dailyTokenLimit?: number
  monthlyTokenLimit?: number
  dailyCostLimit?: number
  monthlyCostLimit?: number
}

export interface DiscoveredModelDto {
  modelId: string
  displayName: string
  createdAt?: string
  contextWindow?: number
  isRecommended: boolean
}

export interface AiProviderConfigDto {
  id: string
  providerKey: string
  displayName: string
  hasApiKey: boolean
  apiKeyHint?: string
  endpointUrl?: string
  extraConfig?: string
  isEnabled: boolean
  isConnected: boolean
  lastTestAt?: string
  lastTestError?: string
  availableModels: DiscoveredModelDto[]
  defaultModel?: string
  modelsFetchedAt?: string
  priority: number
  costPerInputToken: number
  costPerOutputToken: number
  createdAt: string
  updatedAt: string
}

export interface UpdateProviderConfigRequest {
  apiKey?: string
  endpointUrl?: string
  extraConfig?: string
  defaultModel?: string
  isEnabled?: boolean
  priority?: number
  costPerInputToken?: number
  costPerOutputToken?: number
}

export interface TestProviderRequest {
  providerKey: string
  apiKey: string
  extraConfig?: string
}

export interface TestResult {
  isSuccess: boolean
  errorMessage?: string
  statusCode?: number
  models: DiscoveredModelDto[]
}

export interface GlobalSettingsDto {
  defaultTemperature: number
  defaultMaxTokens: number
  requestTimeoutSeconds: number
}

export interface FallbackOrderRequest {
  providerKeys: string[]
}

export interface AiModelInfoDto {
  modelId: string
  displayName: string
  description?: string
  maxContextLength?: number
  costPer1KInputTokens?: number
  costPer1KOutputTokens?: number
  isRecommended: boolean
}

// API Functions
export const aiAssistantApi = {
  // Chat
  ask: (request: AskRequest) =>
    apiClient.post<AskResponse>(`${API_PREFIX}/ask`, request),

  executeSql: (request: ExecuteSqlRequest) =>
    apiClient.post<ExecuteSqlResponse>(`${API_PREFIX}/execute`, request),

  explainDetails: (sql: string, messageId?: string) =>
    apiClient.post<DetailedExplanation>(`${API_PREFIX}/explain-details`, { sql, messageId }),

  addFeedback: (messageId: string, rating: number, feedback?: string) =>
    apiClient.post<MessageDto>(`${API_PREFIX}/messages/${messageId}/feedback`, { rating, feedback }),

  // Contexts
  getContexts: () =>
    apiClient.get<AiContextDto[]>(`${API_PREFIX}/contexts`),

  getContext: (id: string) =>
    apiClient.get<AiContextDto>(`${API_PREFIX}/contexts/${id}`),

  createContext: (request: CreateContextRequest) =>
    apiClient.post<AiContextDto>(`${API_PREFIX}/contexts`, request),

  updateContext: (id: string, request: UpdateContextRequest) =>
    apiClient.put<AiContextDto>(`${API_PREFIX}/contexts/${id}`, request),

  deleteContext: (id: string) =>
    apiClient.delete(`${API_PREFIX}/contexts/${id}`),

  setDefaultContext: (id: string) =>
    apiClient.post<AiContextDto>(`${API_PREFIX}/contexts/${id}/set-default`),

  // Pinned Metrics
  getPinnedMetrics: (contextId: string) =>
    apiClient.get<PinnedMetricDto[]>(`${API_PREFIX}/contexts/${contextId}/pinned-metrics`),

  addPinnedMetric: (contextId: string, request: CreatePinnedMetricRequest) =>
    apiClient.post<PinnedMetricDto>(`${API_PREFIX}/contexts/${contextId}/pinned-metrics`, request),

  removePinnedMetric: (contextId: string, metricId: string) =>
    apiClient.delete(`${API_PREFIX}/contexts/${contextId}/pinned-metrics/${metricId}`),

  // Saved Queries
  getSavedQueries: (contextId: string) =>
    apiClient.get<SavedQueryDto[]>(`${API_PREFIX}/contexts/${contextId}/saved-queries`),

  saveQuery: (contextId: string, request: CreateSavedQueryRequest) =>
    apiClient.post<SavedQueryDto>(`${API_PREFIX}/contexts/${contextId}/saved-queries`, request),

  deleteSavedQuery: (contextId: string, queryId: string) =>
    apiClient.delete(`${API_PREFIX}/contexts/${contextId}/saved-queries/${queryId}`),

  // Library
  getSharedContexts: (search?: string, filter?: 'system' | 'community' | 'pending', page = 1, pageSize = 20) =>
    apiClient.get<AiContextDto[]>(`${API_PREFIX}/library`, { search, filter, page, pageSize }),

  getLibraryStats: () =>
    apiClient.get<TemplateStatsDto>(`${API_PREFIX}/library/stats`),

  cloneContext: (contextId: string) =>
    apiClient.post<AiContextDto>(`${API_PREFIX}/library/${contextId}/clone`),

  shareContext: (contextId: string) =>
    apiClient.post<AiContextDto>(`${API_PREFIX}/contexts/${contextId}/share`),

  unshareContext: (contextId: string) =>
    apiClient.post<AiContextDto>(`${API_PREFIX}/contexts/${contextId}/unshare`),

  // Conversations
  getConversations: (contextId?: string, includeArchived = false) =>
    apiClient.get<ConversationDto[]>(`${API_PREFIX}/conversations`, { contextId, includeArchived: includeArchived ? 'true' : 'false' }),

  getConversation: (id: string) =>
    apiClient.get<ConversationDetailDto>(`${API_PREFIX}/conversations/${id}`),

  shareConversation: (id: string) =>
    apiClient.post<ConversationDto>(`${API_PREFIX}/conversations/${id}/share`),

  forkConversation: (id: string, targetContextId?: string) =>
    apiClient.post<ConversationDetailDto>(
      `${API_PREFIX}/conversations/${id}/fork${targetContextId ? `?targetContextId=${encodeURIComponent(targetContextId)}` : ''}`
    ),

  updateConversationTitle: (id: string, title: string) =>
    apiClient.put<ConversationDto>(`${API_PREFIX}/conversations/${id}/title`, { title }),

  archiveConversation: (id: string) =>
    apiClient.post(`${API_PREFIX}/conversations/${id}/archive`),

  deleteConversation: (id: string) =>
    apiClient.delete(`${API_PREFIX}/conversations/${id}`),

  // Knowledge Base
  getKnowledgeBase: (params?: {
    category?: string
    focusArea?: string
    search?: string
    isActive?: boolean
    needsReview?: boolean
    page?: number
    pageSize?: number
  }) =>
    apiClient.get<KnowledgeBaseEntry[]>(`${API_PREFIX}/knowledge-base`, params as Record<string, string | number | undefined>),

  getKnowledgeBaseEntry: (id: string) =>
    apiClient.get<KnowledgeBaseEntry>(`${API_PREFIX}/knowledge-base/${id}`),

  createKnowledgeBaseEntry: (request: CreateKnowledgeBaseRequest) =>
    apiClient.post<KnowledgeBaseEntry>(`${API_PREFIX}/knowledge-base`, request),

  updateKnowledgeBaseEntry: (id: string, request: Partial<CreateKnowledgeBaseRequest & { isActive?: boolean }>) =>
    apiClient.put<KnowledgeBaseEntry>(`${API_PREFIX}/knowledge-base/${id}`, request),

  deleteKnowledgeBaseEntry: (id: string) =>
    apiClient.delete(`${API_PREFIX}/knowledge-base/${id}`),

  reviewKnowledgeBaseEntry: (id: string, approve: boolean) =>
    apiClient.post<KnowledgeBaseEntry>(`${API_PREFIX}/knowledge-base/${id}/review`, { approve }),

  // Usage & Quota
  getMyUsage: () =>
    apiClient.get<UserQuotaStatus>(`${API_PREFIX}/my-usage`),

  getUsageSummary: () =>
    apiClient.get<UsageSummary>(`${API_PREFIX}/usage/summary`),

  getDailyUsage: (startDate: string, endDate: string) =>
    apiClient.get<UsageStatistics[]>(`${API_PREFIX}/usage/daily`, { startDate, endDate }),

  // Team usage (admin)
  getTeamUsage: () =>
    apiClient.get<TeamUsageResponse>(`${API_PREFIX}/team-usage`),

  getQuotaUsers: () =>
    apiClient.get<QuotaUser[]>(`${API_PREFIX}/admin/users`),

  // Admin Quotas
  getQuotaConfigs: () =>
    apiClient.get<QuotaConfig[]>(`${API_PREFIX}/admin/quotas`),

  createQuota: (request: CreateQuotaRequest) =>
    apiClient.post<QuotaConfig>(`${API_PREFIX}/admin/quotas`, request),

  updateQuota: (id: string, request: Partial<CreateQuotaRequest & { isActive?: boolean }>) =>
    apiClient.put<QuotaConfig>(`${API_PREFIX}/admin/quotas/${id}`, request),

  deleteQuota: (id: string) =>
    apiClient.delete(`${API_PREFIX}/admin/quotas/${id}`),

  // Provider Settings - New API at /api/v1/ai-providers
  getProviderConfigs: () =>
    apiClient.get<AiProviderConfigDto[]>('/api/v1/ai-providers/config'),

  testProvider: (request: TestProviderRequest) =>
    apiClient.post<TestResult>('/api/v1/ai-providers/test', request),

  saveProviderConfig: (providerKey: string, request: UpdateProviderConfigRequest) =>
    apiClient.put<{ message: string }>(`/api/v1/ai-providers/config/${providerKey}`, request),

  refreshProviderModels: (providerKey: string) =>
    apiClient.post<{ message: string; models: DiscoveredModelDto[] }>(`/api/v1/ai-providers/${providerKey}/refresh-models`),

  updateFallbackOrder: (request: FallbackOrderRequest) =>
    apiClient.put<{ message: string }>('/api/v1/ai-providers/fallback-order', request),

  getGlobalSettings: () =>
    apiClient.get<GlobalSettingsDto>('/api/v1/ai-providers/global-settings'),

  updateGlobalSettings: (request: GlobalSettingsDto) =>
    apiClient.put<{ message: string }>('/api/v1/ai-providers/global-settings', request),

  getProviderModels: (providerKey: string) =>
    apiClient.get<AiModelInfoDto[]>(`${API_PREFIX}/settings/providers/${providerKey}/models`),
}
