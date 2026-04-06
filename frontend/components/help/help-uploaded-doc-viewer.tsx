"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { helpDocumentsApi } from "@/lib/api/services"
import type { HelpDocumentListItem } from "@/types/api"
import { HelpMarkdown } from "@/components/help/help-markdown"
import { transformHelpMarkdown } from "@/lib/transform-help-markdown"
import { useToast } from "@/hooks/use-toast"

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function kindFromContentType(ct: string): "md" | "text" | "pdf" | "image" | "docx" | "binary" {
  const c = ct.toLowerCase()
  if (c.includes("markdown") || c.includes("text/markdown")) return "md"
  if (c.includes("text/plain")) return "text"
  if (c.includes("pdf")) return "pdf"
  if (c.startsWith("image/")) return "image"
  if (c.includes("wordprocessingml") || c.includes("msword")) return "docx"
  return "binary"
}

type HelpUploadedDocViewerProps = {
  docId: string
}

export function HelpUploadedDocViewer({ docId }: HelpUploadedDocViewerProps) {
  const { toast } = useToast()
  const [meta, setMeta] = useState<HelpDocumentListItem | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [textBody, setTextBody] = useState<string | null>(null)
  const [kind, setKind] = useState<ReturnType<typeof kindFromContentType> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const revokeBlob = useCallback(() => {
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  useEffect(() => {
    if (!uuidRe.test(docId)) {
      setLoadError("ID tài liệu không hợp lệ.")
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      revokeBlob()
      setTextBody(null)
      setKind(null)
      try {
        const m = await helpDocumentsApi.get(docId)
        if (cancelled) return
        setMeta(m)
        const k = kindFromContentType(m.contentType || "")
        setKind(k)

        const { blob } = await apiClient.getBlob(`/api/HelpDocuments/${docId}/file`)
        if (cancelled) return

        if (k === "md" || k === "text") {
          const text = await blob.text()
          if (cancelled) return
          setTextBody(k === "md" ? transformHelpMarkdown(text) : text)
        } else if (k === "pdf" || k === "image") {
          const url = URL.createObjectURL(blob)
          if (cancelled) {
            URL.revokeObjectURL(url)
            return
          }
          setBlobUrl(url)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Không tải được tài liệu.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [docId, revokeBlob])

  useEffect(() => () => revokeBlob(), [revokeBlob])

  async function handleDownload() {
    if (!meta) return
    try {
      const { blob } = await apiClient.getBlob(`/api/HelpDocuments/${docId}/file`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = meta.originalFileName || "document"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast({
        title: "Tải xuống thất bại",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    }
  }

  async function handleDelete() {
    if (!meta?.isOwner) return
    if (!window.confirm("Xóa tài liệu này? Hành động không hoàn tác.")) return
    setDeleting(true)
    try {
      await helpDocumentsApi.delete(docId)
      toast({ title: "Đã xóa tài liệu" })
      window.location.href = "/help"
    } catch (e) {
      toast({
        title: "Không xóa được",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loadError && !loading) {
    return (
      <div className="space-y-4">
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Help
        </Link>
        <p className="text-slate-600">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/help"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Help &amp; Docs
          </Link>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải…
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{meta?.title}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {meta?.originalFileName}
                {meta?.isPublishedGlobal ? (
                  <span className="ml-2 text-emerald-600 font-medium">· Chia sẻ toàn tổ chức</span>
                ) : (
                  <span className="ml-2 text-slate-400">· Chỉ tác giả</span>
                )}
              </p>
            </>
          )}
        </div>
        {!loading && meta && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleDownload()}>
              <Download className="h-4 w-4 mr-1" />
              Tải xuống
            </Button>
            {meta.isOwner && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )}
      </div>

      {!loading && meta && kind === "md" && textBody !== null && <HelpMarkdown content={textBody} />}

      {!loading && meta && kind === "text" && textBody !== null && (
        <pre className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-4">
          {textBody}
        </pre>
      )}

      {!loading && meta && kind === "pdf" && blobUrl && (
        <iframe title={meta.title} src={blobUrl} className="w-full min-h-[80vh] rounded-lg border border-slate-200" />
      )}

      {!loading && meta && kind === "image" && blobUrl && (
        <img src={blobUrl} alt={meta.title} className="max-w-full rounded-lg border border-slate-200 shadow-sm" />
      )}

      {!loading && meta && kind === "docx" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          File Word (.docx) không xem trực tiếp trên trình duyệt. Dùng nút <strong>Tải xuống</strong> để mở bằng ứng dụng
          trên máy.
        </div>
      )}

      {!loading && meta && kind === "binary" && (
        <p className="text-slate-600 text-sm">Không có bản xem trước. Dùng nút Tải xuống.</p>
      )}
    </div>
  )
}
