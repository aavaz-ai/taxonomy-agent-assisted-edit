// Wisdom prompts for taxonomy operations
// Based on Theme & SubTheme Management Guide PRD

export type TaxonomyOperationType =
  | "rename-subtheme"
  | "merge-subtheme"
  | "merge-theme"
  | "delete-subtheme"
  | "split-subtheme"
  | "create-subtheme"
  | "create-theme"
  | "change-theme-category"
  | "rename-theme"
  | "delete-keyword"

export type OperationRisk = "Low" | "Medium" | "High"

export interface OperationConfig {
  type: TaxonomyOperationType
  risk: OperationRisk
  description: string
}

export const OPERATION_CONFIGS: Record<TaxonomyOperationType, OperationConfig> = {
  "rename-subtheme": {
    type: "rename-subtheme",
    risk: "Low",
    description: "Rename a sub-theme while keeping records mapped",
  },
  "merge-subtheme": {
    type: "merge-subtheme",
    risk: "High",
    description: "Merge two sub-themes under the same parent theme",
  },
  "merge-theme": {
    type: "merge-theme",
    risk: "High",
    description: "Merge two themes, consolidating all sub-themes",
  },
  "delete-subtheme": {
    type: "delete-subtheme",
    risk: "Medium",
    description: "Archive a sub-theme and handle orphaned records",
  },
  "split-subtheme": {
    type: "split-subtheme",
    risk: "High",
    description: "Split a sub-theme into multiple new sub-themes",
  },
  "create-subtheme": {
    type: "create-subtheme",
    risk: "Low",
    description: "Create a new sub-theme under an existing theme",
  },
  "create-theme": {
    type: "create-theme",
    risk: "Medium",
    description: "Create a new theme under an L3 keyword",
  },
  "change-theme-category": {
    type: "change-theme-category",
    risk: "Low",
    description: "Change the category of a theme (cascades to sub-themes)",
  },
  "rename-theme": {
    type: "rename-theme",
    risk: "Low",
    description: "Rename a theme while keeping records mapped",
  },
  "delete-keyword": {
    type: "delete-keyword",
    risk: "Medium",
    description: "Delete a keyword (L3) from the taxonomy",
  },
}

export interface WisdomPromptContext {
  // Current entity details
  currentName?: string
  newName?: string

  // For merge operations
  sourceName?: string
  destinationName?: string

  // For category changes
  currentCategory?: "COMPLAINT" | "IMPROVEMENT" | "PRAISE" | "HELP"
  newCategory?: "COMPLAINT" | "IMPROVEMENT" | "PRAISE" | "HELP"

  // For create operations
  parentThemeName?: string
  l3Path?: string
  proposedName?: string

  // For split operations
  proposedSplits?: string[]

  // Taxonomy path context
  l1Name?: string
  l2Name?: string
  l3Name?: string
  themeName?: string
  subThemeName?: string

  // Additional context for richer responses
  subThemeNames?: string[]
  themeVolume?: number
  subThemeVolumes?: { name: string; count: number }[]
  siblingThemes?: string[]
  siblingSubThemes?: string[]
}

export function generateWisdomPrompt(
  operationType: TaxonomyOperationType,
  context: WisdomPromptContext
): string {
  switch (operationType) {
    case "rename-subtheme":
      return generateRenameSubThemePrompt(context)
    case "merge-subtheme":
      return generateMergeSubThemePrompt(context)
    case "merge-theme":
      return generateMergeThemePrompt(context)
    case "delete-subtheme":
      return generateDeleteSubThemePrompt(context)
    case "split-subtheme":
      return generateSplitSubThemePrompt(context)
    case "create-subtheme":
      return generateCreateSubThemePrompt(context)
    case "create-theme":
      return generateCreateThemePrompt(context)
    case "change-theme-category":
      return generateChangeThemeCategoryPrompt(context)
    case "rename-theme":
      return generateRenameThemePrompt(context)
    case "delete-keyword":
      return generateDeleteKeywordPrompt(context)
    default:
      return generateGenericPrompt(context)
  }
}

function generateRenameSubThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following rename request:

