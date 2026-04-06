"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  Globe,
  ListChecks,
  Lock,
  Loader2,
  MessageSquare,
  Upload,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { HELP_ALERT_CENTER_CHILDREN, type HelpDocSlug } from "@/lib/help-docs"
import { helpDocumentsApi } from "@/lib/api/services"
import type { HelpDocumentListItem } from "@/types/api"
import { HelpDocUploadModal } from "@/components/help/help-doc-upload-modal"
import { HELP_UPLOAD_ACCEPT_HINT, isHelpUploadAllowedFile } from "@/lib/help-upload"
import { useToast } from "@/hooks/use-toast"

const slugIcon = (slug: "" | HelpDocSlug) => {
  if (slug === "") return BookOpen
  if (slug === "slack-user") return MessageSquare
  return ListChecks
}

export function HelpDocsSidebar() {
  const pathname = usePathname()
  const { toast } = useToast()
  const anyHelpActive = pathname.startsWith("/help")
  const [alertCenterOpen, setAlertCenterOpen] = useState(anyHelpActive)
  const [uploadsOpen, setUploadsOpen] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [docs, setDocs] = useState<HelpDocumentListItem[]>([])
  const [docsLoading, setDocsLoading] = useState(false)

  const loadDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const list = await helpDocumentsApi.list()
      setDocs(Array.isArray(list) ? list : [])
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (anyHelpActive) setAlertCenterOpen(true)
  }, [anyHelpActive])

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])

  const anyChildActive = HELP_ALERT_CENTER_CHILDREN.some((item) => {
    const href = item.slug ? `/help/${item.slug}` : "/help"
    return pathname === href || pathname.startsWith(`${href}/`)
  })

  const onDragOverAside = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy"
      setDragOver(true)
    }
  }

  const onDragLeaveAside = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = e.relatedTarget as Node | null
    if (next && (e.currentTarget as HTMLElement).contains(next)) return
    setDragOver(false)
  }

  const openFilePicker = (e: React.MouseEvent) => {
    e.stopPropagation()
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".pdf,.txt,.md,.docx,.png,.jpg,.jpeg,.gif,.webp"
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return
      if (!isHelpUploadAllowedFile(f)) {
        toast({
          title: "Định dạng không hỗ trợ",
          description: HELP_UPLOAD_ACCEPT_HINT,
          variant: "destructive",
        })
        return
      }
      setPendingFile(f)
      setModalOpen(true)
    }
    input.click()
  }

  const onDropAside = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (!f) {
      toast({ title: "Không có file", description: "Kéo một file vào sidebar.", variant: "destructive" })
      return
    }
    if (!isHelpUploadAllowedFile(f)) {
      toast({
        title: "Định dạng không hỗ trợ",
        description: HELP_UPLOAD_ACCEPT_HINT,
        variant: "destructive",
      })
      return
    }
    setPendingFile(f)
    setModalOpen(true)
  }

  return (
    <>
      <aside
        onDragOver={onDragOverAside}
        onDragLeave={onDragLeaveAside}
        onDrop={onDropAside}
        className={cn(
          "w-full shrink-0 lg:w-60 flex flex-col rounded-lg border bg-white shadow-sm transition-colors",
          dragOver ? "border-blue-500 border-2 ring-2 ring-blue-200" : "border-slate-200",
          "lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)]",
        )}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Help &amp; Docs</p>
            <p className="text-xs text-slate-500 truncate">Tài liệu sản phẩm</p>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0">
          <div>
            <button
              type="button"
              onClick={() => setAlertCenterOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                anyChildActive ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Bell className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">Alert Center</span>
              <ChevronRight
                className={cn("w-4 h-4 text-slate-400 transition-transform shrink-0", alertCenterOpen && "rotate-90")}
              />
            </button>

            {alertCenterOpen && (
              <div className="mt-1 ml-2 pl-2 border-l border-slate-200 space-y-0.5">
                {HELP_ALERT_CENTER_CHILDREN.map((item) => {
                  const href = item.slug ? `/help/${item.slug}` : "/help"
                  const isActive =
                    item.slug === ""
                      ? pathname === "/help"
                      : pathname === `/help/${item.slug}` || pathname.startsWith(`/help/${item.slug}/`)
                  const Icon = slugIcon(item.slug)

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-start gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 text-left leading-snug">
                        <span className="block">{item.title}</span>
                        {item.description && (
                          <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setUploadsOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith("/help/uploads")
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <FileText className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">Tài liệu tải lên</span>
              <ChevronRight
                className={cn("w-4 h-4 text-slate-400 transition-transform shrink-0", uploadsOpen && "rotate-90")}
              />
            </button>

            {uploadsOpen && (
              <div className="mt-2 space-y-2 px-1">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className={cn(
                    "w-full flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-2 py-3 text-center text-xs transition-colors",
                    dragOver
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-slate-50/80 text-slate-600 hover:border-slate-400 hover:bg-slate-100",
                  )}
                >
                  <Upload className="h-4 w-4" />
                  <span className="font-medium">Kéo thả file vào sidebar</span>
                  <span className="text-[10px] text-slate-500 leading-tight">{HELP_UPLOAD_ACCEPT_HINT}</span>
                </button>

                {docsLoading ? (
                  <div className="flex justify-center py-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : docs.length === 0 ? (
                  <p className="text-[11px] text-slate-400 px-2 text-center">Chưa có tài liệu.</p>
                ) : (
                  <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                    {docs.map((d) => {
                      const href = `/help/uploads/${d.id}`
                      const active = pathname === href
                      return (
                        <li key={d.id}>
                          <Link
                            href={href}
                            className={cn(
                              "flex items-start gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors",
                              active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100",
                            )}
                          >
                            {d.isPublishedGlobal ? (
                              <span title="Chia sẻ tổ chức" className="shrink-0 mt-0.5">
                                <Globe className="w-3 h-3 text-emerald-600" />
                              </span>
                            ) : (
                              <span title="Riêng tư (chỉ tác giả)" className="shrink-0 mt-0.5">
                                <Lock className="w-3 h-3 text-slate-400" />
                              </span>
                            )}
                            <span className="line-clamp-2 leading-snug">{d.title}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </nav>
      </aside>

      <HelpDocUploadModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v)
          if (!v) setPendingFile(null)
        }}
        file={pendingFile}
        onUploaded={() => {
          setPendingFile(null)
          void loadDocs()
        }}
      />
    </>
  )
}
