export interface ModelMeta {
  description: string
  accuracy: number // 1-5
  speed: number    // 1-5
  badge?: string
  badgeColor?: string
  inputPer1M?: number
  outputPer1M?: number
}

export const MODEL_METADATA: Record<string, ModelMeta> = {
  // Anthropic Claude
  "claude-opus-4": { description: "Most powerful, best reasoning", accuracy: 5, speed: 2, badge: "Best", badgeColor: "bg-amber-500", inputPer1M: 15, outputPer1M: 75 },
  "claude-sonnet-4": { description: "Balanced performance & cost", accuracy: 5, speed: 4, badge: "Recommended", badgeColor: "bg-blue-500", inputPer1M: 3, outputPer1M: 15 },
  "claude-haiku-3.5": { description: "Fastest, most compact", accuracy: 3, speed: 5, badge: "Fastest", badgeColor: "bg-green-500", inputPer1M: 0.8, outputPer1M: 4 },
  "claude-sonnet-3.5": { description: "Previous gen, solid performance", accuracy: 4, speed: 4, inputPer1M: 3, outputPer1M: 15 },
  "claude-opus-3": { description: "Previous gen flagship", accuracy: 4, speed: 2, inputPer1M: 15, outputPer1M: 75 },
  "claude-sonnet-4.5": { description: "Enhanced reasoning & coding", accuracy: 5, speed: 4, badge: "Recommended", badgeColor: "bg-blue-500", inputPer1M: 3, outputPer1M: 15 },
  "claude-opus-4.5": { description: "Extended thinking, top-tier", accuracy: 5, speed: 2, badge: "Best", badgeColor: "bg-amber-500", inputPer1M: 15, outputPer1M: 75 },

  // OpenAI GPT
  "gpt-5.4": { description: "Latest flagship model", accuracy: 5, speed: 3, badge: "New", badgeColor: "bg-purple-500", inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-5.4-pro": { description: "Enhanced reasoning & analysis", accuracy: 5, speed: 2, badge: "Best", badgeColor: "bg-amber-500", inputPer1M: 5, outputPer1M: 20 },
  "gpt-5.3": { description: "Previous gen, reliable", accuracy: 4, speed: 3, inputPer1M: 2, outputPer1M: 8 },
  "gpt-4o": { description: "Multimodal, fast & capable", accuracy: 4, speed: 4, badge: "Recommended", badgeColor: "bg-blue-500", inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-4o-mini": { description: "Compact, cost-effective", accuracy: 3, speed: 5, badge: "Cheapest", badgeColor: "bg-green-500", inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { description: "Previous gen turbo", accuracy: 4, speed: 3, inputPer1M: 10, outputPer1M: 30 },
  "o1": { description: "Advanced reasoning model", accuracy: 5, speed: 2, badge: "Reasoning", badgeColor: "bg-purple-500", inputPer1M: 15, outputPer1M: 60 },
  "o1-mini": { description: "Fast reasoning, lower cost", accuracy: 4, speed: 3, inputPer1M: 3, outputPer1M: 12 },
  "o3": { description: "Next-gen reasoning", accuracy: 5, speed: 2, badge: "Best", badgeColor: "bg-amber-500", inputPer1M: 10, outputPer1M: 40 },
  "o3-mini": { description: "Efficient reasoning", accuracy: 4, speed: 4, badge: "Recommended", badgeColor: "bg-blue-500", inputPer1M: 1.1, outputPer1M: 4.4 },
  "o4-mini": { description: "Latest efficient reasoner", accuracy: 4, speed: 4, badge: "New", badgeColor: "bg-purple-500", inputPer1M: 1.1, outputPer1M: 4.4 },

  // Google Gemini
  "gemini-2.5-pro": { description: "Advanced reasoning & coding", accuracy: 5, speed: 3, badge: "Best", badgeColor: "bg-amber-500", inputPer1M: 1.25, outputPer1M: 10 },
  "gemini-2.5-flash": { description: "Fast & efficient", accuracy: 4, speed: 5, badge: "Recommended", badgeColor: "bg-blue-500", inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-2.0-flash": { description: "Previous gen fast model", accuracy: 4, speed: 5, badge: "Fast", badgeColor: "bg-green-500", inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-1.5-pro": { description: "1M context, deep analysis", accuracy: 4, speed: 3, inputPer1M: 1.25, outputPer1M: 5 },
  "gemini-1.5-flash": { description: "Fast, cost-effective", accuracy: 3, speed: 5, inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-pro": { description: "General purpose", accuracy: 3, speed: 4, inputPer1M: 0.5, outputPer1M: 1.5 },
}

export function getModelMeta(modelId: string): ModelMeta | null {
  const id = modelId.toLowerCase()
  for (const [key, meta] of Object.entries(MODEL_METADATA)) {
    if (id.startsWith(key) || id.includes(key)) return meta
  }
  return null
}

const PROVIDER_HINTS: Record<string, { hint: string; accuracy: number; speed: number }> = {
  anthropic: { hint: "Best SQL accuracy", accuracy: 5, speed: 4 },
  openai: { hint: "Great all-rounder", accuracy: 4, speed: 4 },
  gemini: { hint: "Fastest & cheapest", accuracy: 4, speed: 5 },
}

export function getProviderHint(providerKey: string) {
  return PROVIDER_HINTS[providerKey] ?? { hint: "", accuracy: 3, speed: 3 }
}
