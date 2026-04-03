"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Trash2, Edit2, X, Sparkles } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface GeneratedContext {
  id: string
  type: string
  icon: string
  title: string
  content: string
  isEditing?: boolean
}

interface AIContextBuilderModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (contexts: GeneratedContext[]) => void
}

const contextTypeEmojis = {
  "game-design": "🎮",
  monetization: "💰",
  "user-flow": "🔄",
  "geo-strategy": "🌍",
  "ua-campaigns": "🎯",
  "ab-tests": "🧪",
}

// Simulated AI follow-up questions
const followUpQuestions = [
  "Bạn có thể cho tôi biết thêm về difficulty curve? Levels nào hay bị drop rate cao?",
  "Monetization strategy cho các thị trường khác nhau (US vs SEA) có khác không?",
  "Hiện tại có A/B test nào đang chạy không? Kết quả ban đầu ra sao?",
  "Chiến lược user acquisition của bạn là gì? Bạn đang focus vào channels nào?",
]

export function AIContextBuilderModal({
  isOpen,
  onOpenChange,
  onSave,
}: AIContextBuilderModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Xin chào! Tôi sẽ giúp bạn tạo context cho app.

Hãy mô tả app/game của bạn. Bạn có thể nói về:

🎮 Thiết kế game (levels, mechanics, progression)
💰 Chiến lược monetization (IAP, ads, subscription)
🌍 Chiến lược theo quốc gia
🔄 User flow và core loop
🧪 A/B tests đang chạy

Ví dụ: "Puzzle Blast là puzzle game có 500 levels, kiếm tiền chủ yếu từ rewarded video và gem IAP..."`,
      timestamp: new Date(),
    },
  ])
  const [userInput, setUserInput] = useState("")
  const [generatedContexts, setGeneratedContexts] = useState<GeneratedContext[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationTurns, setConversationTurns] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!userInput.trim()) return

    const newMessage: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setUserInput("")
    setIsLoading(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Simulate AI response and context generation
    const turnNumber = conversationTurns + 1
    let aiResponse = ""
    let newContexts: GeneratedContext[] = []

    if (turnNumber === 1) {
      aiResponse =
        "Cảm ơn! Tôi hiểu. Puzzle Blast là một puzzle game với 500 levels. Bạn kiếm tiền chủ yếu từ rewarded video và IAP. Điều này rất hữu ích!\n\n" +
        followUpQuestions[0]

      newContexts = [
        {
          id: "ctx-1",
          type: "game-design",
          icon: "🎮",
          title: "Game Progression & Level Design",
          content:
            "Puzzle Blast có 500 levels, chia thành các worlds. Mỗi world có 50 levels. Game có progressive difficulty curve, với boss levels sau mỗi 50 levels.",
        },
      ]
    } else if (turnNumber === 2) {
      aiResponse =
        "Tuyệt vời! Những thông tin này rất quan trọng. Hãy cho tôi biết thêm về những khác biệt trong monetization giữa các khu vực.\n\n" +
        followUpQuestions[1]

      newContexts = [
        ...generatedContexts,
        {
          id: "ctx-2",
          type: "monetization",
          icon: "💰",
          title: "Monetization Strategy",
          content:
            "IAP: Gem packages ($0.99-$49.99), VIP subscription ($4.99/mo). IAA: Rewarded video (sau mỗi 3-5 levels), Interstitial ads (mỗi 2-3 lần mở game).",
        },
      ]
    } else if (turnNumber >= 3) {
      aiResponse =
        "Tôi đã hiểu đủ! Xem bên phải — tôi đã tạo 3 context items. Bạn có thể review và chỉnh sửa trước khi lưu."

      newContexts = [
        ...generatedContexts,
        {
          id: "ctx-3",
          type: "geo-strategy",
          icon: "🌍",
          title: "Geo-Specific Strategy",
          content:
            "US/EU: focus IAP, low ad frequency. SEA: focus IAA, high ad frequency. Japan: gacha-style gameplay elements to increase engagement.",
        },
      ]
    }

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now() + 1),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      },
    ])

    setGeneratedContexts(newContexts)
    setConversationTurns(turnNumber)
    setIsLoading(false)
  }

  const handleRemoveContext = (id: string) => {
    setGeneratedContexts((prev) => prev.filter((ctx) => ctx.id !== id))
  }

  const handleEditContext = (id: string, field: "title" | "content", value: string) => {
    setGeneratedContexts((prev) =>
      prev.map((ctx) =>
        ctx.id === id
          ? { ...ctx, [field]: value }
          : ctx
      )
    )
  }

  const handleSaveAllContexts = () => {
    onSave(generatedContexts)
    onOpenChange(false)
  }

  const handleDiscardAll = () => {
    setGeneratedContexts([])
    setMessages([messages[0]])
    setUserInput("")
    setConversationTurns(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <DialogTitle>AI Context Builder</DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Describe your app — AI will structure the context for you</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-lg text-slate-500 hover:bg-slate-100 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="flex-1 flex gap-0 overflow-hidden">
          {/* Left Panel: Chat Interface */}
          <div className="flex-1 flex flex-col border-r border-slate-200">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-3 rounded-lg text-sm ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-100 text-slate-900 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-900 px-4 py-3 rounded-lg rounded-bl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-slate-200 p-4 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Mô tả app của bạn..."
                  className="resize-none h-20"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel: Generated Contexts */}
          <div className="w-80 border-l border-slate-200 flex flex-col bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                Generated Contexts
                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                  {generatedContexts.length}
                </span>
              </h3>
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {generatedContexts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">Contexts will appear here as you chat...</p>
                  </div>
                ) : (
                  generatedContexts.map((ctx) => (
                    <Card key={ctx.id} className="p-3 bg-white border border-slate-200">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-lg">{ctx.icon}</span>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={ctx.title}
                              onChange={(e) => handleEditContext(ctx.id, "title", e.target.value)}
                              className="text-sm font-semibold text-slate-900 w-full bg-transparent border-0 p-0 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveContext(ctx.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={ctx.content}
                        onChange={(e) => handleEditContext(ctx.id, "content", e.target.value)}
                        className="text-xs text-slate-600 w-full bg-transparent border-0 p-0 focus:outline-none focus:ring-1 focus:ring-indigo-200 rounded resize-none h-16"
                      />
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Contexts generated: <span className="font-semibold">{generatedContexts.length}</span>
            </span>
            <button
              onClick={handleDiscardAll}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
              disabled={generatedContexts.length === 0}
            >
              Discard All
            </button>
          </div>
          <Button
            onClick={handleSaveAllContexts}
            disabled={generatedContexts.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Save All Contexts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
