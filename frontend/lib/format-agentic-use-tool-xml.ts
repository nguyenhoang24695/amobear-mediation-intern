/**
 * Normalizes agentic assistant text for Markdown: strips <thinking>, converts
 * <use_mcp_tool>/<use_tool> blocks to ### + ```sql (matches backend AgenticQueryLoop).
 */
const mcpXmlBlockRe =
  /(?:<use_tool>|<use_mcp_tool>)\s*<tool_name>\s*([^<]+?)\s*<\/tool_name>\s*<parameters>\s*([\s\S]*?)<\/parameters>\s*(?:<\/use_tool>|<\/use_mcp_tool>)/gi

const xmlQueryOrSqlRe = /(?:<query>|<sql>)\s*([\s\S]*?)\s*(?:<\/query>|<\/sql>)/i

function stripThinkingBlocks(content: string): string {
  return content.replace(/<thinking>\s*[\s\S]*?\s*<\/thinking>\s*/gi, "").trim()
}

function containsMcpXmlTool(content: string): boolean {
  return /<use_tool/i.test(content) || /<use_mcp_tool/i.test(content)
}

export function formatAgenticUseToolXmlToMarkdown(content: string): string {
  if (!content) return content
  const stripped = stripThinkingBlocks(content)
  if (!containsMcpXmlTool(stripped)) return stripped

  return stripped.replace(mcpXmlBlockRe, (_full, toolNameRaw: string, paramsInner: string) => {
    const toolName = toolNameRaw.trim()
    const queryMatch = paramsInner.match(xmlQueryOrSqlRe)
    const dbMatch =
      paramsInner.match(/<database>\s*([^<]+?)\s*<\/database>/i) ||
      paramsInner.match(/<db>\s*([^<]+?)\s*<\/db>/i)
    const database = dbMatch ? dbMatch[1].trim() : null

    let body = `### MCP · \`${toolName}\`\n\n`
    if (queryMatch) {
      const sql = queryMatch[1].trim()
      body += "```sql\n" + sql + "\n```"
    } else if (database) {
      body += `**database:** \`${database}\``
    } else if (paramsInner.trim()) {
      body += "```\n" + paramsInner.trim() + "\n```"
    }
    return body
  })
}
