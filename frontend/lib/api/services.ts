import type {
    AdUnit,
    App,
    DashboardMetrics,
    DashboardKeyMetrics,
    DateRangeType,
    MediationGroup,
    PagedResponse,
    PerformanceData,
    PerformanceSummary,
    RecentActivities,
    RevenueByNetwork,
    RevenueOverview,
    TopApp,
    TopApps,
} from '@/types/api'
import { apiClient } from './client'

// Auth Types
export interface LoginRequest {
    email: string
    password: string
    organizationSlug?: string
    deviceInfo?: string
    ipAddress?: string
}

export interface AuthResponse {
    success: boolean
    data?: {
        accessToken: string
        refreshToken: string
        expiresIn: number
        tokenType: string
        user: {
            id: string
            email: string
            firstName?: string
            lastName?: string
            fullName?: string
            avatarUrl?: string
            role: string
            organization?: {
                id: string
                name: string
                slug: string
                logoUrl?: string
            }
            teams: Array<{
                id: string
                name: string
                role: string
            }>
            permissions?: Record<string, string>
        }
    }
    error?: {
        code: string
        message: string
    }
}

export interface RefreshTokenRequest {
    refreshToken: string
}

export interface ForgotPasswordRequest {
    email: string
    organizationSlug?: string
}

export interface ResetPasswordRequest {
    token: string
    newPassword: string
    confirmPassword: string
}

export interface ChangePasswordRequest {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

export interface CurrentUser {
    id: string
    email: string
    firstName?: string
    lastName?: string
    fullName?: string
    avatarUrl?: string
    role: string
    organizationId?: string
}

// Structure API Service
export const structureApi = {
    // Apps - Returns apps with metrics from cache and summary
    getApps: async (publisherId?: string): Promise<{
        apps: App[]
        summary: {
            totalApps: number
            totalAdUnits: number
            averageEcpm: number
        }
    }> => {
        return apiClient.get('/api/Structure/apps', { publisherId })
    },

    getApp: async (id: number): Promise<App> => {
        return apiClient.get<App>(`/api/Structure/apps/${id}`)
    },

    getAppAdUnits: async (id: number): Promise<AdUnit[]> => {
        return apiClient.get<AdUnit[]>(`/api/Structure/apps/${id}/adunits`)
    },

    getAppAdUnitsCount: async (id: number): Promise<{ appId: number; adUnitsCount: number }> => {
        return apiClient.get(`/api/Structure/apps/${id}/adunits/count`)
    },

    getAppMediationGroups: async (id: number): Promise<MediationGroup[]> => {
        return apiClient.get<MediationGroup[]>(`/api/Structure/apps/${id}/mediationgroups`)
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

    getMediationGroupAdSources: async (id: number): Promise<{
        mediationGroupId: number
        adSources: string[]
    }> => {
        return apiClient.get(`/api/Structure/mediationgroups/${id}/adsources`)
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

// Auth API Service
export const authApi = {
    login: async (request: LoginRequest): Promise<AuthResponse> => {
        return apiClient.post<AuthResponse>('/api/v1/auth/login', request)
    },

    refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
        return apiClient.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken })
    },

    logout: async (refreshToken?: string): Promise<{ success: boolean; message?: string }> => {
        if (refreshToken) {
            return apiClient.post('/api/v1/auth/logout', { refreshToken })
        }
        return apiClient.post('/api/v1/auth/logout', {})
    },

    logoutAll: async (): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post('/api/v1/auth/logout-all', {})
    },

    getCurrentUser: async (): Promise<{ success: boolean; data?: CurrentUser }> => {
        return apiClient.get('/api/v1/auth/me')
    },

    forgotPassword: async (request: ForgotPasswordRequest): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post('/api/v1/auth/forgot-password', request)
    },

    resetPassword: async (request: ResetPasswordRequest): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post('/api/v1/auth/reset-password', request)
    },

    changePassword: async (request: ChangePasswordRequest): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post('/api/v1/auth/change-password', request)
    },
}

