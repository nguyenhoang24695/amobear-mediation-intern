"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AiContext } from "./ai-assistant-content"

interface ChooseContextForForkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contexts: AiContext[]
  onSelect: (contextId: string) => void
}

export function ChooseContextForForkModal({
  open,
  onOpenChange,
  contexts,
  onSelect,
}: ChooseContextForForkModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn context để đưa conversation vào</DialogTitle>
          <DialogDescription>
            Conversation này sẽ được sao chép vào context bạn chọn. Sau đó bạn có thể tiếp tục hỏi AI trong context đó.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[280px] rounded-md border">
          <div className="p-2 space-y-1">
            {contexts.map((ctx) => (
              <Button
                key={ctx.id}
                variant="ghost"
                className="w-full justify-start gap-2 h-auto py-2.5"
                onClick={() => {
                  onSelect(ctx.id)
                  onOpenChange(false)
                }}
              >
                <span className="text-lg">{ctx.icon}</span>
                <div className="text-left truncate">
                  <div className="font-medium text-sm">{ctx.name}</div>
                  {ctx.appScope && (
                    <div className="text-xs text-slate-500 truncate">{ctx.appScope}</div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
