import { structureApi, type StructureAppsResponse } from "@/lib/api/services"

export const STRUCTURE_APPS_FETCH_PAGE_SIZE = 50

export interface LoadStructureAppsProgressiveOptions {
  publisherId?: string
  approvalState?: string | null
  fetchPageSize?: number
  signal?: AbortSignal
  onFirstPage?: (response: StructureAppsResponse) => void
  onPage?: (response: StructureAppsResponse, page: number) => void
}

export async function loadStructureAppsProgressive(
  options: LoadStructureAppsProgressiveOptions = {},
): Promise<StructureAppsResponse> {
  const {
    publisherId,
    approvalState,
    fetchPageSize = STRUCTURE_APPS_FETCH_PAGE_SIZE,
    signal,
    onFirstPage,
    onPage,
  } = options

  const baseParams = {
    ...(publisherId ? { publisherId } : {}),
    approvalState: approvalState ?? undefined,
    pageSize: fetchPageSize,
  }

  const firstPage = await structureApi.getApps({ ...baseParams, page: 1 })
  if (signal?.aborted) return firstPage

  onFirstPage?.(firstPage)
  onPage?.(firstPage, 1)

  const totalApps = firstPage.summary?.totalApps ?? firstPage.apps.length
  const totalPages =
    firstPage.totalPages ??
    (totalApps > 0 ? Math.ceil(totalApps / fetchPageSize) : firstPage.apps.length > 0 ? 1 : 0)

  if (totalPages <= 1) {
    return firstPage
  }

  const mergedApps = [...firstPage.apps]
  for (let page = 2; page <= totalPages; page += 1) {
    if (signal?.aborted) {
      return {
        ...firstPage,
        apps: mergedApps,
        page: 1,
        pageSize: fetchPageSize,
        totalPages,
      }
    }

    const response = await structureApi.getApps({ ...baseParams, page })
    onPage?.(response, page)
    mergedApps.push(...response.apps)
  }

  return {
    ...firstPage,
    apps: mergedApps,
    page: 1,
    pageSize: fetchPageSize,
    totalPages,
  }
}
