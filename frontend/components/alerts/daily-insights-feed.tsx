"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { DailyInsightFeedItem } from "@/types/api"
import { CalendarIcon, ChevronRight, Grid3x3, List, Loader2, Search, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function DailyInsightsFeed() {
  const { toast } = useToast()
  const can = hasScreenFunction("s-alerts", "view-daily-insights")
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  })
  const [view, setView] = useState<"cards" | "list">("cards")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"severity" | "health" | "revenue" | "name">("severity")
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "healthy">("all")
  const [payload, setPayload] = useState<{
    date: string
    summary: {
      totalApps: number
      criticalCount: number
      warningCount: number
      healthyCount: number
      generatedApps: number
    }
    items: DailyInsightFeedItem[]
  } | null>(null)

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const load = useCallback(async () => {
    if (!can) return
    setLoading(true)
    try {
      const res = await insightApi.getDailyFeed({
        date: dateStr,
        sort: sortBy,
        severity: severityFilter === "all" ? undefined : severityFilter,
      })
      setPayload(res)
    } catch (e) {
      console.error(e)
      toast({ title: "Khong tai duoc Daily Insights", variant: "destructive" })
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [can, dateStr, sortBy, severityFilter, toast])

  useEffect(() => {
    void load()
  }, [load])

  const items = useMemo(() => {
    if (!payload?.items) return []
    if (!search.trim()) return payload.items
    const q = search.toLowerCase()
    return payload.items.filter(
      (i) =>
        (i.displayName ?? "").toLowerCase().includes(q) ||
        i.appId.toLowerCase().includes(q),
    )
  }, [payload, search])

  if (!can) {
    return <p className="text-sm text-muted-foreground">Ban khong co quyen xem Daily Insights.</p>
  }

  const summary = payload?.summary

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Daily Insights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tong hop insight theo ngay (T-1 mac dinh)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView("cards")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{summary.totalApps}</p>
              <p className="text-xs text-muted-foreground">Apps</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-500/10 dark:border-red-900/60">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.criticalCount}
              </p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-500/10 dark:border-amber-900/60">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {summary.warningCount}
              </p>
              <p className="text-xs text-muted-foreground">Warning</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-500/10 dark:border-emerald-900/60">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {summary.healthyCount}
              </p>
              <p className="text-xs text-muted-foreground">Healthy</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tim app..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="severity">Sort: Severity</SelectItem>
            <SelectItem value="health">Sort: Health</SelectItem>
            <SelectItem value="revenue">Sort: Revenue</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={severityFilter}
          onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.insightId} className="border-border transition-colors hover:border-primary/30">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={item.iconUri || "/placeholder.svg"}
                      alt=""
                      className="h-10 w-10 rounded-lg border border-border object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {item.displayName ?? item.appId}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{item.appId}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      (item.healthScore ?? 0) >= 70
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-800 dark:text-amber-400",
                    )}
                  >
                    {item.healthScore ?? "-"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.summary || "-"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.anomalies.slice(0, 4).map((a, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        "text-xs",
                        a.severity === "critical" &&
                          "border-red-300 text-red-700 dark:border-red-800 dark:text-red-400",
                        a.severity === "warning" &&
                          "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-400",
                        a.severity === "positive" &&
                          "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-400",
                      )}
                    >
                      {a.label}
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full gap-1 text-primary" asChild>
                  <Link href={`/apps/${encodeURIComponent(item.appId)}?tab=ai-insight&date=${item.insightDate}`}>
                    Mo insight
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <Link
              key={item.insightId}
              href={`/apps/${encodeURIComponent(item.appId)}?tab=ai-insight&date=${item.insightDate}`}
              className="flex items-center gap-4 p-4 hover:bg-accent/40"
            >
              <img
                src={item.iconUri || "/placeholder.svg"}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{item.displayName ?? item.appId}</p>
                <p className="truncate text-sm text-muted-foreground">{item.summary}</p>
              </div>
              <Badge variant="secondary">{item.healthScore ?? "-"}</Badge>
            </Link>
          ))}
        </div>
      )}

      {!loading && items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Khong co insight cho bo loc hien tai.
        </p>
      ) : null}
    </div>
  )
}
