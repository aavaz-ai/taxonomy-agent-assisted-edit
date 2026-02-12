import { NextRequest, NextResponse } from "next/server"
import {
  generateWisdomPrompt,
  type TaxonomyOperationType,
  type WisdomPromptContext,
  OPERATION_CONFIGS,
} from "@/lib/wisdom-prompts"
import { type WorkaroundType, type PartialItem } from "@/lib/agent-utils"

export interface WisdomQueryRequest {
  operationType: TaxonomyOperationType
  context: WisdomPromptContext
}

export interface WisdomQueryResponse {
  success: boolean
  prompt: string
  response: string
  operationRisk: string
  verdict?: "APPROVE" | "REJECT" | "WORKAROUND" | "APPROVE WITH CONDITIONS" | "PARTIAL"
  confidence?: "High" | "Med" | "Low"
  risks?: string[]
  workaround?: string
  workaroundType?: WorkaroundType
  workaroundContext?: Partial<WisdomPromptContext>  // enriched context for workaround execution
  partialItems?: PartialItem[]
}

// Configuration for Wisdom agent
const WISDOM_AUTH_TOKEN = process.env.WISDOM_AUTH_TOKEN
const USE_LIVE_WISDOM = process.env.USE_LIVE_WISDOM === "true"
const WISDOM_API_ENDPOINT = process.env.WISDOM_API_ENDPOINT || "https://wisdom-api.enterpret.com/v1/query"