SubTheme: ${context.currentName || "[CURRENT_SUBTHEME_NAME]"}
Proposed New Name: ${context.newName || "[NEW_SUBTHEME_NAME]"}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find ALL taxonomy paths for this sub-theme. A sub-theme has exactly ONE parent Theme, but that Theme may be linked to multiple L3 keywords — list every path.

2. **Sibling Uniqueness Check**:
   - List all sibling sub-themes under the same parent Theme
   - Check if the proposed new name conflicts with or is semantically identical to any existing sibling

3. **Feedback Alignment**:
   - Retrieve sample feedback records (10-20) from the SubTheme
   - Analyze whether the proposed new name accurately represents the feedback content
   - Compare how well the current name vs proposed name describes the feedback

4. **Parent Theme Alignment**: Does the proposed name stay within the scope of the parent Theme?

5. **Name Quality**:
   - Concise: Is it short enough for UI display?
   - Granular: Does it capture a specific aspect of the parent Theme?
   - Self-explanatory: Is it understandable without needing context?

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**SubTheme Taxonomy Path(s)**:
- Parent Theme: [Theme Name]
- Path 1: [L1] → [L2] → [L3] → [Theme] → [SubTheme]
- Path 2: [L1] → [L2] → [L3] → [Theme] → [SubTheme]
(list all L3 paths the parent Theme is linked to)

**Sibling SubThemes**:
- [Sibling 1]
- [Sibling 2]
- Conflict Detected: [Yes/No] — [Sibling name if conflict exists]

**Operation Evaluation**:
- Current Name: [Current SubTheme Name]
- Proposed Name: [New SubTheme Name]
- Sibling Conflict: [Yes/No]
- Parent Theme Alignment: [Yes/No]
- Feedback Alignment: [Better/Same/Worse]
  - Sample feedback patterns: [List 3-5 patterns from feedback]
  - Current name fit: [How well current name describes feedback]
  - Proposed name fit: [How well proposed name describes feedback]
- Name Quality:
  - Concise: [Yes/No]
  - Granular: [Yes/No]
  - Self-explanatory: [Yes/No]

**Risks**: [List any risks]

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]

