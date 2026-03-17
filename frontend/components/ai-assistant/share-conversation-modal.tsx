"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface ShareConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
}

export function ShareConversationModal({
  open,
  onOpenChange,
  conversationId,
}: ShareConversationModalProps) {
  const [copied, setCopied] = useState(false)
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/ai-assistant?conversationId=${conversationId}`
      : ""

  const handleCopy = useCallback(async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      setCopied(false)
    }
  }, [link])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chia sẻ conversation</DialogTitle>
          <DialogDescription>
            Gửi link bên dưới cho người khác để họ mở và xem conversation. Khi họ gửi câu hỏi mới, hệ thống sẽ tạo conversation mới (clone) cho họ.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700 break-all select-all">
            {link}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Đã copy
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
