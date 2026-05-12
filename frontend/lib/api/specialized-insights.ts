import { apiClient } from "./client"

const AGENTS = "/api/v1/agents"
const APPS = "/api/v1/apps"
export const PERSONA_CHAT_TIMEOUT_MS = 30 * 60 * 1000

export type PersonaReportListItem = {
  id: string
  reportDate: string
  healthScore?: number | null
  playbookVersionUsed?: number | null
  createdAt: string
}

export async function listPersonaReports(
  personaId: string,
  appRowId: number,
  args?: { date?: string; from?: string; to?: string },
) {
  return apiClient.get<{
    persona: string
    appId: number
    date?: string
    from?: string
    to?: string
    items: PersonaReportListItem[]
  }>(
    `${AGENTS}/${personaId}/reports/${appRowId}`,
    args ? args : undefined,
  )
}

export async function getPersonaReportDetail(personaId: string, reportId: string) {
  return apiClient.get<{
    id: string
    personaId: string
    appRowId: number
    reportDate: string
    payloadJson: string
    healthScore?: number | null
    playbookVersionUsed?: number | null
    createdAt: string
  }>(`${AGENTS}/${personaId}/reports/${reportId}/detail`)
}

export async function generatePersonaDigest(personaId: string, appRowId: number, dateYmd: string) {
  // Backend expects date in querystring as DateOnly
  return apiClient.post<{
    persona: string
    appId: number
    status: string
    reportDate: string
    generatedAtUtc: string
    digestMarkdown: string
    reportId: string
    recentReportCount7d: number
  }>(`${AGENTS}/${personaId}/digest/${appRowId}/generate?date=${encodeURIComponent(dateYmd)}`, {})
}

export type AppPersonaContext = {
  id: string
  version: number
  contextMd: string
  extrasJson: string
  lastUpdatedByEmail?: string | null
  createdAt: string
  updatedAt: string
}

export async function getAppPersonaContext(appRowId: number, personaId: string) {
  return apiClient.get<{ appRowId: number; personaId: string; context: AppPersonaContext | null }>(
    `${APPS}/${appRowId}/personas/${personaId}/context`,
  )
}

export async function upsertAppPersonaContext(
  appRowId: number,
  personaId: string,
  body: { contextMd: string; extrasJson?: string | null },
) {
  return apiClient.put<{ appRowId: number; personaId: string; id: string; version: number; updatedAt: string }>(
    `${APPS}/${appRowId}/personas/${personaId}/context`,
    body,
  )
}

export type AppPersonaContextVersionMeta = {
  id: string
  version: number
  createdAt: string
  createdByEmail?: string | null
}

export async function listAppPersonaContextVersions(appRowId: number, personaId: string) {
  return apiClient.get<{ appRowId: number; personaId: string; items: AppPersonaContextVersionMeta[] }>(
    `${APPS}/${appRowId}/personas/${personaId}/context/versions`,
  )
}

export async function getAppPersonaContextVersion(appRowId: number, personaId: string, version: number) {
  return apiClient.get<{
    appRowId: number
    personaId: string
    version: number
    contextMd: string
    extrasJson: string
    createdAt: string
    createdByEmail?: string | null
  }>(`${APPS}/${appRowId}/personas/${personaId}/context/versions/${version}`)
}

export async function rollbackAppPersonaContext(appRowId: number, personaId: string, version: number) {
  return apiClient.post<{
    appRowId: number
    personaId: string
    rolledBackFromVersion: number
    newVersion: number
    updatedAt: string
  }>(`${APPS}/${appRowId}/personas/${personaId}/context/rollback/${version}`, {})
}

export type PersonaChatSession = {
  id: string
  appRowId: number
  personaId: string
  title: string
  lensFamily?: string | null
  referenceReportId?: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

export type PersonaChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  payloadJson?: string | null
  createdAt: string
  latencyMs?: number | null
}

export async function createPersonaChatSession(
  personaId: string,
  body: { appRowId: number; title?: string | null; lensFamily?: string | null; referenceReportId?: string | null },
) {
  return apiClient.post<{ session: PersonaChatSession }>(`${AGENTS}/${personaId}/chat/sessions`, body)
}

export async function listPersonaChatSessions(personaId: string, appRowId: number) {
  return apiClient.get<{ persona: string; appRowId: number; items: PersonaChatSession[] }>(
    `${AGENTS}/${personaId}/chat/sessions`,
    { appRowId },
  )
}

export async function getPersonaChatSession(personaId: string, sessionId: string) {
  return apiClient.get<{ session: PersonaChatSession; messages: PersonaChatMessage[] }>(
    `${AGENTS}/${personaId}/chat/sessions/${sessionId}`,
  )
}

export async function sendPersonaChatMessage(personaId: string, sessionId: string, message: string) {
  return apiClient.post<{ sessionId: string; persona: string; assistant: PersonaChatMessage }>(
    `${AGENTS}/${personaId}/chat/sessions/${sessionId}/messages`,
    { message },
  )
}

export type PersonaChatAttachment = {
  kind: "text" | "image"
  fileName: string
  contentType?: string | null
  text?: string | null
  base64Data?: string | null
}

export async function sendPersonaChatMessageV2(
  personaId: string,
  sessionId: string,
  args: { message: string; useMcp?: boolean; planText?: string | null; attachments?: PersonaChatAttachment[] },
) {
  return apiClient.post<{ sessionId: string; persona: string; assistant: PersonaChatMessage }>(
    `${AGENTS}/${personaId}/chat/sessions/${sessionId}/messages`,
    { message: args.message, useMcp: args.useMcp ?? false, planText: args.planText ?? null, attachments: args.attachments ?? null },
    PERSONA_CHAT_TIMEOUT_MS,
  )
}