**Workaround** (if Verdict is WORKAROUND):
Recommend an alternative using available operations.`
}

function generateMergeSubThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following merge request:

Source SubTheme: ${context.sourceName || "[SOURCE_SUBTHEME_NAME]"}
Destination SubTheme: ${context.destinationName || "[DESTINATION_SUBTHEME_NAME]"}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find ALL taxonomy paths for both source and destination. A sub-theme has exactly ONE parent Theme, but that Theme may be linked to multiple L3 keywords — list every path.

2. **Same Parent Check**: Do both sub-themes share the SAME parent Theme?

3. **Feedback Analysis**:
   - Retrieve sample feedback records (10-20) from the Source SubTheme
   - Retrieve sample feedback records (10-20) from the Destination SubTheme
   - Analyze the feedback content to determine semantic similarity
   - Identify common patterns, keywords, and user intents across both sets

4. **Volume Impact**: What is the record volume for source and destination sub-themes?

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**Source SubTheme Taxonomy Path(s)**:
- Parent Theme: [Theme Name]
- Path 1: [L1] → [L2] → [L3] → [Theme] → [Source SubTheme]

**Destination SubTheme Taxonomy Path(s)**:
- Parent Theme: [Theme Name]
- Path 1: [L1] → [L2] → [L3] → [Theme] → [Destination SubTheme]

**Operation Evaluation**:
- Same Parent Theme: [Yes/No]
- Source Volume: [X records]
- Destination Volume: [Y records]
- Semantic Similarity: [High/Med/Low]
  - Common Patterns: [List 3-5 shared themes in feedback]
  - Source-Specific Patterns: [Patterns unique to source]
  - Destination-Specific Patterns: [Patterns unique to destination]
  - Overlap Assessment: [% of feedback that would fit naturally in merged sub-theme]

**Risks**: [List any risks - this is an irreversible, high-risk operation]

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateMergeThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following merge request:

Source Theme: ${context.sourceName || "[SOURCE_THEME_NAME]"}
Destination Theme: ${context.destinationName || "[DESTINATION_THEME_NAME]"}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find ALL taxonomy paths for both source and destination Themes. A Theme may be linked to multiple L3 keywords — list every path.

2. **Sub-theme Inventory**:
   - List all sub-themes under Source Theme
   - List all sub-themes under Destination Theme
   - Identify overlapping/duplicate sub-themes that would need consolidation post-merge

3. **Feedback Analysis**:
   - Retrieve sample feedback records (10-20) from the Source Theme
   - Retrieve sample feedback records (10-20) from the Destination Theme
   - Analyze the feedback content to determine semantic similarity
   - Assess: Are these truly duplicates/overlapping, or serving different purposes?

4. **Volume Impact**: What is the record volume for source and destination Themes? (Large merges = extended backfill time)

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**Source Theme Taxonomy Path(s)**:
- Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Path 1: [L1] → [L2] → [L3] → [Source Theme]

**Destination Theme Taxonomy Path(s)**:
- Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Path 1: [L1] → [L2] → [L3] → [Destination Theme]

**Sub-theme Inventory**:
- Source Theme Sub-themes: [List all]
- Destination Theme Sub-themes: [List all]
- Overlapping Sub-themes: [List pairs that are semantically similar]
- Combined Sub-theme Count: [X]

**Operation Evaluation**:
- Same Category: [Yes/No] — Source: [Category], Destination: [Category]
- Source Volume: [X records]
- Destination Volume: [Y records]
- Combined Volume: [Z records]
- Semantic Similarity: [High/Med/Low]
- Assessment: [Duplicates/Overlapping OR Different Purposes]

**Risks**:
- Irreversible structural change
- Sub-theme granularity loss
- Historical trend analysis impact
- Extended backfill time if large volume

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateDeleteSubThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following delete request:

SubTheme: ${context.subThemeName || context.currentName || "[SUBTHEME_NAME]"}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find ALL taxonomy paths for this sub-theme.

2. **Volume Check**: What is the feedback volume for this sub-theme? (Zero/minimal volume = safer to delete)

3. **Alternative Predictions Check**:
   - Retrieve sample feedback records (10-20) from the SubTheme
   - For each record, check if it has co-occurring predictions (other sub-themes it's also tagged with)
   - Assess: If deleted, will records have alternative homes or become orphaned?

4. **Sibling Inventory**:
   - List all sibling sub-themes under the same parent Theme
   - Identify if this is the only specific (non-Generic/non-Misc) sub-theme
   - Deleting should not leave parent Theme with only Generic/Misc sub-themes

5. **Hierarchy Inversion Check**: Is the sub-theme name broader/vaguer than its parent Theme?

6. **Duplicate Check**: Does a semantically identical sibling exist? (If yes, merge first instead of delete)

7. **Catch-all Assessment**: Is this a high-volume catch-all sub-theme? (If yes, should split or reclassify, not delete)

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**SubTheme Taxonomy Path(s)**:
- Parent Theme: [Theme Name]
- Path 1: [L1] → [L2] → [L3] → [Theme] → [SubTheme]

**Sibling SubThemes**:
- [Sibling 1] — [Volume]
- Generic/Misc siblings: [List any]
- Specific siblings remaining after delete: [Count]

**Operation Evaluation**:
- SubTheme Volume: [X records]
- Volume Assessment: [Zero/Minimal/Moderate/High]
- Alternative Predictions Available: [Yes/No/Partial]
  - Records with co-occurring tags: [X%]
  - Records that would be orphaned: [Y%]
- Only Specific Child: [Yes/No] — Would delete leave parent with only Misc?
- Hierarchy Inversion: [Yes/No]
- Duplicate Sibling Exists: [Yes/No]
- Catch-all Assessment: [Yes/No]

**Risks**:
- Orphaned records if no alternative predictions
- Parent Theme left hollow
- Irreversible operation

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateSplitSubThemePrompt(context: WisdomPromptContext): string {
  const proposedSplitsText = context.proposedSplits?.length
    ? context.proposedSplits.join(", ")
    : "[Not Provided — Recommend Splits]"

  return `Analyze the following split request:

