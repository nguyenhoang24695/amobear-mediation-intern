/** Mirrors backend AppInsightSettingsDefaults.RecommendedJson for “Reset to system default”. */
export const RECOMMENDED_INSIGHT_SETTINGS = {
  aiContext: {
    appSummary:
      "Mô tả ngắn app (thể loại, đối tượng, giai đoạn vòng đời). Ví dụ: game puzzle hyper-casual, ưu tiên IAA, thị trường US/EU.",
    genre: "Puzzle / Midcore / …",
    lifecycleStage: "Launch / Growth / Mature / Sunset",
    monetizationModel: "IAA chủ đạo / Hybrid IAA+IAP / IAP chủ đạo",
    primaryGeos: "US, VN, …",
    teamsToEmphasize: ["Mediation", "UA", "Product"],
    knownRisks: "Rủi ro đã biết (ví dụ: phụ thuộc một network, mùa eCPM, bản build gần đây).",
    competitiveNotes: "So sánh benchmark nội bộ hoặc đối thủ nếu có.",
    scenarios: [
      {
        id: "revenue-down-ecpm-ok",
        when: "Revenue giảm mạnh nhưng eCPM ổn",
        focus: "Ưu tiên phân tích volume/impressions và UA; tag [UA] hoặc [Product].",
      },
      {
        id: "fill-below-threshold",
        when: "Fill rate < 85%",
        focus: "Ưu tiên waterfall, timeout, bidder; tag [Mediation].",
      },
    ],
    contextItems: [] as unknown[],
  },
  sectionOverrides: {} as Record<string, string>,
  generationOverride: {
    enabled: false,
    provider: "openai",
    priority: "normal",
    additionalInstructions: "",
  },
  generationNotes: "Ghi chú vận hành (không bắt buộc): ví dụ chỉ generate các ngày weekday.",
} as const

export function cloneRecommendedInsightSettings(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(RECOMMENDED_INSIGHT_SETTINGS)) as Record<string, unknown>
}
