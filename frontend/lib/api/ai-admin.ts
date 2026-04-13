import { apiClient } from './client'
import type { AiContextDto, CreateSystemTemplateRequest, UpdateSystemTemplateRequest } from './ai-assistant'

const API_PREFIX = '/api/v1/ai-admin'

// ============================================================
// System Config Types
// ============================================================

export interface SystemConfigDto {
  id: string
  configKey: string
  configValue: string
  description?: string
  configType: 'text' | 'json' | 'number' | 'boolean'
  category: 'base_rules' | 'craft_defaults' | 'scoring' | 'data_context'
  isActive: boolean
  version: number
  updatedBy?: string
  updatedByEmail?: string
  updatedAt: string
}

export interface UpdateSystemConfigRequest {
  configValue: string
  changeNote?: string
}

export interface SystemConfigVersionDto {
  id: string
  configId: string
  version: number
  configValue: string
  changeNote?: string
  createdBy?: string
  createdByEmail?: string
  createdAt: string
}

// ============================================================
// Role Prompt Types
// ============================================================

export interface RolePromptDto {
  id: string
  roleKey: string
  displayName: string
  craftContext: string
  craftRole: string
  craftAction: string
  craftFormat?: string
  craftTone?: string
  includedTopics: string[]
  excludedTopics: string[]
  isActive: boolean
  version: number
  updatedBy?: string
  updatedByEmail?: string
  updatedAt: string
}

export interface CreateRolePromptRequest {
  roleKey: string
  displayName: string
  craftContext: string
  craftRole: string
  craftAction: string
  craftFormat?: string
  craftTone?: string
  includedTopics?: string[]
  excludedTopics?: string[]
}

export interface UpdateRolePromptRequest {
  displayName?: string
  craftContext?: string
  craftRole?: string
  craftAction?: string
  craftFormat?: string | null
  craftTone?: string | null
  includedTopics?: string[]
  excludedTopics?: string[]
  isActive?: boolean
  changeNote?: string
}

export interface RolePromptVersionDto {
  id: string
  rolePromptId: string
  version: number
  craftContext: string
  craftRole: string
  craftAction: string
  craftFormat?: string
  craftTone?: string
  includedTopics: string[]
  excludedTopics: string[]
  changeNote?: string
  createdBy?: string
  createdByEmail?: string
  createdAt: string
}

export interface PreviewPromptResponse {
  assembledPrompt: string
  tokenCount: number
  sections: {
    baseRules: string
    craftDefaults: string
    rolePrompt: string
  }
}

export interface TestPromptRequest {
  question: string
  provider?: string
}

