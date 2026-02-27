// Base API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

/** Timeout mặc định (ms). Sync/Apply gọi AdMob có thể chạy lâu; recommendations khi cache chưa có. */
const DEFAULT_REQUEST_TIMEOUT_MS = 180_000

// Global flag to prevent multiple simultaneous redirects
let isRedirecting = false

export class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`

        // Get access token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS)

        const config: RequestInit = {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        }

        try {
            const response = await fetch(url, config)
            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`,
                }))

                // Handle 401 Unauthorized - clear auth and redirect to login
                if (response.status === 401) {
                    // Clear auth data
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('accessToken')
                        localStorage.removeItem('refreshToken')
                        localStorage.removeItem('user')

                        // Only redirect once to prevent infinite loops
                        if (!isRedirecting && !window.location.pathname.startsWith('/login')) {
                            isRedirecting = true
                            // Use setTimeout to allow current error handling to complete
                            setTimeout(() => {
                                window.location.href = '/login'
                            }, 100)
                        }
                    }
                }

                // Create error object with response data for better error handling
                const error = new Error(errorData.error?.message || errorData.message || errorData.error || 'Request failed')
                    ; (error as any).response = { data: errorData, status: response.status }
                throw error
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json()
                clearTimeout(timeoutId)
                return data
            }
            clearTimeout(timeoutId)
            return {} as T
        } catch (error) {
            clearTimeout(timeoutId)
            if (error instanceof Error) {
                if ((error as any).name === 'AbortError') {
                    throw new Error('Request timeout. The server took too long to respond.')
                }
                throw error
            }
            throw new Error('Unknown error occurred')
        }
    }

    async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
        const queryString = params
            ? '?' + new URLSearchParams(
                Object.entries(params)
                    .filter(([_, value]) => value !== undefined && value !== null)
                    .map(([key, value]) => [key, String(value)])
            ).toString()
            : ''

        return this.request<T>(`${endpoint}${queryString}`, {
            method: 'GET',
        })
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        })
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        })
    }

    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        })
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'DELETE',
        })
    }
}

// Singleton instance
export const apiClient = new ApiClient()
