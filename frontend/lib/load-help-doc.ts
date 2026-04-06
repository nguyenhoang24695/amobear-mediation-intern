import fs from "fs/promises"
import path from "path"
import { helpFileNameForSlug, isAllowedHelpFile, pathBasename } from "@/lib/help-docs"

const HELP_DIR = path.join(process.cwd(), "content", "help")

export async function loadHelpDocMarkdown(slug?: string): Promise<string> {
  const fileName = helpFileNameForSlug(slug)
  const base = pathBasename(fileName)
  if (!isAllowedHelpFile(base)) {
    throw new Error("Invalid help document")
  }
  const fullPath = path.join(HELP_DIR, base)
  const resolved = path.resolve(fullPath)
  const resolvedDir = path.resolve(HELP_DIR)
  if (!resolved.startsWith(resolvedDir)) {
    throw new Error("Invalid path")
  }
  return await fs.readFile(resolved, "utf-8")
}
