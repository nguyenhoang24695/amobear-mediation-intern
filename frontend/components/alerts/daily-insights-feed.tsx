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
    summary: { totalApps: number; criticalCount: number; warningCount: number; healthyCount: number; generatedApps: number }
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
      toast({ title: "Không tải được Daily Insights", variant: "destructive" })
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
    return <p className="text-sm text-slate-500">Bạn không có quyền xem Daily Insights.</p>
  }

  const summary = payload?.summary

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Daily Insights
          </h2>
          <p className="text-sm text-slate-500 mt-1">Tổng hợp insight theo ngày (T-1 mặc định)</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <CalendarIcon className="w-4 h-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView("cards")}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{summary.totalApps}</p>
              <p className="text-xs text-slate-500">Apps</p>
            </CardContent>
          </Card>
          <Card className="border-red-100 bg-red-50/50">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600">{summary.criticalCount}</p>
              <p className="text-xs text-slate-600">Critical</p>
            </CardContent>
          </Card>
          <Card className="border-amber-100 bg-amber-50/50">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-700">{summary.warningCount}</p>
              <p className="text-xs text-slate-600">Warning</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-emerald-50/50">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-700">{summary.healthyCount}</p>
              <p className="text-xs text-slate-600">Healthy</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" placeholder="Tìm app…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="severity">Sort: Severity</SelectItem>
            <SelectItem value="health">Sort: Health</SelectItem>
            <SelectItem value="revenue">Sort: Revenue</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
          <SelectTrigger className="w-40">
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
        <div className="flex justify-center py-16 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.insightId} className="border-slate-200 hover:border-indigo-200 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={item.iconUri || "/placeholder.svg"}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.displayName ?? item.appId}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">{item.appId}</p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      (item.healthScore ?? 0) >= 70 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900",
                    )}
                  >
                    {item.healthScore ?? "—"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{item.summary || "—"}</p>
                <div className="flex flex-wrap gap-1">
                  {item.anomalies.slice(0, 4).map((a, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        "text-xs",
                        a.severity === "critical" && "border-red-200 text-red-700",
                        a.severity === "warning" && "border-amber-200 text-amber-800",
                        a.severity === "positive" && "border-emerald-200 text-emerald-800",
                      )}
                    >
                      {a.label}
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full gap-1 text-indigo-600" asChild>
                  <Link href={`/apps/${encodeURIComponent(item.appId)}?tab=ai-insight&date=${item.insightDate}`}>
                    Mở insight
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {items.map((item) => (
            <Link
              key={item.insightId}
              href={`/apps/${encodeURIComponent(item.appId)}?tab=ai-insight&date=${item.insightDate}`}
              className="flex items-center gap-4 p-4 hover:bg-slate-50"
            >
              <img src={item.iconUri || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.displayName ?? item.appId}</p>
                <p className="text-sm text-slate-500 truncate">{item.summary}</p>
              </div>
              <Badge variant="secondary">{item.healthScore ?? "—"}</Badge>
            </Link>
          ))}
        </div>
      )}

      {!loading && items.length === 0 ? (
        <p className="text-center text-slate-500 py-12 text-sm">Không có insight cho bộ lọc hiện tại.</p>
      ) : null}
    </div>
  )
}
