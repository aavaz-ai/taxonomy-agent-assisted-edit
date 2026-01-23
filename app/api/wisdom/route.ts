import { NextRequest, NextResponse } from "next/server"
import {
  generateWisdomPrompt,
  type TaxonomyOperationType,
  type WisdomPromptContext,
  OPERATION_CONFIGS,
} from "@/lib/wisdom-prompts"

export interface WisdomQueryRequest {
  operationType: TaxonomyOperationType
  context: WisdomPromptContext
}

export interface WisdomQueryResponse {
  success: boolean
  prompt: string
  response: string
  operationRisk: string
  verdict?: "APPROVE" | "REJECT" | "WORKAROUND" | "APPROVE WITH CONDITIONS"
  confidence?: "High" | "Med" | "Low"
  risks?: string[]
  workaround?: string
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

  switch (operationType) {
    case "rename-subtheme":
      response = generateRenameSubThemeResponse(context)
      confidence = "High"
      verdict = "APPROVE"
      risks = ["Minor: Records will remain mapped to the same entity with new name"]
      break

    case "rename-theme":
      response = generateRenameThemeResponse(context)
      confidence = "High"
      verdict = "APPROVE"
      risks = ["Minor: All sub-themes will retain their mappings"]
      break

    case "delete-subtheme":
      response = generateDeleteSubThemeResponse(context)
      confidence = "Med"
      verdict = context.currentName?.toLowerCase().includes("misc") ? "REJECT" : "APPROVE"
      risks = [
        "Records may become orphaned if no alternative predictions exist",
        "Irreversible operation",
      ]
      if (verdict === "REJECT") {
        workaround =
          "Consider splitting the catch-all sub-theme into more specific categories instead of deleting"
      }
      break

    case "delete-keyword":
      response = generateDeleteKeywordResponse(context)
      confidence = "Low"
      verdict = "WORKAROUND"
      risks = [
        "All Themes and sub-themes under this keyword will be deleted",
        "High volume of records may become orphaned",
        "Irreversible structural change",
      ]
      workaround =
        "Consider merging this keyword with a sibling keyword to preserve taxonomy coverage"
      break

    case "merge-subtheme":
      response = generateMergeSubThemeResponse(context)
      // Reject if merging unrelated sub-themes (low semantic similarity)
      const isLowSimilarity = checkLowSemanticSimilarity(context.sourceName, context.destinationName)
      confidence = isLowSimilarity ? "Low" : "Med"
      verdict = isLowSimilarity ? "REJECT" : "APPROVE"
      risks = isLowSimilarity
        ? [
            "Sub-themes capture different types of feedback",
            "Merging would lose granularity for distinct issue tracking",
            "Users searching for specific issues would get mixed results",
          ]
        : [
            "Irreversible operation — cannot un-merge",
            "Granularity loss if sub-themes were tracking distinct aspects",
          ]
      break

    case "merge-theme":
      response = generateMergeThemeResponse(context)
      confidence = "Med"
      verdict = "APPROVE WITH CONDITIONS"
      risks = [
        "Irreversible structural change",
        "Sub-theme consolidation may lose granularity",
        "Historical trend analysis affected",
        "Extended backfill time for large volumes",
      ]
      break

    case "split-subtheme":
      response = generateSplitSubThemeResponse(context)
      confidence = "Med"
      verdict = "APPROVE WITH CONDITIONS"
      risks = [
        "Coverage gaps may cause record loss",
        "Vague feedback won't redistribute cleanly",
        "Risk of creating more fragmentation",
      ]
      break

    case "create-subtheme":
      response = generateCreateSubThemeResponse(context)
      confidence = "High"
      verdict = "APPROVE"
      risks = ["Low: Adding leaf node only, parent Theme/siblings unaffected"]
      break

    case "create-theme":
      response = generateCreateThemeResponse(context)
      confidence = "Med"
      verdict = "APPROVE"
      risks = [
        "Duplicate Theme creation if not validated",
        "Wrong L3 placement may cause records not to flow correctly",
      ]
      break

    case "change-theme-category":
      response = generateChangeCategoryResponse(context)
      confidence = "High"
      verdict = "APPROVE"
      risks = [
        "All sub-themes inherit the new category",
        "Dashboard/filter counts will shift",
        "Saved views filtered by old category will exclude this Theme",
      ]
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
  }
}