SubTheme: ${context.subThemeName || context.currentName || "[SUBTHEME_NAME]"}
Proposed Splits: ${proposedSplitsText}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find ALL taxonomy paths for this sub-theme.

2. **Volume Check**: What is the feedback volume for this sub-theme? (Recommend 100+ records per proposed split for viable sub-themes)

3. **Feedback Pattern Analysis**:
   - Retrieve sample feedback records (20-30) from the SubTheme
   - Identify distinct patterns, clusters, or categories within the feedback
   - Group feedback into potential split categories
   - Calculate approximate distribution across each pattern

4. **Sibling Inventory**:
   - List all existing sibling sub-themes under the same parent Theme
   - Check if proposed/recommended splits would duplicate existing siblings

5. **Coverage Assessment**:
   - What % of feedback would be covered by proposed/recommended splits?
   - Identify feedback that wouldn't fit any split (would fall to Misc)

6. **Catch-all Assessment**: Is this a vague catch-all sub-theme? (If better predictions exist elsewhere, delete + backfill may be better than split)

7. **Retain Original Check**: Should the original sub-theme be retained as a catch-all alongside the new splits?

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**SubTheme Taxonomy Path(s)**:
- Parent Theme: [Theme Name]
- Path 1: [L1] → [L2] → [L3] → [Theme] → [SubTheme]

**Sibling SubThemes**: [List all]

**Feedback Pattern Analysis**:
- Total Volume: [X records]
- Pattern 1: [Pattern Name] — [X%] of feedback
- Pattern 2: [Pattern Name] — [Y%] of feedback
- Uncategorized/Vague: [W%]

**Recommended Splits** (if not provided by user):
- Split 1: [Proposed SubTheme Name] — would capture [X%]
- Split 2: [Proposed SubTheme Name] — would capture [Y%]

**Operation Evaluation**:
- Current Volume: [X records]
- Volume per Split: [Sufficient (100+) / Insufficient (<100)]
- Coverage: [X%] of feedback covered
- Sibling Overlap: [Yes/No]
- Retain Original: [Recommended/Not Recommended]

**Risks**:
- Coverage gaps — X% of records have nowhere to go
- Vague feedback won't redistribute cleanly
- Irreversible operation

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateCreateSubThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following create request:

Parent Theme: ${context.parentThemeName || context.themeName || "[PARENT_THEME_NAME]"}
Proposed SubTheme Name: ${context.proposedName || context.newName || "[NEW_SUBTHEME_NAME]"}

Perform the following checks:

1. **Parent Theme Validation**:
   - Does the specified parent Theme exist?
   - Find ALL taxonomy paths for the parent Theme
   - Identify the category (COMPLAINT/IMPROVEMENT/PRAISE/HELP) — new sub-theme will inherit this

2. **Sibling Inventory**:
   - List all existing sibling sub-themes under the parent Theme
   - Check if proposed name conflicts with or duplicates existing siblings
   - Identify Generic/Misc sub-themes under parent

3. **Misc/Generic Feedback Analysis** (to justify creation):
   - Retrieve sample feedback records (20-30) from the parent Theme's Generic/Misc sub-theme
   - Identify distinct patterns that are NOT captured by existing siblings
   - Assess: Would the proposed sub-theme capture feedback currently falling to Misc?

4. **Name Quality Assessment**:
   - Unique: Does not duplicate siblings
   - Granular: More specific than parent Theme
   - Concise: Short enough for UI display
   - Self-explanatory: Understandable without parent context
   - Not a catch-all: Avoid vague names

5. **Volume Potential**: Based on Misc feedback analysis, estimate how many records would redistribute to the new sub-theme

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**Parent Theme Taxonomy Path(s)**:
- Parent Theme: [Theme Name]
- Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Path 1: [L1] → [L2] → [L3] → [Theme]

**Existing Sibling SubThemes**: [List all]
- Generic/Misc: [Name] — [Volume]

**Misc Feedback Analysis**:
- Misc Volume: [X records]
- Pattern 1: [Pattern Name] — [X%] of Misc feedback
- Covered by existing sibling: [Yes/No]