// Simulated Wisdom response generator for the prototype
// In production, this would call the actual Wisdom MCP server
function generateSimulatedWisdomResponse(
  operationType: TaxonomyOperationType,
  context: WisdomPromptContext
): WisdomQueryResponse {
  const prompt = generateWisdomPrompt(operationType, context)
  const config = OPERATION_CONFIGS[operationType]

  // Generate a realistic simulated response based on operation type
  let response = ""
  let verdict: WisdomQueryResponse["verdict"] = "APPROVE"
  let confidence: WisdomQueryResponse["confidence"] = "High"
  let risks: string[] = []
  let workaround: string | undefined
  let workaroundType: WorkaroundType | undefined
  let workaroundContext: Partial<WisdomPromptContext> | undefined
  let partialItems: PartialItem[] | undefined

  switch (operationType) {
    case "rename-subtheme": {
      response = generateRenameSubThemeResponse(context)
      confidence = "High"
      verdict = "APPROVE"
      risks = ["Minor: Records will remain mapped to the same entity with new name"]
      // 1. Exact duplicate against cross-theme sub-themes
      const crossDuplicate = checkSiblingDuplicate(context.newName, context.crossThemeSubThemeNames)
      if (crossDuplicate) {
        const duplicateParentTheme = context.crossThemeSubThemeParents?.[crossDuplicate]
        verdict = "WORKAROUND"
        confidence = "Med"
        workaroundType = "transfer-then-merge"
        risks = [
          `Name "${crossDuplicate}" already exists as a sub-theme under "${duplicateParentTheme || "a different theme"}"`,
          "Duplicate names across themes cause confusion when filtering or searching",
        ]
        workaround = `A sub-theme named "${crossDuplicate}" already exists under "${duplicateParentTheme || "another theme"}". Merge "${context.currentName}" into "${crossDuplicate}" instead.`
        workaroundContext = {
          sourceName: context.currentName,
          destinationName: crossDuplicate,
          sourceParentTheme: context.themeName,
          destinationParentTheme: duplicateParentTheme,
        }
      }
      // 2. Check if newName shares 2+ words with a same-parent sibling name
      if (!crossDuplicate) {
        const renameOverlap = checkSiblingNameOverlap(context.newName, context.siblingNames)
        if (renameOverlap) {
          verdict = "WORKAROUND"
          confidence = "Med"
          workaroundType = "merge-siblings"
          risks = [
            `New name overlaps significantly with sibling "${renameOverlap}"`,
            "May cause confusion when filtering or searching",
            "Records could be misclassified between similar sub-themes",
          ]
          workaround = `Merge "${context.currentName}" with "${renameOverlap}" instead of renaming, since both cover similar feedback patterns.`
          workaroundContext = { destinationName: renameOverlap }
        // 3. Generic name check
        } else if (checkGenericName(context.newName)) {
          verdict = "APPROVE WITH CONDITIONS"
          confidence = "Med"
          risks = [
            "Generic names reduce discoverability",
            "Catch-all sub-themes tend to accumulate unrelated feedback",
            "Consider a more specific name that describes the feedback pattern",
          ]
        }
      }
      break
    }

    case "rename-theme": {
      response = generateRenameThemeResponse(context)
      confidence = "High"
      verdict = "APPROVE"
      risks = ["Minor: All sub-themes will retain their mappings"]
      const themeRenameOverlap = checkSiblingNameOverlap(context.newName, context.siblingThemes)
      if (themeRenameOverlap) {
        verdict = "WORKAROUND"
        confidence = "Med"
        workaroundType = "merge-siblings"
        risks = [
          `New name overlaps significantly with sibling theme "${themeRenameOverlap}"`,
          "May cause confusion when filtering or analyzing trends",
        ]
        workaround = `Merge "${context.currentName}" with "${themeRenameOverlap}" instead of renaming, since both cover similar feedback patterns.`
        workaroundContext = { destinationName: themeRenameOverlap }
      } else if (checkGenericName(context.newName)) {
        verdict = "APPROVE WITH CONDITIONS"
        confidence = "Med"
        risks = [
          "Generic names reduce discoverability",
          "Catch-all themes tend to accumulate unrelated feedback",
        ]
      }
      break
    }

    case "delete-subtheme": {
      response = generateDeleteSubThemeResponse(context)
      const isCatchAllDelete = checkGenericName(context.currentName)
      const isOnlyChild = context.siblingNames != null && context.siblingNames.length === 0

      if (isCatchAllDelete) {
        confidence = "Low"
        verdict = "REJECT"
        risks = [
          "Cannot delete catch-all sub-theme — high-volume bucket captures unclassified feedback",
          "Records would become orphaned with no alternative predictions",
        ]
        workaround = "Consider splitting the catch-all sub-theme into more specific categories instead of deleting"
      } else if (isOnlyChild) {
        confidence = "Med"
        verdict = "REJECT"
        risks = [
          "This is the only sub-theme under its parent theme",
          "Deleting it would leave the parent theme empty",
          "Consider deleting or merging the parent theme instead",
        ]
        workaround = "Delete or merge the parent theme instead of removing its only sub-theme"
      } else {
        confidence = "Med"
        verdict = "APPROVE"
        risks = [
          "Records may become orphaned if no alternative predictions exist",
          "Irreversible operation",
        ]
        // Flag high record counts as APPROVE WITH CONDITIONS
        const simulatedCount = context.themeVolume || 67
        if (simulatedCount > 200) {
          verdict = "APPROVE WITH CONDITIONS"
          risks = [
            `High volume sub-theme (${simulatedCount} records) — verify redistribution targets exist`,
            "Irreversible operation",
          ]
        }
      }
      break
    }

    case "delete-keyword": {
      response = generateDeleteKeywordResponse(context)
      // Check for DAG-shared (keyword appearing under multiple L2 paths)
      const hasMultipleParents = context.l2Name && context.l1Name &&
        (context.currentName?.toLowerCase().includes("general") || context.currentName?.toLowerCase().includes("common"))
      // Check if keyword has no themes
      const isEmptyKeyword = context.subThemeNames != null && context.subThemeNames.length === 0

      if (isEmptyKeyword) {
        confidence = "High"
        verdict = "APPROVE"
        risks = ["Empty keyword with no themes — safe to remove"]
      } else if (hasMultipleParents) {
        confidence = "High"
        verdict = "REJECT"
        risks = [
          "This keyword appears under multiple L2 paths (DAG structure)",
          "Deleting it would affect all connected paths",
          "Must remove from each parent path individually",
        ]
        workaround = "Remove this keyword from individual paths instead of deleting it entirely"
      } else {
        confidence = "Low"
        verdict = "WORKAROUND"
        workaroundType = "merge-keyword"
        risks = [
          "All Themes and sub-themes under this keyword will be deleted",
          "High volume of records may become orphaned",
          "Irreversible structural change",
        ]
        workaround = "Merge this keyword with a sibling keyword to preserve taxonomy coverage instead of deleting."
      }
      break
    }

    case "merge-subtheme": {
      // Check cross-parent constraint first
      const isCrossParent = context.sourceParentTheme && context.destinationParentTheme &&
        context.sourceParentTheme !== context.destinationParentTheme
      const isLowSimilarity = checkLowSemanticSimilarity(context.sourceName, context.destinationName)
      const isModerateSimilarity = !isLowSimilarity && checkModerateSimilarity(context.sourceName, context.destinationName)

      if (isCrossParent) {
        const parentsRelated = checkParentSimilarity(context.sourceParentTheme, context.destinationParentTheme)
        response = generateCrossParentMergeResponse(context)

        if (parentsRelated) {
          // Related parents → WORKAROUND with move-to-parent
          confidence = "Med"
          verdict = "WORKAROUND"
          workaroundType = "move-to-parent"
          risks = [
            "Cannot merge sub-themes across parent themes",
            `Source parent: "${context.sourceParentTheme}"`,
            `Destination parent: "${context.destinationParentTheme}"`,
            "Parents are semantically related — move sub-theme first, then merge",
          ]
          workaround = `Move "${context.sourceName}" from "${context.sourceParentTheme}" to "${context.destinationParentTheme}", then merge with "${context.destinationName}".`
        } else {
          // Unrelated parents → REJECT with merge-parents suggestion
          confidence = "High"
          verdict = "REJECT"
          workaroundType = "merge-parents"
          risks = [
            "Cannot merge sub-themes across parent themes",
            `Source parent: "${context.sourceParentTheme}"`,
            `Destination parent: "${context.destinationParentTheme}"`,
            "Sub-themes must share the same parent theme to merge",
          ]
          workaround = `Cannot merge sub-themes across parent themes. Consider merging the parent themes instead: "${context.sourceParentTheme}" and "${context.destinationParentTheme}"`
        }
      } else if (isLowSimilarity) {
        response = generateMergeSubThemeResponse(context)
        confidence = "High"
        verdict = "REJECT"
        risks = [
          "Sub-themes capture different types of feedback",
          "Merging would lose granularity for distinct issue tracking",
          "Users searching for specific issues would get mixed results",
        ]
        workaround = "Keep both sub-themes separate and add clarifying descriptions to distinguish their scope"
      } else if (isModerateSimilarity) {
        response = generateMergeSubThemeResponse(context)
        confidence = "Med"
        verdict = "PARTIAL"
        risks = [
          "Partial semantic overlap — some feedback items fit both, others don't",
          "Merging would combine unrelated feedback for non-overlapping items",
        ]
        partialItems = [
          { name: `${context.sourceName} → shared patterns`, included: true, reason: "Overlapping feedback patterns can be merged" },
          { name: `${context.sourceName} → unique patterns`, included: false, reason: "Distinct feedback not captured by destination" },
          { name: `${context.destinationName} → all patterns`, included: true, reason: "Destination retains full coverage" },
        ]
      } else {
        response = generateMergeSubThemeResponse(context)
        confidence = "Med"
        verdict = "APPROVE"
        risks = [
          "Irreversible operation — cannot un-merge",
          "Granularity loss if sub-themes were tracking distinct aspects",
        ]
      }
      break
    }

    case "merge-theme": {
      response = generateMergeThemeResponse(context)
      const categoryConflict = context.currentCategory && context.newCategory && context.currentCategory !== context.newCategory

      if (categoryConflict) {
        confidence = "Med"
        verdict = "WORKAROUND"
        workaroundType = "change-category"
        risks = [
          "Themes have different categories — merging would force one category",
          `Source category: ${context.currentCategory}`,
          `Destination category: ${context.newCategory}`,
          "Sub-themes from source would inherit destination's category",
        ]
        workaround = `Change the category of "${context.sourceName}" to "${context.newCategory}" before merging.`
      } else {
        confidence = "Med"
        verdict = "APPROVE WITH CONDITIONS"
        risks = [
          "Irreversible structural change",
          "Sub-theme consolidation may lose granularity",
          "Historical trend analysis affected",
          "Extended backfill time for large volumes",
        ]
      }
      break
    }

    case "split-subtheme": {
      response = generateSplitSubThemeResponse(context)
      const proposedSplits = context.proposedSplits || []
      const splitSiblings = context.siblingNames || context.siblingSubThemes || []

      // Check if any proposed name duplicates a sibling
      const splitNameCollision = proposedSplits.find(name =>
        checkSiblingDuplicate(name, splitSiblings)
      )

      if (splitNameCollision) {
        confidence = "Med"
        verdict = "PARTIAL"
        risks = [
          `Proposed split name "${splitNameCollision}" conflicts with existing sibling`,
          "Some splits can proceed, others need renaming",
        ]
        partialItems = proposedSplits.map(name => {
          const collision = checkSiblingDuplicate(name, splitSiblings)
          return {
            name,
            included: !collision,
            reason: collision ? `Conflicts with existing sibling "${collision}"` : "Name is unique — can proceed",
          }
        })
      } else if (proposedSplits.length > 5) {
        confidence = "Low"
        verdict = "APPROVE WITH CONDITIONS"
        risks = [
          `${proposedSplits.length} splits is high — may cause over-fragmentation`,
          "Each split should have sufficient volume (100+ records)",
          "Consider fewer, broader categories",
        ]
      } else {
        confidence = "Med"
        verdict = "APPROVE WITH CONDITIONS"
        risks = [
          "Coverage gaps may cause record loss",
          "Vague feedback won't redistribute cleanly",
          "Risk of creating more fragmentation",
        ]
      }
      break
    }

    case "create-subtheme": {
      response = generateCreateSubThemeResponse(context)
      const createSubThemeName = context.proposedName || context.newName
      const createSubThemeDuplicate = checkSiblingDuplicate(createSubThemeName, context.siblingNames || context.siblingSubThemes)

      if (createSubThemeDuplicate) {
        confidence = "High"
        verdict = "REJECT"
        risks = [
          `Sub-theme "${createSubThemeDuplicate}" already exists under this parent theme`,
          "Creating a duplicate would cause ambiguity in record classification",
        ]
      } else if (checkGenericName(createSubThemeName)) {
        confidence = "Med"
        verdict = "APPROVE WITH CONDITIONS"
        risks = [
          "Generic name may accumulate unrelated feedback",
          "Consider a more specific name that describes the feedback pattern",
        ]
      } else {
        confidence = "High"
        verdict = "APPROVE"
        risks = ["Low: Adding leaf node only, parent Theme/siblings unaffected"]
      }
      break
    }

    case "create-theme": {
      response = generateCreateThemeResponse(context)
      const createThemeName = context.proposedName || context.newName
      const createThemeDuplicate = checkSiblingDuplicate(createThemeName, context.siblingThemes)

      if (createThemeDuplicate) {
        confidence = "High"
        verdict = "REJECT"
        risks = [
          `Theme "${createThemeDuplicate}" already exists under this L3 keyword`,
          "Creating a duplicate would cause ambiguity in record classification",
        ]
      } else {
        confidence = "Med"
        verdict = "APPROVE"
        risks = [
          "Duplicate Theme creation if not validated",
          "Wrong L3 placement may cause records not to flow correctly",
        ]
      }
      break
    }

    case "change-theme-category": {
      response = generateChangeCategoryResponse(context)
      // In real agent behavior, category change = moving sub-themes to a different
      // parent theme with the target category. Check if such a theme exists.
      const targetThemeExists = context.siblingThemes && context.siblingThemes.length > 0

      if (!targetThemeExists && context.siblingThemes != null) {
        // No theme with target category under this L3 → need to create one
        confidence = "Med"
        verdict = "WORKAROUND"
        workaroundType = "create-theme"
        risks = [
          "No existing theme with the target category under this L3 keyword",
          "A new theme must be created to host these sub-themes",
        ]
        workaround = `No theme with category "${context.newCategory}" exists under this L3 keyword. Create a new theme with category "${context.newCategory}" first, then move sub-themes.`
      } else {
        confidence = "High"
        verdict = "APPROVE"
        risks = [
          "All sub-themes inherit the new category",
          "Dashboard/filter counts will shift",
          "Saved views filtered by old category will exclude this Theme",
        ]
        // Flag high record counts
        if (context.themeVolume && context.themeVolume > 200) {
          verdict = "APPROVE WITH CONDITIONS"
          risks.push(`High volume theme (${context.themeVolume} records) — dashboard impact will be significant`)
        }
      }
      break
    }

    case "promote-subtheme":
      response = generatePromoteSubThemeResponse(context)
      confidence = "Med"
      verdict = "WORKAROUND"
      workaroundType = "create-theme"
      risks = [
        "Direct promotion not supported — requires creating a new theme",
        "Category assignment needed for the new theme",
        "Parent theme may be left with fewer sub-themes",
      ]
      workaround = `Cannot promote directly. Create a new theme "${context.subThemeName || context.currentName}" instead, then migrate feedback from the sub-theme.`
      break

    default:
      response = "Unable to analyze this operation type."
      confidence = "Low"
      verdict = "WORKAROUND"
  }

  return {
    success: true,
    prompt,
    response,
    operationRisk: config.risk,
    verdict,
    confidence,
    risks,
    workaround,
    workaroundType,
    workaroundContext,
    partialItems,
  }
}

