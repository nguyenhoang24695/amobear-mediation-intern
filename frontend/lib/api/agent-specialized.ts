import { apiClient } from "./client"

const ADMIN = "/api/v1/agent-admin"
const APPS = "/api/v1/apps"

export type AiCategoryProfile = {
  categoryId: string
  displayName: string
  description?: string
  profileJson: string
  sortOrder: number
  isActive: boolean
}

export type PlaybookResponse = {
  appRowId: number
  playbook: null | {
    id: string
    categoryId: string
    playbookYaml: string
    version: number
    status: string
    confidence?: number
    lastUpdatedByEmail?: string
    createdAt: string
    updatedAt: string
    versions: { id: string; version: number; createdAt: string; createdByEmail?: string }[]
  }
}

export async function getCategoryProfiles(): Promise<AiCategoryProfile[]> {
  return apiClient.get<AiCategoryProfile[]>(`${ADMIN}/categories`)
}

export async function getPlaybook(appRowId: number): Promise<PlaybookResponse> {
  return apiClient.get<PlaybookResponse>(`${APPS}/${appRowId}/playbook`)
}

export async function savePlaybook(
  appRowId: number,
  body: { categoryId: string; playbookYaml: string; status: string },
): Promise<unknown> {
  return apiClient.put(`${APPS}/${appRowId}/playbook`, body)
}

export async function validatePlaybookForApp(appRowId: number, playbookYaml: string) {
  return apiClient.post<{ valid: boolean; errors: string[] }>(`${APPS}/${appRowId}/playbook/validate`, {
    playbookYaml,
  })
}

export async function autoDiscoverPlaybook(appRowId: number) {
  return apiClient.post<{ draftYaml: string; confidence: number; categoryId: string }>(
    `${APPS}/${appRowId}/playbook/auto-discover`,
    {},
  )
}

export async function getPersonas() {
  return apiClient.get(`${ADMIN}/personas`)
}

export type PlaybookVersionMeta = {
  id: string
  version: number
  createdAt: string
  createdByEmail?: string
}

export type PlaybookVersionsResponse = { appRowId: number; versions: PlaybookVersionMeta[] }

export async function getPlaybookVersions(appRowId: number): Promise<PlaybookVersionsResponse> {
  return apiClient.get<PlaybookVersionsResponse>(`${APPS}/${appRowId}/playbook/versions`)
}

export type PlaybookVersionYamlResponse = {
  appRowId: number
  version: number
  playbookYaml: string
  createdAt: string
  createdByEmail?: string
}

export async function getPlaybookVersionYaml(
  appRowId: number,
  version: number,
): Promise<PlaybookVersionYamlResponse> {
  return apiClient.get<PlaybookVersionYamlResponse>(`${APPS}/${appRowId}/playbook/versions/${version}/yaml`)
}

export async function rollbackPlaybook(appRowId: number, version: number) {
  return apiClient.post<{ rolledBackFrom: number; newVersion: number }>(
    `${APPS}/${appRowId}/playbook/rollback/${version}`,
    {},
  )
}
