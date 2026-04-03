"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Eye,
  Code2,
  Copy,
  FileDown,
  Share2,
  MoreHorizontal,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface ViewToggleActionsBarProps {
  viewMode: "rendered" | "raw"
  onViewModeChange: (mode: "rendered" | "raw") => void
  sections: Array<{ id: string; title: string }>
  content: string
}

export function ViewToggleActionsBar({
  viewMode,
  onViewModeChange,
  sections,
  content,
}: ViewToggleActionsBarProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "Markdown content has been copied",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPdf = () => {
    toast({
      title: "Export started",
      description: "Your PDF will be ready shortly",
    })
  }

  const handleShareToLark = () => {
    toast({
      title: "Sharing to Lark",
      description: "Opening Lark share dialog...",
    })
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
      {/* Left: View Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-2 rounded-md",
              viewMode === "rendered"
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => onViewModeChange("rendered")}
          >
            <Eye className="w-4 h-4" />
            Rendered
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-2 rounded-md",
              viewMode === "raw"
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => onViewModeChange("raw")}
          >
            <Code2 className="w-4 h-4" />
            Raw
          </Button>
        </div>

        {/* Quick Nav Pills */}
        {viewMode === "rendered" && sections.length > 0 && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500">Jump to:</span>
            <div className="flex items-center gap-1.5">
              {sections.map((section) => (
                <Badge
                  key={section.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                  onClick={() => scrollToSection(section.title.toLowerCase().replace(/\s+/g, "-"))}
                >
                  {section.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 bg-white"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopy} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
              <FileDown className="w-4 h-4" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareToLark} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share to Lark
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