function generateRenameSubThemeResponse(context: WisdomPromptContext): string {
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const theme = context.themeName || "Scheduling Blocked by Error Messages"
  const currentName = context.currentName || "Unknown Error During Scheduling"
  const newName = context.newName || "Scheduling Error Messages"
  const siblings = context.siblingNames && context.siblingNames.length > 0
    ? context.siblingNames.filter(s => s !== currentName)
    : ["Calendar Connection Errors", "Permission Denied Messages", "Miscellaneous Scheduling Errors"]

  // Check for sibling naming conflict
  const conflictingSibling = siblings.find(s =>
    s.toLowerCase() === newName.toLowerCase() ||
    s.toLowerCase().replace(/\s+/g, "") === newName.toLowerCase().replace(/\s+/g, "")
  )
  const hasConflict = !!conflictingSibling

  return `**Operations Confidence**: High

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${currentName}

**Sibling SubThemes**:
${siblings.map(s => `- ${s}`).join("\n")}
- Conflict with existing: **${hasConflict ? `Yes — "${conflictingSibling}"` : "No"}**

**Semantic Alignment with Parent**:
- Parent Theme: "${theme}"
- Proposed Name: "${newName}"
- Alignment: Yes — name stays within scope of parent theme

**Operation Evaluation**:
- Current Name: ${currentName}
- Proposed Name: ${newName}
- Sibling Conflict: ${hasConflict ? `Yes — "${conflictingSibling}"` : "No"}
- Parent Theme Alignment: Yes — name stays within scope of scheduling errors
- Feedback Alignment: Better
  - Sample feedback patterns:
    - "Got an error when trying to schedule but it didn't say what went wrong"
    - "Scheduling failed with no explanation"
    - "Unknown error keeps popping up when I create meetings"
  - Current name fit: Too vague — doesn't indicate the error is unexplained
  - Proposed name fit: Clearer — indicates these are error message issues
- Name Quality:
  - Concise: Yes
  - Granular: Yes — specific to error messaging
  - Self-explanatory: Yes

**Risks**:
- Minor: 142 existing records remain mapped to same entity with new name
- No re-inference required

**Verdict**: APPROVE
The rename improves clarity. Feedback consistently describes unclear or missing error messages during scheduling.`
}

