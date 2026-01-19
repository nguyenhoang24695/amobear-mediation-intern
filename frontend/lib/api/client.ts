// Base API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        }

        try {
            const response = await fetch(url, config)

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    error: `HTTP ${response.status}: ${response.statusText}`,
                }))
                throw new Error(error.error || error.message || 'Request failed')
            }

            // Handle empty responses
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                return await response.json()
            }

            return {} as T
        } catch (error) {
            if (error instanceof Error) {
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

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'DELETE',
        })
    }
}

// Singleton instance
export const apiClient = new ApiClient()
