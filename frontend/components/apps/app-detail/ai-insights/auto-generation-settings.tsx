"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { insightApi } from "@/lib/api/services";
import { useToast } from "@/hooks/use-toast";
import type { AppInsightSettings } from "@/types/api";
import {
  MAIN_INSIGHT_AUTO_GEN,
  PERSONA_AUTO_GENERATION_ROLES,
  getPersonaGenerationEnabled,
  hasPersistedInsightSettings,
  mergePersonaGeneration,
  resolveMainGenerationEnabled,
  type PersonaAutoGenId,
} from "@/lib/insight-auto-generation";

interface Props {
  appId: string;
}

export function AutoGenerationSettings({ appId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppInsightSettings | null>(null);
  const [mainEnabled, setMainEnabled] = useState(false);
  const [personaFlags, setPersonaFlags] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const s = await insightApi.getAppSettings(appId);
      setSettings(s);
      setMainEnabled(resolveMainGenerationEnabled(s));
      const flags: Record<string, boolean> = {};
      for (const role of PERSONA_AUTO_GENERATION_ROLES) {
        flags[role.id] = getPersonaGenerationEnabled(
          s.settings as Record<string, unknown>,
          role.id,
        );
      }
      setPersonaFlags(flags);
    } catch (e) {
      console.error(e);
      toast({
        title: "Không tải được cấu hình auto insight",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [appId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (
    key: string,
    nextMain: boolean,
    nextPersona: Record<string, boolean>,
  ) => {
    setSavingKey(key);
    try {
      const prevSettings = {
        ...((settings?.settings as Record<string, unknown>) ?? {}),
      };
      const personaGeneration = Object.fromEntries(
        PERSONA_AUTO_GENERATION_ROLES.map((r) => [
          r.id,
          nextPersona[r.id] ?? false,
        ]),
      );
      const updated = await insightApi.patchAppSettings(appId, {
        generationEnabled: nextMain,
        settings: { ...prevSettings, personaGeneration },
      });
      setSettings(updated);
      setMainEnabled(resolveMainGenerationEnabled(updated));
      const flags: Record<string, boolean> = {};
      for (const role of PERSONA_AUTO_GENERATION_ROLES) {
        flags[role.id] = getPersonaGenerationEnabled(
          updated.settings as Record<string, unknown>,
          role.id,
        );
      }
      setPersonaFlags(flags);
    } catch (e) {
      console.error(e);
      toast({ title: "Lưu cấu hình thất bại", variant: "destructive" });
      await load();
    } finally {
      setSavingKey(null);
    }
  };

  const handleMainChange = async (enabled: boolean) => {
    setMainEnabled(enabled);
    setSavingKey(MAIN_INSIGHT_AUTO_GEN.id);
    try {
      const prevSettings = {
        ...((settings?.settings as Record<string, unknown>) ?? {}),
      };
      const personaGeneration = Object.fromEntries(
        PERSONA_AUTO_GENERATION_ROLES.map((r) => [
          r.id,
          personaFlags[r.id] ?? false,
        ]),
      );
      const updated = await insightApi.patchAppSettings(appId, {
        generationEnabled: enabled,
        settings: { ...prevSettings, personaGeneration },
      });
      setSettings(updated);
      setMainEnabled(resolveMainGenerationEnabled(updated));
    } catch (e) {
      console.error(e);
      toast({ title: "Lưu cấu hình thất bại", variant: "destructive" });
      await load();
    } finally {
      setSavingKey(null);
    }
  };

  const handlePersonaChange = async (
    personaId: PersonaAutoGenId,
    enabled: boolean,
  ) => {
    const next = { ...personaFlags, [personaId]: enabled };
    setPersonaFlags(next);
    const prevSettings = {
      ...((settings?.settings as Record<string, unknown>) ?? {}),
    };
    const merged = mergePersonaGeneration(prevSettings, personaId, enabled);
    setSavingKey(personaId);
    try {
      const updated = await insightApi.patchAppSettings(appId, {
        settings: merged,
      });
      setSettings(updated);
    } catch (e) {
      console.error(e);
      toast({ title: "Lưu cấu hình thất bại", variant: "destructive" });
      await load();
    } finally {
      setSavingKey(null);
    }
  };

  const configured = settings ? hasPersistedInsightSettings(settings) : false;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              AI Insight tự động (T-1)
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm text-muted-foreground">
              Bật để app được đưa vào job generate insight hàng ngày. Mặc định
              tắt cho đến khi bạn bật rõ ràng.
            </CardDescription>
          </div>
          {!loading && (
            <Badge
              variant="outline"
              className={
                configured
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border/70 bg-muted/40 text-muted-foreground"
              }
            >
              {configured ? "Đã cấu hình" : "Chưa cấu hình — mặc định tắt"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải cấu hình…
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/70 p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor="auto-main-insight"
                  className="font-medium text-foreground"
                >
                  {MAIN_INSIGHT_AUTO_GEN.label}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {MAIN_INSIGHT_AUTO_GEN.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {savingKey === MAIN_INSIGHT_AUTO_GEN.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Theo role
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PERSONA_AUTO_GENERATION_ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-4 py-3 shadow-sm"
                  >
                    <Label
                      htmlFor={`auto-${role.id}`}
                      className="cursor-pointer text-sm font-medium text-foreground"
                    >
                      {role.label}
                    </Label>
                    <div className="flex shrink-0 items-center gap-2">
                      {savingKey === role.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                      <Switch
                        id={`auto-${role.id}`}
                        checked={personaFlags[role.id] ?? false}
                        disabled={savingKey !== null}
                        onCheckedChange={(v) =>
                          void handlePersonaChange(role.id, v)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Role digest dùng cùng lịch batch khi job tương ứng được bật trên
                hệ thống; cấu hình per-app lưu trong{" "}
                <code className="rounded bg-muted px-1 text-[11px]">
                  settings.personaGeneration
                </code>
                .
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
