import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}))

vi.mock("./client", () => ({
  apiClient: {
    get: mocks.get,
    put: mocks.put,
    post: mocks.post,
  },
}))

// Import after mock
import {
  getAppPersonaContext,
  upsertAppPersonaContext,
  rollbackAppPersonaContext,
  createPersonaChatSession,
  sendPersonaChatMessage,
} from "./specialized-insights"

describe("specialized-insights api wrappers", () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.put.mockReset()
    mocks.post.mockReset()
  })

  it("builds app-persona context endpoints", async () => {
    mocks.get.mockResolvedValueOnce({ appRowId: 1, personaId: "po", context: null })
    await getAppPersonaContext(123, "product_owner")
    expect(mocks.get).toHaveBeenCalledWith("/api/v1/apps/123/personas/product_owner/context")

    mocks.put.mockResolvedValueOnce({ appRowId: 123, personaId: "product_owner", id: "x", version: 1, updatedAt: "" })
    await upsertAppPersonaContext(123, "product_owner", { contextMd: "a", extrasJson: "{}" })
    expect(mocks.put).toHaveBeenCalledWith("/api/v1/apps/123/personas/product_owner/context", { contextMd: "a", extrasJson: "{}" })

    mocks.post.mockResolvedValueOnce({ appRowId: 123, personaId: "product_owner", rolledBackFromVersion: 2, newVersion: 3, updatedAt: "" })
    await rollbackAppPersonaContext(123, "product_owner", 2)
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/apps/123/personas/product_owner/context/rollback/2", {})
  })

  it("builds chat endpoints", async () => {
    mocks.post.mockResolvedValueOnce({ session: { id: "s" } })
    await createPersonaChatSession("data_analyst", { appRowId: 9, title: "t", referenceReportId: "r" })
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/agents/data_analyst/chat/sessions", {
      appRowId: 9,
      title: "t",
      referenceReportId: "r",
    })

    mocks.post.mockResolvedValueOnce({ sessionId: "s", persona: "data_analyst", assistant: { id: "m", role: "assistant", content: "ok", createdAt: "" } })
    await sendPersonaChatMessage("data_analyst", "s", "hello")
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/agents/data_analyst/chat/sessions/s/messages", { message: "hello" })
  })
})

