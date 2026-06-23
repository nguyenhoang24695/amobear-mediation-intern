"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { AiMessage } from "./ai-assistant-content"

interface UserMessageBubbleProps {
  message: AiMessage
}

export function UserMessageBubble({ message }: UserMessageBubbleProps) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-2xl">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="text-xs text-slate-400 text-right mt-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src="/professional-man-avatar.png" />
        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
          JD
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
