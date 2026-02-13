import { type AgentDiffItem, type AgentContext } from "./taxonomy-context"
import { type TaxonomyOperationType, OPERATION_CONFIGS, type OperationRisk, type WisdomPromptContext } from "./wisdom-prompts"
import { type TaxonomyNode } from "./taxonomy-data"
import { type WisdomQueryResponse } from "./wisdom-client"

// --- Types ---

export type LinterStatus = "pending" | "analyzing" | "pass" | "warn" | "fail" | "error"

export interface AgentCheck {
  label: string
  status: "pass" | "warn" | "fail"
  detail?: string
}

export type WorkaroundType =
  | "merge-parents"        // "Merge the parent themes instead"
  | "create-theme"         // "Create a theme instead" (Transfer/Promote)
  | "move-to-parent"       // "Move sub-theme to a different parent" (Change Category)
  | "transfer-then-merge"  // "Transfer, then merge"
  | "merge-siblings"       // "Merge with overlapping sibling" (rename overlap)
  | "merge-keyword"        // "Merge keyword with sibling keyword" (delete keyword alternative)
  | "change-category"      // "Change category first, then proceed" (merge-theme category conflict)

export interface PartialItem {
  name: string
  included: boolean
  reason: string
}

export interface AgentAnalysis {
  status: LinterStatus
  verdict?: "APPROVE" | "REJECT" | "WORKAROUND" | "APPROVE WITH CONDITIONS" | "PARTIAL"
  confidence?: "High" | "Med" | "Low"
  risks?: string[]
  summary?: string
  checks?: AgentCheck[]
  fullReasoning?: string
  fullResponse?: string
  workaround?: string
  workaroundType?: WorkaroundType
  workaroundContext?: Partial<WisdomPromptContext>
  partialItems?: PartialItem[]
  affectedPaths?: string[]
  operationType?: TaxonomyOperationType
  recordCount?: number
  pathCount?: number
  // Vaibhav format fields
  understanding?: string
  recommendation?: string
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
    case "PARTIAL":
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
  const understanding = extractUnderstanding(wisdomResponse.response, operationType)
  const recommendation = extractRecommendation(wisdomResponse.response, wisdomResponse.verdict, wisdomResponse.workaround)

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
    workaroundType: wisdomResponse.workaroundType,
    workaroundContext: wisdomResponse.workaroundContext,
    partialItems: wisdomResponse.partialItems,
    affectedPaths,
    operationType,
    recordCount,
    pathCount,
    understanding,
    recommendation,
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
    "promote-subtheme": [100, 500],
  }
  const [min, max] = ranges[operationType] || [50, 200]
  if (min === 0 && max === 0) return 0
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// --- Understanding & Recommendation Extraction ---

function extractUnderstanding(response: string, operationType: TaxonomyOperationType): string {
  // Try to find a first-line summary or build from operation type
  const lines = response.split("\n").filter(l => l.trim())
  const firstContentLine = lines.find(l => !l.startsWith("**") && l.trim().length > 20)
  if (firstContentLine) {
    return firstContentLine.replace(/\*\*/g, "").trim().substring(0, 150)
  }
  // Fallback: describe operation type
  const descriptions: Record<string, string> = {
    "rename-subtheme": "Rename a sub-theme while preserving record mappings",
    "rename-theme": "Rename a theme while preserving record mappings",
    "merge-subtheme": "Merge two sub-themes under the same parent",
    "merge-theme": "Merge two themes, consolidating sub-themes",
    "delete-subtheme": "Delete a sub-theme and handle orphaned records",
    "delete-keyword": "Delete a keyword and all themes beneath it",
    "split-subtheme": "Split a sub-theme into multiple new sub-themes",
    "create-subtheme": "Create a new sub-theme under an existing theme",
    "create-theme": "Create a new theme under a keyword path",
    "change-theme-category": "Change the category classification of a theme",
    "promote-subtheme": "Promote a sub-theme to a standalone theme",
  }
  return descriptions[operationType] || "Modify taxonomy structure"
}

function extractRecommendation(response: string, verdict?: string, workaround?: string): string {
  // Look for recommendation section in response
  const lines = response.split("\n")
  const recIdx = lines.findIndex(l => l.match(/\*\*(recommendation|suggested action)/i))
  if (recIdx !== -1) {
    for (let i = recIdx + 1; i < Math.min(recIdx + 3, lines.length); i++) {
      const line = lines[i].trim()
      if (line && !line.startsWith("**")) {
        return line.replace(/\*\*/g, "")
      }
    }
  }

  // Fallback based on verdict
  if (verdict === "APPROVE") return ""
  if (verdict === "REJECT") return "This change cannot proceed as described. Contact Enterpret for assistance."
  if (verdict === "WORKAROUND" && workaround) return workaround
  return ""
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
    case "promote-subtheme":
      return `Promote "${wisdomContext.subThemeName || wisdomContext.currentName}" to theme`
    default:
      return `Modify "${selectedNode?.name}"`
  }
}

// --- Workaround Draft Changes ---

export interface WorkaroundDraftChange {
  nodeName: string
  nodeLevel: "L1" | "L2" | "L3" | "Theme"
  field: string
  oldValue: string
  newValue: string
  operationDescription: string
}