**Operation Evaluation**:
- Parent Theme Exists: [Yes/No]
- Proposed Name: [SubTheme Name]
- Sibling Conflict: [Yes/No]
- Name Quality: [Unique/Granular/Concise/Self-explanatory]
- Estimated Redistribution: [X records] from Misc

**Risks**:
- Sibling overlap causing unexpected record splits
- Catch-all name creating new Misc bucket

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateCreateThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following create request:

L3 Keyword Path: ${context.l3Path || `${context.l1Name || "[L1]"} → ${context.l2Name || "[L2]"} → ${context.l3Name || "[L3]"}`}
Proposed Theme Name: ${context.proposedName || context.newName || "[NEW_THEME_NAME]"}
Category: ${context.newCategory || "[COMPLAINT/IMPROVEMENT/PRAISE/HELP]"}

Perform the following checks:

1. **L3 Path Validation**:
   - Does the specified L3 exist?
   - List sibling Themes already under this L3

2. **Duplicate Check**:
   - List all existing Themes under the specified L3
   - Check if proposed Theme name is semantically identical to an existing sibling
   - Identify if an existing Theme already captures this feedback

3. **Misc Theme Feedback Analysis** (to justify creation):
   - Retrieve sample feedback records (20-30) from the L3's Misc/Generic Theme
   - Identify distinct patterns that are NOT captured by existing sibling Themes

4. **Breadth Assessment**:
   - Is the proposed Theme broad enough to support 3+ sub-themes?
   - Identify potential sub-themes that could be created under this Theme
   - If too narrow, recommend as SubTheme under existing Theme instead

5. **Category Validation**:
   - Validate category aligns with the Theme name and expected feedback

6. **Name Quality Assessment**:
   - Unique: Does not duplicate sibling Themes
   - Appropriate breadth: Can support multiple sub-themes
   - Clear: Understandable without L3 context

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**L3 Placement**:
- L1: [L1 Name]
- L2: [L2 Name]
- L3: [L3 Name]
- L3 Exists: [Yes/No]

**Sibling Themes under L3**: [List all with categories]

**Duplicate Check**:
- Semantic Duplicate Found: [Yes/No]

**Misc Feedback Analysis**:
- Misc Volume: [X records]
- Pattern 1: [Pattern Name] — [X%] of Misc feedback

**Operation Evaluation**:
- Proposed Theme: [Theme Name]
- Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Duplicate: [Yes/No]
- Breadth Assessment: [Sufficient/Too Narrow]
- Can support 3+ sub-themes: [Yes/No]

**Risks**:
- Duplicate Theme if not validated
- Wrong L3 placement = records won't flow
- Too narrow = should be SubTheme instead

