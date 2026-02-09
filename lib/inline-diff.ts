export type ActionType = "UPDATE" | "DELETE" | "CREATE" | "MOVE" | "MERGE" | "SPLIT"

export interface DiffSegment {
  type: "common" | "removed" | "added"
  text: string
}

/**
 * Computes an inline diff between two strings using word-level LCS.
 * Produces fine-grained diffs that highlight only the words that actually changed.
 */
export function computeInlineDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: "common", text: oldText }]
  }

  if (!oldText) {
    return [{ type: "added", text: newText }]
  }

  if (!newText) {
    return [{ type: "removed", text: oldText }]
  }

  const oldWords = oldText.split(/\s+/).filter(Boolean)
  const newWords = newText.split(/\s+/).filter(Boolean)

  // Build LCS table
  const n = oldWords.length
  const m = newWords.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to produce per-word operations
  const ops: { type: "common" | "removed" | "added"; word: string }[] = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      ops.push({ type: "common", word: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "added", word: newWords[j - 1] })
      j--
    } else {
      ops.push({ type: "removed", word: oldWords[i - 1] })
      i--
    }
  }

  ops.reverse()

  // Merge consecutive same-type operations into DiffSegments
  const segments: DiffSegment[] = []

  for (const op of ops) {
    const last = segments[segments.length - 1]
    const wordWithSpace = segments.length === 0 ? op.word : " " + op.word

    if (last && last.type === op.type) {
      last.text += " " + op.word
    } else {
      segments.push({ type: op.type, text: wordWithSpace })
    }
  }

  return segments
}

/**
 * For long descriptions: truncates common text segments that exceed 2 * maxContextChars,
 * replacing the middle with "...". Keeps ~maxContextChars of context around each change point.
 */
export function truncateDiffWithContext(
  segments: DiffSegment[],
  maxContextChars: number = 40,
): DiffSegment[] {
  return segments.map((segment, index) => {
    if (segment.type !== "common") return segment
    if (segment.text.length <= maxContextChars * 2) return segment

    const isFirst = index === 0
    const isLast = index === segments.length - 1

    if (isFirst) {
      // Keep only the tail
      return { type: "common", text: "..." + segment.text.slice(-maxContextChars) }
    }

    if (isLast) {
      // Keep only the head
      return { type: "common", text: segment.text.slice(0, maxContextChars) + "..." }
    }

    // Middle common segment: keep head and tail
    return {
      type: "common",
      text:
        segment.text.slice(0, maxContextChars) +
        "..." +
        segment.text.slice(-maxContextChars),
    }
  })
}

/**
 * Derives action type from the DraftChange.field value.
 */
export function getActionType(field: string): ActionType {
  switch (field) {
    case "delete-keyword":
      return "DELETE"
    case "add-keyword":
      return "CREATE"
    case "move-keyword":
      return "MOVE"
    case "name":
    case "description":
    default:
      return "UPDATE"
  }
}

/**
 * Maps a group of fields to the most significant action type.
 * Priority: DELETE > CREATE > MOVE > UPDATE
 */
export function getGroupActionType(fields: string[]): ActionType {
  const priority: ActionType[] = ["DELETE", "CREATE", "MOVE", "UPDATE"]
  const actions = fields.map(getActionType)
  for (const action of priority) {
    if (actions.includes(action)) return action
  }
  return "UPDATE"
}

/**
 * Formats a node level string into a human-readable label.
 */
export function formatNodeLevel(level: string): string {
  switch (level) {
    case "L1":
      return "Level 1 Keyword"
    case "L2":
      return "Level 2 Keyword"
    case "L3":
      return "Level 3 Keyword"
    case "Theme":
      return "Theme"
    default:
      return level
  }
}
