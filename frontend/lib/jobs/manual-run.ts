import type { ManualRunConfig, ManualRunQueryParamField } from "@/types/api"

export function parseManualRunJson(raw: string | null | undefined): ManualRunConfig | null {
  if (raw == null || !String(raw).trim()) return null
  try {
    return JSON.parse(String(raw)) as ManualRunConfig
  } catch {
    return null
  }
}

/** Ưu tiên jobsTestPath trong config; mặc định bỏ hậu tố `-job` trên jobId. */
export function resolveJobsTestPath(jobId: string, config: ManualRunConfig | null): string {
  const p = config?.jobsTestPath?.trim()
  if (p) return p.replace(/^\/+/, "").replace(/\/+$/, "")
  return jobId.replace(/-job$/, "")
}

export type ParamValuesState = Record<string, string | boolean>

export function buildInitialParamValues(fields: ManualRunQueryParamField[] | undefined): ParamValuesState {
  const out: ParamValuesState = {}
  for (const f of fields ?? []) {
    if (f.type === "boolean") {
      out[f.key] = f.default === true || f.default === "true"
    } else {
      out[f.key] = f.default != null && f.default !== false ? String(f.default) : ""
    }
  }
  return out
}

/** Query string values cho jobs-test; boolean false tùy chọn có thể bỏ qua. */
export function buildJobsTestQueryParams(
  fields: ManualRunQueryParamField[] | undefined,
  values: ParamValuesState
): Record<string, string> | null {
  const params: Record<string, string> = {}
  for (const f of fields ?? []) {
    const v = values[f.key]
    if (f.type === "boolean") {
      const on = v === true || v === "true"
      if (!f.required && !on) continue
      params[f.key] = on ? "true" : "false"
      continue
    }
    const s = String(v ?? "").trim()
    if (!s) {
      if (f.required) return null
      continue
    }
    params[f.key] = s
  }
  return params
}

export function manualRunFormIsValid(
  fields: ManualRunQueryParamField[] | undefined,
  values: ParamValuesState
): boolean {
  for (const f of fields ?? []) {
    if (!f.required) continue
    if (f.type === "boolean") continue
    const s = String(values[f.key] ?? "").trim()
    if (!s) return false
  }
  return true
}