**Verdict**: [APPROVE / APPROVE WITH CONDITIONS / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateChangeThemeCategoryPrompt(context: WisdomPromptContext): string {
  return `Analyze the following category change request:

Theme: ${context.themeName || context.currentName || "[THEME_NAME]"}
Current Category: ${context.currentCategory || "[CURRENT_CATEGORY]"}
Proposed Category: ${context.newCategory || "[NEW_CATEGORY]"}

Categories: COMPLAINT | IMPROVEMENT | PRAISE | HELP

Perform the following checks:

1. **Theme Lookup**:
   - Find the Theme and ALL its taxonomy paths
   - Identify the current category
   - List all sub-themes under this Theme (they will ALL inherit the new category)

2. **Semantic Alignment Check**:
   - Does the Theme name make sense with the proposed new category?
   - Example: "Issues with Payment Flow" as IMPROVEMENT is confusing

3. **Theme Name Sentiment Check**:
   - Does the Theme name have sentiment baked in that conflicts with new category?
   - Negative sentiment words: "Issues", "Problems", "Frustration", "Difficulty"
   - Positive sentiment words: "Request", "Need", "Want", "Suggestion"
   - If conflict exists, recommend renaming alongside category change

4. **Feedback Alignment**:
   - Retrieve sample feedback records (15-20) from the Theme
   - Analyze the sentiment and intent of the feedback
   - Does the feedback actually align with the proposed category?

5. **Sub-theme Cascade Impact**:
   - List all sub-themes that will inherit the new category
   - Check if any sub-theme names conflict semantically with the new category

6. **Downstream Impact Assessment**:
   - Quantify filters by category will show different counts
   - Dashboards with category breakdowns will shift
   - Saved views filtered by old category will exclude this Theme

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**Theme Taxonomy Path(s)**:
- Theme: [Theme Name]
- Current Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Proposed Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Path 1: [L1] → [L2] → [L3] → [Theme]

**Sub-themes** (will inherit new category):
- [SubTheme 1]
- [SubTheme 2]
- Total: [X sub-themes]

**Feedback Analysis**:
- Theme Volume: [X records]
- Feedback Sentiment Breakdown:
  - Complaint-like: [X%]
  - Improvement-like: [Y%]
  - Praise-like: [Z%]
  - Help-like: [W%]
- Feedback aligns with proposed category: [Yes/No/Partial]

**Operation Evaluation**:
- Current Category: [Category]
- Proposed Category: [Category]
- Semantic Alignment: [Yes/No]
- Name Sentiment Conflict: [Yes/No]
- Rename Recommended: [Yes/No]
- Sub-theme Conflicts: [Yes/No]
- Feedback Alignment: [Strong/Moderate/Weak]

**Risks**:
- Sub-themes inherit category — X sub-themes affected
- Dashboard/filter impact
- Semantic confusion if Theme name not updated

**Verdict**: [APPROVE / APPROVE WITH CONDITIONS / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateRenameThemePrompt(context: WisdomPromptContext): string {
  return `Analyze the following rename request:

Theme: ${context.currentName || "[CURRENT_THEME_NAME]"}
Proposed New Name: ${context.newName || "[NEW_THEME_NAME]"}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find ALL taxonomy paths for this Theme. A Theme may be linked to multiple L3 keywords — list every path.

2. **Sibling Uniqueness Check**:
   - List all sibling Themes under the same L3
   - Check if the proposed new name conflicts with or is semantically identical to any existing sibling

3. **Sub-theme Alignment**:
   - List all sub-themes under this Theme
   - Check if sub-theme names still make sense under the proposed new Theme name

4. **Feedback Alignment**:
   - Retrieve sample feedback records (10-20) from the Theme
   - Analyze whether the proposed new name accurately represents the feedback content
   - Compare how well the current name vs proposed name describes the feedback

5. **Category Alignment**: Does the proposed name align with the Theme's category (COMPLAINT/IMPROVEMENT/PRAISE/HELP)?

6. **Name Quality**:
   - Concise: Is it short enough for UI display?
   - Clear: Does it clearly describe the feedback scope?
   - Self-explanatory: Is it understandable without needing L3 context?

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**Theme Taxonomy Path(s)**:
- Category: [COMPLAINT/IMPROVEMENT/PRAISE/HELP]
- Path 1: [L1] → [L2] → [L3] → [Theme]

**Sibling Themes**: [List all]
- Conflict Detected: [Yes/No]

**Sub-themes**:
- [SubTheme 1]
- [SubTheme 2]
- Sub-themes align with new name: [Yes/No]

**Operation Evaluation**:
- Current Name: [Current Theme Name]
- Proposed Name: [New Theme Name]
- Sibling Conflict: [Yes/No]
- Category Alignment: [Yes/No]
- Feedback Alignment: [Better/Same/Worse]
- Name Quality: [Concise/Clear/Self-explanatory]

**Risks**: [List any risks]

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateDeleteKeywordPrompt(context: WisdomPromptContext): string {
  return `Analyze the following delete request:

Keyword (L3): ${context.l3Name || context.currentName || "[KEYWORD_NAME]"}
Path: ${context.l1Name || "[L1]"} → ${context.l2Name || "[L2]"} → ${context.l3Name || context.currentName || "[L3]"}

Perform the following checks:

1. **Taxonomy Path Lookup**: Find the complete path for this keyword.

2. **Volume Check**: What is the total feedback volume for this keyword? (Zero/minimal volume = safer to delete)

3. **Theme Inventory**:
   - List all Themes under this keyword
   - List all sub-themes under each Theme
   - Total entities that would be affected

4. **Alternative Predictions Check**:
   - Retrieve sample feedback records (10-20) from this keyword
   - For each record, check if it has co-occurring predictions (other keywords it's also tagged with)
   - Assess: If deleted, will records have alternative homes or become orphaned?

5. **Sibling Keyword Check**:
   - List sibling keywords under the same L2
   - Could feedback be absorbed by a sibling keyword?

6. **Downstream Impact**:
   - All Themes and sub-themes will be deleted
   - Records will need to be re-inferenced

Return your response STRICTLY in this format:

**Operations Confidence**: [High/Med/Low]

**Keyword Taxonomy Path**:
- L1: [L1 Name]
- L2: [L2 Name]
- L3 (Keyword): [Keyword Name]

**Themes under this Keyword**: [List all]
- Theme 1: [Theme Name] — [X sub-themes] — [Y records]
- Theme 2: [Theme Name] — [X sub-themes] — [Y records]

**Sibling Keywords**: [List all under same L2]

**Operation Evaluation**:
- Keyword Volume: [X records]
- Volume Assessment: [Zero/Minimal/Moderate/High]
- Total Themes Affected: [X]
- Total SubThemes Affected: [Y]
- Alternative Predictions Available: [Yes/No/Partial]
- Records that would be orphaned: [Y%]

**Risks**:
- Irreversible — all Themes and sub-themes deleted
- Orphaned records if no alternative predictions
- High impact if keyword has significant volume

**Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

function generateGenericPrompt(context: WisdomPromptContext): string {
  return `Analyze the following taxonomy change request:

Context:
- L1: ${context.l1Name || "N/A"}
- L2: ${context.l2Name || "N/A"}
- L3: ${context.l3Name || "N/A"}
- Theme: ${context.themeName || "N/A"}
- SubTheme: ${context.subThemeName || "N/A"}
- Current Name: ${context.currentName || "N/A"}
- New Name: ${context.newName || "N/A"}

Please analyze:
1. The current state of the taxonomy at this path
2. What changes are being proposed
3. Potential risks and impacts
4. Whether this change should be approved

Return your response with:
- **Operations Confidence**: [High/Med/Low]
- **Taxonomy Path(s)**: [List all affected paths]
- **Operation Evaluation**: [Key findings]
- **Risks**: [List any risks]
- **Verdict**: [APPROVE / REJECT / WORKAROUND]
[One-line rationale]`
}

// Helper to determine operation type from user action in the UI
export function inferOperationType(
  action: string,
  nodeLevel: "L1" | "L2" | "L3" | "Theme" | "SubTheme" | null,
  field?: string
): TaxonomyOperationType {
  const lowerAction = action.toLowerCase()

  if (lowerAction.includes("rename") || lowerAction.includes("change name") || field === "name") {
    if (nodeLevel === "SubTheme") return "rename-subtheme"
    if (nodeLevel === "Theme") return "rename-theme"
  }

  if (lowerAction.includes("delete") || lowerAction.includes("remove")) {
    if (nodeLevel === "SubTheme") return "delete-subtheme"
    if (nodeLevel === "L3") return "delete-keyword"
  }

  if (lowerAction.includes("merge") || lowerAction.includes("combine")) {
    if (nodeLevel === "SubTheme") return "merge-subtheme"
    if (nodeLevel === "Theme") return "merge-theme"
  }

  if (lowerAction.includes("split")) {
    if (nodeLevel === "SubTheme") return "split-subtheme"
  }

  if (lowerAction.includes("create") || lowerAction.includes("add") || lowerAction.includes("new")) {
    if (nodeLevel === "Theme") return "create-subtheme" // Creating under a theme = new subtheme
    if (nodeLevel === "L3") return "create-theme" // Creating under L3 = new theme
  }

  if (lowerAction.includes("category") || field === "category") {
    return "change-theme-category"
  }

  // Default based on node level
  if (nodeLevel === "SubTheme") return "rename-subtheme"
  if (nodeLevel === "Theme") return "rename-theme"

  return "rename-subtheme" // Fallback
}
