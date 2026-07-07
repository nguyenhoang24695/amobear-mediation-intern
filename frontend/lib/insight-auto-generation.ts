import type { AppInsightSettings } from "@/types/api";

/** Main daily insight — backed by <c>AppInsightSettings.GenerationEnabled</c>. */
export const MAIN_INSIGHT_AUTO_GEN = {
  id: "app_insight",
  label: "AI Insight chung",
  description: "Daily App Insight (T-1) — job 6:30 AM UTC",
} as const;

/** Specialized role digests — stored in <c>settings.personaGeneration</c>. */
export const PERSONA_AUTO_GENERATION_ROLES = [
  { id: "product_owner", label: "PO · Product Owner" },
  { id: "data_analyst", label: "DA · Data Analyst" },
  { id: "ua_marketing", label: "UA · UA Marketing" },
  { id: "mediation", label: "MED · Mediation" },
  { id: "devops", label: "DEV · DevOps" },
  { id: "qa", label: "QA · QA" },
  { id: "bod", label: "BOD · Portfolio" },
] as const;

export type PersonaAutoGenId =
  (typeof PERSONA_AUTO_GENERATION_ROLES)[number]["id"];

export function parsePersonaGeneration(
  settings: Record<string, unknown> | undefined,
): Record<string, boolean> {
  const raw = settings?.personaGeneration;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = !!v;
  }
  return out;
}

export function mergePersonaGeneration(
  settings: Record<string, unknown>,
  personaId: string,
  enabled: boolean,
): Record<string, unknown> {
  const current = parsePersonaGeneration(settings);
  return {
    ...settings,
    personaGeneration: { ...current, [personaId]: enabled },
  };
}

/** Daily batch flag — only the DB column <c>generation_enabled</c> (GET returns false when no row). */
export function resolveMainGenerationEnabled(
  settings: AppInsightSettings | null,
): boolean {
  if (!settings) return false;
  return settings.generationEnabled === true;
}

export function hasPersistedInsightSettings(
  settings: AppInsightSettings,
): boolean {
  return (
    settings.insightTemplateId != null ||
    Object.keys(settings.settings ?? {}).length > 0
  );
}

export function getPersonaGenerationEnabled(
  settings: Record<string, unknown> | undefined,
  personaId: PersonaAutoGenId,
): boolean {
  return parsePersonaGeneration(settings)[personaId] ?? false;
}