function generateRenameThemeResponse(context: WisdomPromptContext): string {
  const l1 = context.l1Name || "Product Area"
  const l2 = context.l2Name || "Feature Group"
  const l3 = context.l3Name || "Keyword"
  const currentName = context.currentName || "Current Theme"
  const newName = context.newName || "New Name"
  const siblingThemes = context.siblingThemes && context.siblingThemes.length > 0
    ? context.siblingThemes.filter(s => s !== currentName)
    : ["Related Theme A", "Related Theme B"]
  const subThemeNames = context.subThemeNames && context.subThemeNames.length > 0
    ? context.subThemeNames
    : ["SubTheme 1", "SubTheme 2", "Generic"]

  const conflictingSibling = siblingThemes.find(s =>
    s.toLowerCase() === newName.toLowerCase()
  )

  return `**Operations Confidence**: High

**Theme Taxonomy Path(s)**:
- Category: COMPLAINT
- Path 1: ${l1} → ${l2} → ${l3} → ${currentName}

**Sibling Themes**:
${siblingThemes.map(s => `- ${s}`).join("\n")}
- Conflict Detected: ${conflictingSibling ? `Yes — "${conflictingSibling}"` : "No"}

**Sub-themes**:
${subThemeNames.map(s => `- ${s}`).join("\n")}
- Sub-themes align with new name: Yes

**Operation Evaluation**:
- Current Name: ${currentName}
- Proposed Name: ${newName}
- Sibling Conflict: ${conflictingSibling ? `Yes — "${conflictingSibling}"` : "No"}
- Category Alignment: Yes
- Feedback Alignment: Better
- Name Quality: Concise, Clear, Self-explanatory

**Risks**: Minor - All sub-themes will retain their mappings

**Verdict**: APPROVE
The rename improves clarity and maintains alignment with the theme's purpose.`
}

function generateDeleteSubThemeResponse(context: WisdomPromptContext): string {
  const isCatchAll = context.currentName?.toLowerCase().includes("misc") ||
                     context.currentName?.toLowerCase().includes("generic")

  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const theme = context.themeName || "Scheduling Blocked by Error Messages"
  const currentName = context.currentName || "Miscellaneous Scheduling Errors"
  const siblings = context.siblingNames && context.siblingNames.length > 0
    ? context.siblingNames.filter(s => s !== currentName)
    : ["Unknown Error During Scheduling", "Calendar Connection Errors", "Permission Denied Messages"]

  if (isCatchAll) {
    return `**Operations Confidence**: Low

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${currentName}

**Sibling SubThemes**:
${siblings.map(s => `- ${s}`).join("\n")}
- Specific siblings remaining after delete: ${siblings.length}

**Operation Evaluation**:
- SubTheme Volume: 387 records
- Volume Assessment: High
- Alternative Predictions Available: Partial
  - Records with co-occurring tags: 31%
  - Records that would be orphaned: 69%
- Only Specific Child: No
- Hierarchy Inversion: No
- Duplicate Sibling Exists: No
- Catch-all Assessment: Yes — High volume catch-all bucket

**Feedback Sample** (from this sub-theme):
- "Meeting wouldn't schedule, not sure why"
- "Something went wrong but I don't know what"
- "Couldn't create the meeting, tried multiple times"
- "Scheduling just doesn't work sometimes"
- "Random failures when setting up calls"

**Risks**:
- 69% of records (267 feedback items) would become orphaned
- This is a catch-all capturing diverse scheduling issues
- Deleting loses visibility into unclassified scheduling problems

**Recommended Alternative**:
Split into specific sub-themes based on feedback patterns:
- "Intermittent Scheduling Failures" — would capture ~120 records
- "Unclear Scheduling Errors" — would capture ~95 records
- "Recurring Schedule Issues" — would capture ~85 records

**Verdict**: REJECT
Cannot delete high-volume catch-all. 387 records with 69% orphan risk. Split into specific sub-themes first to preserve coverage.`
  }

  return `**Operations Confidence**: Med

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${currentName}

**Sibling SubThemes**:
${siblings.map(s => `- ${s}`).join("\n")}
- Specific siblings remaining after delete: ${siblings.length}

**Operation Evaluation**:
- SubTheme Volume: ${context.currentName ? "67" : "42"} records
- Volume Assessment: Low
- Alternative Predictions Available: Yes
  - Records with co-occurring tags: 78%
  - Records that would be orphaned: 22%
- Only Specific Child: No
- Hierarchy Inversion: No
- Duplicate Sibling Exists: No
- Catch-all Assessment: No

**Risks**:
- 22% of records may redistribute to Miscellaneous Scheduling Errors
- Irreversible operation

**Verdict**: APPROVE
Low volume sub-theme with good alternative prediction coverage. Safe to archive.`
}

function generateDeleteKeywordResponse(context: WisdomPromptContext): string {
  // Use actual taxonomy data
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.currentName || "Schedule a Meeting"

  return `**Operations Confidence**: Low

**Keyword Taxonomy Path**:
- L1: ${l1}
- L2: ${l2}
- L3 (Keyword): ${l3}

**Themes under this Keyword**:
| Theme | Category | Sub-Themes | Records |
|-------|----------|------------|---------|
| Scheduling Blocked by Error Messages | Complaint | 4 | 685 |
| Struggle to Locate Schedule Option | Complaint | 3 | 412 |

**Theme Details**:

1. **Scheduling Blocked by Error Messages** (685 records)
   - Unknown Error During Scheduling — 142 records
   - Calendar Connection Errors — 89 records
   - Permission Denied Messages — 67 records
   - Miscellaneous Scheduling Errors — 387 records

2. **Struggle to Locate Schedule Option** (412 records)
   - Button Hidden in Menu — 156 records
   - Different on Mobile vs Desktop — 134 records
   - Schedule vs Meet Now Confusion — 122 records

**Sibling Keywords under ${l2}**:
- Personal Meeting ID (PMI) — 2 themes — 523 records
- Alternative Host — 2 themes — 287 records
- Join via Link — 2 themes — 634 records
- Meeting Registration — 2 themes — 445 records

**Operation Evaluation**:
- Keyword Volume: 1,097 records
- Volume Assessment: High
- Total Themes Affected: 2
- Total SubThemes Affected: 7
- Alternative Predictions Available: Partial
  - Records with co-occurring L2/L1 tags: 58%
  - Records that would be orphaned: 42%

**Feedback Impact Sample**:
- "Can't figure out how to schedule a meeting" — would lose categorization
- "Error when trying to set up my weekly standup" — would lose categorization
- "Where is the schedule button in the new UI?" — would lose categorization

**Risks**:
- Irreversible — 2 Themes and 7 sub-themes permanently deleted
- 1,097 feedback records affected
- 42% (461 records) would become orphaned
- Lose visibility into all scheduling-related issues
- Historical trend data for scheduling problems lost

**Recommended Alternative**:
Instead of deleting, consider:
1. **Merge with "Join via Link"** — Both relate to meeting access flow
   - Combined keyword: "Meeting Access & Scheduling"
   - Preserves all feedback under unified structure
2. **Archive individual low-volume themes** — If specific themes are outdated
   - Review each theme's relevance before bulk deletion

**Verdict**: WORKAROUND
High-volume keyword (1,097 records) with 42% orphan risk. Merge with sibling keyword "Join via Link" to preserve scheduling feedback coverage.`
}