// Dashboard API Service
export const dashboardApi = {
    // New API endpoints following the spec
    getKeyMetrics: async (params: {
        range?: DateRangeType
        startDate?: string
        endDate?: string
    }): Promise<DashboardKeyMetrics> => {
        return apiClient.get('/api/v1/dashboard/key-metrics', params)
    },

    getRevenueOverview: async (params: {
        range?: DateRangeType
        startDate?: string
        endDate?: string
        metric?: 'revenue' | 'ecpm' | 'impressions'
    }): Promise<RevenueOverview> => {
        return apiClient.get('/api/v1/dashboard/revenue-overview', params)
    },

    getRevenueOverviewForApp: async (appId: string | number, params: {
        range?: DateRangeType
        startDate?: string
        endDate?: string
        metric?: 'revenue' | 'ecpm' | 'impressions'
    }): Promise<RevenueOverview> => {
        return apiClient.get(`/api/v1/dashboard/revenue-overview/app/${appId}`, params)
    },

    getTopApps: async (params: {
        range?: DateRangeType
        startDate?: string
        endDate?: string
        limit?: number
    }): Promise<TopApps> => {
        return apiClient.get('/api/v1/dashboard/top-apps', params)
    },

    getRevenueByNetwork: async (params: {
        range?: DateRangeType
        startDate?: string
        endDate?: string
    }): Promise<RevenueByNetwork> => {
        return apiClient.get('/api/v1/dashboard/revenue-by-network', params)
    },

    getRecentActivities: async (params: {
        limit?: number
    }): Promise<RecentActivities> => {
        return apiClient.get('/api/v1/dashboard/recent-activities', params)
    },

    // Legacy endpoints (for backward compatibility)
    getChartData: async (params: {
        publisherId?: string
        appId?: string
        mediationGroupId?: string
        startDate?: string
        endDate?: string
        groupBy?: string
        period?: 'today' | '7days' | '30days'
    }): Promise<Array<{
        date: string
        revenue: number
        impressions: number
        ecpm: number
        fillRate: number
        matchRate: number
    }>> => {
        // If period is provided, try cache first
        if (params.period) {
            try {
                const cached = await apiClient.get(`/api/DashboardCache/chart/${params.period}`)
                if (cached && Array.isArray(cached)) {
                    return cached as Array<{
                        date: string
                        revenue: number
                        impressions: number
                        ecpm: number
                        fillRate: number
                        matchRate: number
                    }>
                }
            } catch (err) {
                // If cache miss, fall back to calculation
                console.log('Cache miss, calculating chart data...')
            }
        }

        // Fallback to calculation if cache miss or no period provided
        return apiClient.get('/api/PerformanceData/chart', {
            publisherId: params.publisherId,
            appId: params.appId,
            mediationGroupId: params.mediationGroupId,
            startDate: params.startDate,
            endDate: params.endDate,
            groupBy: params.groupBy
        })
    },

    getMetrics: async (period: 'today' | '7days' | '30days' = 'today'): Promise<DashboardMetrics> => {
        // Try to get from cache first
        try {
            const cached = await apiClient.get(`/api/DashboardCache/metrics/${period}`)
            if (cached) {
                return cached as DashboardMetrics
            }
        } catch (err) {
            // If cache miss, fall back to calculation
            console.log('Cache miss, calculating metrics...')
        }

        // Fallback to calculation if cache miss
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
            summary.length > 0
                ? summary.reduce((sum, s) => sum + s.avgEcpmMicros, 0) /
                summary.length /
                1_000_000
                : 0

        const avgFillRate =
            summary.length > 0
                ? summary.reduce((sum, s) => sum + s.avgFillRate, 0) / summary.length
                : 0

        return {
            revenueToday: {
                value: Math.round(todayRevenue * 100) / 100, // Round to 2 decimals
                change: yesterdayRevenue > 0
                    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 * 100) / 100
                    : 0,
                trend: todayRevenue >= yesterdayRevenue ? 'up' : 'down',
            },
            averageEcpm: {
                value: Math.round(avgEcpm * 100) / 100, // Round to 2 decimals
                change: 0, // TODO: Calculate from previous period
                trend: 'up',
            },
            impressions: {
                value: totalImpressions,
                change: 0, // TODO: Calculate from previous period
                trend: 'up',
            },
            fillRate: {
                value: Math.round(avgFillRate * 100 * 100) / 100, // Round to 2 decimals
                change: 0, // TODO: Calculate from previous period
                trend: 'up',
            },
        }
    },
}

// App Metrics API Service
export const appMetricsApi = {
    getAppMetrics: async (appId: string, params?: {
        startDate?: string
        endDate?: string
    }): Promise<{
        appId: string
        startDate: string
        endDate: string
        totalRevenue: number
        totalImpressions: number
        avgEcpm: number
        avgFillRate: number
        avgMatchRate: number
    }> => {
        return apiClient.get(`/api/PerformanceData/apps/${appId}/metrics`, params)
    },
}

// Mediation Group Metrics API Service
export const mediationGroupMetricsApi = {
    getMediationGroupMetrics: async (mediationGroupId: string, params?: {
        startDate?: string
        endDate?: string
    }): Promise<{
        mediationGroupId: string
        startDate: string
        endDate: string
        totalRevenue: number
        totalImpressions: number
        avgEcpm: number
        avgFillRate: number
        avgMatchRate: number
    }> => {
        return apiClient.get(`/api/PerformanceData/mediationgroups/${mediationGroupId}/metrics`, params)
    },
}

// Alerts API Service
export const alertsApi = {
    getActiveAlerts: async (params?: {
        publisherId?: string
        appId?: string
        mediationGroupId?: string
        severity?: string
        page?: number
        pageSize?: number
    }): Promise<{
        data: Array<{
            id: number
            alertType: string
            severity: string
            message: string
            publisherId: string
            appId?: string
            mediationGroupId?: string
            adSourceId?: string
            countryCode?: string
            value: number
            threshold: number
            status: string
            triggeredAt: string
            sentAt?: string
            acknowledgedAt?: string
            acknowledgedBy?: string
            alertRuleName?: string
            alertRuleDescription?: string
        }>
        page: number
        pageSize: number
        totalCount: number
        totalPages: number
    }> => {
        return apiClient.get('/api/Alerts/active', params)
    },

    getActiveAlertsSummary: async (publisherId?: string): Promise<{
        Total: number
        BySeverity: Record<string, number>
        ByType: Record<string, number>
        Details: Array<{
            Severity: string
            AlertType: string
            Count: number
        }>
    }> => {
        return apiClient.get('/api/Alerts/active/summary', { publisherId })
    },
}
