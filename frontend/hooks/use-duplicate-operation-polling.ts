"use client"

import { useEffect, useState } from "react"
import { metaCampaignsApi } from "@/lib/api/meta-ads"
import type { MetaCampaignDuplicateOperationDto } from "@/types/meta-ads"

const TERMINAL_STATUSES = new Set(["completed", "completed_with_errors", "failed"])

export function useDuplicateOperationPolling(operationId: number | null, enabled: boolean) {
  const [operation, setOperation] = useState<MetaCampaignDuplicateOperationDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !operationId) {
      setOperation(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let timeoutId: number | null = null

    const poll = async () => {
      try {
        if (!cancelled) {
          setLoading(true)
        }

        const result = await metaCampaignsApi.getDuplicateOperation(operationId)
        if (cancelled) return

        setOperation(result)
        setError(null)

        const isTerminal = TERMINAL_STATUSES.has(result.status.trim().toLowerCase())
        if (!isTerminal) {
          timeoutId = window.setTimeout(() => {
            void poll()
          }, 3000)
        }
      } catch (apiError) {
        if (cancelled) return
        const nextError = apiError instanceof Error ? apiError : new Error("Unable to poll duplicate operation.")
        setError(nextError)
        timeoutId = window.setTimeout(() => {
          void poll()
        }, 5000)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [enabled, operationId])

  const normalizedStatus = operation?.status.trim().toLowerCase() ?? ""

  return {
    operation,
    loading,
    error,
    isCompleted: normalizedStatus === "completed" || normalizedStatus === "completed_with_errors",
    isFailed: normalizedStatus === "failed",
    isTerminal: TERMINAL_STATUSES.has(normalizedStatus),
  }
}
