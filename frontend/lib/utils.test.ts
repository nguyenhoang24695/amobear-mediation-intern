import { describe, expect, it } from "vitest"
import { cn, randomClientUuid } from "./utils"

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts (last wins)", () => {
    const out = cn("px-2 py-1", "px-4")
    expect(out).toContain("px-4")
    expect(out).toContain("py-1")
  })

  it("handles conditional and falsy values", () => {
    expect(cn("base", false && "hidden", null, undefined)).toBe("base")
  })
})

describe("randomClientUuid", () => {
  it("returns a UUID-shaped string when crypto.randomUUID exists", () => {
    const id = randomClientUuid()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })
})