// Check if a name is generic (other, misc, etc.)
function checkGenericName(name?: string): boolean {
  if (!name) return false
  const generic = ["other", "miscellaneous", "misc", "general", "generic", "uncategorized", "n/a", "unknown", "default"]
  return generic.some(g => name.toLowerCase().trim() === g || name.toLowerCase().trim() === g + "s")
}

// Check if two parent themes are semantically related (for cross-parent merge workaround)
function checkParentSimilarity(parent1?: string, parent2?: string): boolean {
  if (!parent1 || !parent2) return false
  const p1 = parent1.toLowerCase()
  const p2 = parent2.toLowerCase()

  // Same root words
  const words1 = p1.split(/\s+/).filter(w => w.length > 3)
  const words2 = p2.split(/\s+/).filter(w => w.length > 3)
  const shared = words1.filter(w => words2.includes(w))
  if (shared.length > 0) return true

  // Related pairs
  const relatedPairs = [
    ["error", "issue"], ["error", "problem"], ["issue", "problem"],
    ["bug", "error"], ["bug", "issue"],
    ["request", "improvement"], ["feature", "improvement"],
    ["complaint", "issue"], ["complaint", "problem"],
    ["slow", "performance"], ["lag", "performance"],
    ["crash", "error"], ["freeze", "crash"],
    ["ui", "interface"], ["ui", "display"],
    ["login", "auth"], ["login", "sign"],
    ["sync", "connection"], ["sync", "integration"],
  ]

  for (const [t1, t2] of relatedPairs) {
    if ((p1.includes(t1) && p2.includes(t2)) || (p1.includes(t2) && p2.includes(t1))) {
      return true
    }
  }

  return false
}

// Check if a name duplicates a sibling
function checkSiblingDuplicate(name?: string, siblings?: string[]): string | null {
  if (!name || !siblings || siblings.length === 0) return null
  const normalized = name.toLowerCase().trim()
  for (const sibling of siblings) {
    if (sibling.toLowerCase().trim() === normalized) {
      return sibling
    }
  }
  return null
}

// Check if two sub-themes have moderate semantic similarity (for PARTIAL verdict)
function checkModerateSimilarity(source?: string, destination?: string): boolean {
  if (!source || !destination) return false
  const sourceLower = source.toLowerCase()
  const destLower = destination.toLowerCase()

  // Share exactly 1 significant word (not enough for full merge, not incompatible either)
  const stopWords = new Set(["a", "an", "the", "and", "or", "of", "in", "on", "to", "for", "by", "with", "is", "at", "it", "not"])
  const sourceWords = sourceLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  const destWords = destLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  const shared = sourceWords.filter(w => destWords.includes(w))

  return shared.length === 1 && sourceWords.length >= 2 && destWords.length >= 2
}

// Check if two sub-themes have low semantic similarity based on names
function checkLowSemanticSimilarity(source?: string, destination?: string): boolean {
  if (!source || !destination) return false

  const sourceLower = source.toLowerCase()
  const destLower = destination.toLowerCase()

  // Define pairs that should NOT be merged (different root causes)
  const incompatiblePairs = [
    ["calendar", "permission"],
    ["connection", "permission"],
    ["error", "confusion"],
    ["technical", "usability"],
    ["mobile", "desktop"],
    ["audio", "video"],
  ]

  for (const [term1, term2] of incompatiblePairs) {
    if ((sourceLower.includes(term1) && destLower.includes(term2)) ||
        (sourceLower.includes(term2) && destLower.includes(term1))) {
      return true
    }
  }

  return false
}

// Check if a new name shares 2+ significant words with any sibling name
function checkSiblingNameOverlap(newName?: string, siblingNames?: string[]): string | null {
  if (!newName || !siblingNames || siblingNames.length === 0) return null

  const stopWords = new Set(["a", "an", "the", "and", "or", "of", "in", "on", "to", "for", "by", "with", "is", "at", "it"])
  const newWords = newName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))

  for (const sibling of siblingNames) {
    const siblingWords = sibling.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
    const shared = newWords.filter(w => siblingWords.includes(w))
    if (shared.length >= 2) {
      return sibling
    }
  }

  return null
}

function generateMergeSubThemeResponse(context: WisdomPromptContext): string {
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const theme = context.themeName || "Scheduling Blocked by Error Messages"
  const source = context.sourceName || "Calendar Connection Errors"
  const dest = context.destinationName || "Permission Denied Messages"

  const isLowSimilarity = checkLowSemanticSimilarity(source, dest)

  if (isLowSimilarity) {
    return `**Operations Confidence**: Low

**Source SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${source}

**Destination SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${dest}

**Operation Evaluation**:
- Same Parent Theme: **Yes** — both under "${theme}"
- Source Volume: 89 records
- Destination Volume: 67 records
- Semantic Similarity: Low

**Feedback Analysis**:

Source sub-theme "${source}" feedback samples:
- "My Google Calendar won't sync with Zoom"
- "Calendar integration keeps disconnecting"
- "Can't see my Outlook meetings in Zoom"

Destination sub-theme "${dest}" feedback samples:
- "Says I don't have permission to schedule"
- "Admin blocked me from creating meetings"
- "Need host privileges to schedule this type"

**Assessment**:
- Common Patterns: None — feedback describes fundamentally different issues
- Source Focus: Calendar/integration sync problems
- Destination Focus: User permission/access control issues
- Overlap: Less than 5% — almost no shared feedback patterns

**Risks**:
- Merging unrelated issues loses ability to track root causes separately
- Users searching for calendar issues would see permission complaints
- Product team loses signal on which problem type is more prevalent
- Irreversible — cannot separate after merge

**Verdict**: REJECT
Cannot merge sub-themes with low semantic similarity. "${source}" captures calendar sync issues while "${dest}" captures access control problems. These are different root causes requiring separate tracking.`
  }

  return `**Operations Confidence**: Med

**Source SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${source}

**Destination SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${dest}

**Operation Evaluation**:
- Same Parent Theme: **Yes** — both under "${theme}"
- Source Volume: 85 records
- Destination Volume: 120 records
- Semantic Similarity: High
  - Common Patterns: Both capture similar user feedback about the same aspect
  - Source-Specific Patterns: Slight variation in wording
  - Destination-Specific Patterns: More comprehensive coverage
  - Overlap Assessment: 75% of feedback naturally fits merged sub-theme

**Risks**:
- Irreversible operation — cannot un-merge
- Minor granularity loss (acceptable given high semantic similarity)

**Verdict**: APPROVE
High semantic similarity justifies merge. Combined sub-theme will provide better coverage.`
}

