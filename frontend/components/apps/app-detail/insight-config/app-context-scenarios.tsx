"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Edit2, Trash2, Sparkles } from "lucide-react"
import { AddEditContextModal } from "./add-edit-context-modal"
import { AIContextBuilderModal } from "./ai-context-builder-modal"

interface ContextItem {
  id: string
  type: "game-design" | "monetization" | "user-flow" | "geo-strategy" | "custom"
  title: string
  preview: string
  updatedAt: string
}

const contextTypeConfig = {
  "game-design": { label: "Game Design", color: "bg-purple-100 text-purple-700", icon: "🎮" },
  monetization: { label: "Monetization", color: "bg-green-100 text-green-700", icon: "💰" },
  "user-flow": { label: "User Flow", color: "bg-blue-100 text-blue-700", icon: "🔄" },
  "geo-strategy": { label: "Geo Strategy", color: "bg-amber-100 text-amber-700", icon: "🌍" },
  custom: { label: "Custom", color: "bg-slate-100 text-slate-700", icon: "📝" },
}

const mockContextItems: ContextItem[] = [
  {
    id: "1",
    type: "game-design",
    title: "Game Progression & Level Design",
    preview: "Puzzle Blast có 500 levels, chia thành 10 worlds. Mỗi world có 1 boss level...",
    updatedAt: "Updated 5 days ago",
  },
  {
    id: "2",
    type: "monetization",
    title: "Monetization Strategy",
    preview: "IAP: gem packages ($0.99-$49.99), VIP subscription ($4.99/mo). IAA: rewarded video...",
    updatedAt: "Updated 2 weeks ago",
  },
  {
    id: "3",
    type: "geo-strategy",
    title: "Geo-Specific Strategy",
    preview: "US/EU: focus IAP, low ad frequency. SEA: focus IAA, high ad frequency. Japan: gacha-style...",
    updatedAt: "Updated 3 days ago",
  },
  {
    id: "4",
    type: "custom",
    title: "Current A/B Tests",
    preview: "AB Test #12: Rewarded video frequency (3 levels vs 5 levels), started 15/03/2026...",
    updatedAt: "Updated 1 day ago",
  },
]

export function AppContextScenarios() {
  const [contextItems, setContextItems] = useState<ContextItem[]>(mockContextItems)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAIBuilderOpen, setIsAIBuilderOpen] = useState(false)
  const [editingContext, setEditingContext] = useState<ContextItem | null>(null)

  const handleEdit = (item: ContextItem) => {
    setEditingContext(item)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setContextItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSaveContext = (data: any) => {
    if (editingContext) {
      setContextItems((prev) =>
        prev.map((item) =>
          item.id === editingContext.id
            ? { ...item, ...data, updatedAt: "Updated just now" }
            : item
        )
      )
    } else {
      setContextItems((prev) => [
        ...prev,
        { id: String(Date.now()), ...data, updatedAt: "Updated just now" },
      ])
    }
    setIsModalOpen(false)
    setEditingContext(null)
  }

  const handleSaveAIContexts = (contexts: any[]) => {
    const newContexts = contexts.map((ctx) => ({
      id: String(Date.now() + Math.random()),
      type: ctx.type || "custom",
      title: ctx.title,
      preview: ctx.content.substring(0, 100),
      updatedAt: "Updated just now",
    }))
    setContextItems((prev) => [...prev, ...newContexts])
  }

  return (
    <>
      <Card className="border border-indigo-200 bg-indigo-50 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">App Context for AI</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Provide app-specific context so AI can generate more relevant insights. Include game design, user
              flows, monetization strategies, and any special context.
            </p>

            {contextItems.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-lg border-2 border-dashed border-indigo-300 bg-white">
                <Brain className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-900 mb-1">No app context added yet</p>
                <p className="text-sm text-slate-600 mb-4">
                  Adding game scenarios, user flows, and monetization strategies helps AI generate more accurate
                  and actionable insights
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contextItems.map((item) => {
                  const config = contextTypeConfig[item.type]
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group"
                    >
                      <span className="text-xl">{config.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600 line-clamp-2">{item.preview}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${config.color}`}>{config.label}</span>
                          <span className="text-xs text-slate-500">{item.updatedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingContext(null)
            setIsModalOpen(true)
          }}
          className="mt-6 bg-indigo-600 hover:bg-indigo-700"
        >
          Add Context
        </Button>

        <Button
          onClick={() => setIsAIBuilderOpen(true)}
          variant="outline"
          className="mt-4 w-full border-indigo-300 text-indigo-600 hover:bg-indigo-50 gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Add Context via AI
        </Button>
      </Card>

      <AddEditContextModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingContext={editingContext}
        onSave={handleSaveContext}
      />

      <AIContextBuilderModal
        isOpen={isAIBuilderOpen}
        onOpenChange={setIsAIBuilderOpen}
        onSave={handleSaveAIContexts}
      />
    </>
  )
}
