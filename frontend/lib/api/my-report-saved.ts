import { apiClient } from "@/lib/api/client"
import type { SerializedMyReportConfig } from "@/lib/reports/my-report-config-serializer"

const BASE = "/api/v1/reports/my-reports/saved"

export type MyReportSavedVisibility = "private" | "org"

export type MyReportSavedListItem = {
  id: string
  name: string
  visibility: MyReportSavedVisibility
  updatedAt: string
  ownerId?: string
  ownerName?: string
}

export type MyReportSavedTemplate = {
  id: string
  name: string
  visibility: MyReportSavedVisibility
  config: SerializedMyReportConfig
  createdAt: string
  updatedAt: string
  ownerId?: string
  ownerName?: string
}

export type SaveMyReportTemplateRequest = {
  name: string
  config: SerializedMyReportConfig
  visibility?: MyReportSavedVisibility
}

export type UpdateMyReportTemplateRequest = SaveMyReportTemplateRequest

export const myReportSavedApi = {
  list: (): Promise<MyReportSavedListItem[]> => apiClient.get(`${BASE}`),

  listShared: (): Promise<MyReportSavedListItem[]> => apiClient.get(`${BASE}/shared`),

  get: (id: string): Promise<MyReportSavedTemplate> => apiClient.get(`${BASE}/${id}`),

  create: (body: SaveMyReportTemplateRequest): Promise<MyReportSavedTemplate> =>
    apiClient.post(BASE, body),

  update: (id: string, body: UpdateMyReportTemplateRequest): Promise<MyReportSavedTemplate> =>
    apiClient.put(`${BASE}/${id}`, body),

  delete: (id: string): Promise<{ deleted: boolean }> => apiClient.delete(`${BASE}/${id}`),
}
