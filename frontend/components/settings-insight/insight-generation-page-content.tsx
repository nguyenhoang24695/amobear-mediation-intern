"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { InsightGenerationRun } from "@/types/api"
import { Activity, Loader2, Play } from "lucide-react"

export function InsightGenerationPageContent() {
  const { toast } = useToast()
  const canView = hasScreenFunction("s-insight-settings", "view-generation")
  const canTrigger = hasScreenFunction("s-insight-settings", "trigger-generation")
  const [loading, setLoading] = useState(true)
  const [runs, setRuns] = useState<InsightGenerationRun[]>([])
  const [total, setTotal] = useState(0)
  const [dateInput, setDateInput] = useState(() => format(new Date(Date.now() - 86400000), "yyyy-MM-dd"))
  const [triggering, setTriggering] = useState(false)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      const res = await insightApi.listGenerationRuns(1, 30)
      setRuns(res.data)
      setTotal(res.totalCount)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được lịch sử chạy", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [canView, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleTrigger = async () => {
    if (!canTrigger) return
    setTriggering(true)
    try {
      await insightApi.triggerGeneration(dateInput)
      toast({ title: "Đã bắt đầu portfolio run", description: `Ngày ${dateInput}` })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Trigger thất bại", variant: "destructive" })
    } finally {
      setTriggering(false)
    }
  }

  if (!canView) {
    return <p className="text-sm text-muted-foreground">Bạn không có quyền xem Insight generation runs.</p>
  }

  const latest = runs[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Settings · AI Insight</p>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" />
          Insight generation
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Theo dõi batch T-1 và chạy thủ công (portfolio).</p>
      </div>

      {latest ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lần chạy gần nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{format(new Date(latest.startedAt), "PPpp")}</p>
              <p className="text-xs text-muted-foreground mt-1">{latest.triggerKind} · target {latest.insightDateTarget}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{latest.appsSucceeded}</p>
              <p className="text-sm text-muted-foreground">OK / {latest.appsTotal} total</p>
              {latest.appsFailed > 0 ? (
                <p className="text-sm text-destructive mt-1">{latest.appsFailed} failed</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trigger thủ công</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
              <Button className="w-full gap-2" disabled={!canTrigger || triggering} onClick={() => void handleTrigger()}>
                {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run portfolio
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Chưa có lần chạy nào. {canTrigger ? "Dùng nút bên dưới để chạy thử." : null}
          </CardContent>
        </Card>
      )}

      {!latest && canTrigger ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chạy portfolio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Insight date</p>
              <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            </div>
            <Button className="gap-2" disabled={triggering} onClick={() => void handleTrigger()}>
              {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {runs.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap justify-between gap-2">
                  <span className="text-foreground">{format(new Date(r.startedAt), "yyyy-MM-dd HH:mm")}</span>
                  <span className="text-muted-foreground">
                    {r.insightDateTarget} · {r.appsSucceeded}/{r.appsTotal} ok
                    {r.appsFailed > 0 ? ` · ${r.appsFailed} fail` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
