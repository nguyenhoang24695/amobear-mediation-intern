"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { dataSourcesApi } from "@/lib/api/services"

function logTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23) + "Z"
}

async function consumeSseLogStream(
  response: Response,
  onLogLine: (serverLine: string) => void,
  signal: AbortSignal
): Promise<void> {
  const body = response.body
  if (!body) throw new Error("No response body for log stream")

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let carry = ""

  while (!signal.aborted) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })
    for (;;) {
      const sep = carry.indexOf("\n\n")
      if (sep < 0) break
      const block = carry.slice(0, sep)
      carry = carry.slice(sep + 2)
      for (const raw of block.split("\n")) {
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw
        if (!line.startsWith("data:")) continue
        const payload = line.startsWith("data: ") ? line.slice(6) : line.slice(5).trimStart()
        try {
          const obj = JSON.parse(payload) as { line?: string }
          if (typeof obj?.line === "string") onLogLine(obj.line)
          else onLogLine(payload)
        } catch {
          onLogLine(payload)
        }
      }
    }
  }
}

export function useBackfillRunLogStream() {
  const [logLines, setLogLines] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const streamAbortRef = useRef<AbortController | null>(null)

  const appendLog = useCallback((message: string) => {
    setLogLines((prev) => [...prev, `${logTimestamp()}  ${message}`])
  }, [])

  const stopStream = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setStreaming(false)
  }, [])

  const startStream = useCallback(
    async (eventsUrl: string, options?: { initialMessage?: string }) => {
      stopStream()
      const ac = new AbortController()
      streamAbortRef.current = ac
      setStreaming(true)
      if (options?.initialMessage) {
        appendLog(options.initialMessage)
      }
      try {
        const streamRes = await dataSourcesApi.openBackfillRunLogStream(eventsUrl, ac.signal)
        await consumeSseLogStream(streamRes, appendLog, ac.signal)
      } catch (error: unknown) {
        if (!ac.signal.aborted) {
          const msg = error instanceof Error ? error.message : "Log stream failed"
          appendLog(`Lỗi: ${msg}`)
        }
      } finally {
        if (streamAbortRef.current === ac) {
          streamAbortRef.current = null
          setStreaming(false)
        }
      }
    },
    [appendLog, stopStream]
  )

  const resetLogs = useCallback((seed?: string) => {
    setLogLines(seed ? [`${logTimestamp()}  ${seed}`] : [])
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  return {
    logLines,
    logText: logLines.join("\n"),
    streaming,
    appendLog,
    startStream,
    stopStream,
    resetLogs,
  }
}
