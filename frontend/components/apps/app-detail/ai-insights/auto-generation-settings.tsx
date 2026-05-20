"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { insightApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { AppInsightSettings } from "@/types/api"
import {
  MAIN_INSIGHT_AUTO_GEN,
  PERSONA_AUTO_GENERATION_ROLES,
  getPersonaGenerationEnabled,
  hasPersistedInsightSettings,
  mergePersonaGeneration,
  resolveMainGenerationEnabled,
  type PersonaAutoGenId,
} from "@/lib/insight-auto-generation"

interface Props {
  appId: string
}

export function AutoGenerationSettings({ appId }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppInsightSettings | null>(null)
  const [mainEnabled, setMainEnabled] = useState(false)
  const [personaFlags, setPersonaFlags] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!appId) return
    setLoading(true)
    try {
      const s = await insightApi.getAppSettings(appId)
      setSettings(s)
      setMainEnabled(resolveMainGenerationEnabled(s))
      const flags: Record<string, boolean> = {}
      for (const role of PERSONA_AUTO_GENERATION_ROLES) {
        flags[role.id] = getPersonaGenerationEnabled(s.settings as Record<string, unknown>, role.id)
      }
      setPersonaFlags(flags)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được cấu hình auto insight", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [appId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const persist = async (key: string, nextMain: boolean, nextPersona: Record<string, boolean>) => {
    setSavingKey(key)
    try {
      const prevSettings = { ...((settings?.settings as Record<string, unknown>) ?? {}) }
      const personaGeneration = Object.fromEntries(
        PERSONA_AUTO_GENERATION_ROLES.map((r) => [r.id, nextPersona[r.id] ?? false]),
      )
      const updated = await insightApi.patchAppSettings(appId, {
        generationEnabled: nextMain,
        settings: { ...prevSettings, personaGeneration },
      })
      setSettings(updated)
      setMainEnabled(resolveMainGenerationEnabled(updated))
      const flags: Record<string, boolean> = {}
      for (const role of PERSONA_AUTO_GENERATION_ROLES) {
        flags[role.id] = getPersonaGenerationEnabled(updated.settings as Record<string, unknown>, role.id)
      }
      setPersonaFlags(flags)
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu cấu hình thất bại", variant: "destructive" })
      await load()
    } finally {
      setSavingKey(null)
    }
  }

  const handleMainChange = async (enabled: boolean) => {
    setMainEnabled(enabled)
    setSavingKey(MAIN_INSIGHT_AUTO_GEN.id)
    try {
      const prevSettings = { ...((settings?.settings as Record<string, unknown>) ?? {}) }
      const personaGeneration = Object.fromEntries(
        PERSONA_AUTO_GENERATION_ROLES.map((r) => [r.id, personaFlags[r.id] ?? false]),
      )
      const updated = await insightApi.patchAppSettings(appId, {
        generationEnabled: enabled,
        settings: { ...prevSettings, personaGeneration },
      })
      setSettings(updated)
      setMainEnabled(resolveMainGenerationEnabled(updated))
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu cấu hình thất bại", variant: "destructive" })
      await load()
    } finally {
      setSavingKey(null)
    }
  }

  const handlePersonaChange = async (personaId: PersonaAutoGenId, enabled: boolean) => {
    const next = { ...personaFlags, [personaId]: enabled }
    setPersonaFlags(next)
    const prevSettings = { ...((settings?.settings as Record<string, unknown>) ?? {}) }
    const merged = mergePersonaGeneration(prevSettings, personaId, enabled)
    setSavingKey(personaId)
    try {
      const updated = await insightApi.patchAppSettings(appId, { settings: merged })
      setSettings(updated)
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu cấu hình thất bại", variant: "destructive" })
      await load()
    } finally {
      setSavingKey(null)
    }
  }

  const configured = settings ? hasPersistedInsightSettings(settings) : false

  return (
    <Card className="border-slate-200 bg-slate-50/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              AI Insight tự động (T-1)
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 max-w-2xl">
              Bật để app được đưa vào job generate insight hàng ngày. Mặc định tắt cho đến khi bạn bật rõ ràng.
            </CardDescription>
          </div>
          {!loading && (
            <Badge variant="outline" className={configured ? "border-indigo-200 text-indigo-700" : "border-slate-200 text-slate-500"}>
              {configured ? "Đã cấu hình" : "Chưa cấu hình — mặc định tắt"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {loading ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải cấu hình…
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <Label htmlFor="auto-main-insight" className="font-medium text-slate-900">
                  {MAIN_INSIGHT_AUTO_GEN.label}
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">{MAIN_INSIGHT_AUTO_GEN.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === MAIN_INSIGHT_AUTO_GEN.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : null}
                <Switch
                  id="auto-main-insight"
                  checked={mainEnabled}
                  disabled={savingKey !== null}
                  onCheckedChange={(v) => void handleMainChange(v)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Theo role</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PERSONA_AUTO_GENERATION_ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <Label htmlFor={`auto-${role.id}`} className="text-sm font-medium text-slate-800 cursor-pointer">
                      {role.label}
                    </Label>
                    <div className="flex items-center gap-2 shrink-0">
                      {savingKey === role.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : null}
                      <Switch
                        id={`auto-${role.id}`}
                        checked={personaFlags[role.id] ?? false}
                        disabled={savingKey !== null}
                        onCheckedChange={(v) => void handlePersonaChange(role.id, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Role digest dùng cùng lịch batch khi job tương ứng được bật trên hệ thống; cấu hình per-app lưu trong{" "}
                <code className="text-[11px] bg-slate-100 px-1 rounded">settings.personaGeneration</code>.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

