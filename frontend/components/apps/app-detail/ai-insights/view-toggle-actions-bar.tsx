"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Code2,
  Copy,
  FileDown,
  Share2,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ViewToggleActionsBarProps {
  viewMode: "rendered" | "raw";
  onViewModeChange: (mode: "rendered" | "raw") => void;
  content: string;
}

export function ViewToggleActionsBar({
  viewMode,
  onViewModeChange,
  content,
}: ViewToggleActionsBarProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Markdown content has been copied",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = () => {
    toast({
      title: "Export started",
      description: "Your PDF will be ready shortly",
    });
  };

  const handleShareToLark = () => {
    toast({
      title: "Sharing to Lark",
      description: "Opening Lark share dialog...",
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: View Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-2 rounded-md transition-colors",
              viewMode === "rendered"
                ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onViewModeChange("rendered")}
          >
            <Eye className="h-4 w-4" />
            Rendered
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-2 rounded-md transition-colors",
              viewMode === "raw"
                ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onViewModeChange("raw")}
          >
            <Code2 className="h-4 w-4" />
            Raw
          </Button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 bg-background hover:bg-muted"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 bg-background p-0 hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Markdown
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
              <FileDown className="h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleShareToLark} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share to Lark
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
