export type FormulaValidationResult =
  | { valid: true; variables: string[] }
  | { valid: false; error: string; variables?: string[] }

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" }

type AstNode =
  | { kind: "number"; value: number }
  | { kind: "ident"; name: string }
  | { kind: "unary"; op: "-"; operand: AstNode }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: AstNode; right: AstNode }

const IDENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

export function tokenizeFormula(expression: string): Token[] | { error: string } {
  const tokens: Token[] = []
  let i = 0
  const input = expression.trim()

  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" })
      i += 1
      continue
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" })
      i += 1
      continue
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch })
      i += 1
      continue
    }

    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j += 1
      const raw = input.slice(i, j)
      const value = Number(raw)
      if (!Number.isFinite(value)) return { error: `Invalid number: ${raw}` }
      tokens.push({ type: "number", value })
      i = j
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < input.length && /[A-Za-z0-9_]/.test(input[j])) j += 1
      const ident = input.slice(i, j)
      if (!IDENT_PATTERN.test(ident)) return { error: `Invalid variable name: ${ident}` }
      tokens.push({ type: "ident", value: ident })
      i = j
      continue
    }

    return { error: `Unexpected character: ${ch}` }
  }

  return tokens
}

function parseTokens(tokens: Token[]): AstNode | { error: string } {
  let pos = 0

  function peek(): Token | undefined {
    return tokens[pos]
  }

  function consume(): Token {
    return tokens[pos++]
  }

  function parsePrimary(): AstNode | { error: string } {
    const token = peek()
    if (!token) return { error: "Unexpected end of expression" }

    if (token.type === "number") {
      consume()
      return { kind: "number", value: token.value }
    }

    if (token.type === "ident") {
      consume()
      return { kind: "ident", name: token.value }
    }

    if (token.type === "lparen") {
      consume()
      const inner = parseExpression()
      if ("error" in inner) return inner
      const closing = peek()
      if (!closing || closing.type !== "rparen") return { error: "Missing closing parenthesis" }
      consume()
      return inner
    }

    if (token.type === "op" && token.value === "-") {
      consume()
      const operand = parsePrimary()
      if ("error" in operand) return operand
      return { kind: "unary", op: "-", operand }
    }

    return { error: "Invalid expression" }
  }

  function parseTerm(): AstNode | { error: string } {
    let node = parsePrimary()
    if ("error" in node) return node

    while (true) {
      const token = peek()
      if (!token || token.type !== "op" || (token.value !== "*" && token.value !== "/")) break
      consume()
      const right = parsePrimary()
      if ("error" in right) return right
      node = { kind: "binary", op: token.value, left: node, right }
    }

    return node
  }

  function parseExpression(): AstNode | { error: string } {
    let node = parseTerm()
    if ("error" in node) return node

    while (true) {
      const token = peek()
      if (!token || token.type !== "op" || (token.value !== "+" && token.value !== "-")) break
      consume()
      const right = parseTerm()
      if ("error" in right) return right
      node = { kind: "binary", op: token.value, left: node, right }
    }

    return node
  }

  const ast = parseExpression()
  if ("error" in ast) return ast
  if (pos < tokens.length) return { error: "Unexpected token after expression" }
  return ast
}

function collectVariables(node: AstNode, out = new Set<string>()): string[] {
  if (node.kind === "ident") out.add(node.name)
  else if (node.kind === "unary") collectVariables(node.operand, out)
  else if (node.kind === "binary") {
    collectVariables(node.left, out)
    collectVariables(node.right, out)
  }
  return [...out]
}

function evaluateAst(node: AstNode, rowValues: Record<string, number | null | undefined>): number | null {
  if (node.kind === "number") return node.value

  if (node.kind === "ident") {
    const raw = rowValues[node.name]
    if (raw == null || !Number.isFinite(raw)) return null
    return raw
  }

  if (node.kind === "unary") {
    const value = evaluateAst(node.operand, rowValues)
    if (value == null) return null
    return -value
  }

  const left = evaluateAst(node.left, rowValues)
  const right = evaluateAst(node.right, rowValues)
  if (left == null || right == null) return null

  switch (node.op) {
    case "+":
      return left + right
    case "-":
      return left - right
    case "*":
      return left * right
    case "/":
      if (right === 0) return null
      return left / right
    default:
      return null
  }
}

export function validateFormula(
  expression: string,
  availableMetricIds: readonly string[],
): FormulaValidationResult {
  const trimmed = expression.trim()
  if (!trimmed) return { valid: false, error: "Expression is required" }

  const tokenized = tokenizeFormula(trimmed)
  if ("error" in tokenized) return { valid: false, error: tokenized.error }

  const parsed = parseTokens(tokenized)
  if ("error" in parsed) return { valid: false, error: parsed.error }

  const variables = collectVariables(parsed)
  const allowed = new Set(availableMetricIds)
  const missing = variables.filter((name) => !allowed.has(name))
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Unknown metric variable(s): ${missing.join(", ")}`,
      variables,
    }
  }

  return { valid: true, variables }
}

export function evaluateFormula(
  expression: string,
  rowValues: Record<string, number | null | undefined>,
): number | null {
  const tokenized = tokenizeFormula(expression)
  if ("error" in tokenized) return null

  const parsed = parseTokens(tokenized)
  if ("error" in parsed) return null

  return evaluateAst(parsed, rowValues)
}
