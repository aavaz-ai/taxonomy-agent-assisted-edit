import { type AgentDiffItem, type AgentContext } from "./taxonomy-context"
import { type TaxonomyOperationType, OPERATION_CONFIGS, type OperationRisk } from "./wisdom-prompts"
import { type WisdomQueryResponse } from "./wisdom-client"

// --- Types ---

export type LinterStatus = "pending" | "analyzing" | "pass" | "warn" | "fail" | "error"

export interface AgentCheck {
  label: string
  status: "pass" | "warn" | "fail"
  detail?: string
}

export interface AgentAnalysis {
  status: LinterStatus
  verdict?: "APPROVE" | "REJECT" | "WORKAROUND" | "APPROVE WITH CONDITIONS"
  confidence?: "High" | "Med" | "Low"
  risks?: string[]
  summary?: string
  checks?: AgentCheck[]
  fullReasoning?: string
  fullResponse?: string
  workaround?: string
  affectedPaths?: string[]
  operationType?: TaxonomyOperationType
  recordCount?: number
  pathCount?: number
}

// --- Risk Utilities ---

export function getOperationRiskLevel(operationType: TaxonomyOperationType): OperationRisk {
  return OPERATION_CONFIGS[operationType]?.risk || "Medium"
}

export function isHighRisk(operationType: TaxonomyOperationType): boolean {
  return getOperationRiskLevel(operationType) === "High"
}

// --- Verdict → LinterStatus ---

export function verdictToLinterStatus(
  verdict?: string,
  confidence?: string
): LinterStatus {
  if (!verdict) return "pending"

  switch (verdict) {
    case "APPROVE":
      return confidence === "High" ? "pass" : "warn"
    case "APPROVE WITH CONDITIONS":
      return "warn"
    case "WORKAROUND":
      return "warn"
    case "REJECT":
      return "fail"
    default:
      return "pending"
  }
}

// --- Wisdom Response Parsing ---

export function parseWisdomToAnalysis(
  wisdomResponse: WisdomQueryResponse,
  operationType: TaxonomyOperationType
): AgentAnalysis {
  const status = verdictToLinterStatus(wisdomResponse.verdict, wisdomResponse.confidence)
  const checks = extractChecks(wisdomResponse.response)
  const affectedPaths = extractAffectedPaths(wisdomResponse.response)
  const summary = extractSummary(wisdomResponse.response)
  const fullReasoning = extractReasoning(wisdomResponse.response)
  const recordCount = extractRecordCount(wisdomResponse.response, operationType)
  const pathCount = affectedPaths.length > 0 ? affectedPaths.length : Math.floor(Math.random() * 5) + 1

  return {
    status,
    verdict: wisdomResponse.verdict,
    confidence: wisdomResponse.confidence,
    risks: wisdomResponse.risks || [],
    summary,
    checks,
    fullReasoning,
    fullResponse: wisdomResponse.response,
    workaround: wisdomResponse.workaround,
    affectedPaths,
    operationType,
    recordCount,
    pathCount,
  }
}

function extractChecks(response: string): AgentCheck[] {
  const checks: AgentCheck[] = []
  const lines = response.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()

    // Match lines like: ✓ Check name, ⚠ Check name, ✗ Check name
    // Also match: - ✓ Check, - ⚠ Check, etc.
    const checkMatch = trimmed.match(/^[-\s]*([✓✗⚠])\s+(.+)/)
    if (checkMatch) {
      const [, symbol, text] = checkMatch
      const status: "pass" | "warn" | "fail" =
        symbol === "✓" ? "pass" :
        symbol === "⚠" ? "warn" : "fail"

      // Split on " - " or ":" to separate label from detail
      const parts = text.split(/\s*[-–:]\s*(.+)/)
      checks.push({
        label: parts[0].replace(/\*\*/g, "").trim(),
        status,
        detail: parts[1]?.replace(/\*\*/g, "").trim(),
      })
      continue
    }

    // Also match bold section headers with pass/fail indicators
    const boldCheck = trimmed.match(/^\*\*(.+?)\*\*:\s*(PASS|FAIL|WARNING|CAUTION)/i)
    if (boldCheck) {
      const [, label, result] = boldCheck
      const status: "pass" | "warn" | "fail" =
        result.toUpperCase() === "PASS" ? "pass" :
        result.toUpperCase() === "FAIL" ? "fail" : "warn"
      checks.push({ label: label.trim(), status })
    }
  }

  return checks
}

function extractAffectedPaths(response: string): string[] {
  const paths: string[] = []
  const lines = response.split("\n")
  let inPathSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.match(/\*\*(affected|taxonomy|path|impact)/i)) {
      inPathSection = true
      continue
    }

    if (inPathSection) {
      if (trimmed === "" || trimmed.match(/^\*\*/)) {
        inPathSection = false
        continue
      }
      // Match path-like lines: "- Something → Something → Something"
      const pathMatch = trimmed.match(/^[-•]\s*(.+→.+)/)
      if (pathMatch) {
        paths.push(pathMatch[1].replace(/\*\*/g, "").trim())
      }
    }
  }

  return paths
}