function generateMergeThemeResponse(context: WisdomPromptContext): string {
  return `**Operations Confidence**: Med

**Source Theme Taxonomy Path(s)**:
- Category: COMPLAINT
- Path 1: Product Area → Feature Group → Keyword → ${context.sourceName}

**Destination Theme Taxonomy Path(s)**:
- Category: COMPLAINT
- Path 1: Product Area → Feature Group → Keyword → ${context.destinationName}

**Sub-theme Inventory**:
- Source Theme Sub-themes: SubTheme A, SubTheme B, Generic (3 total)
- Destination Theme Sub-themes: SubTheme X, SubTheme Y, SubTheme Z, Generic (4 total)
- Overlapping Sub-themes: (SubTheme A, SubTheme X) appear semantically similar
- Combined Sub-theme Count: 6 (after consolidation)

**Operation Evaluation**:
- Same Category: Yes — Both COMPLAINT
- Source Volume: 320 records
- Destination Volume: 450 records
- Combined Volume: 770 records
- Semantic Similarity: High
- Assessment: Overlapping — Both themes capture similar feedback patterns

**Risks**:
- Irreversible structural change
- Sub-theme consolidation needed for overlapping pairs
- Historical trend analysis affected
- Moderate backfill time expected

**Verdict**: APPROVE WITH CONDITIONS
Merge is appropriate, but consolidate overlapping sub-themes (SubTheme A → SubTheme X) post-merge.`
}

function generateSplitSubThemeResponse(context: WisdomPromptContext): string {
  const l1 = context.l1Name || "Product Area"
  const l2 = context.l2Name || "Feature Group"
  const l3 = context.l3Name || "Keyword"
  const theme = context.themeName || "Parent Theme"
  const subTheme = context.currentName || context.subThemeName || "Sub-theme"
  const proposedSplits = context.proposedSplits || []
  const siblingNames = context.siblingNames || context.siblingSubThemes || []

  const splitList = proposedSplits.length > 0
    ? proposedSplits.map((name, i) => `- Split ${i + 1}: "${name}" — would capture ~${Math.round(70 / proposedSplits.length)}%`).join("\n")
    : `- Split 1: Specific Issue Feedback — would capture 35%\n- Split 2: Improvement Requests — would capture 30%\n- Split 3: General Experience — would capture 25%`

  const siblingCheck = proposedSplits.length > 0 && siblingNames.length > 0
    ? proposedSplits.some(s => siblingNames.some(sib =>
        s.toLowerCase().includes(sib.toLowerCase()) || sib.toLowerCase().includes(s.toLowerCase())
      ))
      ? "Yes — one or more proposed names overlap with existing siblings"
      : "No — proposed names are distinct from existing siblings"
    : "No"

  return `**Operations Confidence**: Med

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${subTheme}

**Sibling SubThemes**: ${siblingNames.length > 0 ? siblingNames.join(", ") : "Related SubTheme A, Related SubTheme B, Generic"}

**Volume Check**:
- Total Volume: 450 records
- Volume Threshold: 100+ records per split recommended
- Per-split estimate: ${proposedSplits.length > 0 ? `${Math.round(450 * 0.7 / proposedSplits.length)} records per split` : "150 records per split"} — ${proposedSplits.length > 0 && Math.round(450 * 0.7 / proposedSplits.length) >= 100 ? "Sufficient" : "Sufficient"}

**Feedback Segmentation Analysis**:
- Pattern 1: Specific Issue Type — 35% of feedback
  - Sample: "Having trouble with specific functionality"
- Pattern 2: Related Concern — 30% of feedback
  - Sample: "Need improvement in this area"
- Pattern 3: General Feedback — 25% of feedback
  - Sample: "Overall experience with feature"
- Uncategorized/Vague: 10%

**Coverage Gap Analysis**:
- 10% of feedback (45 records) would not be captured by proposed splits
- These are vague mentions like "something is wrong" with no clear category
- Recommendation: Let these fall to the parent theme's Generic/Misc sub-theme

**Recommended Splits**:
${splitList}

**Sibling Naming Check**:
- Sibling Overlap: ${siblingCheck}
- Naming Pattern: ${siblingNames.length > 0 ? "Follows sibling naming convention" : "Consistent with parent theme scope"}

**Operation Evaluation**:
- Current Volume: 450 records
- Volume per Split: Sufficient (100+ per split)
- Coverage: 90% of feedback covered
- Sibling Overlap: ${siblingCheck.startsWith("Yes") ? "Yes — review names" : "No"}
- Retain Original: Not Recommended — distinct patterns identified

**Risks**:
- Coverage gaps — 10% of records may not fit cleanly into splits
- Vague feedback won't redistribute cleanly
- Ensure split names are specific enough for accurate inferencing

**Verdict**: APPROVE WITH CONDITIONS
Split is justified by distinct feedback patterns. Ensure each split has clear, specific naming.`
}

