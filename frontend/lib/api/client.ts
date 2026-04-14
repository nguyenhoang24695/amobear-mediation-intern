import { clearAuthSessionData, getAccessToken, refreshAuthSession } from "@/lib/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const DEFAULT_REQUEST_TIMEOUT_MS = 180_000
/** ≥ backend regenerate budget (default 1200s) + đệm cho proxy; regenerate tiếp tục trên server nếu tab đóng nhưng client vẫn cần timeout dài nếu chờ JSON response. */
export const APP_INSIGHT_REGENERATE_TIMEOUT_MS = 1_500_000
let isRedirecting = false

type RequestOptions = RequestInit & { timeoutMs?: number }

export class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, "")
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { timeoutMs, ...fetchInit } = options
        const effectiveTimeoutMs = timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
        const url = `${this.baseUrl}${endpoint}`
        const token = getAccessToken()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs)
        const isFormData = typeof FormData !== "undefined" && fetchInit.body instanceof FormData

        const config: RequestInit = {
            ...fetchInit,
            signal: controller.signal,
            headers: {
                ...(!isFormData && { "Content-Type": "application/json" }),
                ...(token && { Authorization: `Bearer ${token}` }),
                ...fetchInit.headers,
            },
        }

        try {
            let response = await fetch(url, config)

            if (!response.ok) {
                if (response.status === 401) {
                    const newAccessToken = await refreshAuthSession(this.baseUrl)
                    if (newAccessToken) {
                        config.headers = {
                            ...config.headers,
                            Authorization: `Bearer ${newAccessToken}`,
                        }
                        response = await fetch(url, config)
                    }
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))

                    if (response.status === 401 && typeof window !== "undefined") {
                        clearAuthSessionData()
                        if (!isRedirecting && !window.location.pathname.startsWith("/login")) {
                            isRedirecting = true
                            setTimeout(() => {
                                window.location.href = "/login"
                            }, 100)
                        }
                    }

                    const error = new Error(errorData.error?.message || errorData.errorMessage || errorData.message || errorData.error || "Request failed")
                    ;(error as any).response = { data: errorData, status: response.status }
                    throw error
                }
            }

            const contentType = response.headers.get("content-type")
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json()
                clearTimeout(timeoutId)
                return data
            }

            clearTimeout(timeoutId)
            return {} as T
        } catch (error) {
            clearTimeout(timeoutId)
            if (error instanceof Error) {
                if ((error as any).name === "AbortError") {
                    throw new Error("Request timeout. The server took too long to respond.")
                }
                throw error
            }
            throw new Error("Unknown error occurred")
        }
    }

    async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
        const queryString = params
            ? "?" + new URLSearchParams(Object.entries(params).filter(([_, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])).toString()
            : ""

        return this.request<T>(`${endpoint}${queryString}`, { method: "GET" })
    }

    async post<T>(endpoint: string, data?: unknown, timeoutMs?: number): Promise<T> {
        return this.request<T>(endpoint, {
            method: "POST",
            body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
            timeoutMs,
        })
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, { method: "PUT", body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined })
    }

    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, { method: "PATCH", body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined })
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "DELETE" })
    }

    /** GET nhị phân (file) kèm Bearer; dùng cho tải / xem tài liệu Help. */
    async getBlob(endpoint: string): Promise<{ blob: Blob; contentType: string | null }> {
        const url = `${this.baseUrl}${endpoint}`
        const token = getAccessToken()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS)

        const headers: HeadersInit = {}
        if (token) headers.Authorization = `Bearer ${token}`

        try {
            let response = await fetch(url, { method: "GET", headers, signal: controller.signal })

            if (!response.ok) {
                if (response.status === 401) {
                    const newAccessToken = await refreshAuthSession(this.baseUrl)
                    if (newAccessToken) {
                        headers.Authorization = `Bearer ${newAccessToken}`
                        response = await fetch(url, { method: "GET", headers, signal: controller.signal })
                    }
                }

                if (!response.ok) {
                    if (response.status === 401 && typeof window !== "undefined") {
                        clearAuthSessionData()
                        if (!isRedirecting && !window.location.pathname.startsWith("/login")) {
                            isRedirecting = true
                            setTimeout(() => {
                                window.location.href = "/login"
                            }, 100)
                        }
                    }
                    const errText = await response.text().catch(() => "")
                    throw new Error(errText || `HTTP ${response.status}`)
                }
            }

            const blob = await response.blob()
            const contentType = response.headers.get("content-type")
            clearTimeout(timeoutId)
            return { blob, contentType }
        } catch (error) {
            clearTimeout(timeoutId)
            if (error instanceof Error && (error as any).name === "AbortError") {
                throw new Error("Request timeout. The server took too long to respond.")
            }
            throw error
        }
    }
}

export const apiClient = new ApiClient()
