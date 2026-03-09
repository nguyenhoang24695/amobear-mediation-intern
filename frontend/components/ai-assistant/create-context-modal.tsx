"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Library, Pencil, Star, Users } from "lucide-react"
import { aiAssistantApi } from "@/lib/api/ai-assistant"

interface CreateContextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; appScope: string; prompt?: string; fromLibrary?: string }) => void
}

const appOptions = [
  { value: "puzzle_blast", label: "Puzzle Blast" },
  { value: "word_master", label: "Word Master" },
  { value: "racing_legends", label: "Racing Legends" },
  { value: "all_apps", label: "All Apps" },
]

export function CreateContextModal({ open, onOpenChange, onSubmit }: CreateContextModalProps) {
  const [activeTab, setActiveTab] = useState<"custom" | "library">("custom")
  const [name, setName] = useState("")
  const [appScope, setAppScope] = useState("")
  const [prompt, setPrompt] = useState("")
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
  const [libraryContexts, setLibraryContexts] = useState<{ id: string; name: string; description?: string; cloneCount: number; rating: number; focusAreas: string[] }[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  useEffect(() => {
    if (open && activeTab === "library") {
      setLibraryLoading(true)
      aiAssistantApi.getSharedContexts(undefined, "system", 1, 50).then((list) => {
        setLibraryContexts((list ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          cloneCount: c.cloneCount ?? 0,
          rating: c.rating ?? 0,
          focusAreas: c.focusAreas ?? [],
        })))
      }).catch(() => setLibraryContexts([])).finally(() => setLibraryLoading(false))
    }
  }, [open, activeTab])

  const handleSubmit = () => {
    if (activeTab === "custom") {
      if (!name || !appScope) return
      onSubmit({ name, appScope, prompt })
    } else {
      if (!selectedLibraryId) return
      const libContext = libraryContexts.find(c => c.id === selectedLibraryId)
      onSubmit({ 
        name: libContext?.name || "", 
        appScope: appScope || "all_apps", 
        fromLibrary: selectedLibraryId 
      })
    }
    // Reset form
    setName("")
    setAppScope("")
    setPrompt("")
    setSelectedLibraryId(null)
  }

  const isValid = activeTab === "custom" 
    ? name && appScope 
    : !!selectedLibraryId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Context</DialogTitle>
          <DialogDescription>
            Create a custom context or clone from the library to start analyzing your data.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "custom" | "library")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Custom Context
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              From Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Context Name</Label>
              <Input
                id="name"
                placeholder="e.g., Level Analytics, Revenue Dashboard"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appScope">App Scope</Label>
              <Select value={appScope} onValueChange={setAppScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an app" />
                </SelectTrigger>
                <SelectContent>
                  {appOptions.map((app) => (
                    <SelectItem key={app.value} value={app.value}>
                      {app.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Custom Prompt (Optional)</Label>
              <Textarea
                id="prompt"
                placeholder="Add specific instructions or focus areas for this context..."
                className="min-h-[100px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Define focus areas, preferred metrics, or specific analysis patterns.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="appScope2">App Scope</Label>
              <Select value={appScope} onValueChange={setAppScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an app" />
                </SelectTrigger>
                <SelectContent>
                  {appOptions.map((app) => (
                    <SelectItem key={app.value} value={app.value}>
                      {app.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select a Template</Label>
              <ScrollArea className="h-[240px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {libraryLoading ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Đang tải thư viện...</p>
                  ) : libraryContexts.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">Chưa có template trong thư viện.</p>
                  ) : (
                    libraryContexts.map((ctx) => (
                      <button
                        key={ctx.id}
                        type="button"
                        onClick={() => setSelectedLibraryId(ctx.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedLibraryId === ctx.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{ctx.name}</div>
                            <div className="text-sm text-slate-500 mt-0.5">
                              {ctx.description ?? ""}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Users className="h-3 w-3" />
                                {ctx.cloneCount} clones
                              </span>
                              <span className="flex items-center gap-1 text-xs text-amber-500">
                                <Star className="h-3 w-3 fill-amber-500" />
                                {ctx.rating}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {(ctx.focusAreas ?? []).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