function generateCreateSubThemeResponse(context: WisdomPromptContext): string {
  return `**Operations Confidence**: High

**Parent Theme Taxonomy Path(s)**:
- Parent Theme: ${context.parentThemeName || context.themeName || "Parent Theme"}
- Category: COMPLAINT
- Path 1: Product Area → Feature Group → Keyword → ${context.parentThemeName || context.themeName}

**Existing Sibling SubThemes**:
- Existing SubTheme A
- Existing SubTheme B
- Generic — 120 records

**Misc Feedback Analysis**:
- Misc Volume: 120 records
- Pattern 1: Uncovered Aspect — 40% of Misc feedback
  - Sample: "Feedback about specific uncovered topic"
  - Covered by existing sibling: No
- Pattern 2: Related Issue — 25% of Misc feedback
  - Sample: "Related concern not captured elsewhere"
  - Covered by existing sibling: No

**Operation Evaluation**:
- Parent Theme Exists: Yes
- Proposed Name: ${context.proposedName || context.newName || "New SubTheme"}
- Sibling Conflict: No
- Name Quality: Unique, Granular, Concise, Self-explanatory
- Estimated Redistribution: ~50 records from Misc

**Risks**:
- Low structural impact — adding leaf node only
- Parent Theme/siblings unaffected
- Reversible via Delete SubTheme if needed

**Verdict**: APPROVE
New sub-theme addresses a clear gap in coverage and follows naming best practices.`
}

function generateCreateThemeResponse(context: WisdomPromptContext): string {
  return `**Operations Confidence**: Med

**L3 Placement**:
- L1: ${context.l1Name || "Product Area"}
- L2: ${context.l2Name || "Feature Group"}
- L3: ${context.l3Name || "Keyword"}
- L3 Exists: Yes

**Sibling Themes under L3**:
- Existing Theme A — Category: COMPLAINT
- Existing Theme B — Category: IMPROVEMENT
- Misc/Generic Theme — 200 records

**Duplicate Check**:
- Semantic Duplicate Found: No

**Misc Feedback Analysis**:
- Misc Volume: 200 records
- Pattern 1: Uncovered Topic — 30% of Misc feedback
  - Sample: "Feedback about this specific area"
  - Captured by existing Theme: No
- Pattern 2: Related Requests — 25% of Misc feedback
  - Sample: "Users asking about related functionality"
  - Captured by existing Theme: No

**Recommended Theme** (if not provided):
- Theme Name: ${context.proposedName || context.newName || "New Theme"}
- Category: ${context.newCategory || "COMPLAINT"}
- Rationale: Addresses uncovered feedback patterns
- Potential Sub-themes:
  - Specific Aspect A
  - Specific Aspect B
  - General Feedback

**Operation Evaluation**:
- Proposed Theme: ${context.proposedName || context.newName || "New Theme"}
- Category: ${context.newCategory || "COMPLAINT"}
- L3 Path Valid: Yes
- Duplicate: No
- Breadth Assessment: Sufficient
- Can support 3+ sub-themes: Yes
- Estimated Redistribution: ~60 records from Misc

**Risks**:
- Ensure theme name is distinct from siblings
- Verify L3 placement is correct for record flow

**Verdict**: APPROVE
Theme addresses a clear coverage gap and can support multiple sub-themes.`
}

function generateChangeCategoryResponse(context: WisdomPromptContext): string {
  // Use actual sub-theme names from context, or fallback to placeholders
  const subThemeNames = context.subThemeNames && context.subThemeNames.length > 0
    ? context.subThemeNames
    : ["Generic SubTheme"]
  const subThemeCount = subThemeNames.length
  const themeVolume = context.themeVolume || 250

  // Format sub-theme list with volumes if available
  const subThemeList = context.subThemeVolumes && context.subThemeVolumes.length > 0
    ? context.subThemeVolumes.map(st => `- ${st.name} — ${st.count} records`).join("\n")
    : subThemeNames.map(name => `- ${name}`).join("\n")

  // Calculate sentiment percentages based on current category
  const sentimentBreakdown = getSentimentBreakdown(context.currentCategory, context.newCategory)

  return `**Operations Confidence**: High

**Theme Taxonomy Path(s)**:
- Theme: ${context.themeName || context.currentName || "Theme"}
- L3 Keyword: ${context.l3Name || "Keyword"}
- Current Category: ${context.currentCategory || "COMPLAINT"}
- Proposed Category: ${context.newCategory || "IMPROVEMENT"}
- Path: Product Area → Feature Group → ${context.l3Name || "Keyword"} → ${context.themeName || context.currentName}

**Category Inheritance**:
Categories are theme-level properties — all sub-themes inherit the parent theme's category. Changing this category will update ${subThemeCount} sub-theme${subThemeCount !== 1 ? "s" : ""}.

**Sub-themes** (will inherit new category):
${subThemeList}
- Total: ${subThemeCount} sub-theme${subThemeCount !== 1 ? "s" : ""}

**Feedback Analysis**:
- Theme Volume: ${themeVolume} records
- Feedback Sentiment Breakdown:
${sentimentBreakdown}
- Feedback aligns with proposed category: ${context.newCategory === "IMPROVEMENT" ? "Yes" : "Likely"}

**Sibling Impact Analysis**:
- Changing this theme's category does not affect sibling themes
- Only sub-themes under "${context.themeName || "this theme"}" are affected

**Operation Evaluation**:
- Current Category: ${context.currentCategory || "COMPLAINT"}
- Proposed Category: ${context.newCategory || "IMPROVEMENT"}
- Semantic Alignment: Yes
- Name Sentiment Conflict: No
- Rename Recommended: No
- Sub-theme Conflicts: None detected
- Feedback Alignment: ${context.newCategory === context.currentCategory ? "N/A (same category)" : "Strong alignment with proposed category"}

**Risks**:
- ${subThemeCount} sub-theme${subThemeCount !== 1 ? "s" : ""} will inherit new category
- Dashboard category breakdowns will shift
- Saved views filtered by ${context.currentCategory || "old category"} will exclude this Theme

**Verdict**: APPROVE
Category change from ${context.currentCategory} to ${context.newCategory} is appropriate for Theme "${context.themeName}". All ${subThemeCount} sub-themes will be updated.`
}

function generateCrossParentMergeResponse(context: WisdomPromptContext): string {
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const source = context.sourceName || "Source Sub-theme"
  const dest = context.destinationName || "Destination Sub-theme"
  const sourceParent = context.sourceParentTheme || "Source Theme"
  const destParent = context.destinationParentTheme || "Destination Theme"

  return `**Operations Confidence**: High

**Source SubTheme Taxonomy Path(s)**:
- Parent Theme: ${sourceParent}
- Path: ${l1} → ${l2} → ${l3} → ${sourceParent} → ${source}

**Destination SubTheme Taxonomy Path(s)**:
- Parent Theme: ${destParent}
- Path: ${l1} → ${l2} → ${l3} → ${destParent} → ${dest}

**Operation Evaluation**:
- Same Parent Theme: **No**
  - Source parent: "${sourceParent}"
  - Destination parent: "${destParent}"
- Constraint: Sub-themes can only be merged within the same parent theme

**Cross-Parent Merge Constraint**:
Sub-theme merges require both items to share the same parent theme. "${source}" belongs to "${sourceParent}" while "${dest}" belongs to "${destParent}". These are different parent themes.

**Workaround**:
To achieve the desired outcome, merge the parent themes first:
1. Merge "${sourceParent}" into "${destParent}" (or vice versa)
2. After the parent merge, both sub-themes will share the same parent
3. Then merge the sub-themes as originally intended

**Risks**:
- Cannot merge sub-themes across parent themes
- Parent theme merge is a high-impact operation affecting all sub-themes under both
- Consider whether the parent themes are truly related before merging

**Verdict**: REJECT
Cannot merge sub-themes across parent themes. "${source}" is under "${sourceParent}" and "${dest}" is under "${destParent}". Merge the parent themes first.`
}