export function buildWorkaroundDraftChanges(
  workaroundType: WorkaroundType,
  wisdomContext: WisdomPromptContext,
  node: TaxonomyNode,
  level: "L1" | "L2" | "L3" | "Theme",
  operationDescription: string
): WorkaroundDraftChange[] {
  switch (workaroundType) {
    case "merge-parents":
      return [{
        nodeName: wisdomContext.sourceParentTheme || wisdomContext.sourceName || node.name,
        nodeLevel: "Theme",
        field: "merge-theme",
        oldValue: wisdomContext.sourceParentTheme || "",
        newValue: wisdomContext.destinationParentTheme || "",
        operationDescription: `Merge themes "${wisdomContext.sourceParentTheme}" into "${wisdomContext.destinationParentTheme}"`,
      }]

    case "create-theme":
      return [{
        nodeName: wisdomContext.subThemeName || wisdomContext.currentName || node.name,
        nodeLevel: "Theme",
        field: "add-keyword",
        oldValue: "",
        newValue: wisdomContext.subThemeName || wisdomContext.currentName || node.name,
        operationDescription: `Create theme "${wisdomContext.subThemeName || wisdomContext.currentName || node.name}"`,
      }]

    case "move-to-parent":
      return [{
        nodeName: wisdomContext.sourceName || node.name,
        nodeLevel: level,
        field: "move-keyword",
        oldValue: wisdomContext.sourceParentTheme || "",
        newValue: wisdomContext.destinationParentTheme || "",
        operationDescription: `Move "${wisdomContext.sourceName || node.name}" to "${wisdomContext.destinationParentTheme}"`,
      }]

    case "transfer-then-merge":
      return [
        {
          nodeName: wisdomContext.sourceName || node.name,
          nodeLevel: level,
          field: "move-keyword",
          oldValue: wisdomContext.sourceParentTheme || "",
          newValue: wisdomContext.destinationParentTheme || "",
          operationDescription: `Move "${wisdomContext.sourceName || node.name}" to "${wisdomContext.destinationParentTheme}"`,
        },
        {
          nodeName: wisdomContext.sourceName || node.name,
          nodeLevel: level,
          field: "merge-theme",
          oldValue: wisdomContext.sourceName || "",
          newValue: wisdomContext.destinationName || "",
          operationDescription: `Merge "${wisdomContext.sourceName}" into "${wisdomContext.destinationName}"`,
        },
      ]

    case "merge-siblings":
      return [{
        nodeName: wisdomContext.currentName || node.name,
        nodeLevel: level,
        field: "merge-theme",
        oldValue: wisdomContext.currentName || "",
        newValue: wisdomContext.destinationName || "",
        operationDescription: `Merge "${wisdomContext.currentName || node.name}" into "${wisdomContext.destinationName}"`,
      }]

    case "merge-keyword":
      return [{
        nodeName: wisdomContext.currentName || node.name,
        nodeLevel: "L3",
        field: "merge-theme",
        oldValue: wisdomContext.currentName || "",
        newValue: wisdomContext.destinationName || "",
        operationDescription: `Merge keyword "${wisdomContext.currentName || node.name}" into "${wisdomContext.destinationName}"`,
      }]

    case "change-category":
      return [{
        nodeName: wisdomContext.sourceName || node.name,
        nodeLevel: "Theme",
        field: "category",
        oldValue: wisdomContext.currentCategory || "",
        newValue: wisdomContext.newCategory || "",
        operationDescription: `Change category of "${wisdomContext.sourceName || node.name}" to ${wisdomContext.newCategory}`,
      }]

    default:
      return []
  }
}

// --- Diff Building (extracted from agent-overlay.tsx) ---

export function buildDiffFromContext(ctx: AgentContext): AgentDiffItem[] {
  const { operationType, wisdomContext, selectedNode, nodeLevel } = ctx
  const nodeType = nodeLevel || "L1"
  // For theme operations, prefer wisdomContext names over selectedNode (which may be the parent keyword)
  const nodeName = wisdomContext.currentName || selectedNode?.name || ""

  switch (operationType) {
    case "rename-subtheme":
    case "rename-theme":
      return [{
        type: "modified",
        nodeType,
        nodeName: wisdomContext.currentName || nodeName,
        field: "name",
        oldValue: wisdomContext.currentName || "",
        newValue: wisdomContext.newName || "",
      }]

    case "delete-subtheme":
      return [{
        type: "deleted",
        nodeType,
        nodeName: wisdomContext.currentName || nodeName,
      }]

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
        type: "modified",
        nodeType,
        nodeName: wisdomContext.sourceName || nodeName,
        field: "merge-theme",
        oldValue: wisdomContext.sourceName || "",
        newValue: wisdomContext.destinationName || "",
      }]

    case "split-subtheme": {
      const splitName = wisdomContext.currentName || nodeName
      const items: AgentDiffItem[] = [{
        type: "deleted",
        nodeType,
        nodeName: splitName,
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

    case "promote-subtheme":
      return [{
        type: "added",
        nodeType: "Theme" as const,
        nodeName: wisdomContext.subThemeName || wisdomContext.currentName || nodeName,
      }]

    default:
      return []
  }
}
