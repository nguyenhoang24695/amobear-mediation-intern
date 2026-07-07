"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Sparkles,
  Clock,
  Cpu,
} from "lucide-react";
import { format, isAfter, startOfDay } from "date-fns";

interface InsightHeaderProps {
  selectedDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onDateSelect: (date: Date) => void;
  isToday: boolean;
  generatedAt: string | null;
  generationTime: number | null;
  model: string | null;
  onRegenerate: () => void;
}

export function InsightHeader({
  selectedDate,
  onPrevDay,
  onNextDay,
  onDateSelect,
  isToday,
  generatedAt,
  generationTime,
  model,
  onRegenerate,
}: InsightHeaderProps) {
  const today = startOfDay(new Date());
  const isNextDisabled = isAfter(startOfDay(selectedDate), today) || isToday;

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Title and Date Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              AI Insights
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily performance analysis
            </p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="ml-4 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-2 bg-background px-3 font-medium"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}

                {isToday && (
                  <Badge className="ml-1 bg-primary/10 px-1.5 text-xs text-primary hover:bg-primary/10">
                    Today
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-auto border-border bg-popover p-0 text-popover-foreground"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateSelect(date)}
                disabled={(date) => isAfter(startOfDay(date), today)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNextDay}
            disabled={isNextDisabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right: Generation Info and Actions */}
      <div className="flex items-center gap-4">
        {generatedAt && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Generated {format(new Date(generatedAt), "h:mm a")}</span>
            </div>

            {generationTime && (
              <div className="flex items-center gap-1.5">
                <span className="text-border">|</span>
                <span>{generationTime}s</span>
              </div>
            )}

            {model && (
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>{model}</span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-background"
          onClick={onRegenerate}
        >
          <RefreshCw className="h-4 w-4" />
          Re-generate
        </Button>
      </div>
    </div>
  );
}