export interface TestPromptResponse {
  response: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

// ============================================================
// Metrics Catalog Types
// ============================================================

export interface MetricsCatalogDto {
  id: string
  metricKey: string
  displayName: string
  domain: string
  formula: string
  formulaSql?: string
  description?: string
  sourceTable?: string
  unit: string
  thresholds?: {
    healthy?: string
    warning?: string
    critical?: string
  }
  tags: string[]
  defaultPriority: number
  isActive: boolean
  createdBy?: string
  updatedAt: string
}

export interface CreateMetricRequest {
  metricKey: string
  displayName: string
  domain: string
  formula: string
  formulaSql?: string
  description?: string
  sourceTable?: string
  unit?: string
  thresholds?: {
    healthy?: string
    warning?: string
    critical?: string
  }
  tags?: string[]
  defaultPriority?: number
}

export interface UpdateMetricRequest {
  displayName?: string
  domain?: string
  formula?: string
  formulaSql?: string
  description?: string
  sourceTable?: string
  unit?: string
  thresholds?: {
    healthy?: string
    warning?: string
    critical?: string
  }
  tags?: string[]
  defaultPriority?: number
  isActive?: boolean
}

export type MetricDomain =
  | 'revenue'
  | 'engagement'
  | 'retention'
  | 'iap'
  | 'ua'
  | 'game'
  | 'ad_perf'
  | 'product'
  | 'growth'
  | 'health'

export const METRIC_DOMAINS: { value: MetricDomain; label: string; color: string }[] = [
  { value: 'revenue', label: 'Revenue', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'engagement', label: 'Engagement', color: 'bg-blue-100 text-blue-700' },
  { value: 'retention', label: 'Retention', color: 'bg-purple-100 text-purple-700' },
  { value: 'iap', label: 'IAP', color: 'bg-amber-100 text-amber-700' },
  { value: 'ua', label: 'UA', color: 'bg-rose-100 text-rose-700' },
  { value: 'game', label: 'Game', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'ad_perf', label: 'Ad Performance', color: 'bg-orange-100 text-orange-700' },
  { value: 'product', label: 'Product', color: 'bg-sky-100 text-sky-700' },
  { value: 'growth', label: 'Growth', color: 'bg-teal-100 text-teal-700' },
  { value: 'health', label: 'Health', color: 'bg-violet-100 text-violet-700' },
]

// ============================================================
// API Functions
// ============================================================

export const aiAdminApi = {
  // ── System Configs ──────────────────────────────────────
  getSystemConfigs: () =>
    apiClient.get<SystemConfigDto[]>(`${API_PREFIX}/system-configs`),

  getSystemConfig: (key: string) =>
    apiClient.get<SystemConfigDto>(`${API_PREFIX}/system-configs/${key}`),

  updateSystemConfig: (key: string, request: UpdateSystemConfigRequest) =>
    apiClient.put<SystemConfigDto>(`${API_PREFIX}/system-configs/${key}`, request),

  getSystemConfigVersions: (key: string) =>
    apiClient.get<SystemConfigVersionDto[]>(`${API_PREFIX}/system-configs/${key}/versions`),

  rollbackSystemConfig: (key: string, version: number) =>
    apiClient.post<SystemConfigDto>(`${API_PREFIX}/system-configs/${key}/rollback/${version}`),

  // ── Role Prompts ────────────────────────────────────────
  getRolePrompts: () =>
    apiClient.get<RolePromptDto[]>(`${API_PREFIX}/role-prompts`),

  getRolePrompt: (id: string) =>
    apiClient.get<RolePromptDto>(`${API_PREFIX}/role-prompts/${id}`),

  createRolePrompt: (request: CreateRolePromptRequest) =>
    apiClient.post<RolePromptDto>(`${API_PREFIX}/role-prompts`, request),

  updateRolePrompt: (id: string, request: UpdateRolePromptRequest) =>
    apiClient.put<RolePromptDto>(`${API_PREFIX}/role-prompts/${id}`, request),

  deleteRolePrompt: (id: string) =>
    apiClient.delete(`${API_PREFIX}/role-prompts/${id}`),

  getRolePromptVersions: (id: string) =>
    apiClient.get<RolePromptVersionDto[]>(`${API_PREFIX}/role-prompts/${id}/versions`),

  rollbackRolePrompt: (id: string, version: number) =>
    apiClient.post<RolePromptDto>(`${API_PREFIX}/role-prompts/${id}/rollback/${version}`),

  previewRolePrompt: (id: string) =>
    apiClient.post<PreviewPromptResponse>(`${API_PREFIX}/role-prompts/${id}/preview`),

  testRolePrompt: (id: string, request: TestPromptRequest) =>
    apiClient.post<TestPromptResponse>(`${API_PREFIX}/role-prompts/${id}/test`, request),

  // ── Metrics Catalog ─────────────────────────────────────
  getMetricsCatalog: (params?: { domain?: string; search?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get<MetricsCatalogDto[]>(`${API_PREFIX}/metrics-catalog`, params as Record<string, string | number | undefined>),

  getMetric: (id: string) =>
    apiClient.get<MetricsCatalogDto>(`${API_PREFIX}/metrics-catalog/${id}`),

  createMetric: (request: CreateMetricRequest) =>
    apiClient.post<MetricsCatalogDto>(`${API_PREFIX}/metrics-catalog`, request),

  updateMetric: (id: string, request: UpdateMetricRequest) =>
    apiClient.put<MetricsCatalogDto>(`${API_PREFIX}/metrics-catalog/${id}`, request),

  deleteMetric: (id: string) =>
    apiClient.delete(`${API_PREFIX}/metrics-catalog/${id}`),

  importMetrics: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<{ imported: number; skipped: number; errors: string[] }>(
      `${API_PREFIX}/metrics-catalog/import`,
      formData
    )
  },

  // ── Template Approval ───────────────────────────────────
  approveTemplate: (contextId: string, approved: boolean) =>
    apiClient.put<void>(`${API_PREFIX}/templates/${contextId}/approve`, { approved }),

  getPendingTemplates: (page = 1, pageSize = 50) =>
    apiClient.get<AiContextDto[]>(`${API_PREFIX}/templates/pending`, { page, pageSize }),

  // ── System Templates ──────────────────────────────────
  getSystemTemplates: (search?: string, page = 1, pageSize = 50) =>
    apiClient.get<AiContextDto[]>(`${API_PREFIX}/system-templates`, { search, page, pageSize }),

  createSystemTemplate: (request: CreateSystemTemplateRequest) =>
    apiClient.post<AiContextDto>(`${API_PREFIX}/system-templates`, request),

  updateSystemTemplate: (id: string, request: UpdateSystemTemplateRequest) =>
    apiClient.put<AiContextDto>(`${API_PREFIX}/system-templates/${id}`, request),

  deleteSystemTemplate: (id: string) =>
    apiClient.delete(`${API_PREFIX}/system-templates/${id}`),
}
