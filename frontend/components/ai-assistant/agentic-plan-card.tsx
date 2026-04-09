"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Play, X, BrainCircuit } from "lucide-react"

interface AgenticPlanCardProps {
  planDescription: string
  onConfirm: () => void
  onCancel: () => void
  disabled?: boolean
}

export function AgenticPlanCard({ planDescription, onConfirm, onCancel, disabled }: AgenticPlanCardProps) {
  return (
    <div className="flex gap-3">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-violet-600">
          AI
        </div>
      </div>

      <div className="flex-1 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-slate-900">AI Assistant</span>
          <Badge variant="secondary" className="text-xs font-normal bg-violet-50 text-violet-700">
            <span className="flex items-center gap-1">
              <BrainCircuit className="h-3 w-3" />
              Kế hoạch phân tích sâu
            </span>
          </Badge>
        </div>

        <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-100">
            <BrainCircuit className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-900">
              AI đề xuất kế hoạch sau — bạn có muốn chạy phân tích không?
            </span>
          </div>

          {/* Plan content */}
          <div className="p-4">
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ul: ({ children }) => <ul className="list-disc list-inside text-slate-700 text-sm space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-slate-700 text-sm space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-700">{children}</li>,
                  p: ({ children }) => <p className="text-slate-700 text-sm leading-relaxed mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                  code: ({ children }) => <code className="bg-violet-100 text-violet-800 rounded px-1.5 py-0.5 font-mono text-xs">{children}</code>,
                }}
              >
                {planDescription}
              </ReactMarkdown>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100">
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={onConfirm}
              disabled={disabled}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Xác nhận — Chạy phân tích
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Hủy
            </Button>
            <span className="text-xs text-slate-400 ml-1">
              AI sẽ truy vấn cơ sở dữ liệu theo kế hoạch trên
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