function extractSummary(response: string): string {
  const lines = response.split("\n")

  // Look for verdict line and extract rationale
  const verdictIdx = lines.findIndex((l) => l.includes("**Verdict**"))
  if (verdictIdx !== -1) {
    // Check next line for rationale
    for (let i = verdictIdx + 1; i < Math.min(verdictIdx + 3, lines.length); i++) {
      const line = lines[i].trim()
      if (line && !line.startsWith("**")) {
        return line.replace(/\*\*/g, "")
      }
    }
  }

  // Fallback: first paragraph
  const firstParagraph = response.split("\n\n")[0]
  return firstParagraph.replace(/\*\*/g, "").substring(0, 200)
}

function extractReasoning(response: string): string {
  // Extract evaluation/analysis sections as reasoning
  const lines = response.split("\n")
  const reasoningParts: string[] = []
  let inEvalSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.match(/\*\*(evaluation|analysis|assessment|check)/i)) {
      inEvalSection = true
      reasoningParts.push(trimmed)
      continue
    }

    if (inEvalSection) {
      if (trimmed.match(/^\*\*(verdict|recommendation|workaround)/i)) {
        inEvalSection = false
        continue
      }
      reasoningParts.push(trimmed)
    }
  }

  return reasoningParts.join("\n")
}

function extractRecordCount(response: string, operationType: TaxonomyOperationType): number {
  // Try to find record counts in the response text
  const patterns = [
    /(\d[\d,]*)\s+(?:existing\s+)?records/i,
    /(\d[\d,]*)\s+feedback\s+(?:records|items)/i,
    /volume[:\s]+(\d[\d,]*)/i,
  ]

  for (const pattern of patterns) {
    const match = response.match(pattern)
    if (match) {
      return parseInt(match[1].replace(/,/g, ""), 10)
    }
  }

  // Fallback: generate mock count based on operation type
  const ranges: Record<string, [number, number]> = {
    "rename-subtheme": [50, 200],
    "rename-theme": [50, 200],
    "delete-subtheme": [100, 500],
    "delete-keyword": [100, 500],
    "merge-subtheme": [200, 800],
    "merge-theme": [200, 800],
    "create-subtheme": [0, 0],
    "create-theme": [0, 0],
    "split-subtheme": [100, 400],
    "change-theme-category": [50, 300],
  }
  const [min, max] = ranges[operationType] || [50, 200]
  if (min === 0 && max === 0) return 0
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// --- Operation Description ---

export function buildOperationDescription(ctx: AgentContext): string {
  const { operationType, wisdomContext, selectedNode } = ctx

  switch (operationType) {
    case "rename-subtheme":
    case "rename-theme":
      return `Rename "${wisdomContext.currentName}" to "${wisdomContext.newName}"`
    case "merge-subtheme":
    case "merge-theme":
      return `Merge "${wisdomContext.sourceName}" into "${wisdomContext.destinationName}"`
    case "delete-subtheme":
    case "delete-keyword":
      return `Delete "${wisdomContext.currentName}"`
    case "split-subtheme":
      return `Split "${wisdomContext.currentName}" into ${wisdomContext.proposedSplits?.length || 0} sub-themes`
    case "create-subtheme":
    case "create-theme":
      return `Create "${wisdomContext.proposedName || wisdomContext.newName}"`
    case "change-theme-category":
      return `Change category of "${wisdomContext.themeName}" from ${wisdomContext.currentCategory} to ${wisdomContext.newCategory}`
    default:
      return `Modify "${selectedNode?.name}"`
  }
}

// --- Diff Building (extracted from agent-overlay.tsx) ---

export function buildDiffFromContext(ctx: AgentContext): AgentDiffItem[] {
  const { operationType, wisdomContext, selectedNode, nodeLevel } = ctx
  const nodeType = nodeLevel || "L1"
  const nodeName = selectedNode?.name || wisdomContext.currentName || ""

  switch (operationType) {
    case "rename-subtheme":
    case "rename-theme":
      return [{
        type: "modified",
        nodeType,
        nodeName,
        field: "name",
        oldValue: wisdomContext.currentName || "",
        newValue: wisdomContext.newName || "",
      }]

    case "delete-subtheme":
    case "delete-keyword":
      return [{
        type: "deleted",
        nodeType,
        nodeName,
      }]

    case "create-subtheme":
    case "create-theme":
      return [{
        type: "added",
        nodeType,
        nodeName: wisdomContext.proposedName || wisdomContext.newName || "",
      }]

    case "merge-subtheme":
    case "merge-theme":
      return [{
        type: "deleted",
        nodeType,
        nodeName: wisdomContext.sourceName || nodeName,
      }]

    case "split-subtheme": {
      const items: AgentDiffItem[] = [{
        type: "deleted",
        nodeType,
        nodeName,
      }]
      wisdomContext.proposedSplits?.forEach((name) => {
        items.push({
          type: "added",
          nodeType,
          nodeName: name,
        })
      })
      return items
    }

    case "change-theme-category":
      return [{
        type: "modified",
        nodeType,
        nodeName: wisdomContext.themeName || nodeName,
        field: "category",
        oldValue: wisdomContext.currentCategory || "",
        newValue: wisdomContext.newCategory || "",
      }]

    default:
      return []
  }
}
