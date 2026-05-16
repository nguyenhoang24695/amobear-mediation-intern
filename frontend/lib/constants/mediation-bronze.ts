/** Ngày sớm nhất cho phép tra cứu mediation Bronze (UTC, YYYY-MM-DD). */
export const BRONZE_MEDIATION_MIN_YMD = "2026-04-01"

export function clampYmdLowerBound(ymd: string, lower: string = BRONZE_MEDIATION_MIN_YMD): string {
  if (!ymd || ymd.length < 10) return lower
  return ymd < lower ? lower : ymd
}
