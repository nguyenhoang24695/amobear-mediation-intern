"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { InsightTemplate } from "@/types/api"
import { unpackDescription } from "./category-description"

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: InsightTemplate | null
}) {
  if (!template) return null
  const { category, body } = unpackDescription(template.description ?? "")
  const sortedSections = template.sections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88dvh,800px)] w-[min(96vw,640px)] max-w-[min(96vw,640px)] sm:max-w-[min(96vw,640px)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>Preview: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {template.isDefault ? (
                <Badge className="bg-indigo-100 text-indigo-800">Default</Badge>
              ) : null}
              {category ? <Badge variant="secondary">{category}</Badge> : null}
              <Badge variant="outline">{template.sections.length} sections</Badge>
            </div>
            {body ? (
              <div>
                <p className="mb-1 font-medium text-slate-900">Mô tả</p>
                <p className="whitespace-pre-wrap text-slate-600">{body}</p>
              </div>
            ) : null}
            <div>
              <p className="mb-1 font-medium text-slate-900">Global AI instructions</p>
              <pre className="max-h-48 overflow-auto rounded-md border bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-700">
                {template.globalAiInstructions || "—"}
              </pre>
            </div>
            <div>
              <p className="mb-2 font-medium text-slate-900">Sections</p>
              <Accordion type="multiple" className="w-full rounded-md border border-slate-200 px-2">
                {sortedSections.map((s) => (
                  <AccordionItem key={s.sectionKey} value={s.sectionKey} className="border-slate-200">
                    <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{s.title}</span>
                        <span className="text-xs font-normal text-slate-500">({s.sectionKey})</span>
                        {!s.isActive ? (
                          <Badge variant="outline" className="text-amber-700">
                            tắt
                          </Badge>
                        ) : null}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pb-2 text-xs text-slate-600">
                        {s.metrics?.length ? (
                          <p>
                            <span className="font-medium text-slate-800">Metrics: </span>
                            {s.metrics.join(", ")}
                          </p>
                        ) : null}
                        {s.aiInstruction ? (
                          <pre className="max-h-40 overflow-auto rounded border bg-slate-50 p-2 font-mono whitespace-pre-wrap">
                            {s.aiInstruction}
                          </pre>
                        ) : (
                          <p className="text-slate-400">Không có AI instruction.</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            <p className="text-xs text-slate-500">
              Preview chỉ hiển thị cấu hình. Để xem Markdown thật, mở app → tab AI Insight sau khi generate.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
