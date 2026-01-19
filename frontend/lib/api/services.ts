import { apiClient } from './client'
import type {
  App,
  MediationGroup,
  PerformanceData,
  PerformanceSummary,
  PagedResponse,
  TopApp,
  DashboardMetrics,
} from '@/types/api'

// Structure API Service
export const structureApi = {
  // Apps
  getApps: async (publisherId?: string): Promise<App[]> => {
    return apiClient.get<App[]>('/api/Structure/apps', { publisherId })
  },

  getApp: async (id: number): Promise<App> => {
    return apiClient.get<App>(`/api/Structure/apps/${id}`)
  },

  // Mediation Groups
  getMediationGroups: async (
    publisherId?: string,
    platform?: string,
    adFormat?: string
  ): Promise<MediationGroup[]> => {
    return apiClient.get<MediationGroup[]>('/api/Structure/mediationgroups', {
      publisherId,
      platform,
      adFormat,
    })
  },

  getMediationGroup: async (id: number): Promise<MediationGroup> => {
    return apiClient.get<MediationGroup>(`/api/Structure/mediationgroups/${id}`)
  },

  getMediationGroupByAdMobId: async (
    mediationGroupId: string
  ): Promise<MediationGroup> => {
    return apiClient.get<MediationGroup>(
      `/api/Structure/mediationgroups/admob/${mediationGroupId}`
    )
  },
}

// Performance Data API Service
export const performanceApi = {
  getPerformanceData: async (params: {
    publisherId?: string
    appId?: string
    mediationGroupId?: string
    adSourceId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<PagedResponse<PerformanceData>> => {
    return apiClient.get<PagedResponse<PerformanceData>>(
      '/api/PerformanceData',
      params
    )
  },

  getPerformanceSummary: async (params: {
    publisherId?: string
    startDate?: string
    endDate?: string
  }): Promise<PerformanceSummary[]> => {
    return apiClient.get<PerformanceSummary[]>(
      '/api/PerformanceData/summary',
      params
    )
  },

  getPerformanceDataById: async (id: number): Promise<PerformanceData> => {
    return apiClient.get<PerformanceData>(`/api/PerformanceData/${id}`)
  },
}

// Dashboard API Service
export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    // Calculate metrics from performance summary
    const summary = await performanceApi.getPerformanceSummary({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    })

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayData = await performanceApi.getPerformanceData({
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      pageSize: 1,
    })

    const yesterdayData = await performanceApi.getPerformanceData({
      startDate: yesterday.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0],
      pageSize: 1,
    })

    const todayRevenue = todayData.data.reduce(
      (sum, d) => sum + (d.revenueMicros || 0),
      0
    ) / 1_000_000

    const yesterdayRevenue = yesterdayData.data.reduce(
      (sum, d) => sum + (d.revenueMicros || 0),
      0
    ) / 1_000_000

    const totalRevenue = summary.reduce(
      (sum, s) => sum + s.totalRevenueMicros,
      0
    ) / 1_000_000

    const totalImpressions = summary.reduce(
      (sum, s) => sum + s.totalImpressions,
      0
    )

    const avgEcpm =
      summary.reduce((sum, s) => sum + s.avgEcpmMicros, 0) /
      summary.length /
      1_000_000

    const avgFillRate =
      summary.reduce((sum, s) => sum + s.avgFillRate, 0) / summary.length

    return {
      revenueToday: {
        value: todayRevenue,
        change: yesterdayRevenue > 0
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
          : 0,
        trend: todayRevenue >= yesterdayRevenue ? 'up' : 'down',
      },
      averageEcpm: {
        value: avgEcpm,
        change: 0, // TODO: Calculate from previous period
        trend: 'up',
      },
      impressions: {
        value: totalImpressions,
        change: 0, // TODO: Calculate from previous period
        trend: 'up',
      },
      fillRate: {
        value: avgFillRate * 100,
        change: 0, // TODO: Calculate from previous period
        trend: 'up',
      },
    }
  },

  getTopApps: async (limit: number = 5): Promise<TopApp[]> => {
    const apps = await structureApi.getApps()
    const summary = await performanceApi.getPerformanceSummary({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    })

    // Get performance data for each app
    const topApps: TopApp[] = []

    for (const app of apps.slice(0, limit * 2)) {
      const appPerformance = await performanceApi.getPerformanceData({
        appId: app.appId,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        pageSize: 100,
      })

      const revenue = appPerformance.data.reduce(
        (sum, d) => sum + (d.revenueMicros || 0),
        0
      ) / 1_000_000

      if (revenue > 0) {
        const avgEcpm =
          appPerformance.data.reduce(
            (sum, d) => sum + (d.ecpmMicros || 0),
            0
          ) /
          appPerformance.data.length /
          1_000_000

        topApps.push({
          id: app.id,
          appId: app.appId,
          name: app.name,
          displayName: app.displayName,
          revenue,
          ecpm: avgEcpm,
          trend: 'up', // TODO: Calculate trend
        })
      }
    }

    return topApps
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  },
}
