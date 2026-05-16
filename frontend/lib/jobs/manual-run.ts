import type { ManualRunConfig, ManualRunInputType, ManualRunQueryParamField } from "@/types/api"

const INPUT_TYPES: readonly ManualRunInputType[] = [
  "string",
  "date",
  "datetime",
  "integer",
  "boolean",
]

function normalizeParamFromUnknown(raw: unknown): ManualRunQueryParamField | null {
  if (raw == null || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const key = String(o.key ?? "").trim()
  if (!key) return null
  const rawType = o.inputType ?? o.type
  const t = typeof rawType === "string" ? rawType : "string"
  const inputType: ManualRunInputType = INPUT_TYPES.includes(t as ManualRunInputType)
    ? (t as ManualRunInputType)
    : "string"
  const isRequired = !!(o.isRequired ?? o.required)
  return { key, inputType, isRequired }
}

/** Parse + chuẩn hoá (hỗ trợ JSON cũ: type, required, label, …). */
export function parseManualRunJson(raw: string | null | undefined): ManualRunConfig | null {
  if (raw == null || !String(raw).trim()) return null
  try {
    const parsed = JSON.parse(String(raw)) as Record<string, unknown>
    const queryParams = Array.isArray(parsed.queryParams)
      ? (parsed.queryParams.map(normalizeParamFromUnknown).filter(Boolean) as ManualRunQueryParamField[])
      : undefined
    return {
      useAsyncRun: parsed.useAsyncRun === true,
      queryParams,
    }
  } catch {
    return null
  }
}

/** Đường dẫn jobs-test mặc định: bỏ hậu tố `-job` trên Hangfire job id. */
export function defaultJobsTestPathFromJobId(jobId: string): string {
  return jobId.replace(/-job$/, "")
}

export type ParamValuesState = Record<string, string | boolean>

export function buildInitialParamValues(fields: ManualRunQueryParamField[] | undefined): ParamValuesState {
  const out: ParamValuesState = {}
  for (const f of fields ?? []) {
    if (f.inputType === "boolean") {
      out[f.key] = false
    } else {
      out[f.key] = ""
    }
  }
  return out
}

function isValidIntegerString(s: string): boolean {
  if (!s.trim()) return false
  return /^-?\d+$/.test(s.trim())
}

/** Query string values cho jobs-test; boolean false không bắt buộc có thể bỏ qua. */
export function buildJobsTestQueryParams(
  fields: ManualRunQueryParamField[] | undefined,
  values: ParamValuesState
): Record<string, string> | null {
  const params: Record<string, string> = {}
  for (const f of fields ?? []) {
    const v = values[f.key]
    if (f.inputType === "boolean") {
      const on = v === true || v === "true"
      if (!f.isRequired && !on) continue
      params[f.key] = on ? "true" : "false"
      continue
    }
    const s = String(v ?? "").trim()
    if (!s) {
      if (f.isRequired) return null
      continue
    }
    if (f.inputType === "integer" && !isValidIntegerString(s)) return null
    params[f.key] = s
  }
  return params
}

export function manualRunFormIsValid(
  fields: ManualRunQueryParamField[] | undefined,
  values: ParamValuesState
): boolean {
  for (const f of fields ?? []) {
    if (!f.isRequired) continue
    if (f.inputType === "boolean") continue
    const s = String(values[f.key] ?? "").trim()
    if (!s) return false
    if (f.inputType === "integer" && !isValidIntegerString(s)) return false
  }
  return true
}