function generatePromoteSubThemeResponse(context: WisdomPromptContext): string {
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const parentTheme = context.parentThemeName || context.themeName || "Parent Theme"
  const subThemeName = context.subThemeName || context.currentName || "Sub-theme"

  return `**Operations Confidence**: Med

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${parentTheme}
- Path: ${l1} → ${l2} → ${l3} → ${parentTheme} → ${subThemeName}

**Promotion Assessment**:
- Current Volume: 245 records
- Breadth: Sufficient — sub-theme covers a broad enough topic for standalone theme status
- Can support 3+ sub-themes: Yes — feedback patterns show 3-4 distinct subcategories
- Semantic Alignment: "${subThemeName}" represents a concept distinct from parent "${parentTheme}"
- Category Match: Feedback aligns with COMPLAINT category
- Existing Theme Conflict: No — no semantically identical theme exists at theme level

**Related Sub-themes**:
- No other sub-themes under "${parentTheme}" should move with this one
- Parent would retain 3 other sub-themes after promotion — still viable

**Parent Impact**:
- Current sub-theme count under "${parentTheme}": 4
- After promotion: 3 sub-themes remain
- Parent viability: Maintained

**Guardrail Checks**:
- ✓ Volume sufficient for standalone theme (245 records)
- ✓ Distinct concept from parent theme
- ✓ Can support 3+ sub-themes
- ✓ No existing theme conflict
- ⚠ Direct promotion not available — requires creating a new theme

**Risks**:
- Direct sub-theme promotion is not a supported operation
- Must create a new theme and migrate feedback
- Category must be explicitly assigned to the new theme
- Historical data attribution may shift

**Workaround**:
Create a new theme "${subThemeName}" under the same L3 keyword, then:
1. The new theme will capture future feedback matching this pattern
2. Existing records will redistribute during the next backfill cycle
3. The original sub-theme can be archived after records migrate

**Verdict**: WORKAROUND
Cannot promote directly. Create a new theme "${subThemeName}" instead. The sub-theme has sufficient volume (245 records) and breadth for standalone theme status.`
}

function getSentimentBreakdown(currentCategory?: string, newCategory?: string): string {
  // Generate realistic sentiment breakdown based on categories
  if (newCategory === "IMPROVEMENT") {
    return `  - Complaint-like: 15%
  - Improvement-like: 70%
  - Praise-like: 5%
  - Help-like: 10%`
  } else if (newCategory === "COMPLAINT") {
    return `  - Complaint-like: 75%
  - Improvement-like: 15%
  - Praise-like: 2%
  - Help-like: 8%`
  } else if (newCategory === "PRAISE") {
    return `  - Complaint-like: 5%
  - Improvement-like: 10%
  - Praise-like: 80%
  - Help-like: 5%`
  } else if (newCategory === "HELP") {
    return `  - Complaint-like: 10%
  - Improvement-like: 15%
  - Praise-like: 5%
  - Help-like: 70%`
  }
  return `  - Complaint-like: 25%
  - Improvement-like: 25%
  - Praise-like: 25%
  - Help-like: 25%`
}

// Call the live Wisdom agent API
async function queryLiveWisdomAgent(
  operationType: TaxonomyOperationType,
  context: WisdomPromptContext
): Promise<WisdomQueryResponse> {
  const prompt = generateWisdomPrompt(operationType, context)
  const config = OPERATION_CONFIGS[operationType]

  try {
    const response = await fetch(WISDOM_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WISDOM_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        prompt,
        operationType,
        context,
      }),
    })

    if (!response.ok) {
      console.error("Wisdom API error:", response.status, response.statusText)
      // Fall back to simulated response on error
      return generateSimulatedWisdomResponse(operationType, context)
    }

    const data = await response.json()

    // Parse the response from the Wisdom agent
    return {
      success: true,
      prompt,
      response: data.response || data.analysis || data.result || "",
      operationRisk: config.risk,
      verdict: data.verdict || parseVerdictFromResponse(data.response || ""),
      confidence: data.confidence || "Med",
      risks: data.risks || [],
      workaround: data.workaround,
    }
  } catch (error) {
    console.error("Error calling live Wisdom agent:", error)
    // Fall back to simulated response on error
    return generateSimulatedWisdomResponse(operationType, context)
  }
}

// Helper to extract verdict from response text
function parseVerdictFromResponse(response: string): WisdomQueryResponse["verdict"] {
  const upperResponse = response.toUpperCase()
  if (upperResponse.includes("APPROVE WITH CONDITIONS")) return "APPROVE WITH CONDITIONS"
  if (upperResponse.includes("WORKAROUND")) return "WORKAROUND"
  if (upperResponse.includes("REJECT")) return "REJECT"
  if (upperResponse.includes("APPROVE")) return "APPROVE"
  return "APPROVE"
}

export async function POST(request: NextRequest) {
  try {
    const body: WisdomQueryRequest = await request.json()
    const { operationType, context } = body

    if (!operationType || !context) {
      return NextResponse.json(
        { success: false, error: "Missing operationType or context" },
        { status: 400 }
      )
    }

    // Use live Wisdom agent if enabled and token is configured
    let response: WisdomQueryResponse
    if (USE_LIVE_WISDOM && WISDOM_AUTH_TOKEN) {
      console.log("Using live Wisdom agent for operation:", operationType)
      response = await queryLiveWisdomAgent(operationType, context)
    } else {
      // Simulate Wisdom agent processing time:
      // ~500ms Kosh query + ~1-3s LLM inference
      const delay = 1500 + Math.random() * 2000  // 1.5-3.5 seconds
      await new Promise(resolve => setTimeout(resolve, delay))
      response = generateSimulatedWisdomResponse(operationType, context)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Wisdom API error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process Wisdom query" },
      { status: 500 }
    )
  }
}
