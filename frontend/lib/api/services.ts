import type {
    AdUnit,
    App,
    DashboardMetrics,
    DashboardKeyMetrics,
    DateRangeType,
    MediationGroup,
    PagedResponse,
    WaterfallListItem,
    WaterfallAdUnit,
    PerformanceData,
    PerformanceSummary,
    RecentActivities,
    RevenueByNetwork,
    RevenueOverview,
    TopApp,
    TopApps,
    TeamMember,
    TeamMemberFilterRequest,
    PagedTeamMembersResponse,
    HangfireJobSchedule,
    JobScheduleUpdateRequest,
    WaterfallRecommendationConfigDto,
    WaterfallRecommendationRuleDto,
    WaterfallRecommendationRuleGroupDto,
    CreateUpdateRuleGroupDto,
    AppRuleGroupMappingDto,
    WaterfallFilterOptionDto,
} from '@/types/api'
import { apiClient } from './client'
import { formatDateForAPI } from '@/lib/utils/dashboard'

// Auth Types
export interface LoginRequest {
    email: string
    password: string
    organizationSlug?: string
    deviceInfo?: string
    ipAddress?: string
    rememberMe?: boolean
}

export interface AuthResponse {
    success: boolean
    data?: {
        accessToken: string
        refreshToken?: string | null
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

export interface AdminResetUserPasswordRequest {
    newPassword: string
    confirmPassword: string
    mustChangePassword?: boolean
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

export interface PagedResult<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export interface ActivityLogRef {
    refType: string
    refId: string
    refKey?: string | null
    refLabel?: string | null
}

export interface ActivityLogListItem {
    id: number
    occurredAt: string
    actorName?: string | null
    actorRole?: string | null
    source: string
    domain: string
    eventType: string
    status: string
    severity: string
    summary: string
    appId?: number | null
    mediationGroupId?: string | null
    jobName?: string | null
    targetType?: string | null
    targetId?: string | null
    targetName?: string | null
    correlationId?: string | null
    metadata?: unknown
}

export interface ActivityLogDetail extends ActivityLogListItem {
    actorUserId?: string | null
    organizationId?: string | null
    createdAt: string
    refs: ActivityLogRef[]
}

export interface ActivityLogQueryParams {
    from?: string
    to?: string
    domain?: string
    eventType?: string
    status?: string
    actorUserId?: string
    actor?: string
    appId?: number
    mediationGroupId?: string
    jobName?: string
    targetType?: string
    targetId?: string
    q?: string
    page?: number
    pageSize?: number
}

export interface UpdateAppFirebaseParamsPayload {
    firebaseParams?: object | string | null
    enabled?: boolean
    firebaseAppKey?: string
    serviceAccountJson?: object | string | null
}

// Structure API Service
export const structureApi = {
    // Apps - Returns apps with metrics from cache and summary
    getApps: async (publisherId?: string): Promise<{
        apps: App[]
        summary: {
            totalApps: number
            totalApprovedApps: number
            totalAdUnits: number
            totalWaterfallAdUnits: number
            averageEcpm: number
        }
    }> => {
        return apiClient.get('/api/Structure/apps', { publisherId })
    },

    getApp: async (id: number): Promise<App> => {
        return apiClient.get<App>(`/api/Structure/apps/${id}`)
    },

    /** App by AdMob app_id (cho URL /apps/{appId}). Cache key đồng nhất: app_detail_{appId}. */
    getAppByAppId: async (appId: string): Promise<App> => {
        return apiClient.get<App>(`/api/Structure/apps/by-appid/${encodeURIComponent(appId)}`)
    },

    syncAppPerformance: async (appId: string): Promise<{ success: boolean; queued?: boolean; appId: string; jobId?: string; correlationId?: string; message?: string }> => {
        return apiClient.post(`/api/Structure/apps/by-appid/${encodeURIComponent(appId)}/sync-performance`)
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

    getAppWaterfallAdUnits: async (id: number): Promise<WaterfallAdUnit[]> => {
        return apiClient.get<WaterfallAdUnit[]>(`/api/Structure/apps/${id}/waterfalladunits`)
    },

    /** Số waterfall ad units chưa được gắn với ad unit nào (orphan). Có thể lọc theo publisherId. */
    getOrphanWaterfallCount: async (publisherId?: string): Promise<{ count: number }> => {
        return apiClient.get('/api/Structure/orphan-waterfall/count', { publisherId })
    },

    /** List waterfall ad units with optional filter: Unused only or No revenue. Supports pagination and waterfall filters. */
    getWaterfallList: async (params?: {
        publisherId?: string
        appAdMobId?: string
        admobId?: string
        unusedOnly?: boolean
        noRevenue?: boolean
        startDate?: string
        endDate?: string
        sortField?: string
        sortDirection?: "asc" | "desc"
        page?: number
        pageSize?: number
    }): Promise<{
        items: WaterfallListItem[]
        totalCount: number
        page: number
        pageSize: number
    }> => {
        const query: Record<string, string | number | undefined> = {}
        if (params?.publisherId != null) query.publisherId = params.publisherId
        if (params?.appAdMobId != null) query.appAdMobId = params.appAdMobId
        if (params?.admobId != null) query.admobId = params.admobId
        if (params?.unusedOnly != null) query.unusedOnly = params.unusedOnly ? "true" : "false"
        if (params?.noRevenue != null) query.noRevenue = params.noRevenue ? "true" : "false"
        if (params?.startDate != null) query.startDate = params.startDate
        if (params?.endDate != null) query.endDate = params.endDate
        if (params?.sortField != null) query.sortField = params.sortField
        if (params?.sortDirection != null) query.sortDirection = params.sortDirection
        if (params?.page != null) query.page = params.page
        if (params?.pageSize != null) query.pageSize = params.pageSize
        return apiClient.get('/api/Structure/waterfall', query)
    },

    getWaterfallPublisherFilterOptions: async (params?: {
        unusedOnly?: boolean
        noRevenue?: boolean
        startDate?: string
        endDate?: string
        search?: string
        limit?: number
    }): Promise<WaterfallFilterOptionDto[]> => {
        const query: Record<string, string | number | undefined> = {}
        if (params?.unusedOnly != null) query.unusedOnly = params.unusedOnly ? "true" : "false"
        if (params?.noRevenue != null) query.noRevenue = params.noRevenue ? "true" : "false"
        if (params?.startDate != null) query.startDate = params.startDate
        if (params?.endDate != null) query.endDate = params.endDate
        if (params?.search != null) query.search = params.search
        if (params?.limit != null) query.limit = params.limit
        return apiClient.get<WaterfallFilterOptionDto[]>('/api/Structure/waterfall/filters/publishers', query)
    },

    getWaterfallAppFilterOptions: async (params?: {
        publisherId?: string
        unusedOnly?: boolean
        noRevenue?: boolean
        startDate?: string
        endDate?: string
        search?: string
        limit?: number
    }): Promise<WaterfallFilterOptionDto[]> => {
        const query: Record<string, string | number | undefined> = {}
        if (params?.publisherId != null) query.publisherId = params.publisherId
        if (params?.unusedOnly != null) query.unusedOnly = params.unusedOnly ? "true" : "false"
        if (params?.noRevenue != null) query.noRevenue = params.noRevenue ? "true" : "false"
        if (params?.startDate != null) query.startDate = params.startDate
        if (params?.endDate != null) query.endDate = params.endDate
        if (params?.search != null) query.search = params.search
        if (params?.limit != null) query.limit = params.limit
        return apiClient.get<WaterfallFilterOptionDto[]>('/api/Structure/waterfall/filters/apps', query)
    },

    getWaterfallAdMobFilterOptions: async (params?: {
        publisherId?: string
        appAdMobId?: string
        unusedOnly?: boolean
        noRevenue?: boolean
        startDate?: string
        endDate?: string
        search?: string
        limit?: number
    }): Promise<WaterfallFilterOptionDto[]> => {
        const query: Record<string, string | number | undefined> = {}
        if (params?.publisherId != null) query.publisherId = params.publisherId
        if (params?.appAdMobId != null) query.appAdMobId = params.appAdMobId
        if (params?.unusedOnly != null) query.unusedOnly = params.unusedOnly ? "true" : "false"
        if (params?.noRevenue != null) query.noRevenue = params.noRevenue ? "true" : "false"
        if (params?.startDate != null) query.startDate = params.startDate
        if (params?.endDate != null) query.endDate = params.endDate
        if (params?.search != null) query.search = params.search
        if (params?.limit != null) query.limit = params.limit
        return apiClient.get<WaterfallFilterOptionDto[]>('/api/Structure/waterfall/filters/admob', query)
    },

    /** Bulk update app type (game/app) for selected apps by AppId (AdMob app_id) */
    updateAppsType: async (payload: { appIds: string[]; type: "game" | "app" }) => {
        return apiClient.post(`/api/Structure/apps/bulk-type`, payload)
    },

    /** Update Firebase params for an app. Pass null to clear. Uses numeric app.id (not appId string). */
    updateAppFirebaseParams: async (id: number, payload: UpdateAppFirebaseParamsPayload | null): Promise<{ id: number; firebaseParams: string | null }> => {
        return apiClient.patch(`/api/Structure/apps/${id}/firebase-params`, payload ?? { firebaseParams: null })
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

    /** 8-Rule Waterfall Recommendation (Min Match Rate default 3%, Min SOW default 0.9%). Dùng id số (nội bộ). */
    getMediationGroupRecommendations: async (
        id: number,
        params?: {
            startDate?: string
            endDate?: string
            minMatchRatePercent?: number
            minSowPercent?: number
        }
    ): Promise<WaterfallRecommendationsResponse> => {
        return apiClient.get<WaterfallRecommendationsResponse>(
            `/api/Structure/mediationgroups/${id}/recommendations`,
            params as Record<string, string | number | undefined>
        )
    },

    /** 8-Rule Recommendation theo AdMob mediation_group_id. Không truyền params = dùng mặc định 7d + 3% + 0.9% (server trả cache). */
    getMediationGroupRecommendationsByAdMobId: async (
        mediationGroupId: string,
        params?: {
            startDate?: string
            endDate?: string
            minMatchRatePercent?: number
            minSowPercent?: number
        }
    ): Promise<WaterfallRecommendationsResponse> => {
        return apiClient.get<WaterfallRecommendationsResponse>(
            `/api/Structure/mediationgroups/admob/${encodeURIComponent(mediationGroupId)}/recommendations`,
            params as Record<string, string | number | undefined>
        )
    },
}

export interface SowRecommendationItem {
    lineId: string
    adSourceId: string
    displayName?: string
    action: string
    newFloorMicros?: number | null
    reason: string
    priority: string
    sowPercent: number
    matchRatePercent?: number | null
    currentFloorMicros: number
    observedEcpm?: number | null
}

/** Tham số đã dùng khi chạy recommendation (tooltip / debug). */
export interface RecommendationParametersUsed {
    periodStart: string
    periodEnd: string
    minMatchRatePercent: number
    minSowPercent: number
    ruleGroupIdOverride?: number | null
    appId?: string | null
    minRecommendations: number
    maxRecommendations: number
    rulesCount: number
}

export interface WaterfallRecommendationsResponse {
    mediationGroupId: string
    periodStart: string
    periodEnd: string
    minMatchRatePercent: number
    minSowPercent: number
    /** Tham số đã dùng (hiển thị tooltip debug). */
    parametersUsed?: RecommendationParametersUsed | null
    recommendations: SowRecommendationItem[]
}

// SoW (Share of Wallet) Data - per ad source eCPM/SoW for waterfall optimization
export interface SoWDataItem {
    id: number
    date: string
    publisherId: string
    mediationGroupId: string
    adSourceId: string
    adSourceInstanceId?: string
    countryCode?: string
    sow: number
    totalRevenueMicros: number
    mediationGroupTotalRevenueMicros: number
    totalImpressions: number
    avgEcpmMicros: number
    avgMatchRate?: number
    avgFillRate?: number
}

// Waterfall Management API - Apply Direct lên AdMob (flow đầy đủ theo Dolphin)
export interface ApplyWaterfallRequest {
    mediationGroupId: string
    floorsModified: Array<{ name: string; lineId: string; oldValue: number; newValue: number }>
    sourcesAdded: Array<{ name: string; floor: number; adSourceId: string }>
    sourcesRemoved: Array<{ name: string; lineId: string }>
}

export interface ApplyWaterfallResponse {
    success: boolean
    message?: string
    errorMessage?: string
    updatedAt: string
}

export interface WaterfallConfigurationResponse {
    name: string
    mediationGroupId: string
    displayName?: string
    state?: string
    targeting?: { platform?: string; format?: string; adUnitIds?: string[] }
    mediationGroupLines?: Record<string, unknown>
    updatedAt?: string
}

export interface SyncMediationGroupResponse {
    success: boolean
    updatedAt?: string
    error?: string
}

export interface WaterfallApplyPolicyResponse {
    mediationGroupId: string
    applyMode: string
    intervalDays: number
    policyEnabledAt: string
    lastCycleCompletedAt?: string | null
    lastObservedApplyAt?: string | null
    lastApplySource?: string | null
    dueAt: string
    isDue: boolean
    lastAlertedAnchorAt?: string | null
    lastAlertResultId?: number | null
    lastEvaluatedAt?: string | null
}

export const waterfallManagementApi = {
    getConfiguration: async (mediationGroupId: string): Promise<WaterfallConfigurationResponse> => {
        return apiClient.get<WaterfallConfigurationResponse>(`/api/WaterfallManagement/configuration/${encodeURIComponent(mediationGroupId)}`)
    },

    sync: async (mediationGroupId: string): Promise<SyncMediationGroupResponse> => {
        return apiClient.post<SyncMediationGroupResponse>(`/api/WaterfallManagement/sync/${encodeURIComponent(mediationGroupId)}`)
    },

    apply: async (body: ApplyWaterfallRequest): Promise<ApplyWaterfallResponse> => {
        return apiClient.post<ApplyWaterfallResponse>('/api/WaterfallManagement/apply', body)
    },

    getPolicy: async (mediationGroupId: string): Promise<WaterfallApplyPolicyResponse> => {
        return apiClient.get<WaterfallApplyPolicyResponse>(`/api/WaterfallManagement/policy/${encodeURIComponent(mediationGroupId)}`)
    },

    updatePolicy: async (
        mediationGroupId: string,
        body: { applyMode: string }
    ): Promise<WaterfallApplyPolicyResponse> => {
        return apiClient.put<WaterfallApplyPolicyResponse>(`/api/WaterfallManagement/policy/${encodeURIComponent(mediationGroupId)}`, body)
    },
}

export const sowApi = {
    getSoWData: async (params: {
        mediationGroupId?: string
        publisherId?: string
        adSourceId?: string
        startDate?: string
        endDate?: string
        page?: number
        pageSize?: number
    }): Promise<PagedResponse<SoWDataItem>> => {
        return apiClient.get<PagedResponse<SoWDataItem>>('/api/SoWData', params)
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

// Team Members API Service
export interface InviteUserRequest {
    email: string
    role?: string
    teamIds?: string[]
    appPermissions?: Array<{ AppId: string; Level: string }>
    message?: string
}

export const teamMembersApi = {
    filterTeamMembers: async (request: TeamMemberFilterRequest): Promise<{ success: boolean; data: PagedTeamMembersResponse }> => {
        return apiClient.post('/api/v1/team-members/filter', request)
    },

    viewProfile: async (userId: string): Promise<{ success: boolean; data?: TeamMember }> => {
        return apiClient.get(`/api/v1/team-members/view-profile/${userId}`)
    },

    inviteUser: async (request: InviteUserRequest): Promise<{ success: boolean; data?: { invitationId: string; email: string; expiresAt: string; message: string } }> => {
        return apiClient.post('/api/v1/team-members/invite-user', request)
    },

    updateUser: async (
        userId: string,
        data: { firstName?: string; lastName?: string; phone?: string; role?: string; status?: string }
    ): Promise<{ success: boolean; data?: TeamMember }> => {
        return apiClient.put(`/api/v1/team-members/update-user/${userId}`, data)
    },

    resetUserPassword: async (
        userId: string,
        data: AdminResetUserPasswordRequest
    ): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post(`/api/v1/team-members/reset-password/${userId}`, data)
    },

    removeUser: async (userId: string): Promise<{ success: boolean; message?: string }> => {
        return apiClient.delete(`/api/v1/team-members/remove-user/${userId}`)
    },

    // Update team role + app permissions for a user in a team
    managePermissions: async (
        userId: string,
        body: { teamId: string; role: string; appPermissions?: Array<{ AppId: string; Level: string }> }
    ): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post(`/api/v1/team-members/manage-permissions/${userId}`, body)
    },

    // Add existing user to a team
    addUserToTeam: async (
        userId: string,
        body: { teamId: string; role: string }
    ): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post(`/api/v1/team-members/add-to-team/${userId}`, body)
    },

    // Remove user from a team
    removeUserFromTeam: async (
        userId: string,
        teamId: string
    ): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post(`/api/v1/team-members/remove-from-team`, { userId, teamId })
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
// Sử dụng API dashboard key-metrics với các range tương ứng
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
        revenueChange?: number
        revenueChangeDirection?: "up" | "down" | "neutral"
        impressionsChange?: number
        impressionsChangeDirection?: "up" | "down" | "neutral"
        ecpmChange?: number
        ecpmChangeDirection?: "up" | "down" | "neutral"
        fillRateChange?: number
        fillRateChangeDirection?: "up" | "down" | "neutral"
    }> => {
        // Map startDate/endDate to range parameter
        let range: DateRangeType = "today"

        if (params?.startDate && params?.endDate) {
            const startDate = new Date(params.startDate)
            const endDate = new Date(params.endDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

            // Check if it's today
            if (startDate.toDateString() === today.toDateString() &&
                endDate.toDateString() === today.toDateString()) {
                range = "today"
            }
            // Check if it's last 7 days (including today)
            else if (daysDiff === 6 && endDate.toDateString() === today.toDateString()) {
                range = "last7days"
            }
            // Check if it's last 30 days (including today) - used for MTD
            else if (daysDiff === 29 && endDate.toDateString() === today.toDateString()) {
                range = "last30days"
            }
            // For MTD (month to date), use last30days
            else {
                // If startDate is month start and endDate is today, treat as MTD -> use last30days
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                if (startDate.toDateString() === monthStart.toDateString() &&
                    endDate.toDateString() === today.toDateString()) {
                    range = "last30days"
                } else {
                    range = "custom"
                }
            }
        }

        // Call dashboard key-metrics API for specific app
        const response = await apiClient.get<DashboardKeyMetrics>(`/api/v1/dashboard/key-metrics/app/${appId}`, {
            range,
            startDate: params?.startDate,
            endDate: params?.endDate,
        })

        // Map response to expected format
        return {
            appId,
            startDate: params?.startDate || formatDateForAPI(new Date()),
            endDate: params?.endDate || formatDateForAPI(new Date()),
            totalRevenue: response.revenue.value,
            totalImpressions: response.impressions.value,
            avgEcpm: response.averageEcpm.value,
            avgFillRate: response.fillRate.value / 100, // Convert from percentage to decimal (0-1)
            avgMatchRate: 0, // Not available in key-metrics API
            // Include change percentages and directions from API
            revenueChange: response.revenue.change,
            revenueChangeDirection: response.revenue.changeDirection,
            impressionsChange: response.impressions.change,
            impressionsChangeDirection: response.impressions.changeDirection,
            ecpmChange: response.averageEcpm.change,
            ecpmChangeDirection: response.averageEcpm.changeDirection,
            fillRateChange: response.fillRate.change,
            fillRateChangeDirection: response.fillRate.changeDirection,
        }
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

    getOpenAlerts: async (params?: {
        publisherId?: string
        appId?: string
        mediationGroupId?: string
        severity?: string
        page?: number
        pageSize?: number
    }): Promise<{
        Data: Array<{
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
            resolvedAt?: string
            additionalData?: string
            alertRuleName?: string
            alertRuleDescription?: string
        }>
        Page: number
        PageSize: number
        TotalCount: number
        TotalPages: number
    }> => {
        const response = await apiClient.get<{
            data?: Array<{
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
                resolvedAt?: string
                additionalData?: string
                alertRuleName?: string
                alertRuleDescription?: string
            }>
            page?: number
            pageSize?: number
            totalCount?: number
            totalPages?: number
        }>('/api/Alerts/open', params)

        return {
            Data: response.data ?? [],
            Page: response.page ?? 1,
            PageSize: response.pageSize ?? (params?.pageSize ?? 50),
            TotalCount: response.totalCount ?? 0,
            TotalPages: response.totalPages ?? 0,
        }
    },

    getOpenAlertsSummary: async (publisherId?: string): Promise<{
        Total: number
        BySeverity: Record<string, number>
        ByType: Record<string, number>
        Details: Array<{
            Severity: string
            AlertType: string
            Count: number
        }>
    }> => {
        const response = await apiClient.get<{
            total?: number
            bySeverity?: Record<string, number>
            byType?: Record<string, number>
            details?: Array<{
                severity: string
                alertType: string
                count: number
            }>
        }>('/api/Alerts/open/summary', { publisherId })

        return {
            Total: response.total ?? 0,
            BySeverity: response.bySeverity ?? {},
            ByType: response.byType ?? {},
            Details: (response.details ?? []).map((item) => ({
                Severity: item.severity,
                AlertType: item.alertType,
                Count: item.count,
            })),
        }
    },
}

// Organization Types
export interface OrganizationListItem {
    id: string
    name: string
    slug: string
    logoUrl?: string
    isActive: boolean
    userCount: number
    createdAt: string
    updatedAt: string
}

export interface OrganizationDetail {
    id: string
    name: string
    slug: string
    logoUrl?: string
    settings: string
    isActive: boolean
    userCount: number
    createdAt: string
    updatedAt: string
}

export interface CreateOrganizationRequest {
    name: string
    slug: string
    logoUrl?: string
}

export interface UpdateOrganizationRequest {
    name?: string
    slug?: string
    logoUrl?: string
    settings?: string
}

// Organization statistics types
export interface RoleDistribution {
    role: string
    count: number
}

export interface OrganizationStatistics {
    totalUsers: number
    activeUsers: number
    totalTeams: number
    appsWithAccess: number
    roleDistribution: RoleDistribution[]
}

// Organizations API Service
export const organizationsApi = {
    // List all organizations
    getAll: async (): Promise<OrganizationListItem[]> => {
        return apiClient.get<OrganizationListItem[]>('/api/v1/organizations')
    },

    // Get single organization by ID
    getById: async (id: string): Promise<OrganizationDetail> => {
        return apiClient.get<OrganizationDetail>(`/api/v1/organizations/${id}`)
    },

    // Get organization statistics
    getStatistics: async (orgId: string): Promise<OrganizationStatistics> => {
        return apiClient.get<OrganizationStatistics>(`/api/v1/organizations/${orgId}/statistics`)
    },

    // Create new organization
    create: async (request: CreateOrganizationRequest): Promise<OrganizationDetail> => {
        return apiClient.post<OrganizationDetail>('/api/v1/organizations', request)
    },

    // Update organization
    update: async (id: string, request: UpdateOrganizationRequest): Promise<OrganizationDetail> => {
        return apiClient.put<OrganizationDetail>(`/api/v1/organizations/${id}`, request)
    },

    // Delete organization
    delete: async (id: string): Promise<void> => {
        return apiClient.delete(`/api/v1/organizations/${id}`)
    },

    // Activate organization
    activate: async (id: string): Promise<{ message: string }> => {
        return apiClient.post(`/api/v1/organizations/${id}/activate`, {})
    },

    // Deactivate organization
    deactivate: async (id: string): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(`/api/v1/organizations/${id}/deactivate`, {})
    },

    // Get users for an organization
    getUsers: async (orgId: string, params?: OrgUsersFilter): Promise<PagedResult<OrgUserItem>> => {
        const queryParams: Record<string, string | number | undefined> = {}
        if (params?.page) queryParams.page = params.page
        if (params?.pageSize) queryParams.pageSize = params.pageSize
        if (params?.search) queryParams.search = params.search
        if (params?.role) queryParams.role = params.role
        if (params?.status) queryParams.status = params.status
        return apiClient.get<PagedResult<OrgUserItem>>(`/api/v1/organizations/${orgId}/users`, queryParams)
    },

    // Get teams for an organization
    getTeams: async (orgId: string): Promise<OrgTeam[]> => {
        return apiClient.get<OrgTeam[]>(`/api/v1/organizations/${orgId}/teams`)
    },

    // Create a new team
    createTeam: async (orgId: string, data: CreateTeamRequest): Promise<OrgTeam> => {
        return apiClient.post<OrgTeam>(`/api/v1/organizations/${orgId}/teams`, data)
    },

    // Update a team
    updateTeam: async (orgId: string, teamId: string, data: UpdateTeamRequest): Promise<OrgTeam> => {
        return apiClient.put<OrgTeam>(`/api/v1/organizations/${orgId}/teams/${teamId}`, data)
    },

    // Delete a team
    deleteTeam: async (orgId: string, teamId: string): Promise<void> => {
        await apiClient.delete(`/api/v1/organizations/${orgId}/teams/${teamId}`)
    },

    // Create a user directly in the organization
    createUser: async (data: CreateOrganizationUserRequest): Promise<{ success: boolean; data?: OrgUserItem }> => {
        return apiClient.post('/api/v1/auth/organization/users', data)
    },
}

// Create organization user request
export interface CreateOrganizationUserRequest {
    organizationId?: string
    email: string
    password: string
    firstName?: string
    lastName?: string
    role?: string
    mustChangePassword?: boolean
    sendWelcomeEmail?: boolean
}

// Organization user types
export interface OrgUserItem {
    id: string
    email: string
    firstName?: string
    lastName?: string
    fullName: string
    avatarUrl?: string
    role: string
    status: string
    createdAt: string
    lastLoginAt?: string
}

export interface OrgUsersFilter {
    page?: number
    pageSize?: number
    search?: string
    role?: string
    status?: string
}

export interface PagedResult<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export interface OrgTeam {
    id: string
    name: string
    description?: string
    isActive: boolean
    memberCount: number
    createdAt: string
    updatedAt: string
}

// User Teams API types
export interface UserTeamMember {
    id: string
    email: string
    firstName?: string
    lastName?: string
    role: string
    status: string
    avatarUrl?: string
}

export interface UserTeamWithMembers {
    id: string
    name: string
    description?: string
    isActive: boolean
    memberCount: number
    createdAt: string
    updatedAt: string
    members: UserTeamMember[]
}

export interface CreateTeamRequest {
    name: string
    description?: string
}

export interface UpdateTeamRequest {
    name: string
    description?: string
    isActive: boolean
}

// Current User API Service
export const userApi = {
    // Get teams of current user, including members of each team
    getMyTeams: async (): Promise<UserTeamWithMembers[]> => {
        const response = await apiClient.get<{ success: boolean; data: UserTeamWithMembers[] }>('/api/v1/user/teams')
        return response.data
    },
}

// Job Schedules API Service
export const jobSchedulesApi = {
    // Get all job schedules
    list: async (): Promise<HangfireJobSchedule[]> => {
        return apiClient.get<HangfireJobSchedule[]>('/api/v1/job-schedules')
    },

    // Update a job schedule
    update: async (jobId: string, request: JobScheduleUpdateRequest): Promise<HangfireJobSchedule> => {
        return apiClient.put<HangfireJobSchedule>(`/api/v1/job-schedules/${jobId}`, request)
    },

    // Reload schedules from database to Hangfire
    reload: async (): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post<{ success: boolean; message?: string }>('/api/v1/job-schedules/reload', {})
    },
}

export const activityLogsApi = {
    list: async (params?: ActivityLogQueryParams): Promise<PagedResult<ActivityLogListItem>> => {
        return apiClient.get<PagedResult<ActivityLogListItem>>('/api/v1/activity-logs', params as Record<string, string | number | undefined>)
    },

    getById: async (id: number): Promise<ActivityLogDetail> => {
        return apiClient.get<ActivityLogDetail>(`/api/v1/activity-logs/${id}`)
    },
}

// Jobs Test API Service (for running jobs manually)
export const jobsTestApi = {
    // Run a job immediately (not via Hangfire schedule)
    runJob: async (jobName: string): Promise<{ success: boolean; message?: string }> => {
        return apiClient.post<{ success: boolean; message?: string }>(`/api/v1/jobs-test/${jobName}`, {})
    },
}

// Waterfall Recommendation Settings API Service
export const waterfallRecommendationSettingsApi = {
    // Configs
    getAllConfigs: async (): Promise<WaterfallRecommendationConfigDto[]> => {
        return apiClient.get<WaterfallRecommendationConfigDto[]>('/api/waterfall-recommendation-settings/configs')
    },

    getConfig: async (appId?: string | null): Promise<WaterfallRecommendationConfigDto> => {
        const params = appId ? `?appId=${encodeURIComponent(appId)}` : ''
        return apiClient.get<WaterfallRecommendationConfigDto>(`/api/waterfall-recommendation-settings/config${params}`)
    },

    getConfigById: async (id: number): Promise<WaterfallRecommendationConfigDto> => {
        return apiClient.get<WaterfallRecommendationConfigDto>(`/api/waterfall-recommendation-settings/configs/${id}`)
    },

    createConfig: async (config: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<WaterfallRecommendationConfigDto> => {
        return apiClient.post<WaterfallRecommendationConfigDto>('/api/waterfall-recommendation-settings/configs', config)
    },

    updateConfig: async (id: number, config: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<WaterfallRecommendationConfigDto> => {
        return apiClient.put<WaterfallRecommendationConfigDto>(`/api/waterfall-recommendation-settings/configs/${id}`, config)
    },

    deleteConfig: async (id: number): Promise<void> => {
        return apiClient.delete(`/api/waterfall-recommendation-settings/configs/${id}`)
    },

    // Rules
    getAllRules: async (): Promise<WaterfallRecommendationRuleDto[]> => {
        return apiClient.get<WaterfallRecommendationRuleDto[]>('/api/waterfall-recommendation-settings/rules')
    },

    getRuleById: async (id: number): Promise<WaterfallRecommendationRuleDto> => {
        return apiClient.get<WaterfallRecommendationRuleDto>(`/api/waterfall-recommendation-settings/rules/${id}`)
    },

    createRule: async (rule: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<WaterfallRecommendationRuleDto> => {
        return apiClient.post<WaterfallRecommendationRuleDto>('/api/waterfall-recommendation-settings/rules', rule)
    },

    updateRule: async (id: number, rule: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<WaterfallRecommendationRuleDto> => {
        return apiClient.put<WaterfallRecommendationRuleDto>(`/api/waterfall-recommendation-settings/rules/${id}`, rule)
    },

    deleteRule: async (id: number): Promise<void> => {
        return apiClient.delete(`/api/waterfall-recommendation-settings/rules/${id}`)
    },

    // Rule Groups
    getAllRuleGroups: async (): Promise<WaterfallRecommendationRuleGroupDto[]> => {
        return apiClient.get<WaterfallRecommendationRuleGroupDto[]>('/api/waterfall-recommendation-settings/rule-groups')
    },

    getRuleGroupById: async (id: number): Promise<WaterfallRecommendationRuleGroupDto> => {
        return apiClient.get<WaterfallRecommendationRuleGroupDto>(`/api/waterfall-recommendation-settings/rule-groups/${id}`)
    },

    createRuleGroup: async (group: CreateUpdateRuleGroupDto): Promise<WaterfallRecommendationRuleGroupDto> => {
        return apiClient.post<WaterfallRecommendationRuleGroupDto>('/api/waterfall-recommendation-settings/rule-groups', group)
    },

    updateRuleGroup: async (id: number, group: CreateUpdateRuleGroupDto): Promise<WaterfallRecommendationRuleGroupDto> => {
        return apiClient.put<WaterfallRecommendationRuleGroupDto>(`/api/waterfall-recommendation-settings/rule-groups/${id}`, group)
    },

    deleteRuleGroup: async (id: number): Promise<void> => {
        return apiClient.delete(`/api/waterfall-recommendation-settings/rule-groups/${id}`)
    },

    // App-RuleGroup Mapping
    getAppRuleGroupMapping: async (appId: string): Promise<AppRuleGroupMappingDto> => {
        return apiClient.get<AppRuleGroupMappingDto>(`/api/waterfall-recommendation-settings/app-rule-group/${encodeURIComponent(appId)}`)
    },

    updateAppRuleGroupMapping: async (appId: string, groupId: number | null): Promise<AppRuleGroupMappingDto> => {
        return apiClient.put<AppRuleGroupMappingDto>(
            `/api/waterfall-recommendation-settings/app-rule-group/${encodeURIComponent(appId)}`,
            { groupId }
        )
    },

    // Rerun Recommendation (ruleGroupId = rule group đã chọn trên UI; nếu có thì chạy với group đó)
    rerunRecommendation: async (
        mediationGroupId: string,
        ruleGroupId?: number | null
    ): Promise<{ success: boolean; message?: string; error?: string }> => {
        const query = ruleGroupId != null ? `?ruleGroupId=${encodeURIComponent(ruleGroupId)}` : ""
        return apiClient.post<{ success: boolean; message?: string; error?: string }>(
            `/api/waterfall-recommendation-settings/rerun-recommendation/${encodeURIComponent(mediationGroupId)}${query}`
        )
    },
}

// Permission Management (RBAC) API
export interface PermissionRoleDto {
    id: string
    roleKey: string
    name: string
    description: string
    userCount: number
    isSystem: boolean
}

export interface PermissionFunctionDto {
    id: string
    label: string
}

export interface PermissionScreenDto {
    id: string
    name: string
    module: string
    functions: PermissionFunctionDto[]
}

export interface RolePermissionsDto {
    permissions: Record<string, string[]>
}

export const permissionApi = {
    getRoles: async (): Promise<PermissionRoleDto[]> => {
        return apiClient.get<PermissionRoleDto[]>('/api/v1/permissions/roles')
    },
    getScreens: async (): Promise<PermissionScreenDto[]> => {
        return apiClient.get<PermissionScreenDto[]>('/api/v1/permissions/screens')
    },
    getRolePermissions: async (roleId: string): Promise<RolePermissionsDto> => {
        return apiClient.get<RolePermissionsDto>(`/api/v1/permissions/roles/${roleId}/permissions`)
    },
    saveRolePermissions: async (roleId: string, permissions: Record<string, string[]>): Promise<void> => {
        await apiClient.put(`/api/v1/permissions/roles/${roleId}/permissions`, { permissions })
    },
    createRole: async (name: string, description: string): Promise<PermissionRoleDto> => {
        return apiClient.post<PermissionRoleDto>('/api/v1/permissions/roles', { name, description })
    },
    updateRole: async (roleId: string, name: string, description: string): Promise<void> => {
        await apiClient.put(`/api/v1/permissions/roles/${roleId}`, { name, description })
    },
    deleteRole: async (roleId: string): Promise<void> => {
        await apiClient.delete(`/api/v1/permissions/roles/${roleId}`)
    },
}

// Data Accounts Types
export interface DataAccountItem {
    id: number
    name: string
    network: 'admob' | 'applovin' | 'xmp'
    accountId: string
    status: string
    enabled: boolean
    isDefault: boolean
    reportKey?: string
    // AdMob specific
    clientId?: string
    clientSecret?: string
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    timezoneOffsetHours?: number
    baseUrl?: string
    xmpClientId?: string
    xmpClientSecret?: string
    hasToken?: boolean
    tokenExpiresAt?: string
    createdAt: string
    updatedAt: string
}

export interface CreateDataAccountRequest {
    network: string
    name: string
    isDefault?: boolean
    // AdMob specific
    accountId?: string
    clientId?: string
    clientSecret?: string
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    timezoneOffsetHours?: number
    // AppLovin
    reportKey?: string
    baseUrl?: string
    // XMP
    xmpClientId?: string
    xmpClientSecret?: string
}

export interface UpdateDataAccountRequest {
    name?: string
    isDefault?: boolean
    accountId?: string
    clientId?: string
    clientSecret?: string
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    timezoneOffsetHours?: number
    reportKey?: string
    baseUrl?: string
    xmpClientId?: string
    xmpClientSecret?: string
}

// Data Accounts API Service
export const dataAccountsApi = {
    // Get all data accounts across all networks
    getAll: async (): Promise<DataAccountItem[]> => {
        return apiClient.get<DataAccountItem[]>('/api/v1/data-accounts')
    },

    // Get a single data account
    getById: async (network: string, id: number): Promise<DataAccountItem> => {
        return apiClient.get<DataAccountItem>(`/api/v1/data-accounts/${network}/${id}`)
    },

    // Create a new data account
    create: async (request: CreateDataAccountRequest): Promise<DataAccountItem> => {
        return apiClient.post<DataAccountItem>('/api/v1/data-accounts', request)
    },

    // Update a data account
    update: async (network: string, id: number, request: UpdateDataAccountRequest): Promise<DataAccountItem> => {
        return apiClient.put<DataAccountItem>(`/api/v1/data-accounts/${network}/${id}`, request)
    },

    // Enable a data account
    enable: async (network: string, id: number): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(`/api/v1/data-accounts/${network}/${id}/enable`, {})
    },

    // Disable a data account
    disable: async (network: string, id: number): Promise<{ message: string }> => {
        return apiClient.post<{ message: string }>(`/api/v1/data-accounts/${network}/${id}/disable`, {})
    },

    // Delete a data account
    delete: async (network: string, id: number): Promise<{ message: string }> => {
        return apiClient.delete(`/api/v1/data-accounts/${network}/${id}`)
    },

    // Get apps belonging to an AdMob account
    getApps: async (accountId: number): Promise<{ apps: AccountAppItem[]; total: number }> => {
        return apiClient.get<{ apps: AccountAppItem[]; total: number }>(`/api/v1/data-accounts/admob/${accountId}/apps`)
    },
}

export interface AccountAppItem {
    id: number
    name: string
    appId: string
    platform?: string
    displayName?: string
    appStoreId?: string
    iconUri?: string
    approvalState?: string
    createdAt: string
    updatedAt: string
}


