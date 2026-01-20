'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  enabled?: boolean
  cacheKey?: string // Unique key for request deduplication
}

// Global cache for pending requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<any>>()
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute cache

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const { onSuccess, onError, enabled = true, cacheKey } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use refs to track callbacks to avoid dependency issues
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  // Use a ref to track the actual function to avoid stale closures
  const apiCallRef = useRef(apiCall)
  apiCallRef.current = apiCall

  // Generate request key for deduplication
  const requestKey = useMemo(() => {
    if (cacheKey) return cacheKey
    
    // Try to extract a unique key from the function
    const funcStr = apiCall.toString()
    // Use a hash of the function string as key
    let hash = 0
    for (let i = 0; i < funcStr.length; i++) {
      const char = funcStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `api_${Math.abs(hash)}`
  }, [apiCall, cacheKey])

  // Create a stable wrapper function - don't depend on apiCall to avoid re-renders
  // apiCallRef is updated on every render, so we can safely use it without dependencies
  const stableApiCall = useMemo(() => {
    return async () => {
      return await apiCallRef.current()
    }
  }, []) // Empty deps - apiCallRef.current is always the latest apiCall

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      try {
        // Check if there's a cached result
        const cached = requestCache.get(requestKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          if (!cancelled) {
            setData(cached.data)
            setLoading(false)
            onSuccessRef.current?.(cached.data)
          }
          return
        }

        // Check if there's a pending request for the same key
        let requestPromise = pendingRequests.get(requestKey)
        
        if (!requestPromise) {
          // Create new request
          setLoading(true)
          setError(null)
          
          requestPromise = stableApiCall()
          pendingRequests.set(requestKey, requestPromise)
        }

        const result = await requestPromise
        
        // Remove from pending
        pendingRequests.delete(requestKey)
        
        // Cache the result
        requestCache.set(requestKey, { data: result, timestamp: Date.now() })
        
        if (!cancelled) {
          setData(result)
          onSuccessRef.current?.(result)
        }
      } catch (err) {
        // Remove from pending on error
        pendingRequests.delete(requestKey)
        
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Unknown error')
          
          // Don't set error or call onError for 401 - it's handled by API client redirect
          // This prevents infinite loops and error state updates
          if (error && (error as any).response?.status === 401) {
            // 401 is handled by API client, just stop loading
            setLoading(false)
            return
          }
          
          setError(error)
          onErrorRef.current?.(error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [enabled, requestKey]) // Remove stableApiCall from deps - it's stable

  const refetch = async () => {
    // Clear cache and pending request
    requestCache.delete(requestKey)
    pendingRequests.delete(requestKey)
    
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall()
      
      // Cache the result
      requestCache.set(requestKey, { data: result, timestamp: Date.now() })
      
      setData(result)
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}