function generateRenameSubThemeResponse(context: WisdomPromptContext): string {
  // Use actual taxonomy data for realistic response
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const theme = context.themeName || "Scheduling Blocked by Error Messages"
  const currentName = context.currentName || "Unknown Error During Scheduling"
  const newName = context.newName || "Scheduling Error Messages"

  return `**Operations Confidence**: High

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${currentName}

**Sibling SubThemes**:
- Calendar Connection Errors — 89 records
- Permission Denied Messages — 67 records
- Miscellaneous Scheduling Errors — 124 records
- Conflict Detected: No

**Operation Evaluation**:
- Current Name: ${currentName}
- Proposed Name: ${newName}
- Sibling Conflict: No
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
  return `**Operations Confidence**: High

**Theme Taxonomy Path(s)**:
- Category: COMPLAINT
- Path 1: Product Area → Feature Group → ${context.l3Name || "Keyword"} → ${context.currentName}

**Sibling Themes**:
- Related Theme A
- Related Theme B
- Conflict Detected: No

**Sub-themes**:
- SubTheme 1
- SubTheme 2
- Generic
- Sub-themes align with new name: Yes

**Operation Evaluation**:
- Current Name: ${context.currentName}
- Proposed Name: ${context.newName || "New Name"}
- Sibling Conflict: No
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

  // Use actual taxonomy data
  const l1 = context.l1Name || "Zoom Meetings"
  const l2 = context.l2Name || "Scheduling & Joining"
  const l3 = context.l3Name || "Schedule a Meeting"
  const theme = context.themeName || "Scheduling Blocked by Error Messages"
  const currentName = context.currentName || "Miscellaneous Scheduling Errors"

  if (isCatchAll) {
    return `**Operations Confidence**: Low

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${theme}
- Path: ${l1} → ${l2} → ${l3} → ${theme} → ${currentName}

**Sibling SubThemes**:
- Unknown Error During Scheduling — 142 records
- Calendar Connection Errors — 89 records
- Permission Denied Messages — 67 records
- Specific siblings remaining after delete: 3

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
- Unknown Error During Scheduling — 142 records
- Calendar Connection Errors — 89 records
- Permission Denied Messages — 67 records
- Miscellaneous Scheduling Errors — 387 records
- Specific siblings remaining after delete: 4

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
- Same Parent Theme: Yes
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
- Same Parent Theme: Yes
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
  return `**Operations Confidence**: Med

**SubTheme Taxonomy Path(s)**:
- Parent Theme: ${context.themeName || "Parent Theme"}
- Path 1: Product Area → Feature Group → Keyword → Theme → ${context.currentName}

**Sibling SubThemes**: Related SubTheme A, Related SubTheme B, Generic

**Feedback Pattern Analysis**:
- Total Volume: 450 records
- Pattern 1: Specific Issue Type — 35% of feedback
  - Sample: "Having trouble with specific functionality"
- Pattern 2: Related Concern — 30% of feedback
  - Sample: "Need improvement in this area"
- Pattern 3: General Feedback — 25% of feedback
  - Sample: "Overall experience with feature"
- Uncategorized/Vague: 10%

**Recommended Splits**:
- Split 1: Specific Issue Feedback — would capture 35%
- Split 2: Improvement Requests — would capture 30%
- Split 3: General Experience — would capture 25%

**Operation Evaluation**:
- Current Volume: 450 records
- Volume per Split: Sufficient (100+ per split)
- Coverage: 90% of feedback covered
- Sibling Overlap: No
- Retain Original: Not Recommended — distinct patterns identified

**Risks**:
- 10% of records may not fit cleanly into splits
- Vague feedback will fall to Generic/Misc
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

**Sub-themes** (will inherit new category):
${subThemeList}
- Total: ${subThemeCount} sub-theme${subThemeCount !== 1 ? "s" : ""}

**Feedback Analysis**:
- Theme Volume: ${themeVolume} records
- Feedback Sentiment Breakdown:
${sentimentBreakdown}
- Feedback aligns with proposed category: ${context.newCategory === "IMPROVEMENT" ? "Yes" : "Likely"}

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
      // Use simulated response for prototype
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
